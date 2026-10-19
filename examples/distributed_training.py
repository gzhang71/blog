"""Same FP32 synthetic workload for DDP and DeepSpeed ZeRO comparisons.

Launch GPU jobs with torchrun; see the notes and examples/README.md.
--device cpu --cpu-workers N runs a local DDP smoke test, not a GPU benchmark.
"""
import argparse
import importlib.metadata
import json
import os
import platform
import tempfile
import time


def parse_args():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--engine", choices=["ddp", "deepspeed"], default="ddp")
    parser.add_argument("--device", choices=["cuda", "cpu"], default="cuda")
    parser.add_argument("--cpu-workers", type=int, default=0,
                        help="Launch a local CPU/Gloo smoke test using file rendezvous")
    parser.add_argument("--zero-stage", type=int, choices=range(4), default=0)
    parser.add_argument("--batch-size", type=int, default=64, help="Samples per rank")
    parser.add_argument("--width", type=int, default=1024)
    parser.add_argument("--depth", type=int, default=4)
    parser.add_argument("--steps", type=int, default=100)
    parser.add_argument("--warmup", type=int, default=10)
    args = parser.parse_args()
    if min(args.batch_size, args.width, args.depth, args.steps, args.warmup) < 1:
        parser.error("Batch, width, depth, steps, and warmup must be positive")
    if args.cpu_workers < 0:
        parser.error("--cpu-workers cannot be negative")
    if args.cpu_workers and (args.engine != "ddp" or args.device != "cpu"):
        parser.error("--cpu-workers requires --engine ddp --device cpu")
    if args.engine == "deepspeed" and args.device != "cuda":
        parser.error("The DeepSpeed example requires CUDA")
    if args.engine == "ddp" and args.zero_stage:
        parser.error("--zero-stage applies only to DeepSpeed")
    return args


def main(file_rendezvous=None):
    args = parse_args()
    import torch
    import torch.distributed as dist
    from torch.nn.parallel import DistributedDataParallel

    if "RANK" not in os.environ:
        raise SystemExit("Launch with torchrun --standalone --nproc-per-node=N")
    if args.device == "cuda" and not torch.cuda.is_available():
        raise SystemExit("CUDA is unavailable; --device cpu supports DDP smoke tests")

    local_rank = int(os.environ["LOCAL_RANK"])
    device = torch.device("cuda", local_rank) if args.device == "cuda" else torch.device("cpu")
    if device.type == "cuda":
        torch.cuda.set_device(device)
        # Keep the numerical policy identical between engines.
        torch.backends.cuda.matmul.allow_tf32 = False
    else:
        torch.set_num_threads(1)
    if file_rendezvous:
        filename, rank, world = file_rendezvous
        dist.init_process_group("gloo", init_method="file://" + filename,
                                rank=rank, world_size=world)
    else:
        dist.init_process_group("nccl" if device.type == "cuda" else "gloo")
    rank, world = dist.get_rank(), dist.get_world_size()
    try:
        torch.manual_seed(42)
        layers = []
        for _ in range(args.depth):
            layers.extend([torch.nn.Linear(args.width, args.width), torch.nn.GELU()])
        model = torch.nn.Sequential(*layers)
        parameters = sum(p.numel() for p in model.parameters())
        if args.engine == "ddp":
            model = model.to(device)
            optimizer = torch.optim.AdamW(model.parameters(), lr=1e-4, foreach=False)
            model = DistributedDataParallel(
                model, device_ids=[local_rank] if device.type == "cuda" else None
            )
        else:
            import deepspeed

            # Construct on CPU, then let the engine place/shard parameters.
            # This intentionally does not demonstrate zero.Init for huge models.
            optimizer = torch.optim.AdamW(model.parameters(), lr=1e-4, foreach=False)
            config = {
                "train_micro_batch_size_per_gpu": args.batch_size,
                "gradient_accumulation_steps": 1,
                "train_batch_size": args.batch_size * world,
                "fp16": {"enabled": False},
                "bf16": {"enabled": False},
                "gradient_clipping": 0.0,
                "zero_allow_untested_optimizer": True,
                "zero_optimization": {
                    "stage": args.zero_stage,
                    "overlap_comm": False,
                    "reduce_bucket_size": 5_000_000,
                    "allgather_bucket_size": 5_000_000,
                },
                "steps_per_print": 1_000_000,
            }
            model, optimizer, _, _ = deepspeed.initialize(
                model=model, optimizer=optimizer, config=config, dist_init_required=False
            )

        # Deterministic, different data on each rank. No loader/copy cost is timed.
        generator = torch.Generator(device=device).manual_seed(1000 + rank)
        x = torch.randn(args.batch_size, args.width, device=device, generator=generator)
        target = torch.randn(args.batch_size, args.width, device=device, generator=generator)

        def step():
            if args.engine == "ddp":
                optimizer.zero_grad(set_to_none=True)
            loss = torch.nn.functional.mse_loss(model(x), target)
            if args.engine == "ddp":
                loss.backward()
                optimizer.step()
            else:
                model.backward(loss)
                model.step()  # Engine owns zeroing and accumulation boundaries.
            return loss.detach()

        for _ in range(args.warmup):
            step()
        if device.type == "cuda":
            torch.cuda.synchronize(device)
            torch.cuda.reset_peak_memory_stats(device)
        dist.barrier()
        started = time.perf_counter()
        for _ in range(args.steps):
            loss = step()
        if device.type == "cuda":
            torch.cuda.synchronize(device)
        elapsed = time.perf_counter() - started
        stats = torch.tensor([
            elapsed,
            torch.cuda.max_memory_allocated(device) if device.type == "cuda" else 0,
            torch.cuda.max_memory_reserved(device) if device.type == "cuda" else 0,
        ], dtype=torch.float64, device=device)
        dist.all_reduce(stats, op=dist.ReduceOp.MAX)
        finite = torch.tensor(int(torch.isfinite(loss).item()), device=device)
        dist.all_reduce(finite, op=dist.ReduceOp.MIN)
        if not finite.item():
            raise RuntimeError("Nonfinite loss on at least one rank")
        if rank == 0:
            seconds, allocated, reserved = stats.tolist()
            print(json.dumps({
                "engine": args.engine,
                "zero_stage": args.zero_stage if args.engine == "deepspeed" else None,
                "device": str(device),
                "device_name": torch.cuda.get_device_name(device) if device.type == "cuda" else platform.processor(),
                "torch": torch.__version__, "cuda_runtime": torch.version.cuda,
                "deepspeed": importlib.metadata.version("deepspeed") if args.engine == "deepspeed" else None,
                "world_size": world, "dtype": "float32", "parameters": parameters,
                "width": args.width, "depth": args.depth,
                "local_batch": args.batch_size, "global_batch": args.batch_size * world,
                "warmup_steps": args.warmup, "measured_steps": args.steps,
                "slowest_rank_seconds": seconds,
                "global_samples_per_second": args.steps * args.batch_size * world / seconds,
                "mean_step_ms": seconds * 1000 / args.steps,
                "max_rank_allocated_gib": allocated / 2**30,
                "max_rank_reserved_gib": reserved / 2**30,
                "rank0_final_loss": loss.item(),
            }, sort_keys=True), flush=True)
    finally:
        dist.destroy_process_group()


def cpu_worker(rank, world, filename):
    os.environ.update(RANK=str(rank), LOCAL_RANK=str(rank), WORLD_SIZE=str(world))
    if platform.system() == "Darwin":
        os.environ.setdefault("GLOO_SOCKET_IFNAME", "lo0")
    main(file_rendezvous=(filename, rank, world))


if __name__ == "__main__":
    args = parse_args()
    if args.cpu_workers:
        import torch.multiprocessing as mp

        with tempfile.TemporaryDirectory() as directory:
            mp.spawn(cpu_worker, args=(args.cpu_workers, directory + "/rendezvous"),
                     nprocs=args.cpu_workers, join=True)
    else:
        main()

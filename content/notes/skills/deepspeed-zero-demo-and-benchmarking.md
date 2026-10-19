---
title: "DeepSpeed ZeRO: why we need it, a demo, and memory benchmarks"
date: 2026-10-18
summary: "Use a shared workload to compare DDP and ZeRO stages, separating memory capacity from throughput and initialization costs."
tags: [deepspeed, distributed-training, benchmarking]
---

Data parallelism makes training faster by replicating a model and sharing gradients. Replication also duplicates parameters, gradients, and optimizer state on every worker. When that duplication prevents the desired model or batch from fitting, adding another ordinary replica does not solve the memory problem.

DeepSpeed is a training framework; ZeRO is its family of techniques for partitioning training state. DeepSeek is a model family, a different name that is easy to confuse with DeepSpeed.

## Where the memory goes

ZeRO progressively partitions optimizer state, gradients, and parameters across data-parallel ranks. Stage 3 gathers parameter material as needed for computation. Offloading can additionally move state to CPU or NVMe, exchanging device capacity for transfer and execution costs. [ZeRO overview](https://www.deepspeed.ai/tutorials/zero/) and [stage/configuration reference](https://deepspeed.readthedocs.io/en/stable/zero3.html).

For an intentionally simplified FP32 Adam accounting model, let P be the parameter count and N the number of ranks. Count four bytes each for parameters and gradients, plus eight bytes for two optimizer moments:

| Configuration | Approximate persistent state per rank |
| --- | --- |
| Replicated | `16P` bytes |
| ZeRO-1 | `8P + 8P/N` bytes |
| ZeRO-2 | `4P + 12P/N` bytes |
| ZeRO-3 | `16P/N` bytes |

These are accounting estimates, not allocator predictions. They omit activations, communication buffers, temporary gathers, padding, fragmentation, and implementation details. Mixed precision changes the accounting, including whether master weights exist.

For P = 100 million and N = 4, this toy calculation gives 1.6 GB replicated, 1.0 GB for stage 1, 0.7 GB for stage 2, and 0.4 GB for stage 3, in decimal units. An observed peak above these values is expected; the missing categories still need memory.

## A demo with a meaningful baseline

The companion `examples/distributed_training.py` uses the same model, synthetic inputs, FP32 precision, and PyTorch AdamW for DDP and DeepSpeed. It does not mix a precision change into the sharding comparison.

The integration replaces the backward/update boundary:

```python
# Fragment; imports, model, optimizer, and batch are in the companion script.
engine, optimizer, _, _ = deepspeed.initialize(
    model=model,
    optimizer=optimizer,
    config=config,
    dist_init_required=False,
)
loss = torch.nn.functional.mse_loss(engine(x), target)
engine.backward(loss)
engine.step()
```

DeepSpeed owns gradient accumulation boundaries and gradient clearing. Its configuration must agree about micro-batch, accumulation steps, and total batch. The demo uses one accumulation step and sets global batch to local batch times world size. [Getting started](https://www.deepspeed.ai/getting-started/).

On a Linux CUDA machine, install a compatible DeepSpeed build in the training environment and check `ds_report`. From the repository root:

```bash
torchrun --standalone --nproc-per-node=2 examples/distributed_training.py --engine ddp
torchrun --standalone --nproc-per-node=2 examples/distributed_training.py --engine deepspeed --zero-stage 0
torchrun --standalone --nproc-per-node=2 examples/distributed_training.py --engine deepspeed --zero-stage 1
torchrun --standalone --nproc-per-node=2 examples/distributed_training.py --engine deepspeed --zero-stage 2
torchrun --standalone --nproc-per-node=2 examples/distributed_training.py --engine deepspeed --zero-stage 3
```

Stage 0 is useful as a control: DDP versus DeepSpeed stage 0 includes engine and implementation differences, while stage 0 versus the other stages isolates more of the sharding effect. The demo deliberately disables communication overlap and bounds communication buckets for an understandable starting point; it is not tuned for maximum throughput.

## Run a speed experiment and a capacity experiment

First hold width, depth, batch, GPU count, and optimizer constant. Compare throughput, mean step latency, and memory across stages. The script warms up before timing, synchronizes CUDA, and reports the slowest rank's elapsed time and maximum per-rank allocated/reserved memory.

Then increase `--width` or `--depth` at a fixed local batch. At every size, run every configuration in a fresh process. Record the largest workload that completes. An OOM is a capacity result; do not omit it from the comparison.

| Configuration | Fits? | Samples/s | Peak allocated GiB | Peak reserved GiB |
| --- | --- | --- | --- | --- |
| DDP | Measure | Measure | Measure | Measure |
| ZeRO-0 | Measure | Measure | Measure | Measure |
| ZeRO-1 | Measure | Measure | Measure | Measure |
| ZeRO-2 | Measure | Measure | Measure | Measure |
| ZeRO-3 | Measure | Measure | Measure | Measure |

No CUDA or DeepSpeed runtime was available on the authoring machine, so no GPU result is claimed here. CPU DDP validates part of the shared harness, not the DeepSpeed execution path.

## Interpret the tradeoff

For a small model that already fits, extra coordination may buy little. For a larger model, lower persistent-state memory may permit a larger local batch, increasing useful work enough to offset communication. That second experiment changes the batch and should be reported separately from the fixed-workload comparison.

The demo constructs the full model before initializing the engine. It does not demonstrate initialization of a model too large to construct normally; that requires a separate `deepspeed.zero.Init` setup. Steady-state memory statistics also miss initialization peaks and some non-PyTorch allocations. Pair allocator statistics with device-level monitoring.

My selection rule is to choose the least complicated setup that meets the capacity target, then tune throughput under the real workload. Sharding state is a capacity tool. Whether it also improves elapsed training time is a benchmark question.

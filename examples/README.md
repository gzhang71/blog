# Companion demos

Run commands from the repository root. These scripts use separate Python ML
environments; the Next.js site does not depend on their packages. Install PyTorch
with a CUDA build appropriate to your Linux GPU machine using the official
PyTorch installer. Install DeepSpeed in that training environment and check
`ds_report`. Use a separate vLLM-supported environment for the inference demo;
vLLM may require a different PyTorch build. Record exact package versions before
comparing runs; these scripts are examples, not a pinned environment lockfile.

## Distributed training

```bash
# CPU functional smoke test (also works on this development Mac).
python examples/distributed_training.py --device cpu --cpu-workers 2 \
  --width 32 --depth 2 --batch-size 8 --warmup 2 --steps 3

# CUDA: same local batch, increasing total batch (weak scaling).
torchrun --standalone --nproc-per-node=1 examples/distributed_training.py
torchrun --standalone --nproc-per-node=2 examples/distributed_training.py

# CUDA: same global batch of 64 (strong scaling).
torchrun --standalone --nproc-per-node=2 examples/distributed_training.py --batch-size 32

# Compare DDP and ZeRO stages on the same GPU count and local batch.
torchrun --standalone --nproc-per-node=2 examples/distributed_training.py --engine ddp
torchrun --standalone --nproc-per-node=2 examples/distributed_training.py --engine deepspeed --zero-stage 0
torchrun --standalone --nproc-per-node=2 examples/distributed_training.py --engine deepspeed --zero-stage 1
torchrun --standalone --nproc-per-node=2 examples/distributed_training.py --engine deepspeed --zero-stage 2
torchrun --standalone --nproc-per-node=2 examples/distributed_training.py --engine deepspeed --zero-stage 3
```

The FP32 MLP uses persistent device-resident synthetic inputs, AdamW, no gradient
accumulation, no mixed precision, no offload, and no activation checkpointing.
The timed region includes forward, backward, optimizer updates, and distributed
communication, but excludes initialization, input preparation, and warmup. It is
a systems microbenchmark, not a convergence or transformer benchmark. DeepSpeed
owns backward/step and gradient clearing; DDP uses the ordinary PyTorch optimizer.
ZeRO stages use deliberately bounded communication buckets and disable overlap
for an easier first comparison; these are not recommended peak-performance settings.

Each run emits a final JSON line with throughput, mean step latency, and the
maximum allocated/reserved CUDA memory over ranks. Repeat configurations in
fresh processes at least three times, alternate run order, and report the median
and range. Save final JSON lines separately from framework logs. Record GPU model,
driver, interconnect (`nvidia-smi topo -m`), world size, package versions,
precision, workload dimensions, and local/global batch. The memory metrics cover
the measured steady-state region; they exclude initialization peaks and
allocations invisible to PyTorch's allocator. Use device-level monitoring too.

Increase `--width`/`--depth` for a memory-capacity experiment, keeping the same
workload across engines at each size. Record OOM as a result, not as a zero-time
run. This demo constructs a full model before engine initialization; use
DeepSpeed `zero.Init` for a separate study of models too large to initialize
normally. It has no checkpoint-save demo and intentionally does not run an
extra full-parameter checksum that could defeat sharding.

## Other demos

```bash
python examples/pinned_memory.py --mib 64 --steps 50
python examples/vllm_demo.py
```

The pinning script allocates source and destination before timing, warms each
case, synchronizes around measurements, and verifies copied values afterward.
It measures repeated H2D copies to one destination; it does not measure
DataLoader latency, allocation cost, or concurrent training overlap.

The vLLM script downloads model weights on first run, uses chat templates via
`LLM.chat`, and demonstrates multiple conversations. Its tiny throughput output
is a smoke signal rather than a reliable performance comparison.

Validation on the authoring machine: PyTorch 2.12.1, macOS arm64, no CUDA.
The two-process CPU DDP smoke test passed using file-based rendezvous; the local
torchrun/TCP rendezvous stalled resolving a network address. The CPU launcher
therefore avoids TCP rendezvous and selects macOS loopback for Gloo. CUDA copies,
DeepSpeed, and vLLM still need their target runtime. No GPU performance results
are supplied.

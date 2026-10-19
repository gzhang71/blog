---
title: "PyTorch DDP: why we need it, a demo, and a fair benchmark"
date: 2026-10-18
summary: "Replicate the model, split the work, synchronize gradients—and distinguish training speedup from simply increasing the batch."
tags: [pytorch, distributed-training, benchmarking]
---

One GPU can become the limiting factor even when the model fits comfortably in memory. If an epoch takes hours, putting different training examples on multiple GPUs can reduce elapsed time. But independent workers would quickly learn different weights. DistributedDataParallel, or DDP, coordinates their gradients so the replicas continue following one training trajectory.

This note includes a working companion script, `examples/distributed_training.py`, and separates functional validation from GPU performance measurement. The script's CPU/Gloo path can run on a development laptop; the CUDA/NCCL path is intended for a multi-GPU machine.

## What DDP actually synchronizes

In the usual configuration, each process owns one GPU and a complete model replica. Each rank computes a forward and backward pass on its local examples. DDP synchronizes gradient buckets during backward; each rank then applies an optimizer update. This is collective communication, not a head node collecting all gradients and updating the model centrally. DDP does not shard the input dataset for you. [PyTorch DDP introduction](https://docs.pytorch.org/tutorials/beginner/ddp_series_theory.html).

```text
rank 0: batch A → model replica → gradients ─┐
                                          ├→ all-reduce → each replica updates
rank 1: batch B → model replica → gradients ─┘
```

For equally sized local batches and ordinary mean-reduced losses, averaging local gradients gives the gradient of the combined batch. With B samples per rank, N ranks, and A gradient accumulation steps:

```text
effective global batch = B × N × A
```

This equality needs care with uneven inputs or token-normalized language-model losses. If one rank has 100 valid tokens and another has 1,000, averaging their local token means gives each rank equal influence, not each token. Define the intended objective before choosing loss normalization.

## The smallest useful training-loop change

After `torchrun` has supplied rank environment variables and a process group has been initialized:

```python
# Fragment: initialization, model, optimizer, x, and target are in the companion.
model = DistributedDataParallel(model, device_ids=[local_rank])
optimizer.zero_grad(set_to_none=True)
loss = torch.nn.functional.mse_loss(model(x), target)
loss.backward()       # DDP's hooks synchronize gradients here.
optimizer.step()      # Every rank updates its own replica.
```

For a real dataset, use a rank-aware sampler and call `sampler.set_epoch(epoch)` when shuffling across epochs. All ranks must execute compatible collective operations; skipping backward on only one rank can hang a job. Rank-zero logging is fine, but rank-zero-only training is not. [DDP tutorial](https://docs.pytorch.org/tutorials/intermediate/ddp_tutorial.html) and [API reference](https://docs.pytorch.org/docs/2.14/generated/torch.nn.parallel.DistributedDataParallel.html).

## Run the demo

From the repository root, in an environment with the appropriate PyTorch build:

```bash
# Functional check without CUDA.
python examples/distributed_training.py --device cpu --cpu-workers 2 \
  --width 32 --depth 2 --batch-size 8 --warmup 2 --steps 3

# One GPU, then two GPUs. Default local batch is 64.
torchrun --standalone --nproc-per-node=1 examples/distributed_training.py
torchrun --standalone --nproc-per-node=2 examples/distributed_training.py
```

The companion constructs a configurable FP32 MLP with AdamW, uses different deterministic synthetic inputs on each rank, warms up optimizer state, then measures completed forward/backward/update steps. Inputs remain on the device so data loading cannot hide the communication effect. This is a training-systems microbenchmark, not evidence of model convergence or production transformer performance.

The two-process CPU smoke test passed on macOS with PyTorch 2.12.1. Its local launcher uses file-based rendezvous and loopback because TCP rendezvous stalled on this machine. That checks the DDP training path; it does not test CUDA/NCCL or establish a GPU speedup.

## Ask two different scaling questions

The commands above keep local batch fixed. Two GPUs process twice as many samples per update, so this is a weak-scaling experiment. It answers how much aggregate throughput increases as the workload grows.

For a fixed global batch of 64, compare one rank at 64 with two ranks at 32:

```bash
torchrun --standalone --nproc-per-node=2 examples/distributed_training.py --batch-size 32
```

This is strong scaling. It answers whether a fixed amount of training work completes faster. Smaller local batches may use each GPU less efficiently, even while the total job benefits.

The script synchronizes CUDA around the measured loop and reduces elapsed time using the maximum over ranks. Report `global samples / slowest-rank elapsed seconds`. A rank-zero timer without synchronization can measure dispatch rather than completion or hide another rank's slowdown.

For N GPUs, calculate `speedup = throughput_N / throughput_1` and `scaling efficiency = speedup / N`. Compare like with like: same model, precision, optimizer, global-batch policy, and hardware family. Repeat in fresh processes and report median and range rather than the best run.

| Run | GPUs | Local batch | Global batch | Samples/s | Peak allocated GiB |
| --- | ---: | ---: | ---: | --- | --- |
| Baseline | 1 | 64 | 64 | Measure | Measure |
| Weak scaling | 2 | 64 | 128 | Measure | Measure |
| Strong scaling | 2 | 32 | 64 | Measure | Measure |

No GPU measurements are available from the authoring machine. The table is a collection plan, not a performance claim.

## When more replicas stop helping

My first investigation would separate compute, communication, and input wait. A small model may spend more time launching kernels and synchronizing than doing useful work. A large local batch may amortize communication; it also changes optimization if global batch grows. Network topology and the slowest worker matter because training steps coordinate across ranks.

DDP also replicates model state. Adding GPUs does not automatically make an oversized model fit on each GPU. When memory duplication becomes the problem, compare [DeepSpeed ZeRO](/notes/skills/deepspeed-zero-demo-and-benchmarking). When the task is request serving rather than gradient updates, use an inference scheduler such as [vLLM](/notes/llm/vllm-demo).

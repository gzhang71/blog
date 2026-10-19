---
title: "A deep dive into PyTorch pin_memory"
date: 2026-10-18
summary: "Separate page locking, device placement, host asynchrony, and actual copy/compute overlap—then benchmark the boundary you intend to optimize."
tags: [pytorch, cuda, memory, performance]
---

`pin_memory=True` changes how a CPU batch is stored. It does not choose a GPU, move a tensor there, or make the forward pass faster by itself. Understanding those boundaries prevents three common mistakes: pinning tensors that already live on the GPU, forgetting the device transfer, and calling an asynchronous copy “overlap” without checking a timeline.

## Four distinct operations

| Operation | What it changes | What it does not establish |
| --- | --- | --- |
| Allocate pinned host memory | CPU pages remain resident for transfer | GPU placement |
| `.to("cuda")` | Device placement, if a copy is needed | Useful overlap |
| `non_blocking=True` | Attempts host-asynchronous transfer | Independent GPU work |
| Separate copy/compute streams with dependencies | Enables overlap where supported | An end-to-end speedup |

Page-locked memory gives the transfer system a stable host buffer. Copying ordinary pageable memory may require staging. But manually pinning a tensor immediately before copying adds an allocation and host copy; that extra cost can outweigh the transfer gain. PyTorch's tutorial also distinguishes host nonblocking behavior from conditions for real device-side overlap. [Transfer tutorial](https://docs.pytorch.org/tutorials/intermediate/pinmem_nonblock.html).

## Follow one batch through the system

```text
files → decode/collate → CPU tensors → pinned CPU tensors → CUDA tensors
                                                           |
                                            forward → loss → backward
```

For a CUDA training loop:

```python
# Fragment: dataset and model are supplied by the training application.
loader = DataLoader(dataset, batch_size=128, num_workers=4, pin_memory=True)
for inputs, labels in loader:
    inputs = inputs.to("cuda", non_blocking=True)
    labels = labels.to("cuda", non_blocking=True)
    predictions = model(inputs)
    loss = loss_fn(predictions, labels)
```

The DataLoader handles pinning for supported tensor-containing batches. Custom batch types need a compatible `pin_memory()` method. Do not return CUDA tensors from multiprocessing workers just to avoid the explicit main-process transfer; PyTorch documents pinned host batches as the usual approach. Worker count and prefetching also affect how much CPU data is in flight. [DataLoader documentation](https://docs.pytorch.org/docs/2.14/data.html).

Setting `pin_memory=False` does not make transfer automatic either. Both settings require explicit movement when training on CUDA.

## What should be pinned?

Pin CPU tensors that will soon be copied to CUDA and are large or frequent enough to justify the resource use. In a classifier, that usually includes features and ground-truth labels. A label is the target value used in the loss; it is not the model's prediction.

For a transformer training example, input IDs, attention masks, and target token IDs may arrive from the CPU. Q, K, V, attention scores, activations, and predictions are ordinarily created during computation on the GPU. There is no CPU-to-GPU boundary to optimize for those intermediates in the ordinary pipeline.

String record IDs used only for logging should stay on the CPU. Pinning the whole dataset is rarely the right starting point: batches, worker prefetch, and retained buffers can already put substantial pressure on host memory.

For scale intuition, 128 int64 class labels occupy only 1 KiB. A batch of 128 float32 images shaped 3 × 224 × 224 occupies about 73.5 MiB. Copying the labels may be necessary for the loss, but optimizing that tiny transfer is unlikely to explain a large end-to-end improvement. Measure rather than assign every tensor equal performance importance.

## Asynchronous is not the same as overlapping

These operations on one stream remain ordered:

```text
stream 0: copy batch n → compute batch n → copy batch n+1 → compute batch n+1
```

For overlap, the intended schedule is closer to:

```text
copy stream:    copy batch n+1 ────────────┐
compute stream: compute batch n → wait → compute batch n+1
```

The next batch's compute must wait for its copy, while the previous batch's compute can run independently. Separate streams require explicit dependency and lifetime handling. PyTorch documents `wait_stream` and `record_stream` for ordering and allocator safety; they are not interchangeable. [CUDA semantics](https://docs.pytorch.org/docs/2.14/notes/cuda.html).

The host source also needs a valid lifetime. Do not mutate or recycle a pinned source buffer while an asynchronous copy still reads it. Likewise, an asynchronous GPU-to-CPU copy needs completion before CPU code consumes its destination. A fast return from a Python method does not establish either condition.

## Benchmark the transfer, then the pipeline

The complete `examples/pinned_memory.py` compares pageable blocking, pageable nonblocking, and pinned nonblocking copies:

```bash
python examples/pinned_memory.py --mib 64 --steps 50
```

It preallocates the source and destination, warms up each case, synchronizes before and after timing, and checks copied values afterward. Reported GiB/s is bytes copied divided by synchronized elapsed time. It excludes pin allocation, preprocessing, and training compute. Repeatedly copying to one destination measures a specific H2D microbenchmark, not a pipelined training system.

For the application experiment, hold model, data, batch, workers, and precision fixed. Compare pinning off/on, then compare explicit prefetching as a separate change. Measure completed steps per second and inspect a profiler trace for GPU idle gaps and copy/compute overlap. Do not put `.item()`, CPU copies, or per-step synchronizations into only one configuration.

No CUDA copy measurement was possible on the authoring Mac. The useful result here is a reproducible measurement procedure, not a universal claim that pinning improves performance. If preprocessing or kernels dominate, the best-case gain from transfer optimization is already bounded by the fraction of time those transfers consume.

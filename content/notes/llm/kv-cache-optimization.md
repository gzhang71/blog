---
title: "KV cache optimization, ranked by what you give up"
date: 2026-09-12
summary: "Decode throughput is set by how many requests fit in memory, and the KV cache is what fills it. Every technique trades the same currency: memory for quality, compute, or generality."
tags: [inference, attention]
---

At decode time the GPU is loading memory, not doing math: one token per step per
sequence, and the arithmetic is trivial next to the bytes moved. Throughput is
therefore set by batch size, batch size is set by free memory, and after weights
the KV cache is what consumes it. Every technique below buys memory, and each one
pays for it differently.

## Where the memory goes

```
bytes = 2 × layers × kv_heads × head_dim × seq_len × batch × dtype_bytes
```

The 2 is K and V. Note what isn't there: query heads. That's why the
architectural fixes all attack `kv_heads`, and why the cache grows linearly in
both context length and batch — the two things you most want to increase.

## Architectural — decided before training

| Technique | Mechanism | Cost |
| --- | --- | --- |
| MQA | One KV head shared by all query heads | Quality degradation; needs training or uptraining |
| GQA (2305.13245) | An intermediate number of KV heads, grouped | Quality "close to MHA with speed comparable to MQA"; uptraining from an MHA checkpoint costs ~5% of pretraining compute |
| MLA (2405.04434) | Compress KV into a shared latent vector | Architectural commitment; DeepSeek-V2 reports 93.3% KV cache reduction and 5.76x max generation throughput vs DeepSeek 67B |
| Sliding window | Cache only the last W tokens | Loses attention beyond the window |

GQA is the default in most open-weight models now because it's the one that
retrofits: you can uptrain an existing MHA checkpoint rather than pretraining
from scratch.

## Runtime — applied to a model you already have

| Technique | Mechanism | Cost |
| --- | --- | --- |
| PagedAttention (vLLM) | Paged allocation, near-zero fragmentation, sharing across requests | None to quality — this is pure allocator work |
| Prefix caching | Reuse KV for a shared prompt prefix | Only helps with repeated prefixes; cache management |
| Quantization, e.g. KIVI (2402.02750) | 2-bit KV, keys per-channel and values per-token | KIVI reports ~2.6x less peak memory, up to 4x batch, 2.35–3.47x throughput |
| Eviction, e.g. H2O (2306.14048) | Keep recent tokens plus "heavy hitter" tokens | Lossy — evicted tokens are gone; H2O reports up to 29x throughput over DeepSpeed Zero-Inference and HF Accelerate at 20% heavy hitters |
| Attention sinks (2309.17453) | Keep the first few tokens alongside a sliding window | Enables streaming to 4M tokens, 22.2x over sliding-window recomputation — but it's still a window, not full context |

## Picking one

Start with PagedAttention, because it costs nothing in quality — it's memory
management, and the gains come from fragmentation that was pure waste. Prefix
caching next if the workload has shared system prompts, for the same reason.

Only then consider the lossy options, and note what "lossless" means in each
paper: quantization perturbs every stored value slightly, while eviction deletes
some entirely. Those fail differently. Quantization degrades gracefully across
a whole context; eviction is fine until the model needs precisely the token
that was dropped, which benchmark averages hide.

The architectural choices aren't available to you at all unless you're training
the model — worth knowing when reading a KV-cache benchmark that quietly
assumes GQA.

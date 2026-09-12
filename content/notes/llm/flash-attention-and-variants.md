---
title: "FlashAttention, and what each version actually fixed"
date: 2026-09-12
summary: "None of the versions change the math. Each one targets a different hardware bottleneck — HBM traffic, then GPU work partitioning, then Hopper asynchrony."
tags: [attention, gpu]
---

FlashAttention computes exact attention. It isn't an approximation, a sparsity
pattern, or a kernel trick that trades quality for speed — it reorders the same
arithmetic to move less data. That framing explains the whole version history:
each release targets whatever hardware bottleneck dominated after the previous
one was removed.

## The original insight

Standard attention materializes the N×N score matrix in HBM, writes it, reads
it back for softmax, writes again, reads again for the value multiply. At long
sequence lengths the kernel is bound by that traffic, not by arithmetic.

FlashAttention tiles Q, K and V into blocks that fit in on-chip SRAM, computes
softmax incrementally over tiles (running max and sum, rescaled as it goes),
and never writes the full score matrix to HBM at all. The backward pass
recomputes tiles from stored statistics rather than reloading them — more FLOPs,
less memory traffic, net faster.

<svg viewBox="0 0 720 190" width="100%" role="img" aria-label="Standard attention writes the full N by N score matrix to HBM; FlashAttention keeps tiles in on-chip SRAM" style="max-width:100%;height:auto;margin:1.5rem 0">
  <defs>
    <marker id="fa" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M0,0 L10,5 L0,10 z" fill="var(--text-faint)"/>
    </marker>
  </defs>
  <g font-family="var(--mono)" font-size="11" fill="var(--text-faint)" letter-spacing="0.08em">
    <text x="0" y="12">STANDARD</text>
    <text x="380" y="12">FLASHATTENTION</text>
  </g>
  <g stroke="var(--border-strong)" fill="var(--bg-sunken)">
    <rect x="0" y="24" width="330" height="52" rx="7"/>
    <rect x="0" y="104" width="330" height="60" rx="7"/>
    <rect x="380" y="24" width="330" height="52" rx="7"/>
    <rect x="380" y="104" width="330" height="60" rx="7"/>
  </g>
  <g font-family="var(--sans)" font-size="11.5" fill="var(--text)">
    <text x="12" y="45">SRAM — on-chip, small, fast</text>
    <text x="12" y="64" fill="var(--text-faint)">one tile at a time</text>
    <text x="12" y="126">HBM — off-chip, large, slower</text>
    <text x="12" y="146" fill="var(--accent)">full N×N score matrix written + reread</text>
    <text x="392" y="45">SRAM</text>
    <text x="392" y="64" fill="var(--accent)">tiles + running softmax stats stay here</text>
    <text x="392" y="126">HBM</text>
    <text x="392" y="146" fill="var(--text-faint)">Q, K, V and output only</text>
  </g>
  <g stroke="var(--text-faint)" stroke-width="1.5" marker-end="url(#fa)">
    <line x1="250" y1="80" x2="250" y2="100"/>
    <line x1="290" y1="100" x2="290" y2="80"/>
    <line x1="640" y1="100" x2="640" y2="80"/>
  </g>
</svg>

## What each version fixed

| Version | Bottleneck it attacks | Mechanism | Reported result |
| --- | --- | --- | --- |
| FlashAttention (2205.14135) | HBM read/write traffic | Tiling, online softmax, recomputation in backward | 3x on GPT-2 at seq 1K; 15% end-to-end over the MLPerf 1.1 BERT-large record |
| FlashAttention-2 (2307.08691) | Poor GPU occupancy; v1 hit only 25–40% of peak FLOPs/s | Fewer non-matmul FLOPs, parallelize over sequence length, better warp-level work split | ~2x over v1, 50–73% of peak on A100; 225 TFLOPs/s, 72% MFU end-to-end |
| FlashAttention-3 (2407.08608) | Hopper features unused; v2 hit only 35% on H100 | Warp specialization with TMA, matmul/softmax interleaving, FP8 block quantization | 1.5–2.0x over v2; 740 TFLOPs/s FP16 (75%), ~1.2 PFLOPs/s FP8 |

The pattern is that each version's headline number is measured against the
previous one's specific inefficiency, on the hardware generation that exposed
it. A v3 speedup claim is an H100 claim.

## Things that sound related but solve a different problem

| Method | Actually addresses |
| --- | --- |
| Block-sparse FlashAttention | Approximate attention — this one *does* change the math |
| FlashDecoding | Inference decode, where one query token leaves the GPU idle; splits along KV length |
| PagedAttention / vLLM (2309.06180) | KV cache *memory fragmentation* during serving, not kernel speed — 2–4x throughput |
| Ring Attention (2310.01889) | Sequence length beyond one device; distributes blocks and overlaps KV communication |

FlashAttention and PagedAttention are routinely discussed as alternatives. They
compose: one is a kernel, the other is a memory allocator for the cache.

Where it doesn't help much: short sequences, where the kernel was never
IO-bound, and single-token decode, which is bound by weight and KV-cache
loading rather than by the score matrix.

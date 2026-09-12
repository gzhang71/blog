---
title: "Paper notes: context parallelism for HSTU"
date: 2026-09-12
summary: "The follow-up that makes long user histories affordable. Almost all of the win comes from one collective-communication change, not from the parallelism scheme itself."
tags: [paper, systems]
---

[arXiv:2508.04711](https://arxiv.org/abs/2508.04711) — Dong et al., Meta
Platforms, 2025.

Once recommendation is sequential transduction, sequence length becomes the
lever — and attending over longer histories is an activation-memory problem, not
a modeling one. This paper ports context parallelism from LLM training to HSTU,
and the interesting content is entirely in what breaks when inputs are jagged.

## The constraint

HSTU on an 80GB H100 with DDP and no activation checkpointing tops out at a
**3072-token** sequence, using 89% of memory. Past that, OOM. Context
parallelism sharding Q/K/V along the sequence dimension moves that ceiling:

| Setup | Max sequence length |
| --- | --- |
| No CP | 3,072 |
| CP=2 | 4,096 |
| CP=4 | 7,168 |
| CP=8 | 16,384 |

16,384 / 3,072 is the 5.3x in the abstract.

## Why jagged tensors break the standard recipe

In LLM training, sequences are padded to a fixed length, so the usual
preprocessing — AllGather along the batch dimension, then an even split along
sequence — is cheap and predictable. Production recommendation features are
jagged: variable-length per user, stored as values plus offsets (TorchRec).
AllGather then forces every rank to hold a full copy of the concatenated
sequence, and both communication volume and peak intermediate memory scale with
that total length.

Replacing AllGather with **AllToAll** — sending each sample's relevant chunk
directly to the rank that needs it — is the paper's main contribution in
practice. Reported: peak memory down more than 60%, throughput more than 2x.

## Where the throughput actually came from

| Optimization | Gain (QPS) |
| --- | --- |
| AllGather → AllToAll | 2.7x |
| Triton kernels for memory reordering (load balancing) | +37% |
| Async offset copy, deferring `.item()` device-host sync | +2% |

One change carries the result; the other two are cleanup. The `.item()` finding
is the kind of thing worth checking in any jagged-tensor pipeline — computing
sequence lengths for a collective triggered a device-host sync every step.

## What it doesn't reach

| Case | Scaling factor |
| --- | --- |
| Ideal | 2.00x |
| DDP only | 1.6–1.7x |
| DDP + CP (cp_size=2) | 1.33x |
| DDP + CP (cp_size=2, 2x batch) | 1.55x |

CP costs efficiency relative to plain DDP — 1.55x against an ideal 2.00x, from a
24K QPS baseline. It buys sequence length you otherwise cannot have at any
throughput. The stated bottleneck is the attention kernel, tuned for short
sequences.

Worth noting what the paper doesn't report: no model-quality numbers. It
establishes that longer sequences are *trainable*, and cites prior work for the
claim that they help.

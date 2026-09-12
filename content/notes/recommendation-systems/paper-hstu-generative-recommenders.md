---
title: "Paper notes: Actions Speak Louder than Words (HSTU)"
date: 2026-09-12
summary: "Meta's ICML'24 paper reformulating recommendation as sequential transduction. The load-bearing change is dropping softmax attention, not adding parameters."
tags: [paper, architecture]
---

[arXiv:2402.17152](https://arxiv.org/abs/2402.17152) — Zhai et al., Meta AI,
ICML'24.

The claim worth taking away: DLRMs stop improving when you add compute, and
that's an architecture problem rather than a data problem. Recast recommendation
as sequential transduction over a single stream of user events, and quality
follows a power law in training compute across three orders of magnitude — the
scaling behavior language models have and recommenders previously didn't.

## What changes versus a DLRM

| DLRM | Generative Recommender (GR) |
| --- | --- |
| Thousands of handcrafted features | Raw categorical engagement events in one sequence |
| Separate retrieval and ranking models | Both as transduction over the same sequence |
| Softmax attention (when attention at all) | Pointwise aggregated attention |
| Quality plateaus with compute | Power-law scaling with compute |

## Why softmax had to go

Two reasons given, and they're the most transferable part of the paper. First,
softmax normalizes away *how many* prior events relate to the target — but that
count is the signal for engagement intensity, which ranking needs to predict
alongside relative order. Second, softmax's noise robustness assumes a stable
vocabulary; recommendation vocabularies are non-stationary and streaming.

On synthetic streaming data over a non-stationary vocabulary, the softmax
ablation scores HR@10 .0617 against .0893 for pointwise attention (Table 2) —
the gap the paper describes as up to 44.7%. Layer norm after pointwise pooling
is required for stable training.

## Results

| Dataset | Metric | SASRec | HSTU | HSTU-large |
| --- | --- | --- | --- | --- |
| ML-1M | NDCG@10 | .1603 | .1720 (+7.3%) | .1893 (+18.1%) |
| ML-20M | NDCG@10 | .1621 | .1878 (+15.9%) | .2106 (+30.0%) |
| Books | NDCG@10 | .0156 | .0219 (+40.6%) | .0257 (+65.8%) |

All from Table 4, multi-pass full-shuffle settings, against the best SASRec
recipe. The headline "65.8%" is the Books NDCG@10 case — the largest cell in
the table, on the sparsest dataset, at the largest model size.

In production streaming settings the deltas are far smaller and arguably more
meaningful: ranking normalized entropy .4982 → .4845, and +12.4% on the main
engagement event in an online A/B test (Tables 6–7).

## The systems half

Three tricks do the scaling work, and they matter more than the attention
change for anyone trying to reproduce this.

| Technique | Problem | Effect |
| --- | --- | --- |
| Stochastic Length | Encoder cost grows as Θ(Σnᵢ²) | Samples subsequences, exploiting temporal repetition in user histories |
| Fused design | Activation memory dominates at large batch | Linear layers outside attention cut from six to two |
| M-FALCON | Scoring m candidates costs O(bₘn²d) | Amortizes to O(n²d) via shared masks and KV caching |

M-FALCON is the one to steal: it's what makes a target-aware cross-attention
model affordable at ranking-stage candidate counts — the paper reports serving a
285x more complex model at 1.5–3x throughput on a constant inference budget.

---
title: "Evaluating RAG beyond vibes"
date: 2026-08-14
summary: "A retrieval pipeline that feels good in a demo and a retrieval pipeline that works are different objects. Here's the eval harness I keep rebuilding."
tags: [rag, evals]
---

Every retrieval system I've shipped has gone through the same arc: the demo is
magic, the first real user query is embarrassing, and nobody can say whether the
fix helped. The cure is an eval set built *before* the tuning starts.

## Split the metric in two

Retrieval failures and generation failures need separate numbers, or you'll
spend a week tuning a prompt to compensate for a chunker.

- **Retrieval:** recall@k against a labeled set of (question, supporting chunk)
  pairs. If the right chunk isn't in the context, nothing downstream matters.
- **Generation:** faithfulness — does every claim in the answer trace to a
  retrieved chunk? Graded by an LLM judge with the chunks in the prompt.

## Build the eval set from real traffic

Fifty questions pulled from actual logs beats five hundred synthetic ones. Label
them once, by hand. Re-label quarterly as the corpus drifts.

## Things that moved the number

| Change | Recall@10 |
| --- | --- |
| Naive fixed-size chunks | baseline |
| Chunk on document structure | +8 pts |
| Hybrid BM25 + dense | +11 pts |
| Cross-encoder rerank on top 50 | +6 pts |

Reranking was the cheapest win by a wide margin, and the easiest to roll back.

> Replace this note with your own — it's here as a shape to write into.

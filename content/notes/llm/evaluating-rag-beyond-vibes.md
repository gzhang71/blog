---
title: "Evaluating RAG beyond vibes"
date: 2026-08-14
summary: "Retrieval failures and generation failures need separate numbers. Measuring them together is why RAG tuning stalls."
tags: [rag, evals]
---

Score retrieval and generation separately. A single end-to-end quality number
can't tell you whether the answer was wrong because the right chunk never made
it into the context or because the model ignored it, and those have opposite
fixes. Most stalled RAG projects are stalled on exactly this ambiguity.

## The two metrics

| Layer | Question it answers | Metric | Needs |
| --- | --- | --- | --- |
| Retrieval | Was the supporting evidence in the context at all? | recall@k, MRR | Labeled (query, supporting chunk) pairs |
| Generation | Does every claim trace to retrieved text? | Faithfulness / groundedness | An LLM judge given answer + chunks |

Retrieval sets the ceiling. No prompt recovers a chunk that was never
retrieved, so when recall@k is low, work there and ignore generation entirely
until it isn't.

## Building the eval set

Pull queries from real traffic rather than generating them. Synthetic questions
are drawn from the same distribution as the documents, which flatters retrieval
in a way production queries never do — real users are vaguer, use different
vocabulary, and ask things the corpus doesn't answer.

A few dozen hand-labeled queries is enough to detect the regressions that
matter. Include queries the corpus genuinely can't answer: a system that
confidently cites something for an unanswerable question is a failure mode you
won't see otherwise.

Re-label as the corpus drifts. An eval set frozen against a corpus that has
moved on measures nothing.

## Interventions, and what each one fixes

| Change | Fixes | Cost |
| --- | --- | --- |
| Chunk on document structure instead of fixed tokens | Chunks that split a claim from its qualifier | Cheap, one-off |
| Hybrid BM25 + dense, fused with RRF | Queries with rare exact terms — IDs, error codes, proper nouns | Second index to maintain |
| Cross-encoder rerank over the top ~50 | Right chunk retrieved but ranked below the cutoff | Latency per query |
| Query rewriting / decomposition | Multi-hop and conversational queries | Extra model call, added latency |
| Metadata filters before search | Retrieving the right content from the wrong document version or tenant | Requires clean metadata |

Reranking is usually the first thing to try: it's additive, needs no reindexing,
and reverts cleanly. Whether it's worth its latency on a specific corpus is an
empirical question — measure it on your own labeled set rather than trusting a
number from someone else's.

Tooling worth knowing: Ragas and TruLens for scaffolding, and any
cross-encoder reranker (bge-reranker, Cohere Rerank) for the rerank stage.

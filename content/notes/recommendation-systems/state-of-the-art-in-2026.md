---
title: "What state of the art actually means in recommenders right now"
date: 2026-09-12
summary: "The two-stage retrieve-then-rank stack still runs most of the internet, but the frontier has moved to one sequence model that does both. What changed, and what didn't."
tags: [architecture, ranking]
---

The honest answer: state of the art and production practice have split. The
frontier is a single large sequence model that consumes a user's raw action
history and emits recommendations directly. Almost every system actually
serving traffic still runs the four-stage funnel below. Both statements are
true, and the gap between them is a few years wide.

## The stack most systems still run

| Stage | Job | What's standard now |
| --- | --- | --- |
| Candidate generation | ~10⁸ items → ~10³ | Two-tower encoders, ANN index (HNSW, ScaNN), plus non-learned sources: recent, trending, same-author |
| Filtering | drop the ineligible | Business rules, dedup, already-seen, region and rights |
| Ranking | ~10³ → ~10² | DLRM-style feature-crossing nets (DCN-v2), multi-task heads (MMoE) predicting click, dwell, like, complete |
| Re-ranking | ~10² → the slate | Diversity, calibration, exploration, freshness, policy constraints |

Most reported wins land in ranking and re-ranking. The retrieval stage is where
the ceiling actually lives, because nothing downstream can recover an item that
was never a candidate.

## What changed

Three things, all pointing the same direction.

**Sequence models became the ranker.** Transformers over user action history —
the lineage from SASRec and BERT4Rec through PinnerFormer — stopped being a
research curiosity and became the main architecture. The user is a sequence,
not a bag of features.

**Item IDs got replaced by semantic IDs.** Instead of one embedding per item,
quantize item content into a short sequence of discrete codes (RQ-VAE, as in
TIGER). The recommender then *generates* the code sequence of the next item
rather than scoring candidates against it. Cold-start stops being a special
case, because a new item already has codes.

**Recsys got scaling laws.** Meta's HSTU work ("Actions Speak Louder than
Words") showed that generative recommenders keep improving with scale in a way
the feature-engineered DLRM generation did not. That result is why the frontier
is now "make the sequence model bigger" instead of "add another cross feature".

<svg viewBox="0 0 720 160" width="100%" role="img" aria-label="Classic four-stage funnel compared with a single generative sequence model" style="max-width:100%;height:auto;margin:1.5rem 0">
  <defs>
    <marker id="ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M0,0 L10,5 L0,10 z" fill="var(--text-faint)"/>
    </marker>
  </defs>
  <g font-family="var(--mono)" font-size="11" fill="var(--text-faint)" letter-spacing="0.08em">
    <text x="0" y="10">CLASSIC FUNNEL</text>
    <text x="0" y="96">GENERATIVE</text>
  </g>
  <g fill="var(--bg-sunken)" stroke="var(--border-strong)" rx="7">
    <rect x="0" y="20" width="126" height="34" rx="7"/>
    <rect x="148" y="20" width="126" height="34" rx="7"/>
    <rect x="296" y="20" width="126" height="34" rx="7"/>
    <rect x="444" y="20" width="126" height="34" rx="7"/>
    <rect x="592" y="20" width="126" height="34" rx="7" fill="var(--accent-soft)" stroke="var(--accent)"/>
    <rect x="0" y="106" width="170" height="34" rx="7"/>
    <rect x="192" y="106" width="170" height="34" rx="7"/>
    <rect x="384" y="106" width="170" height="34" rx="7"/>
    <rect x="576" y="106" width="142" height="34" rx="7" fill="var(--accent-soft)" stroke="var(--accent)"/>
  </g>
  <g font-family="var(--sans)" font-size="11.5" fill="var(--text)" text-anchor="middle">
    <text x="63" y="41">user features</text>
    <text x="211" y="41">two-tower</text>
    <text x="359" y="41">ANN index</text>
    <text x="507" y="41">DLRM ranker</text>
    <text x="655" y="41">slate</text>
    <text x="85" y="127">raw action sequence</text>
    <text x="277" y="127">sequence transducer</text>
    <text x="469" y="127">semantic ID decode</text>
    <text x="647" y="127">slate</text>
  </g>
  <g stroke="var(--text-faint)" stroke-width="1.5" marker-end="url(#ar)">
    <line x1="126" y1="37" x2="142" y2="37"/>
    <line x1="274" y1="37" x2="290" y2="37"/>
    <line x1="422" y1="37" x2="438" y2="37"/>
    <line x1="570" y1="37" x2="586" y2="37"/>
    <line x1="170" y1="123" x2="186" y2="123"/>
    <line x1="362" y1="123" x2="378" y2="123"/>
    <line x1="554" y1="123" x2="570" y2="123"/>
  </g>
</svg>

## What didn't change

| Still true | Why it survives every architecture |
| --- | --- |
| Feedback loops | The model's output is tomorrow's training data, whatever the model is |
| Exploration | A generative model is equally happy to be confidently stuck |
| Calibration | Ranking well and predicting probability well are different objectives |
| Latency budget | p99 in the tens of milliseconds is what actually rules out architectures |

An LLM in the loop is mostly earning its place upstream — content
understanding, tagging, cold-start embeddings, explanation text — not as the
thing ranking a thousand candidates under a 50ms budget.

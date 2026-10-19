---
title: "Recommendation carousels: modeling items, rows, and the whole page"
date: 2026-10-18
summary: "A carousel is a ranked row inside a ranked page. Retrieval, item ranking, row selection, and exposure modeling each solve a different part of the problem."
tags: [ranking, carousels, slate-recommendation, modeling]
---

A recommendation carousel is a horizontal collection of items, often with a theme or explanation: “Because you watched X,” “Popular nearby,” or “Continue watching.” A homepage may stack several carousels vertically while letting the user scroll within each row.

That creates two ranking problems immediately: which items belong in a row, and which rows belong on the page. Netflix's [personalized homepage article](https://netflixtechblog.com/learning-a-personalized-homepage-aa8ec670359a) describes the move from individual item ranking to assembling a coherent page, including row selection and presentation bias.

## Start with a two-dimensional action

```text
                         horizontal position →
row 1  Continue watching     [A] [B] [C] ...
row 2  Because you liked X   [D] [E] [F] ...
row 3  New this week         [G] [H] [I] ...
  ↓
vertical position
```

Here the system chooses a row theme, seed or explanation, item membership, item order, and page position. Two individually strong rows can create a poor page if both contain the same items. Conversely, an item with a slightly lower isolated score may improve the page by covering a different user intent.

The following is my proposed baseline modeling approach, not a claim that one model architecture is standard everywhere.

## Match each decision to a model

| Decision | Reasonable starting approach | Training target or check |
| --- | --- | --- |
| Retrieve candidates | Two-tower embeddings, item similarity, or theme filters | Recall of useful eligible items |
| Rank items within a row | GBDT or neural multi-task ranker | Qualified engagement or conversion |
| Select and order rows | Row-level ranker with page/context features | Row utility at measured exposure |
| Assemble the page | Constrained greedy selection or slate reranker | Page utility, diversity, eligibility |

For “Because you liked X,” item-to-item retrieval can propose neighbors of X. A personalized ranker can then incorporate user history, item freshness, and current context. For “Continue watching,” the candidate generator is primarily the user's unfinished eligible items; forcing a semantic retrieval model into that row would solve the wrong problem.

For an item model, I would begin with a pointwise prediction of a defined useful action, such as a play lasting beyond a threshold. Features include user/item representations, row theme, seed affinity, device, and session context. A pairwise or listwise loss may improve within-row ordering, but it does not automatically optimize row choice or page diversity.

## Row scores need their own semantics

Taking the maximum item score as a row score ignores depth and duplication. Summing scores can favor rows containing many nearly interchangeable items. As a first engineered baseline, I would use top-item score summaries, theme affinity, freshness, and overlap with already selected rows, then train a row-level model once exposure logs are trustworthy.

Suppose row A offers five similar action movies, while row B offers three documentaries relevant to another demonstrated interest. If A is selected first, the marginal value of another action-heavy row may fall. A greedy assembly objective could be:

```text
incremental value(row | selected page)
    = predicted useful engagement
    - duplication penalty
    - redundancy penalty
```

This is a heuristic objective. Tune its penalties with measured outcomes and product constraints; do not present the sum as a calibrated probability. Enforce hard rules such as item eligibility and row-theme consistency outside the learned score.

## Exposure is part of the label

A row returned by the backend may never enter the viewport. An item in horizontal position 20 may never be scrolled into view. Treating all returned items as exposed negatives teaches the model that unseen inventory was rejected.

Carousel-specific research studies how users navigate rows and items and how click models can account for that behavior. A flat-list position model can miss the two-dimensional browsing structure. [Understanding User Behavior in Carousel Recommendation Systems](https://arxiv.org/abs/2307.01866).

I would log a page request ID, policy version, selected rows, item coordinates, viewport visibility with a defined dwell rule, horizontal navigation, and attributed outcomes. Distinguish selection from examination. A non-click after measured visibility is still an imperfect preference signal, but it is more interpretable than a non-click on an item never displayed.

Position correction needs identifiable exposure or propensity estimates and sufficient support. Weighting by an arbitrary inverse row number is not a valid debiasing method. Exploration must obey eligibility and experience constraints; randomizing a limited row boundary can be safer and more statistically useful than unrestricted whole-page randomization.

## When slate models or reinforcement learning become useful

If interactions dominate, a context-aware reranker can condition on the selected set. If the objective is long-term behavior, sequential decision modeling may become relevant. SlateQ studies a tractable decomposition of slate value under user-choice assumptions; it is not a guarantee that item scores always add up to the right page value. [Google Research paper](https://research.google/pubs/reinforcement-learning-for-slate-based-recommender-systems-a-tractable-decomposition-and-practical-methodology/).

I would add that complexity only after defining rewards, exposure logging, and a credible evaluation path. A row-level contextual bandit may be a simpler exploration step than full-page RL.

## Evaluate the hierarchy

Measure retrieval recall, within-row ranking, row engagement conditional on exposure, and page/session outcomes separately. Offline replay cannot reliably value a new page policy when the logs contain no support for its choices. An online experiment should include page-level success, quality of engagement, latency, duplicate exposure, and diversity or coverage guardrails.

A carousel is therefore a UI structure with a corresponding hierarchy of decisions. Start with strong item and row baselines, log what users could actually see, and introduce joint page modeling when isolated ranking leaves a measurable gap.

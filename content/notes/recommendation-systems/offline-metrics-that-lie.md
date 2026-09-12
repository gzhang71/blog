---
title: "Offline metrics that lie"
date: 2026-06-18
summary: "Offline ranking evaluation is counterfactual estimation in disguise. The logged data only describes what the incumbent model chose to show."
tags: [ranking, metrics]
---

Offline replay measures how well a new model reproduces the old model's
choices, not how well it would have served users. Every item the incumbent
never showed has no label, so the evaluation is blind exactly where a genuinely
better model differs most.

## Three biases, and the correction for each

| Bias | What it does | Correction |
| --- | --- | --- |
| Position | Clicks concentrate at the top regardless of relevance | Inverse propensity weighting by the logged position |
| Exposure | Unshown items have no labels — missing, not negative | Treat as missing; sample negatives deliberately |
| Popularity feedback | Model output becomes tomorrow's training data | Track catalog coverage and tail share alongside accuracy |

Position bias is the one that quietly rewards the incumbent: uncorrected, a
model that reproduces the current ranking scores well by construction.

## The metrics disagree with each other

| Metric | Measures | Blind to |
| --- | --- | --- |
| NDCG / MAP | Ordering quality | Calibration, diversity, whether anything new surfaces |
| Recall@k | Did retrieval include it | Where in the list it landed |
| Log loss / AUC | Probability quality | Ordering at the top of the list, which is all users see |
| Coverage / entropy | Catalog health | Whether recommendations are any good |

NDCG improving while engagement drops is the canonical symptom, and usually
means the model got better at reproducing logged behavior while collapsing
diversity. Ranking metrics and calibration metrics are not substitutes:
optimizing rank order alone degrades predicted probabilities, which matters as
soon as a downstream stage (ads pricing, blending, thresholds) consumes them.

## What makes offline numbers trustworthy

A small always-on randomized bucket — one or two percent of traffic served
uniformly at random — produces unbiased logged data. Off-policy estimators
(IPS, doubly robust) then have a clean slice to estimate against, and it gives
every item some exposure, which keeps the tail from disappearing from training
data entirely.

It costs a slice of traffic permanently. Systems that skip it end up unable to
evaluate any model that would behave meaningfully differently from the one
already running.

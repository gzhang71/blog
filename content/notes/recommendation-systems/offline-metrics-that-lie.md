---
title: "Offline metrics that lie"
date: 2026-06-18
summary: "NDCG went up nine percent and engagement went down. What the offline replay was hiding."
tags: [ranking, metrics]
---

Offline evaluation of a recommender is counterfactual estimation wearing a
costume. The logged data only tells you about items the *old* model showed.

## The three biases I check first

1. **Position bias** — clicks concentrate at the top regardless of relevance.
   Correct with an inverse-propensity weight, or you'll keep rewarding whatever
   the incumbent already ranked first.
2. **Exposure bias** — items never shown have no labels. They aren't negatives;
   they're missing.
3. **Popularity feedback** — the model's own output becomes tomorrow's training
   data. Measure catalog coverage alongside accuracy or the tail dies quietly.

## What I actually trust

A small, always-on randomized exploration bucket. One or two percent of traffic
with uniform sampling gives an unbiased slice to evaluate against, and it pays
for itself the first time it catches a regression the replay missed.

> Replace this note with your own.

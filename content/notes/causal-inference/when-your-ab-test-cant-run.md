---
title: "When your A/B test can't run"
date: 2026-07-02
summary: "Network effects, regulatory blocks, and one-way launches. The quasi-experimental ladder I climb when randomization is off the table."
tags: [causal, experiments]
---

Randomization is the cleanest tool, and often the one you can't use. A ranked
list of what I try next, best to worst.

## 1. Switchback / time-based randomization

If the interference is between users sharing a marketplace, randomize *time
buckets* instead of users. Cheap to run, and the analysis is still close to a
plain difference in means.

## 2. Synthetic control

Build a weighted combination of untreated units that tracks the treated unit's
pre-period, then read the post-period gap. Strong when you have one treated
market and many candidate donors.

## 3. Difference-in-differences

Works when parallel trends is plausible — and you should *show* it, with a plot
of the pre-period, not assert it.

## 4. Instrumental variables

The last resort. The exclusion restriction is untestable, so the whole estimate
rests on an argument, not on data. Write that argument down explicitly.

> Replace this note with your own.

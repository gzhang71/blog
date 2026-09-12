---
title: "When your A/B test can't run"
date: 2026-07-02
summary: "Interference, one-way launches, and regulatory blocks all break randomization. The quasi-experimental ladder, ordered by how much the estimate rests on an untestable assumption."
tags: [causal, experiments]
---

When randomization is unavailable, the ordering that matters isn't statistical
sophistication — it's how much of the estimate rests on an assumption you can
check. Prefer the method whose assumption is testable, even if the estimator is
cruder.

## The ladder

| Method | Core assumption | Testable? | Fits |
| --- | --- | --- | --- |
| Switchback / time randomization | No carryover between periods | Partly — vary period length | Marketplaces, shared supply |
| Cluster randomization | Interference stays inside clusters | Partly — check cross-cluster edges | Social graphs, geo effects |
| Difference-in-differences | Parallel trends absent treatment | Partly — inspect pre-period | A staggered or regional rollout |
| Synthetic control | Donor pool reconstructs the treated unit | Partly — pre-period fit | One treated market, many controls |
| Regression discontinuity | No manipulation around the cutoff | Partly — density test at cutoff | Threshold-based eligibility |
| Instrumental variables | Exclusion restriction | **No** | Last resort |

The "partly testable" column is the whole point. Parallel trends can't be
proven, but a pre-period plot that visibly diverges refutes it. Synthetic
control's pre-period fit is directly observable. The exclusion restriction has
no empirical analogue at all — an IV estimate is an argument, so write the
argument down where readers can attack it.

## Interference is the usual culprit

The reason randomization fails is most often SUTVA violation, not access:
treating one user changes another's experience through shared inventory, a
ranking model, or a social feed. Splitting users then contaminates both arms,
and the measured effect shrinks toward zero. Switchbacks and cluster
randomization attack that directly by moving the unit of randomization to
something that doesn't leak.

## Before reaching for any of it

Two cheaper moves solve a surprising share of "we can't randomize" cases:
randomize at a coarser unit (store, city, cohort) rather than abandoning
randomization, or stage the rollout so the untreated regions become a control
group by construction. Variance reduction on whatever experiment you can run —
CUPED using pre-period outcomes — often beats a more elaborate design on a
smaller sample.

For the methods themselves, Abadie's synthetic control work and the
Callaway–Sant'Anna treatment of staggered DiD are the standard references;
naive two-way fixed effects with staggered adoption is a known trap.

---
title: "The three-statement sanity check"
date: 2026-05-21
summary: "Four checks that decide whether a financial model is auditable. None of them ask whether the forecast is right."
tags: [forecasting, modeling]
---

A model is auditable when a reader can find every assumption, change one, and
watch the consequence propagate correctly. That property is independent of
whether the forecast turns out to be accurate, and it's the only one you can
verify before the fact.

## The four checks

| Check | Test | Failure means |
| --- | --- | --- |
| Balance sheet balances | Assets − (liabilities + equity) = 0, **every** projected period | A plug is hiding somewhere, or an entry hit one statement only |
| Cash ties out | Closing cash on the BS = ending cash on the CFS | The cash flow statement isn't actually derived from the other two |
| No hardcodes in formulas | No numeric literals outside the assumptions block | Someone will change an input and the output won't move |
| Circularity is deliberate | Interest-on-average-debt loops are known and controlled | Iterative calc silently masking a broken link |

Put the balance check in a visible row at the top of every sheet, not in a
diagnostics tab. A check nobody sees is a check nobody runs.

## Structure that makes the checks possible

Separate inputs, calculations, and outputs — conventionally by color, with
inputs in one block. The rule that does the real work: an assumption appears
exactly once in the workbook, and everything else references that cell.
Duplicated assumptions are the most common source of models that stop
balancing after an edit.

Keep one row per driver rather than folding several into a formula. Revenue as
`volume × price` beats a single growth rate, because the two components can be
argued about separately and sanity-checked against different sources.

## Presenting the output

A single point estimate invites an argument about that number. A two-way
sensitivity table over the two drivers the result is most elastic to moves the
conversation to which region of outcomes is plausible, which is the useful
conversation.

Choose those two drivers by elasticity, not by which are easiest to vary —
flexing a driver the output barely responds to produces a table that looks
rigorous and says nothing. And label the base case honestly: a base case that
requires every driver to break favorably is an upside case.

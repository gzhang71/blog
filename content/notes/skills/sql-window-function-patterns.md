---
title: "Four SQL window function patterns"
date: 2026-04-09
summary: "Dedupe, sessionize, running totals, and period-over-period — the patterns that replace most analytical self-joins."
tags: [sql]
---

Four patterns cover the majority of analytical SQL that would otherwise be
written as a correlated subquery or a self-join. All four are single-pass over
a sorted partition, which is why they're also faster.

| Need | Function | Pattern |
| --- | --- | --- |
| Latest row per key | `row_number()` | Filter on `rn = 1` in an outer query |
| Sessionize by gap | `lag()` + `sum()` | Flag gaps, then cumulative-sum the flags |
| Running total | `sum() over (order by …)` | Explicit frame clause |
| Period over period | `lag(x, n)` | Offset within the partition |

## Latest row per key

```sql
select *
from (
  select *,
         row_number() over (
           partition by user_id
           order by updated_at desc
         ) as rn
  from events
) t
where rn = 1;
```

Use `rank()` instead of `row_number()` only when ties should all survive.
`row_number()` picks one arbitrarily on a tie, so add a deterministic
tiebreaker to the `order by` if reproducibility matters.

## Sessionize by a gap threshold

```sql
select *,
       sum(new_session) over (
         partition by user_id order by ts
       ) as session_id
from (
  select *,
         case when ts - lag(ts) over (partition by user_id order by ts)
                   > interval '30 minutes'
              then 1 else 0 end as new_session
  from events
) t;
```

The cumulative sum of a boundary flag is the general trick for grouping
consecutive rows — it works for any "start a new group when X" rule, not just
time gaps.

## Running total, and the frame that bites

```sql
sum(amount) over (
  order by d
  rows between unbounded preceding and current row
)
```

Write the frame explicitly. The default frame is `range between unbounded
preceding and current row`, and `range` includes **all peer rows with the same
sort value** — so with duplicate dates, the default silently returns the total
through the end of each date rather than through each row. This is the most
common window function bug.

## Period over period

```sql
select d,
       revenue,
       revenue - lag(revenue, 7) over (order by d) as wow_change
from daily;
```

`lag` over a gap-free date series only. If dates can be missing, join against a
generated calendar first, or the offset silently spans the wrong interval.

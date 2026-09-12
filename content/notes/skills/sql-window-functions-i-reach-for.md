---
title: "SQL window functions I reach for"
date: 2026-04-09
summary: "Deduping, sessionization, and running totals — the four patterns that cover most of what I write."
tags: [sql]
---

## Dedupe to the latest row per key

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

## Running total and period-over-period

`sum(x) over (order by d rows between unbounded preceding and current row)` for
the cumulative line; `lag(x, 7) over (order by d)` for week-over-week. Both
cheaper than the self-join people reach for first.

> Replace this note with your own.

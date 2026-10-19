---
title: "Designing QueryGPT: a study note on Uber's text-to-SQL system"
date: 2026-10-18
summary: "Study intent routing, table selection, column pruning, and evaluation, then work through a concrete design extension with explicit business semantics."
tags: [text-to-sql, rag, agents, system-design]
---

A text-to-SQL system has to translate both language and business meaning. “Completed trips yesterday” is not just a `SELECT`: it requires a dataset, a completion definition, a time zone, a grain, and possibly joins. The most useful design question is where to resolve each ambiguity before SQL generation.

## What Uber's article describes

This section summarizes Uber's September 19, 2024 article, [QueryGPT – Natural Language to SQL Using Generative AI](https://www.uber.com/in/en/blog/query-gpt/), rather than making claims about its current deployment.

The initial prototype retrieved schemas and example SQL with similarity search, then generated a query and explanation. Relevance declined as the catalog grew, and large schemas created context pressure.

The later design introduces curated business-domain workspaces. An intent agent routes the question to workspaces; a table agent proposes tables for user confirmation or correction; a column-pruning agent reduces schema context before generation.

Uber evaluates intent, table overlap, execution success, nonempty output, and qualitative SQL similarity against manually curated questions. Its decoupled flow supplies correct intent and datasets to downstream generation, helping separate retrieval errors from generation errors. The article also reports unresolved hallucinations; a recursive validation agent is discussed as an experiment, not an established guarantee. [Source architecture and evaluation](https://www.uber.com/in/en/blog/query-gpt/).

## My interpretation: make uncertainty smaller at each boundary

The rest of this note is my design analysis and proposed extension, not additional reporting about Uber's implementation.

I would model the pipeline as typed intermediate records:

```text
question → semantic intent → candidate tables → required schema
                                                      |
                       reviewed SQL ← validation ← SQL generation
```

For a synthetic question, “How many completed Seattle trips did Tesla vehicles make yesterday?”, an intent record might be:

```json
{
  "metric": "completed_trip_count",
  "grain": "trip",
  "city": "Seattle",
  "vehicle_make": "Tesla",
  "time_window": "previous_calendar_day",
  "time_zone": "America/Los_Angeles",
  "unresolved": ["Should vehicle make use trip-time or current metadata?"]
}
```

If a business glossary supplies the time-zone convention, store that provenance. If it does not, ask for clarification rather than silently turning “yesterday” into an arbitrary UTC interval.

## Build the smallest sufficient schema

Suppose this hypothetical warehouse has:

```text
fact_trip(trip_id, city_id, vehicle_id, completed_at, status, ds)
dim_city(city_id, city_name)
dim_vehicle(vehicle_id, make)
```

An incorrect pruning strategy keeps only columns mentioned in the question. It can delete `city_id` or `vehicle_id`, making correct joins impossible. I would preserve join keys, partition filters, and time semantics alongside selected output/filter columns.

The toy schema also hides an assumption: `dim_vehicle` has exactly one row per vehicle and the make is stable. A slowly changing dimension would need effective-time predicates. Duplicated dimension keys can multiply trip counts while the SQL still runs successfully.

This suggests schema metadata beyond column descriptions: unique keys, relationship cardinalities, event timestamps, business-state values, and approved metric definitions. Retrieval should identify a semantic contract, not merely a table with plausible names.

## Generate a query with inspectable assumptions

For this toy schema, assume a UTC `completed_at`, a local-day definition in Los Angeles, and Trino-style SQL. For a local day of October 17, 2026:

```sql
select count(*) as completed_trip_count
from fact_trip t
join dim_city c on t.city_id = c.city_id
join dim_vehicle v on t.vehicle_id = v.vehicle_id
where t.status = 'completed'
  and c.city_name = 'Seattle'
  and v.make = 'Tesla'
  and t.completed_at >= timestamp '2026-10-17 07:00:00 UTC'
  and t.completed_at <  timestamp '2026-10-18 07:00:00 UTC'
  and t.ds in ('2026-10-17', '2026-10-18');
```

These are illustrative tables, values, and partition conventions, not Uber schema details. The partition restriction assumes `ds` represents the UTC date of completion; another partition definition requires another bound. Compute local-day boundaries with a timezone library in production, since daylight-saving transitions make fixed UTC offsets unsafe.

Prefer half-open time intervals so adjacent daily windows do not double-count the boundary. Explain whether the count is by completion time or request time, and whether the dimensions are unique. Those assumptions are more valuable to a reviewer than a paraphrase of SQL syntax.

## Validate semantics in addition to syntax

My extension would put permission checks and SQL policy outside the model: identity-scoped catalog access, parsed statement validation, allowlisted execution capability, bounded query resources, and a review boundary appropriate to the product. A string-prefix check for `SELECT` is not a SQL permission system.

A dry run can catch unknown columns or expensive scans. It cannot prove the correct denominator, date, or business state. Likewise, nonempty output is not correctness: `count(*)` commonly returns one row even when zero trips match, while a valid grouped query may legitimately return no rows.

I would build counterexample fixtures: duplicate dimension keys, a trip at local midnight, canceled trips with a completion-like timestamp, and a vehicle record updated after the trip. Compare result sets on those fixtures and inspect query logic. Two different wrong queries can match on a dataset lacking the edge case.

Finally, log errors by stage: wrong domain, missing table, pruned join key, invalid SQL, and incorrect metric semantics. Use the same questions with correct intermediate inputs to identify which stage actually needs work. The existing [RAG evaluation note](/notes/llm/evaluating-rag-beyond-vibes) gives the general motivation for keeping retrieval and generation measurements separate.

---
title: "Data medallion architecture: bronze, silver, and gold"
date: 2026-10-18
summary: "Use layers to define replay, cleaning, and business contracts—not just three folders—and follow an order event through corrections and aggregation."
tags: [data-engineering, lakehouse, sql]
---

The standard names are bronze, silver, and gold. The useful distinction is what each layer promises its consumers: a record of what arrived, a trusted reusable representation, and a product with an explicit business meaning.

Databricks describes medallion architecture as progressive refinement: bronze retains source data, silver validates and cleans it, and gold serves business-oriented datasets. It is a design pattern within a lakehouse, not the definition of a lakehouse or a requirement to materialize exactly three copies of everything. [Architecture overview](https://developers.databricks.com/perspectives/what-is-the-medallion-architecture-in-a-modern-data-lakehouse) and [layer guidance](https://docs.databricks.com/aws/en/lakehouse/medallion).

## Give each layer a contract

| Layer | Primary promise | Example grain | Consumer |
| --- | --- | --- | --- |
| Bronze | Preserve source evidence for replay | One received event | Ingestion/debugging jobs |
| Silver | Apply shared typing and quality rules | One valid order version | Analysts and downstream pipelines |
| Gold | Publish a defined business dataset | One day/city/currency total | Reporting or an ML feature job |

The rest of this note uses a proposed order-processing design. The details are examples, not a requirement of a particular vendor.

## Bronze: what actually arrived?

Suppose an order source sends updates out of order and sometimes redelivers them. A bronze record might contain:

```json
{
  "source": "orders-cdc",
  "source_offset": "partition-3:1042",
  "ingested_at": "2026-10-18T01:04:00Z",
  "payload": {
    "order_id": "o-7",
    "version": 2,
    "status": "completed",
    "city": "Seattle",
    "amount_minor": 2500,
    "currency": "USD",
    "completed_at": "2026-10-18T00:55:00Z"
  }
}
```

Preserve source offsets or equivalent identities, ingestion time, source version, and schema metadata. Transport deduplication prevents the same offset being ingested twice if that is the contract; business deduplication is a separate question. Two distinct events can describe the same order.

Replayable does not mean retained forever. Access, retention, and deletion rules still apply. If downstream reconstruction depends on bronze history, document how much history remains available and how deletions propagate.

## Silver: what is the trusted representation?

I would validate identifiers, parse timestamps, normalize status values using documented mappings, and separate invalid records into a visible quarantine path. “No missing rows” is not an achievable quality promise if malformed records are silently dropped.

For a current-state silver table, the key could be `order_id`, with the newest source version winning. A history table instead has an order/version grain. Both can be useful; neither should be inferred from a table name alone.

This illustrative SQL selects current versions from an already parsed and validated staging relation:

```sql
with ranked as (
  select *,
         row_number() over (
           partition by order_id
           order by version desc, source_sequence desc
         ) as rn
  from valid_order_versions
)
select order_id, version, status, city, amount_minor, currency, completed_at
from ranked
where rn = 1;
```

`source_sequence` must be a trustworthy tie-breaker. An ingestion timestamp alone says when this system saw an update, not necessarily which source state is newer. For deletes, preserve tombstones or apply a defined deletion rule rather than resurrecting an older version during replay.

## Gold: what does the number mean?

A finance-oriented gold table might expose completed order value by local completion day, city, and currency. Calling it “revenue” would require additional decisions about taxes, refunds, discounts, and accounting recognition.

```sql
select local_completion_date,
       city,
       currency,
       count(*) as completed_orders,
       sum(amount_minor) as completed_order_value_minor
from silver_orders_current
where status = 'completed'
group by local_completion_date, city, currency;
```

Keep currencies separate unless a documented conversion policy is part of the product. Specify the time zone used to compute `local_completion_date`. Define whether later corrections restate previous days. Gold can also contain detailed business entities or feature tables; aggregation is common, not mandatory.

## Late updates expose the real architecture

Imagine version 3 arrives tomorrow and changes an order from completed to canceled. Appending tomorrow's completed totals is insufficient: yesterday's count may need to decrease. The pipeline needs enough lineage to identify affected output partitions and recompute or update them consistently.

For a small daily table, recomputing affected days may be simpler than maintaining incremental arithmetic. For a large stream, stateful updates may be necessary. Either way, test replay idempotence: processing the same source range twice should produce the same final state, not double the totals.

My checks at each boundary would be concrete: bronze offset completeness and freshness, silver key uniqueness and quarantine rate, gold reconciliation and metric freshness. A green job status only establishes that code finished; it says little about those contracts.

## Medallion versus lakehouse versus data mesh

A data lake describes a storage approach; a lakehouse adds warehouse-like management capabilities to lake-oriented storage; medallion describes data refinement boundaries. Data mesh concerns ownership and data products. They address different architectural questions and can coexist.

Start with the contracts consumers need. A small stable workload may combine layers, while a regulated pipeline may require more explicit boundaries. Three color-coded folders do not create trustworthy data; documented grain, replay behavior, and metric ownership do.

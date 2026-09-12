# guoqingzhang.dev

Personal site — Next.js (App Router) + markdown content, deployed on Vercel.

```bash
npm install
npm run dev      # http://localhost:3000
npm run build
```

## Pages

| Route | What it is |
| --- | --- |
| `/` | Hero, tracked links (resume / LinkedIn / GitHub), note categories, recent notes, life preview |
| `/notes` | All categories + a full chronological list |
| `/notes/<category>` | One category |
| `/notes/<category>/<slug>` | A note |
| `/life`, `/life/<slug>` | Personal Life |
| `/stats` | Click-trend dashboard |

## Adding a note

Drop a markdown file in `content/notes/<category>/`:

```markdown
---
title: "Title of the note"
date: 2026-09-12
summary: "One or two lines shown in the list."
tags: [rag, evals]
draft: false        # omit or false to publish
---

Body in markdown. GFM tables, code fences, and footnote-free prose all render.
```

That's the whole step — the category page, the index, the home page and the
static routes all pick it up on the next build.

## Adding a category

Make a folder under `content/notes/`. The folder name is the URL slug. Add an
optional `_meta.json` to control how it's presented:

```json
{ "title": "Time Series", "order": 7, "blurb": "One line for the category card." }
```

Without `_meta.json` the title is derived from the slug and it sorts last.

Personal Life posts work the same way, as flat files in `content/life/`, with
`title`, `date`, `summary` and an optional `location`.

## Click tracking

Every outbound link renders through `components/TrackedLink.tsx`, which fires a
`sendBeacon` to `POST /api/track` with a stable `target` id (`resume`,
`linkedin`, `github` — set in `lib/site.ts`). The route increments two counters:

```
clicks:<target>:total
clicks:<target>:<YYYY-MM-DD>     # UTC day bucket
```

`GET /api/stats?days=30` reads the window back and `/stats` charts it. No
cookies, no visitor identifiers, nothing that identifies a person — just counts.

To track something new, render it with `TrackedLink` and give it a `track` id
(lowercase letters, digits, `-`/`_`). It shows up on `/stats` after its first
click.

### Storage

`lib/store.ts` picks a backend at runtime:

- **Production** — Vercel KV / Upstash Redis, via the REST API. Set
  `KV_REST_API_URL` and `KV_REST_API_TOKEN` (or the `UPSTASH_REDIS_REST_*`
  equivalents). Attaching the store from the Vercel dashboard sets these for you.
- **No env vars** — falls back to `.data/clicks.json` on disk (gitignored). Good
  for local dev; on Vercel the filesystem is ephemeral, so counts would reset.

## Deploy

1. Push to GitHub.
2. Import the repo on Vercel — it detects Next.js, no config needed.
3. Storage → create an Upstash Redis / KV store → connect it to the project.
   Redeploy so the env vars land.

Without step 3 the site works fine; `/stats` just won't retain history.

---
name: write-note
description: Draft or revise a technical Note for this site (content/notes/<category>/*.md). Use whenever the user wants to add, write, expand, or edit a note, publish a draft, or start a new note category. Enforces the house style - one idea per note, dense with tables and figures, no filler.
---

# Writing a Note

Notes are working reference material, not essays. Someone lands on one from a
search, needs a specific answer, and leaves. Write for that person.

## Before writing

1. Read 2-3 existing notes in the target category to match voice and depth.
2. Confirm the category exists: `ls content/notes/`. If it doesn't, create the
   folder and a `_meta.json` (`title`, `order`, `blurb`).
3. Ask the user for the actual content if you don't have it. **Never invent
   technical claims, benchmark numbers, or results.** A note with fabricated
   numbers is worse than no note.

## File

`content/notes/<category>/<kebab-case-slug>.md`

```markdown
---
title: "Sentence case, specific, no colon-subtitle"
date: YYYY-MM-DD
summary: "One or two lines. What the reader learns, not what the note is about."
tags: [two, maybe-three]
draft: false
---
```

Set `draft: true` to keep it out of the build while you work.

## The rules

**One note, one thing.** If the note needs the word "also" at the top level,
it's two notes. Split it. A note answering "how do I pick a chunking strategy"
must not drift into eval harnesses.

**Lead with the answer.** First paragraph states the conclusion. No throat
clearing, no "in this post we will explore", no history of the field. The
reader can scroll up for context if they want it; they can't scroll past
preamble to find the answer.

**Target 200-500 words of prose.** Tables and code don't count against that.
If prose runs past 600 words, you are explaining something that wants to be a
table.

**Reach for a table or a figure first.** Anything with more than two
dimensions - options compared across criteria, before/after, parameter sweeps,
tradeoffs, decision rules - is a table, not paragraphs. Comparisons in prose
are unreadable and unskimmable.

| Prose that should have been a table | Why |
| --- | --- |
| "A is faster but uses more memory, while B is slower but..." | comparison across 2+ criteria |
| "At k=10 recall was 0.71, at k=20 it was 0.79, at k=50..." | a parameter sweep |
| "First check X, then if Y do Z, otherwise..." | a decision table |

For figures, inline SVG or a mermaid fence both render. Use one when the shape
of the thing is the point - a pipeline, a DAG, a distribution. Don't decorate;
if the figure doesn't carry information the text lacks, cut it.

**Code blocks must be runnable and minimal.** Real syntax, real function names,
no `...` standing in for the interesting part. Strip imports and setup unless
they're load-bearing. Always tag the language fence.

**Numbers need provenance.** State the dataset, the n, and the conditions, or
don't state the number. "Reranking added 6 points of recall@10" is only useful
with "on 300 labeled queries against our own corpus".

**Cut the conclusion.** Notes end when the information ends. No "in summary",
no "hopefully this helps", no restating what was just said.

## Voice

First person, past tense for things you did. Direct and specific. It's fine to
say something was a bad idea, or that you don't know why it worked.

Avoid: "leverage", "delve", "robust", "seamless", "it's worth noting that",
"in today's landscape", rhetorical questions as section headers, and any
sentence of the form "It's not just X - it's Y".

## After writing

- `npm run build` - catches frontmatter and markdown problems. Must pass.
- Check the note renders at `/notes/<category>/<slug>` and that its summary
  reads well in the list on `/notes`.
- Do not commit or deploy unless the user asks.

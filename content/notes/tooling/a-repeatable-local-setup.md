---
title: "A repeatable local setup"
date: 2026-03-12
summary: "Every environment problem I've had came from a machine nobody could rebuild. The short list that fixed it."
tags: [dev-env]
---

- **One Python per project**, pinned with `uv` and a committed lockfile. The
  interpreter version goes in the repo, not in my shell profile.
- **`make dev` works on a fresh clone.** If onboarding needs a wiki page, the
  Makefile is incomplete.
- **Secrets from the environment, never the repo** — a committed `.env.example`
  documents the shape without leaking the values.
- **Pre-commit hooks for formatting**, so no review ever spends a comment on
  whitespace.
- **Notebooks are drafts.** Anything that runs twice moves into a module with a
  test.

> Replace this note with your own.

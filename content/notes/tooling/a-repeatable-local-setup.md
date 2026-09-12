---
title: "A repeatable local setup"
date: 2026-03-12
summary: "The test is whether a fresh clone runs in one command. Everything else in a dev-environment checklist follows from that."
tags: [dev-env]
---

The property worth optimizing for is reproducibility from a clean checkout: new
machine, `git clone`, one command, working environment. Every environment
problem that consumes an afternoon traces back to state that lives on one
machine and nowhere in the repo.

| Concern | In the repo | Not in the repo |
| --- | --- | --- |
| Interpreter version | `.python-version`, `.nvmrc`, or the lockfile | Whatever the shell profile happens to activate |
| Dependencies | A committed lockfile, exact pins | `pip install` run by hand |
| Setup steps | A Makefile or task runner | A wiki page, onboarding docs |
| Config shape | `.env.example`, checked in | `.env`, never committed |
| Formatting | Pre-commit hooks | Review comments about whitespace |

## One command

`make dev` — or whatever the equivalent is — should take a fresh clone to a
running state. If onboarding needs a document, the document is a list of steps
that belong in the task runner. This is also the only reliable test of the
whole setup: CI runs from a clean checkout every time, so a repo that
bootstraps in one command is one that CI can build.

## Pin the interpreter, not just the packages

Lockfiles pin dependencies while leaving the runtime floating, and a package
resolved under a different Python or Node minor version can install different
wheels entirely. Tools like `uv`, `mise`, and `asdf` read a version file from
the repo, which puts the runtime under version control alongside everything
else.

## Secrets from the environment

Application code reads configuration from environment variables; a committed
`.env.example` documents which variables exist without carrying values. This
keeps credentials out of history and makes the same code run locally, in CI,
and in production with nothing but a different environment.

## Notebooks are drafts

Notebooks are good for exploration and bad as a unit of reuse: hidden execution
order, no meaningful diffs, no tests. Anything that runs a second time belongs
in a module with a test covering it. `nbstripout` as a pre-commit hook keeps
outputs out of diffs for the notebooks that remain.

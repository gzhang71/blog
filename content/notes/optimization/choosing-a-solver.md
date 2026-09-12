---
title: "Choosing between Gurobi, Knitro and CVXOPT"
date: 2026-09-12
summary: "Pick by problem class and by what 'solved' has to mean — global or local. Benchmark speed is the last question, not the first."
tags: [solvers, tooling]
---

The choice is made by the structure of your problem, not by solver benchmarks.
Get the problem class wrong and the fastest solver in the world either refuses
the model or returns a local optimum you mistake for the answer.

## What each one is for

| | Gurobi | Knitro | CVXOPT |
| --- | --- | --- | --- |
| Built for | LP / MIP, and integer structure generally | Smooth nonlinear (NLP, MINLP) | Convex cone programs |
| Handles | LP, QP, MIQP, SOCP, nonconvex quadratics, general nonlinear constraints, conic | NLP, MINLP, complementarity constraints, nonconvex NLP | LP, QP, SOCP, SDP, geometric programming |
| Integers | Yes — this is its core strength | Yes, via MINLP | Only through the optional GLPK/MOSEK interfaces |
| Guarantee | Global optimum for MIP and nonconvex quadratics | Local by default; multi-start and a global mode for some classes | Global, because convex |
| License | Commercial, free academic | Commercial, free academic/teaching | Open source, **GPL-3** |
| Interface | `gurobipy`, plus every modeling layer | Python/C/MATLAB/AMPL, algorithm-level control | Python; usually driven through CVXPY |

The received wisdom that "Gurobi can't do nonlinear" is out of date — it now
documents general nonlinear constraints as a first-class category alongside
simple and function constraints, and proves global optimality for nonconvex
quadratics.

## Pros and cons

**Gurobi.** Unmatched on mixed-integer models: presolve, cuts and heuristics are
where decades of work went, and a proven optimality gap is a real deliverable.
It's also the most operationally pleasant — good diagnostics, an IIS for
infeasible models, stable APIs. Against it: cost at commercial scale, and a
license server is a deployment dependency. For genuinely general nonlinear
work it's a newer entrant rather than the specialist.

**Knitro.** The specialist for large smooth nonlinear problems, with four
algorithms (two interior-point variants, active-set, SQP) you can switch
between when one stalls — that switch is the reason to own it. Handles
complementarity constraints, which most solvers won't touch. Against it:
commercial, less familiar, and its default answer is a *local* solution.
Reporting a local optimum as "the optimum" is the standard way to be wrong with
this class of solver.

**CVXOPT.** Free, small, dependency-light, and gives you SDP and geometric
programming that neither commercial solver targets. Best treated as a backend
under CVXPY rather than used directly. Against it: no meaningful MIP, weaker on
large sparse problems than commercial interior-point codes, and GPL-3 — which
is a genuine blocker for shipping closed-source products and the thing to check
before it's embedded.

## The decision

| If the problem is… | Use |
| --- | --- |
| Integer or combinatorial | Gurobi |
| Smooth, nonlinear, continuous, large | Knitro |
| Convex and you can express it as a cone program | CVXOPT (via CVXPY) |
| Nonconvex and you need a *proven* global optimum | Only tractable for specific classes — quadratics in Gurobi; otherwise reformulate or accept local |

Two checks worth running before optimizing anything: whether a convex
reformulation exists (it changes which column you're in), and whether your
"nonlinear" model is actually linearizable, since piecewise-linear approximation
plus a MIP solver often beats an NLP solver on a problem that was never smooth.

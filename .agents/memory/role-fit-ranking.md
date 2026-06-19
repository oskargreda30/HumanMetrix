---
name: Multi-candidate role-fit ranking
description: The rule that every candidate-ranking surface must follow the server hiring-band rank, not the displayed fit %.
---

# Multi-candidate role-fit ranking

**Rule:** every surface that orders or ranks candidates in the multi-candidate Role
Fit flow must sort by the server-assigned `candidate.rank` (rank ascending; null
ranks last; fall back to `overallFit` only when both ranks are null), and display
`entry.rank` rather than recomputing an ordinal client-side.

**Why:** ranking is a hiring-band order (must-have *critical* skill gaps weighted
above overall fit, fit % only as a tie-breaker), not a fit-% sort. So a higher
"Fit %" candidate can legitimately rank below a lower one. Surfaces that re-sort by
raw `overallFit` silently contradict the authoritative order and confuse clients.

**How to apply:** when adding/editing any candidate list, table, chart, or heatmap
in this flow, sort by `rank` with the fallback above; keep user-facing copy
describing the ranking as "hiring suitability — critical skills weighted above
overall fit". Note `overallFit` is capped at 74 whenever a candidate has any
critical-skill gap, so a displayed fit ≥ 75 implies zero critical gaps.

# Optimize the program and validate the model

## Goal
Make the code smaller, faster, and easier to maintain **without changing any numbers the app shows**, then prove the model is still correct with a much broader test suite.

## Phase 1 — Lock in today's results (before touching code)
- Capture "golden" year-by-year outputs for ~8 representative households (single/MFJ/HOH, working vs. retired, already claiming SS, ACA on, IRMAA cap, relocation, QCD, home sale, life events, survivor, each Roth strategy incl. Auto).
- Every later change must reproduce these to within $1.

## Phase 2 — Speed
- Profile the projection engine, Auto strategy search (runs many full projections), Two-Pass, and Monte Carlo.
- Hoist repeated per-year work (bracket inflation, deduction lookups, IRMAA tiers) into per-run tables.
- Cache Auto-strategy candidate runs; avoid recomputing identical scenarios across Dashboard/Comparison/Monte Carlo.
- Memoize heavy chart/table data; stop needless re-renders in the Projections table and Charts tab.

## Phase 3 — Code cleanup
- Split the 78k-char projection engine into focused pieces (income, taxes, healthcare, withdrawals, harvesting/conversions) behind the same public function.
- Remove dead code left from removed features (custom amount, bracket consistency, True Lifetime Wealth, Optimization Goal).
- Deduplicate repeated formatting, currency, and bracket helpers; break up very large screens (Action Items, Tax Settings, Index) into smaller parts.
- No visible UI or behavior changes.

## Phase 4 — Comprehensive model tests
- Tax law: 2026 brackets, standard + 65+ + senior bonus (with phase-out and 2029 expiry), LTCG 0/15/20, NIIT fixed thresholds, SS taxation (provisional income), AMT, state tax + relocation.
- Healthcare: ACA premium/subsidy/400% cliff, entered household premium, Medicare B & D, IRMAA tiers and lookback.
- Withdrawals: take-home solver hits target within $1, RMD start 73 and amounts, withdrawal order, depletion behavior.
- Strategies: each Roth strategy, IRMAA cap never exceeded, 0%/15% harvesting limits, Auto picks the highest After-Tax Equivalent.
- Invariants across all scenarios: no negative balances, income chart sources reconcile to withdrawals, single filers ignore spouse data, determinism, Monte Carlo reproducible with a fixed seed.
- Hand-calculated spot checks for a few years to confirm the math independently.

## Phase 5 — Verify
- Full test run, clean build, browser check of each tab, and before/after timing report.
- Report any real calculation bugs found separately rather than silently changing results.

## Technical details
- Runner stays `node --import tsx --test`; golden fixtures stored as JSON under `src/test/fixtures`.
- Monte Carlo gets an optional seed parameter for tests only.
- Record module split decision in `AGENTS.md`.

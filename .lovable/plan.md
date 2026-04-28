## Align Monte Carlo with Strategy Comparison

### Why
Monte Carlo and Strategy Comparison currently disagree on depletion ages because (a) MC defaults to a 3% mean return while the deterministic engine uses your higher assumed return, and (b) MC only reports a single combined depletion age, while Strategy Comparison reports per-account ages. Fixing both eliminates most of the apparent contradiction.

### Changes

**1. Align return assumption (`src/hooks/useMonteCarloSimulation.ts`)**
- Default `returnMean` to the deterministic return used by `calculateProjections` (read from `taxSettings`) instead of the hardcoded `0.03`.
- Keep `returnStdDev = 0.15` as variance default.
- Callers no longer need to pass a return override — MC will be centered on your baseline.

**2. Per-account depletion tracking (`src/hooks/useMonteCarloSimulation.ts`)**
- Extend `SimulationOutcome` with `tradDepletionAge`, `rothDepletionAge`, `taxableDepletionAge`.
- In `runSingleSimulation`, record the first year each account drops below the $1,000 threshold (same rule as `findDepletionAges`).
- Extend `StrategySimulationResults` with median values for each.

**3. Monte Carlo UI (`src/components/MonteCarloResults.tsx`)**
- Add three new rows per strategy: Median Traditional Depleted, Median Roth Depleted, Median Taxable Depleted, each with an `InfoTooltip`.
- Add an explainer note at the top: "Monte Carlo medians reflect random-return variance and will typically deplete earlier than the deterministic Strategy Comparison even at the same average return (sequence-of-returns risk)."

### Not changing
- `calculateProjections` math, `StrategyComparison.tsx`, and snapshot tests are untouched.
- Hardcoded Trad → Taxable → Roth withdrawal order in MC stays for now (documented as a known limitation in the explainer).

### Deferred
- Full re-simulation per MC iteration (calling `calculateProjections` with shocked returns each run) — only way to truly reflect each strategy's withdrawal logic. ~Nx slower; revisit if numbers still feel off after this change.

### Files touched
- `src/hooks/useMonteCarloSimulation.ts`
- `src/components/MonteCarloResults.tsx`

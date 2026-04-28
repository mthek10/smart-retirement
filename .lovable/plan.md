# Add Pre-Tax vs Post-Tax Breakdown to Monte Carlo Median Final

## Why this matters

Today the cards show a single **Median Final Balance** (e.g. $1.2M). That number blends three very different dollars:

- **Traditional / 401(k)** — fully taxable as ordinary income on withdrawal (you don't really own all of it; the IRS owns a slice)
- **Roth** — already taxed, 100% yours
- **Taxable / Brokerage** — basis is tax-free, gains owe LTCG

Two strategies can show the same $1.2M median but represent very different real wealth. A "Fill to 24%" strategy that aggressively converts to Roth should look **better** here than a "No Conversions" strategy with the same nominal balance — and right now that advantage is invisible.

## What will change

### 1. Track per-account final balances in the simulation
`src/hooks/useMonteCarloSimulation.ts`

- Extend `SimulationOutcome` with `finalTraditional`, `finalRoth`, `finalTaxable` (already computed inside `runSingleSimulation` — just need to return them).
- Extend `StrategySimulationResults` with median values: `medianFinalTraditional`, `medianFinalRoth`, `medianFinalTaxable`, and a derived `medianFinalAfterTax`.
- Compute medians using the existing `medianOf` helper pattern (sort + middle index, per account).
- Compute `medianFinalAfterTax` as a simple after-tax estimate:
  - Traditional × (1 − assumedOrdinaryRate)
  - Roth × 1.0
  - Taxable × (1 − assumedLTCGRate × estimatedGainFraction)
  - Use rates from `taxSettings` if available; otherwise default to 22% ordinary / 15% LTCG with a 50% gain assumption (configurable constant at top of file).

### 2. Display the breakdown in each strategy card
`src/components/MonteCarloResults.tsx`

Replace the single "Median Final" row with a small grouped block:

```text
Median Final (nominal)        $1,240,000
  Pre-tax (Trad/401k)           $620,000
  Post-tax (Roth)               $410,000
  Taxable (brokerage)           $210,000
After-Tax Equivalent          $1,015,000   ← new headline number
```

- "After-Tax Equivalent" gets bold styling so users compare strategies on real spendable wealth.
- Each row gets an `InfoTooltip` explaining what's being shown and the assumed tax rates.
- Keep the existing 10th–90th percentile row (still based on nominal final balance).

### 3. No changes to
- Histogram chart (still nominal, with a one-line note added below the chart noting it shows pre-tax dollars)
- Depletion age tracking
- Settings sliders / debounce logic
- Strategy Comparison or other tabs

## Technical notes

- Per-account final medians are computed independently, so the three account medians won't sum exactly to the nominal median (which is the median of sums). We display the nominal median as the headline of the breakdown and label the three rows as "median per account" via tooltip to set expectations.
- After-tax equivalent uses **median per account** as the basis (not the sum-median), since that's what's actually being decomposed.
- Default tax assumptions are conservative and clearly disclosed in tooltips. If `taxSettings` exposes a marginal/effective rate field, use it; otherwise fall back to the constants.

## Files modified

- `src/hooks/useMonteCarloSimulation.ts` — extend interfaces, return per-account finals, compute medians + after-tax equivalent
- `src/components/MonteCarloResults.tsx` — render breakdown block + after-tax headline in each card
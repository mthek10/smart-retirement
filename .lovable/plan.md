# Fix After-Tax Equivalent so Roth conversions are evaluated fairly

## Why this matters

The current Monte Carlo "After-Tax Equivalent" metric biases the comparison toward **No Conversions** for two reasons:

1. **Conversion tax double-accounting in the simulator.** When a Roth conversion occurs, the engine subtracts the gross amount from Traditional and adds the *full* gross amount to Roth — but the conversion tax was already pre-funded inside `baselineRow.withdrawals` (which shrank the brokerage). So the conversion strategies end up with an inflated Roth balance and a deflated Taxable balance versus what the deterministic engine in `useProjections` actually produces. The terminal *mix* is wrong.
2. **Flat 22% terminal tax assumption.** A static 22% discount on the ending Traditional balance over-rewards strategies that *leave* large Traditional balances (because in real life RMDs at age 75+ widow-bracket would often hit higher than 22%) and gives no credit to strategies that *pre-paid* tax during life at lower brackets.

Compounded, these can flip the ranking and make "No Conversions" look like a free win.

## Changes

### 1. `src/hooks/useMonteCarloSimulation.ts` — fix the conversion mechanics

In `runSingleSimulation`, when applying `rothConversion`:

- Compute an estimated marginal rate at conversion time (re-use `ASSUMED_ORDINARY_RATE` as a first-pass; better: read it from the strategy bracket — `fill_10` → 10%, `fill_12` → 12%, `fill_22` → 22%, `fill_24` → 24%, `none` → 0%).
- Move `actualConversion` *out* of Traditional, but credit Roth with `actualConversion * (1 - conversionRate)` (i.e. net of the tax that the withdrawal already covered).
- This keeps the total dollars conserved and matches what `useProjections` does in the `tax_source = "conversion"` path; for the brokerage path the gross-up is already in `withdrawals`, so the Roth credit should still be net-of-tax to avoid double-counting tax-free growth on dollars that were really paid to the IRS.

### 2. Improve the terminal-tax assumption

Replace the flat `ASSUMED_ORDINARY_RATE = 0.22` with an **effective terminal rate** derived from the simulation:

- For each outcome, compute `effectiveTerminalRate = avgOrdinaryWithdrawalRate` from the last ~5 years of `baselineProjections` (their `totalTaxes / ordinaryIncome`).
- Fall back to 22% if unavailable.
- Apply per-outcome, then take the median. This makes the metric reflect the *user's actual bracket trajectory* rather than a guess.

(Lower-cost alternative if the above is too invasive: keep flat-rate but expose it as a settable input — "Assumed terminal tax rate" — so the user can stress-test it. Default to 24% for married couples at typical RMD ages, not 22%.)

### 3. Add a true lifetime-comparison headline

In `MonteCarloResults.tsx`, add a new bold row above "After-Tax Equivalent":

> **Lifetime Net Wealth = After-Tax Equivalent − Avg Lifetime Tax**

This is the only number that fairly captures the Roth-conversion tradeoff (pay tax now to avoid more tax later). Keep the existing rows as supporting detail.

Also update the explainer paragraph to say:
- After-Tax Equivalent is a terminal snapshot and does not credit a strategy for paying less tax over the lifetime.
- Compare strategies primarily on **Success Rate** + **Lifetime Net Wealth**, not on terminal balance alone.

### 4. Update tests

- Extend `src/hooks/useProjections.snapshot.test.ts` (or add a new MC-focused test) to assert that for a representative scenario, the sum of `medianFinalTraditional + medianFinalRoth + medianFinalTaxable` is within a small tolerance of `medianFinalBalance`, and that `Fill to 24%` produces a Roth balance ≤ pre-fix value (proves the net-of-tax credit landed).

## Out of scope

- Restructuring the MC engine to do its own per-year tax calc (too large; baselineRow scaling stays).
- Changing strategy ranking logic in `StrategyComparison` (separate engine, separate ticket).

## Files touched

- `src/hooks/useMonteCarloSimulation.ts` — conversion crediting + per-outcome terminal rate.
- `src/components/MonteCarloResults.tsx` — new "Lifetime Net Wealth" row + revised explainer.
- `src/hooks/useProjections.snapshot.test.ts` (or new test file) — guardrail assertions.

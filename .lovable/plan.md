## Goal

Give users a single dropdown choice that automatically picks the Roth conversion strategy producing the highest **True Lifetime Wealth** (the headline Monte Carlo metric), instead of forcing them to manually compare Fill to 12 / 22 / 24 / 32.

## New strategy option

Add `maximize_after_tax` to the **Roth Conversion Strategy** dropdown in `src/components/TaxSettings.tsx`, labeled:

> **Maximize Lifetime Wealth (Auto)** — *Recommended*

with a small "beta" / info tooltip:
> "Runs each fill-bracket strategy and automatically applies the one that produces the highest after-tax lifetime wealth for your situation."

Place it at the top of the list so it's the obvious default for users who don't want to tinker.

## How it resolves to a real strategy

The deterministic projection engine (`useProjections.ts`) needs a concrete fill bracket — it can't run "auto." We resolve `maximize_after_tax` once, up front, by comparing candidate strategies:

Candidates: `none`, `fill_12`, `fill_22`, `fill_24`, `fill_32`.

Selection metric: **median True Lifetime Wealth** (`medianFinalAfterTax − avgLifetimeTax`) — the same number now shown as the headline in the Monte Carlo card.

Two execution options (we'll go with **B** unless you prefer A):

- **A. Monte Carlo–based picker (most accurate, slower)** — runs a small MC sweep (e.g. 200 sims × 5 strategies) to choose the winner. Honest but adds ~1s of compute on every settings change.
- **B. Deterministic picker (fast, default)** — for each candidate, runs the existing deterministic `calculateProjections`, computes terminal after-tax (using the same lump-sum bracket walk + basis-decay logic already in `useMonteCarloSimulation.ts`) minus cumulative `totalTaxes`, picks the max. Near-instant; matches MC ranking in the vast majority of cases.

## Implementation

1. **`src/lib/strategyOptimizer.ts`** (new) — exports `pickBestAfterTaxStrategy(accounts, ssData, taxSettings): { strategy: string; ranking: Array<{strategy, lifetimeNetWealth}> }`. Internally loops candidates, calls `calculateProjections`, and reuses the terminal lump-sum tax + basis-decay formulas extracted from `useMonteCarloSimulation.ts` (refactored into a shared helper to avoid duplication).

2. **`src/hooks/useProjections.ts`** — at the top of `calculateProjections`, if `effectiveConversionStrategy === 'maximize_after_tax'`, resolve it to the winner via the optimizer and continue with that strategy. Cache the result on `taxSettings` identity to avoid recomputation.

3. **`src/components/TaxSettings.tsx`** — add the new `<SelectItem value="maximize_after_tax">` with the recommended badge and tooltip. When selected, show a small read-only line below the dropdown: *"Currently using: Fill to 24% Bracket — chosen automatically."* so the user can see what was picked and why.

4. **`src/hooks/useMonteCarloSimulation.ts`** — when the user's strategy is `maximize_after_tax`, the "Your Strategy" column should label itself *"Maximize Lifetime Wealth (= Fill to 24%)"* so the comparison card stays meaningful.

5. **Tests** — extend `useMonteCarloSimulation.test.ts` with a case asserting that for the MFJ $5M Trad / $3M Taxable scenario, the optimizer picks a fill-bracket strategy (not `none`), confirming the regression we just fixed stays fixed.

## UX note

Because this option is labeled *Recommended* and sits at the top, new users get the right answer by default. Power users can still pick a specific bracket manually.

## Open question

Do you want option **B (deterministic, fast)** or **A (Monte Carlo–based, slower but slightly more robust against sequence-of-returns risk)** for the picker?

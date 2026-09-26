# Plan: Let "Maximize Lifetime Wealth" Decide Harvest vs. Roth Conversion Order

## Goal
When the Roth strategy is "Maximize Lifetime Wealth (Auto)", the model should also decide the **order** of tax moves — not just how big conversions are. For a 60-year-old with a big unrealized gain it may pick "harvest 0% gains first, convert later"; for a 70-year-old already on Social Security it may pick "convert now, little/no harvesting". The choice is made by testing the options and keeping whichever gives the highest After-Tax Equivalent.

## How it works today
- Each year, Roth conversions are sized first; the 0% (and optional 15%) gain harvest only uses whatever room is left. So conversions always win the low-income years.
- The Auto optimizer only compares conversion sizes (None, Fill 12/22/24/32%).

## What you'll see
- **Tax Settings**: under "Maximize Lifetime Wealth (Auto)", a short line explaining the chosen approach, e.g. "Harvest 0% gains ages 60–64, then Fill to 22% from 65".
- **Year-by-year table**: CG Harvest appears in the early years, Roth Conversions start at the chosen age.
- **Two-Pass Comparison / Monte Carlo**: the Auto column label includes the order (e.g. "Fill to 22% from 65, harvest first").
- Manual strategies (Fill to 12% etc.) behave exactly as today unless the user picks the new options below.

## New sequencing options (used by the optimizer, also settable manually)
1. **Conversion start age** — conversions begin at: now, +3 yrs, +5 yrs, Social Security claim age, or RMD age. Years before start are dedicated to harvesting.
2. **Priority in shared years** — "Conversions first" (today) or "0% harvest first" (conversions are capped so they don't eat the 0% gain room).

The optimizer tests every combination of conversion size x start age x priority (about 50 quick runs, only when inputs change; results cached) and keeps the best After-Tax Equivalent. Candidates that can't matter are skipped (e.g. no unrealized gains -> priority not tested; start age already past -> skipped).

## Technical details
- `TaxSettings`: add `rothConversionStartAge?: number | null` and `conversionPriority?: 'conversions_first' | 'harvest_first'` (defaults null / conversions_first -> identical to today). Wire defaults in `Index.tsx`, scenario save/load, CSV.
- `useProjections.ts`: `calculateProjections` gains an override object `{ strategy, startAge, priority }`. Skip conversions when `age < startAge`. When `harvest_first`, compute 0% harvest room before sizing conversions and reduce the conversion target by that room (floored at 0); harvest block then runs as today.
- `strategyOptimizer.ts`: expand candidates to the grid above, return `{ strategy, startAge, priority }` plus a human-readable label; keep WeakMap cache. Existing call sites (line ~503, ~1660, StrategyComparison, Monte Carlo) consume the combined result.
- `TaxSettings.tsx`: explanation line under Auto; in Advanced Options, manual "Start Roth conversions at age" and "Prioritize 0% gain harvest" controls (hidden when Auto is selected, since Auto picks them).
- Tests (`node:test`):
  - Age 60, large unrealized gains, low income: optimizer chooses harvest-first or a delayed start; harvest > 0 in early years.
  - Age 70 with SS, little gains: optimizer keeps conversions first.
  - Defaults unchanged: existing 27 tests pass.
  - `harvest_first` never reduces 0% harvest below the conversions-first run in the same year.

## Caveats
- Picks from a fixed menu of start ages, not every possible year-by-year mix.
- Uses the deterministic return path; Monte Carlo just reports how the chosen order performs.

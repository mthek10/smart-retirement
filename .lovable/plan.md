# Plan: "Fill 15% LTCG Bracket" Harvest Toggle

## Goal
Add an optional second tier to the auto-harvest feature: after filling the 0% LTCG bracket, also realize gains up to the **top of the 15% bracket** (≈$519k single / ≈$584k married taxable income, inflation-adjusted), stepping up cost basis. Off by default — it pays real 15% tax today, so it only wins for large brokerage accounts that would otherwise face 20% + NIIT later.

## What you'll see
- **Tax Settings → Advanced Options**: a new switch "Also harvest into the 15% capital-gains bracket" (only visible/enabled when Auto-harvest 0% is on), with a plain-language explanation of when it helps and the warning that it prepays 15% tax.
- **Year-by-year table**: the CG Harvest column shows total harvested gains; a new "15% Harvest" sub-line (or separate column) distinguishes the 15% portion. The note under the table explains both bands.
- **CSV export**: new column "CG Harvested (15% Bracket)".
- No change when the toggle is off — behavior stays exactly as today.

## Technical details

1. **`src/lib/taxCalculations.ts`**
   - Add `roomInFifteenBracket` to `calculateCapitalGainsHarvestingRoom` (or a sibling helper): `brackets[1].max * inflationMultiplier − taxableIncome`, floored at 0.

2. **`src/hooks/useProjections.ts`**
   - New setting `taxSettings.harvestFifteenBracket?: boolean` (default `false`).
   - Extend the existing harvest block (≈lines 1158–1202): when enabled, size an additional harvest = min(room in 15% band above the 0% harvest, remaining unrealized gains after the 0% harvest).
   - Sizing uses the same conservative SS-taxability estimate; respects `neverTriggerIRMAA` cap; also cap at the NIIT threshold ($200k/$250k MAGI) so harvesting never triggers the 3.8% surtax — that would defeat the purpose.
   - The 15% harvest flows into `capitalGains` so existing stacking logic taxes it at 15% automatically; the extra tax is funded like other taxes that year (slightly higher withdrawal need).
   - Basis steps up by the gross harvested gain; balance unchanged by the harvest itself (sell + rebuy).
   - New `ProjectionRow` field `capitalGainsHarvested15: number`.

3. **UI / export**
   - `src/components/TaxSettings.tsx`: toggle under Advanced Options, nested under the existing Auto-harvest switch, disabled when auto-harvest is off.
   - `src/components/ProjectionTable.tsx`: add "15% Harvest" column in the Income group (active when any value > 0); update the green explainer note to cover the 15% band.
   - `src/lib/exportUtils.ts`: add CSV column.
   - `src/components/ActionItems.tsx`: subtract both executed harvests from advisory recommendations.

4. **Tests (`src/hooks/useProjections.test.ts`)**
   - High-income year: 0% band full → 15% harvest fills remaining room when on; zero when off.
   - `neverTriggerIRMAA` + NIIT caps respected.
   - No unrealized gains → no harvest.
   - Existing 0% tests still pass unchanged.

## Caveats
- Paying 15% now is a prepayment: the model will show higher early taxes and (usually) lower later taxes; the After-Tax Equivalent metric decides whether it helps each plan.
- The 20%-bracket avoidance benefit only materializes if the projection actually reaches the 20% bracket later; the toggle does not add a separate lookahead optimizer.

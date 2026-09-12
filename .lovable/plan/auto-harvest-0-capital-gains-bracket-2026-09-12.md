# Auto-Harvest 0% Capital Gains Bracket

## Goal
Automatically realize long-term capital gains in the brokerage account each year up to the top of the 0% federal LTCG bracket — executing in the projections what the Action Items tab currently only suggests. Harvested gains get a basis step-up (sell + rebuy), so future withdrawals are taxed less.

## How it works today
- Withdrawal order per year: RMDs → brokerage → traditional → Roth. Brokerage gains are only realized when money is withdrawn for spending.
- Action Items computes a 0%-bracket harvesting *schedule* (`calculateCapitalGainsHarvestingRoom` in `src/lib/taxCalculations.ts`) but the projection engine never acts on it.

## What we'll build

### 1. New setting
- Add `autoHarvestCapitalGains: boolean` to `TaxSettings` (default **on**), with a Switch + short explanation in the Tax Settings step next to the Roth conversion strategy.
- Thread through `Index.tsx` defaults, CSV export/import (`exportUtils.ts`), and scenario save/load.

### 2. Engine changes (`src/hooks/useProjections.ts`)
Each year, after the take-home solver and Roth conversion sizing, when the toggle is on and a brokerage balance remains:
- Compute unused 0% LTCG room via the existing `calculateCapitalGainsHarvestingRoom` (inflation-indexed), using the year's taxable income *including* already-realized gains, dividends, and any Roth conversion.
- Harvest amount = min(0% room, unrealized gains in the brokerage balance). Skip when under the existing $1,000 meaningfulness floor.
- Effects of a harvest:
  - Balance unchanged (sell and immediately rebuy); `costBasisDollars += harvestAmount` (basis step-up).
  - Harvested gain is added to the year's capital-gains income so side effects are captured correctly: federal LTCG stays $0 within the 0% bracket, but MAGI-driven items (NIIT, taxable Social Security, IRMAA, ACA subsidies, state tax) still see the income.
  - When "Never trigger IRMAA" is on, cap the harvest so MAGI does not cross the next IRMAA tier.
- Expose `capitalGainsHarvested` on the projection row.

### 3. UI surfacing
- Projections table: optional "CG Harvested" column.
- Action Items harvesting schedule: subtract already-executed harvests so advice matches the plan (no double counting).
- Summary/Analysis: small note showing lifetime harvested gains and estimated federal tax saved.

### 4. Tests (`node:test`)
- Low-income early-retirement year: harvest fills exactly to the 0% bracket top; basis steps up; federal LTCG tax stays $0.
- High-income year (SS + RMD + conversion): harvest is $0 when no room.
- Toggle off: behavior identical to today.

## Out of scope
- Changing the withdrawal order (brokerage still drawn first by default).
- Specific-share / FIFO lot selection (average-cost tracking stays).

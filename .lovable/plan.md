

## Add Brokerage Dividend Yield to the Tax Model

### Problem
Brokerage holdings (mutual funds, ETFs) often pay **qualified and ordinary (non-qualified) dividends every year**, even when nothing is sold. Today the model only realizes taxes on the brokerage when funds are *withdrawn* (cost-basis based capital gains). That understates yearly tax drag and can hide bracket/IRMAA/ACA cliff impacts.

### Recommended Approach
Split the brokerage's annual return into three components the user can tune, and feed dividends through the existing tax engine each year:

1. **Qualified dividend yield (%)** → taxed at long-term capital gains rates (same bracket as realized LTCG; also counted in NIIT MAGI).
2. **Ordinary (non-qualified) dividend yield (%)** → taxed as ordinary income (impacts federal/state brackets, taxable Social Security, IRMAA, ACA MAGI).
3. **Price appreciation (%)** → unrealized growth, taxed only when sold (current behavior).

The existing "Annual Return %" becomes the **sum** of these three, so existing scenarios stay backward compatible.

### Behavioral Details
- Dividends are assumed **paid out and reinvested** (typical for mutual funds). Reinvestment **increases cost basis** by the dividend amount each year — this prevents future double-taxation when shares are sold.
- Dividend income flows into the projection row alongside withdrawals, so it shows up in:
  - Federal ordinary income tax (non-qualified portion)
  - Federal capital gains tax (qualified portion)
  - State income tax / state cap gains tax
  - Taxable Social Security calculation
  - IRMAA MAGI, ACA MAGI/subsidy, NIIT
  - Tax bracket fill gauge & marginal bracket display
- The withdrawal solver accounts for the tax on dividends so target take-home is still hit.
- Roth conversion "headroom to bracket top" correctly subtracts dividend ordinary income.

### UI Changes
In **Setup → Accounts → Brokerage** section, replace the single "Annual Return (%)" input with a small grouped block:

```text
Brokerage Annual Return Breakdown
  Price appreciation %     [ 4.0 ]   ← unrealized growth
  Qualified dividend %     [ 1.5 ]   ← taxed at LTCG rates
  Ordinary dividend %      [ 0.0 ]   ← taxed as ordinary income
  ─────────────────────────────
  Total annual return:      5.5%      (auto-calculated)
```

Tooltips explain each field with a brief example (e.g., "Most broad index ETFs ≈ 1.3–1.8% qualified dividend yield; bond funds & REITs typically pay ordinary dividends").

A small note: *"Dividends are assumed reinvested and increase your cost basis each year."*

### Defaults (backward-compatible)
- Existing users: migrate `taxableReturn` → `priceAppreciation = taxableReturn`, `qualifiedDividendYield = 0`, `ordinaryDividendYield = 0`. No change in their results.
- New users: default `priceAppreciation = 4.0`, `qualifiedDividendYield = 1.5`, `ordinaryDividendYield = 0.0` (≈ broad-market ETF profile).

### Technical Changes

**Data model** (`src/hooks/useProjections.ts`)
- Extend `Accounts` with `qualifiedDividendYield: number` and `ordinaryDividendYield: number`. Keep `taxableReturn` as the **price appreciation** component (rename internally to `taxablePriceReturn` with a back-compat shim during load).
- Extend `ProjectionRow` with `qualifiedDividends: number` and `ordinaryDividends: number`.

**Projection loop** (`src/hooks/useProjections.ts`)
- Each year, before withdrawal logic:
  - `qualDiv = taxableBalance * qualifiedDividendYield/100`
  - `ordDiv  = taxableBalance * ordinaryDividendYield/100`
  - Add `ordDiv` into `ordinaryIncome` (alongside trad withdrawals, wages, pension).
  - Add `qualDiv` into `capitalGainsRealized` for tax purposes.
  - Reinvest both into `taxableBalance` and add to cost basis: new cost basis $ = old cost basis $ + qualDiv + ordDiv. Recompute `costBasisPercent` from updated $ each year (track basis in dollars internally for accuracy).
- Then apply price appreciation: `taxableBalance *= (1 + priceAppreciation/100)`.
- Pass updated MAGI (now including dividends) to IRMAA, NIIT, ACA, taxable SS.

**Solver** (`solveRequiredWithdrawal`)
- Accept dividend amounts as inputs and include them in the same tax calculations so the solved withdrawal produces correct take-home.

**UI** (`src/components/AccountInputs.tsx`)
- Replace single brokerage return input with the 3-field block + auto-summed total + tooltips.

**Storage / import-export** (`src/lib/exportUtils.ts`, scenarios, localStorage draft)
- Add the two new fields to CSV export/import and scenario serialization with safe defaults on load.

**Display surfaces** (optional polish, same task)
- `ProjectionTable` / `ProjectionChart`: add a "Dividends" line item (qualified + ordinary) so users can see the annual tax drag.
- `BracketFillGauge`: dividends already fold in via `ordinaryIncome` and `capitalGainsIncome` — verify both are used.
- `TaxSettings` "Annual Take Home" target unchanged.

### Out of Scope (can be follow-ups)
- Per-account dividend yields (e.g., separate yields for different lots/funds).
- Modeling capital gain distributions from mutual funds separately from dividends.
- Foreign tax credit on international fund dividends.
- Section 199A REIT dividend deduction.


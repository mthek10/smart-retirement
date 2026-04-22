

## Add §121 Primary Home Sale Exclusion to Life Events

### Background: IRS §121 Exclusion
When selling a primary residence (owned + used as main home for 2 of last 5 years), the IRS allows excluding capital gain from taxable income:
- **$250,000** for single filers
- **$500,000** for married filing jointly

Only the **gain above the exclusion** is taxed (as long-term capital gains). Today, a "Home Sale" preset adds the **entire sale price** as taxable ordinary income — which dramatically overstates tax, often pushing users into top brackets, NIIT, IRMAA, and ACA cliffs incorrectly.

### Proposed Approach

Introduce a new life event **subtype** `"home_sale"` that captures the inputs needed to compute the taxable portion correctly, then feeds only the post-exclusion gain (as long-term capital gain, not ordinary income) into the tax engine.

#### New fields on a Home Sale event
| Field | Purpose |
|---|---|
| Sale price | Gross proceeds |
| Cost basis | Original purchase price + capital improvements |
| Selling costs (optional) | Agent commission, closing — reduces gain |
| Filing status auto-detected | Married → $500k exclusion, Single/Survivor → $250k |
| "Qualifies for §121 exclusion" toggle | Default ON; off for vacation/rental homes |

**Computation each year the event fires:**
```text
realized_gain   = max(0, salePrice − costBasis − sellingCosts)
exclusion_cap   = (married && qualifies) ? 500,000 : (qualifies ? 250,000 : 0)
taxable_gain    = max(0, realized_gain − exclusion_cap)
net_proceeds    = salePrice − sellingCosts        // cash to the household
```

#### Tax engine wiring (`useProjections.ts`)
- `taxable_gain` flows into the existing **capital gains realized** bucket (same path as `qualifiedDividends`) → taxed at LTCG rates, included in NIIT MAGI, IRMAA MAGI, ACA MAGI, and taxable-SS calc.
- `net_proceeds − taxable_gain_tax` (or simply `net_proceeds`, with tax handled via the bracket math) is added to the **brokerage taxable balance** as new principal, with cost basis equal to `net_proceeds` (so future withdrawals don't double-tax).
- Nothing is added to ordinary income.

#### UI changes (`LifeEventsEditor.tsx`)
- Add a new event "type" option: **Home Sale (§121)** alongside Expense / Income.
- When selected, the panel swaps to show: Sale Price, Cost Basis, Selling Costs, "Primary residence (qualifies for §121)" switch.
- Show a live computed preview:
  > Realized gain: $650,000 — Exclusion: $500,000 (MFJ) = **Taxable LTCG: $150,000**  
  > Net proceeds reinvested into brokerage: $740,000
- Update the **"Home Sale"** preset to use the new type with sensible defaults (price $750k, basis $250k, qualifies = true).
- Remove the misleading current behavior where Home Sale dumps the full price as taxable income.

#### Display surfaces
- `ProjectionTable` Life Events column tooltip shows the breakdown (gain / exclusion / taxable portion) on hover.
- Existing "Dividends" + capital gains columns automatically reflect the new LTCG.

#### Backward compatibility
- Existing `LifeEvent` records keep working (`type: "expense" | "income"`).
- New optional fields (`subtype`, `salePrice`, `costBasis`, `sellingCosts`, `qualifiesForSection121`) default to undefined; only used when `subtype === "home_sale"`.
- Old "Home Sale" preset entries already saved by users continue to behave as before until the user re-adds the preset.

#### Edge cases handled
- **Survivor year**: if spouse died in current/prior year, the $500k exclusion still applies for sales in the year of death (filing MFJ) and for up to 2 years after if not remarried — flag with a tooltip; default to $500k if survivor toggle is on within that window, else $250k.
- **Loss on sale**: personal-residence losses are non-deductible → clamp `taxable_gain` to ≥ 0 and don't create a capital loss.
- **Non-qualifying sale** (toggle off): full realized gain is taxed as LTCG (no exclusion).
- **State tax**: taxable gain flows through state cap-gains/income calc the same way other LTCG does (most states conform to federal §121, which the model already approximates by using federal taxable amount).

### Out of Scope (follow-ups)
- Partial exclusion for hardship moves (job change, health) — IRS prorated rule.
- Depreciation recapture for prior rental use (§1250 unrecaptured gain at 25%).
- Tracking multiple primary residences over time / 2-of-5-year lookback enforcement.

### Files to Modify
- `src/hooks/useProjections.ts` — extend `LifeEvent` type; new branch in life-events aggregation that pushes `taxable_gain` into `capitalGainsRealized` and `net_proceeds` into brokerage balance + cost basis.
- `src/components/LifeEventsEditor.tsx` — new subtype UI, preset rewrite, live preview.
- `src/components/ProjectionTable.tsx` — tooltip breakdown on Life Event Income cell.
- `src/lib/exportUtils.ts` — add `Home Sale Taxable Gain` column.


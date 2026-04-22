

## Add Annual Charitable Donations to the Model

### Why this matters
Charitable giving has three distinct tax effects the model should capture:
1. **Itemized deduction** — donations + SALT + mortgage interest can exceed the standard deduction, lowering taxable ordinary income.
2. **QCDs (Qualified Charitable Distributions)** — at age 70½+, donating directly from a Traditional IRA satisfies RMDs and is **excluded from AGI** (better than a deduction — also lowers IRMAA, NIIT, ACA MAGI, and taxable SS).
3. **Donating appreciated brokerage shares** — avoids capital gains tax on the donated lot AND gives an itemized deduction at fair market value.

The model already references QCDs as advice in `RMDPlanner` but doesn't actually compute any of these effects.

### Proposed Inputs (Tax Settings tab → new "Charitable Giving" card)

| Field | Default | Notes |
|---|---|---|
| Annual donation amount | $0 | In today's dollars; inflation-adjusted yearly |
| Start age / End age | retirement → 95 | Age range the giving is active |
| Funding source | Cash (from take-home) | Dropdown: **Cash**, **QCD from Traditional IRA** (only enabled at 70½+), **Appreciated brokerage shares** |
| Other itemized deductions (annual) | $10,000 | SALT cap + mortgage interest + medical estimate — needed so the model knows when itemizing beats the standard deduction |

A single recurring stream covers the typical case. (One-off large gifts can already be modeled as a Life Event — we'll add "Charitable Gift" to the Label preset dropdown.)

### Tax Engine Wiring (`src/hooks/useProjections.ts` + `taxCalculations.ts`)

For each projection year, after computing gross income but before federal tax:

```text
giving = donationAmount × inflationMultiplier   (if age within window)

switch (fundingSource):
  case "cash":
      itemized = giving + otherItemized
      deduction = max(standardDeduction, itemized)
      // reduces take-home target by `giving`
  
  case "qcd":  // age ≥ 70.5 only; capped at $105k (2024, inflation-adj)
      qcdAmount = min(giving, 105_000 × inflationMultiplier, tradBalance)
      ordinaryIncome -= qcdAmount          // excluded from AGI
      rmdSatisfied += qcdAmount            // counts toward RMD
      tradBalance  -= qcdAmount
      // No itemized deduction for the QCD portion
      // Remaining giving (if any) falls back to cash
  
  case "appreciated_shares":
      sharesFMV = giving
      // Skip capital gain realization on these shares
      embeddedGain = sharesFMV × (1 − costBasisPct)
      avoidedCapGains = embeddedGain       // not added to capitalGainsRealized
      taxableBalance -= sharesFMV
      itemized = sharesFMV + otherItemized
      deduction = max(standardDeduction, itemized)
      // Cap deduction at 30% of AGI (LTCG-property limit); carryover ignored for v1
```

The existing `calculateFederalTax` already takes a deduction parameter — extend the projection loop to pass `effectiveDeduction = max(standardDeduction, itemizedTotal)` instead of always using standard. State tax follows federal taxable income, so it benefits automatically in conforming states.

### UI Surfaces

- **TaxSettings** → new "Charitable Giving" card with the inputs above and a small live preview (`"At 22% bracket and $20k QCD: ~$4,400 federal tax saved + IRMAA tier avoided"`).
- **ProjectionTable** → new optional column **"Charitable"** (toggleable like other columns) showing donation amount with a tooltip breaking out funding source + tax savings.
- **ActionItems (Dashboard)** → upgrade the existing QCD note to a personalized recommendation: *"At age 73 your projected RMD is $48,000. Redirecting $20,000 as a QCD would save ~$5,400/yr in federal tax and drop you below the next IRMAA tier."*
- **BracketFillGauge** → automatically reflects the lowered ordinary income from QCDs (no extra work).
- **exportUtils** → add `charitableDonation`, `qcdAmount`, `itemizedDeduction` to CSV.

### Backward Compatibility & Edge Cases
- All inputs default to $0 — existing scenarios are unaffected.
- QCD selection auto-disables before age 70½ with a tooltip.
- Appreciated-shares mode falls back to cash when `taxableBalance` is depleted.
- Survivor year: standard deduction & QCD limit recompute automatically from filing status.
- Annual QCD cap inflation-adjusted (IRS indexes it post-SECURE 2.0).

### Out of Scope (follow-ups)
- Donor-Advised Fund "bunching" strategy optimizer (alternate years itemize vs. standard).
- 5-year carryforward of excess charitable deductions over AGI limits.
- Separate AGI limits for cash (60%) vs. appreciated property (30%) when both are used.
- Charitable Remainder Trusts / charitable gift annuities.

### Files to Modify
- `src/hooks/useProjections.ts` — new fields on inputs; per-year giving logic; itemized vs. standard deduction selection; QCD reduces ordinary income & counts toward RMD; appreciated-shares path bypasses capital gains.
- `src/lib/taxCalculations.ts` — helper `computeEffectiveDeduction(itemizedTotal, filingStatus, year)`; export `qcdAnnualLimit2024 = 105_000`.
- `src/components/TaxSettings.tsx` — new "Charitable Giving" card with inputs + live preview.
- `src/components/ProjectionTable.tsx` — optional "Charitable" column with tooltip breakdown.
- `src/components/ActionItems.tsx` — personalized QCD recommendation with computed savings.
- `src/components/LifeEventsEditor.tsx` — add "Charitable Gift" to label preset dropdown for one-off donations.
- `src/lib/exportUtils.ts` — new CSV columns.


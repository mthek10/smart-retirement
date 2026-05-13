# Add "Never Trigger IRMAA" Mode

## Goal

Add a user-controlled toggle that, when enabled, ensures the plan's Roth conversions never push MAGI across the next IRMAA tier during any Medicare-eligible year (age 65–100). Today the model uses a soft heuristic ("IRMAA increase ≤ 50% of conversion tax cost") — this adds an explicit hard cap as an opt-in mode.

## Scope

This applies to **Roth conversion sizing only**. Required withdrawals, RMDs, SS, pensions, and life-event income can still cross IRMAA tiers because they aren't discretionary — the plan can't refuse to fund the user's spending target. When baseline MAGI already exceeds the next tier with no conversion, the conversion is set to 0 (no extra IRMAA caused by conversions).

## UX

In **Tax Settings → Roth Conversion Strategy** section, add a new toggle below the strategy dropdown:

- **Label:** "Never trigger IRMAA surcharges"
- **Help tooltip:** "When on, Roth conversions are capped so MAGI stays below the next Medicare IRMAA tier during ages 65+. Note: required withdrawals, Social Security, and RMDs may still cross IRMAA tiers if your spending target requires it."
- **Default:** off (preserves current behavior).
- Disabled/grayed when strategy is `none`.

## Technical Changes

### 1. State

`taxSettings` shape (defined in `src/pages/Index.tsx` and consumed by `TaxSettings.tsx`, `useProjections.ts`, scenario save/load, CSV export/import):

- Add `neverTriggerIRMAA: boolean` (default `false`).
- Include in default tax settings, `ScenarioManager` snapshots, and `exportUtils` setup CSV serialization/parsing.

### 2. UI — `src/components/TaxSettings.tsx`

In the Roth Conversion section, after the strategy `<Select>`, add a `<Switch>` row bound to `taxSettings.neverTriggerIRMAA`. Disable when `rothConversionStrategy === 'none'`.

### 3. Conversion sizing — `src/hooks/useProjections.ts` (~lines 1014–1067)

Replace the existing soft heuristic block with branching logic:

- Compute `isIRMAAAge` as today.
- If `isIRMAAAge && proposedConversion > 0`:
  - If `taxSettings.neverTriggerIRMAA === true` → **hard cap mode**:
    - Determine the next IRMAA tier threshold above `magiWithoutConversion` using `irmaaBracketsMarried2024` / `irmaaBracketsSingle2024` (inflation-adjusted by `yearIndex` and `inflationRate`), based on `effectiveFilingStatus`.
    - If `magiWithoutConversion >= nextTierThreshold` → `proposedConversion = 0` (already over a tier; conversion would only add more).
    - Else → `headroom = nextTierThreshold - magiWithoutConversion - 1` (subtract $1 for safety); `proposedConversion = min(proposedConversion, max(0, headroom))`.
  - Else → keep existing soft 50% heuristic block unchanged.
- Helper: extract a small `getNextIRMAAThreshold(magi, yearIndex, inflationRate, filingStatus)` function in `src/lib/taxCalculations.ts` (mirrors logic in `getIRMAAProximity` in `incomeAlerts.ts`) and reuse it.

### 4. Tests — `src/hooks/useProjections.test.ts`

Add cases:

- With `neverTriggerIRMAA: true` and a scenario where the unconstrained conversion would cross the first IRMAA tier, assert MAGI stays below that threshold every year age 65+.
- With `neverTriggerIRMAA: false`, assert behavior unchanged from current snapshot.
- Single-filer variant uses single brackets.

### 5. Persistence

- `src/lib/exportUtils.ts`: add `neverTriggerIRMAA` to setup CSV export and parser (default `false` when missing).
- `src/hooks/useScenarios.ts` / `src/components/ScenarioManager.tsx`: include the flag in saved scenarios (defaulting to `false` for older saved scenarios).

## Out of Scope

- Throttling baseline withdrawals or SS timing to avoid IRMAA (would conflict with the user's take-home target).
- A "soft cushion" mode (e.g., stay $X below next tier) — can be added later if requested.
- Real-world 2-year MAGI lookback nuance — keeps current same-year MAGI approximation.

## Verification

1. Enable mode in a scenario with conversions normally crossing the $206k (married) tier at age 66 → conversions shrink so MAGI lands just under $206k.
2. Disable mode → projections match prior snapshot.
3. Single filer with high baseline income at 70 already over Tier 1 → conversion = 0 in that year when mode on.

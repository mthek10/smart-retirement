# Dashboard: Edit Three Spending Periods for Annual Take Home

## Goal
The Dashboard's "Annual Take Home" box (in the return-rates / Recalculate card) currently edits only the single first-year take-home amount. When the three Spending & State Periods are enabled, it should instead show and edit the three periods — each period's take-home amount and state — right on the Dashboard, with changes applied on Recalculate.

## Changes

### 1. Pass spending periods into the Dashboard card
- `src/pages/Index.tsx`: pass `spendingPeriods={taxSettings.spendingPeriods}` and an `onSpendingPeriodsChange` handler (updates `taxSettings.spendingPeriods`) into `SummaryCards`, alongside the existing `targetTakeHome` props.

### 2. SummaryCards / ReturnRateSliders
- `src/components/SummaryCards.tsx`:
  - Add optional props `spendingPeriods?: SpendingPeriodsSettings` and `onSpendingPeriodsChange?: (v: SpendingPeriodsSettings) => void` to `SummaryCardsProps` and forward them to `ReturnRateSliders`.
  - In `ReturnRateSliders`, when `spendingPeriods?.enabled` is true:
    - Replace the single "Annual Take Home" input with a compact three-row editor: one row per period showing its age range label ("Period 1: age 60–69"), a take-home amount input (existing `$`-prefixed style), and a state dropdown (with the NYC resident toggle when NY is chosen).
    - Edits update local state and mark the card dirty; clicking **Recalculate** commits all three periods (plus return rates) and reruns the projection — same committed-state pattern as the existing take-home field.
    - Reuse the same clamping rules as `SpendingPeriodsEditor` (period 1 starts at current age; start ages strictly increasing; capped at plan end age).
  - When periods are disabled, keep the current single take-home input unchanged.

### 3. Shared logic
- Extract the period-clamping helper from `SpendingPeriodsEditor.tsx` into a small shared function so the Dashboard editor and the Tax Settings editor cannot drift apart.

## Verification
- Typecheck + full test suite (`node --import tsx --test`) — existing spending-periods tests must still pass.
- Add a test asserting the dashboard commit path produces identical projections to editing the same periods in Tax Settings (same inputs → same rows).
- Playwright check in the preview: enable periods, edit period amounts/states on the Dashboard, click Recalculate, confirm the year-by-year table reflects the new take-home and state taxes at each period's start age.

## Out of scope
- No change to how periods affect the projection engine (already implemented).
- "Max Annual Withdrawal" figure continues to use the single take-home amount.

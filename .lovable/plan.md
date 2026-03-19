

## Add One-Time Financial Events (Expenses and Windfalls)

Support scheduled large expenses (wedding, mortgage payoff, home renovation) and inflows (inheritance, property sale) that occur in specific future years, so the projection engine can model their impact on withdrawals, taxes, and balances.

### Data Model

Add a new `LifeEvent` interface and array to `TaxSettings`:

```ts
interface LifeEvent {
  id: string;
  label: string;           // e.g. "Wedding", "Inheritance"
  type: "expense" | "income";
  amount: number;
  age: number;             // spouse1's age when it occurs
  taxable: boolean;        // for income: is it taxable? for expense: ignored
}
```

Store as `taxSettings.lifeEvents: LifeEvent[]`.

### Projection Engine Changes (useProjections.ts)

In the yearly loop, after computing `effectiveTargetTakeHome`:

- **Expenses**: Sum all expense events for this age. Add to the withdrawal target for that year (increase `adjustedTargetTakeHome`).
- **Taxable income events**: Add to ordinary income, let the solver account for the tax impact, and deposit the net amount (reduces required withdrawals).
- **Non-taxable income events** (e.g., Roth inheritance, life insurance): Deposit directly into the taxable brokerage account balance, reducing required withdrawals for that year.

Add `lifeEventExpense` and `lifeEventIncome` fields to `ProjectionRow` so the table and charts can display them.

### UI: New "Life Events" Section

Add a new step or section within the existing **Tax Settings** wizard step (step 5) — a collapsible card titled "One-Time Life Events":

- Table/list of configured events with columns: Label, Type (expense/income), Amount, Age, Taxable toggle
- "Add Event" button that adds an empty row inline
- Delete button per row
- Common presets dropdown: "Wedding", "Mortgage Payoff", "Inheritance", "Home Purchase", "Home Sale"

### Setup Wizard

No new wizard step needed — embed within Tax Settings to keep the 6-step flow intact. The section will be collapsed by default so it doesn't clutter the page for users who don't need it.

### Export/Import

Update `exportSetupToCSV` and `parseSetupCSV` in `exportUtils.ts` to serialize/deserialize the `lifeEvents` array.

### Files to Change

1. **src/hooks/useProjections.ts** — Add `LifeEvent` to `TaxSettings`, add fields to `ProjectionRow`, incorporate events in yearly loop
2. **src/components/LifeEventsEditor.tsx** — New component for managing life events list
3. **src/components/TaxSettings.tsx** — Embed `LifeEventsEditor` as a collapsible section
4. **src/pages/Index.tsx** — Add `lifeEvents: []` to `DEFAULT_TAX_SETTINGS`
5. **src/lib/exportUtils.ts** — Handle life events in CSV import/export
6. **src/components/ProjectionTable.tsx** — Optionally show life event columns


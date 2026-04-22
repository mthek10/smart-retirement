

## Restructure Life Events with a Type Dropdown

### Recommendation: Yes
A dropdown is the better UX. Right now Home Sale is a hidden specialty mode buried inside the existing event flow. Promoting it to a first-class event type (alongside Expense, Income, and future types like Inheritance, Gift, Business Sale) makes the feature discoverable and keeps the editor panel clean.

### Proposed UX

In `LifeEventsEditor.tsx`, when adding/editing an event, the first field becomes:

```text
Event Type:  [ Expense ▾ ]
              ├─ Expense (one-time cost)
              ├─ Income (windfall / bonus)
              └─ Home Sale (§121 exclusion)
```

The form fields below the dropdown swap based on selection:

- **Expense** → Name, Age, Amount (current behavior)
- **Income** → Name, Age, Amount, Tax Treatment (ordinary / capital gains / tax-free)
- **Home Sale** → Name, Age, Sale Price, Cost Basis, Selling Costs, "Qualifies for §121" toggle, plus the live preview (Realized gain → Exclusion → Taxable LTCG → Reinvested proceeds)

### Benefits
- **Discoverability**: users see Home Sale as an option without needing to know it exists.
- **Cleaner form**: only the relevant fields show for each type — no conditional clutter.
- **Extensible**: easy to add Inheritance, Business Sale, Gift, etc. later as new dropdown items.
- **Preset alignment**: the "Primary Home Sale" preset just pre-selects type=Home Sale with default values.

### Backward Compatibility
- Existing events keep their current `type` and `subtype` fields. The dropdown reads from `subtype === "home_sale"` first, then falls back to `type` (`expense` / `income`).
- No migration needed. Saved scenarios load unchanged.

### Files to Modify
- `src/components/LifeEventsEditor.tsx` — add the type dropdown at the top of each event card, conditionally render field groups based on selection, wire dropdown to set both `type` and `subtype` on the event object.

### Out of Scope (future dropdown additions)
- Inheritance (tax-free, adds to brokerage with stepped-up basis)
- Business Sale (LTCG with optional QSBS §1202 exclusion)
- Large Gift Given (gift-tax tracking)


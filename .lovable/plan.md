## Plan: Group advanced options under collapsible "Advanced Options" in Tax Settings

Wrap the three existing sections (Charitable Giving, Life Events, Model Survivor Scenario) in a single collapsible block at the bottom of the Tax Settings card so they are hidden by default.

### Changes — `src/components/TaxSettings.tsx`

1. Import `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent` from `@/components/ui/collapsible` and `ChevronDown` from `lucide-react`.
2. Add local state `const [advancedOpen, setAdvancedOpen] = useState(false);`.
3. Wrap the three existing blocks (lines ~509–705: Charitable Giving, Life Events, and the married-only Survivor Scenario) inside a single `<Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>` placed within the same `pt-4 border-t` container.
4. Trigger: a full-width button row labeled "Advanced Options" with a small subtitle ("Charitable giving, life events, survivor scenario") and a rotating `ChevronDown` icon (rotates when open). Styled to match existing section headers.
5. `CollapsibleContent` contains the three sections unchanged. Remove the now-redundant `pt-4 border-t` from the inner Charitable Giving block (the wrapper provides the divider) and keep separators between the inner subsections (or use simple `Separator` / spacing) for visual rhythm.

### Behavior

- Section is collapsed by default for all users.
- If any of the three features already has data (e.g. `charitableGiving.enabled`, `lifeEvents.length > 0`, `survivorSettings.enabled`), default `advancedOpen` to `true` so existing users immediately see their configured settings.
- No changes to data model, defaults, projections, or any other component.

### Out of scope

- No changes to `Index.tsx`, `useProjections`, schema, or persisted CSV.
- Roth Conversion Strategy, Standard Deduction, and other Tax Settings remain visible at the top level.
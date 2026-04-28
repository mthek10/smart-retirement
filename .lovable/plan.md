## Goal

Make it immediately obvious what **After-Tax Equivalent** and **Lifetime Net Wealth** each answer, why they can disagree, and which one to trust when comparing strategies.

## Problem today

In each strategy card the user sees two bold dollar numbers stacked on top of each other:

```text
After-Tax Equivalent      $19,134,000
Lifetime Net Wealth       $15,372,000
```

There's no visual hierarchy, no plain-English label, and no indication of how the two relate. The tooltips explain it, but only if the user hovers — and even then the relationship ("one minus the other plus taxes paid") isn't shown.

## Proposed redesign (per strategy card)

Replace the current two flat rows with a small grouped block that:

1. **Renames** the metrics to action-oriented questions.
2. **Adds a one-line subtitle** under each number.
3. **Shows the arithmetic** that links them.
4. **Marks the headline metric** (Lifetime Net Wealth) with the primary color and a "Best for comparing strategies" pill so the eye lands there first.

### New layout

```text
┌─────────────────────────────────────────────────────┐
│  What you'd have left at the end                    │
│  After-Tax Equivalent                  $19.13M      │
│  Spendable wealth on the final day of the plan      │
│                                                     │
│      −  Avg lifetime taxes paid         $3.76M      │
│      ───────────────────────────────────────        │
│                                                     │
│  True lifetime wealth   ★ headline      $15.37M     │
│  Final wealth after subtracting every tax dollar    │
│  you paid along the way — use this to compare       │
│  strategies                                         │
└─────────────────────────────────────────────────────┘
```

- "After-Tax Equivalent" keeps its name (users have seen it) but gains the subtitle *"Spendable wealth on the final day of the plan."*
- "Lifetime Net Wealth" gets the subtitle *"Final wealth after subtracting every tax dollar you paid along the way."*
- The subtraction line is rendered as a faint indented row (`− Avg lifetime taxes paid  $X`) so the relationship is visible without a tooltip.
- The headline number is bold + primary color + a small "Best for comparing" badge. The After-Tax Equivalent stays neutral foreground.

### Updated explainer block (below the cards)

Replace the current dense paragraph with a two-line contrast:

> **After-Tax Equivalent** answers *"How much wealth is left at the end?"* — a snapshot.
>
> **Lifetime Net Wealth** answers *"How much wealth did this strategy actually keep, after every tax bill along the way?"* — the fair comparison. A strategy that converts to Roth pays tax earlier, so its After-Tax Equivalent looks lower, but its Lifetime Net Wealth is usually higher.

## Files to change

- `src/components/MonteCarloResults.tsx` — lines ~234–247 (the two metric rows) and lines ~327–332 (the explainer). Pure presentation changes; no calculation or hook changes.

## Out of scope

- No changes to `useMonteCarloSimulation.ts` or any math. Numbers and tooltips stay accurate; only labeling, ordering, hierarchy, and the inline subtraction row change.
- No changes to Strategy Comparison or other tabs.

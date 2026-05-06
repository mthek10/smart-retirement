1. Fix the root cause of the duplicate column
- Pass the raw selected Roth strategy key into `StrategyComparison` (for example: `none`, `fill_22`, `maximize_after_tax`) instead of relying only on the display label.
- In `Index.tsx`, also add the missing display label for `maximize_after_tax` so it no longer falls back to `Current`.

2. Compare strategy identity, not column titles
- Update the table visibility logic in `StrategyComparison.tsx` to determine whether the current column is redundant based on the effective strategy key, not the human-readable heading.
- Hide the current column when it resolves to the same strategy as:
  - Baseline (`none`)
  - Optimized (`fill_22`)
  - Auto-Max’s chosen strategy
- This will correctly remove duplicates when:
  - the user selected `maximize_after_tax` (current metrics already equal auto-max)
  - the user selected `fill_12`, `fill_24`, or another bracket that auto-max also chose

3. Keep labels accurate and aligned with the actual data
- Ensure the visible column titles always match the strategy that produced the metrics.
- Preserve the existing dynamic auto-max title, while making the current title reflect the true selected strategy instead of generic `Current`.

4. Re-check table structure after column removal
- Keep the dynamic column count / `colSpan` behavior already added.
- Verify the Tax Efficiency and Longevity group headers still span the correct number of columns after the current column is hidden.

Technical details
- Likely issue found:
  - `currentMetrics` can already equal `autoMaxMetrics` because `calculateProjections(...)` resolves `maximize_after_tax` into the optimizer’s chosen bracket.
  - But `showCurrentColumn` currently compares display text (`currentStrategyName`) rather than strategy identity.
  - `Index.tsx` currently does not map `maximize_after_tax`, so the label falls through to `Current`, which prevents duplicate detection.
- Files to update:
  - `src/pages/Index.tsx`
  - `src/components/StrategyComparison.tsx`

Expected result
- The Two-Pass Strategy Comparison table will only show distinct strategies.
- If the current strategy is effectively the same as auto-max, baseline, or fill-to-22, its duplicate column will disappear.
## Issue

In the Two-Pass Strategy Comparison table, the "Optimized - Fill to 22%" column and the starred "Maximize Lifetime Wealth" column show identical values whenever the auto-max optimizer also selects `fill_22`. Similarly, when the optimizer picks `none`, the "Baseline - No Conversion" column duplicates the auto-max column.

The "Current" column already has duplicate-detection logic (lines 43-48), but Baseline and Optimized do not.

## Fix

In `src/components/StrategyComparison.tsx`, extend the column-hiding logic so that:

1. **Hide the "Optimized - Fill to 22%" column** when `autoMaxStrategy === 'fill_22'` (auto-max already represents it).
2. **Hide the "Baseline - No Conversion" column** when `autoMaxStrategy === 'none'` (auto-max already represents it).
3. Keep the existing logic that hides the "Current" column when it duplicates baseline / optimized / auto-max.

### Implementation details

- Add `showBaselineColumn` and `showOptimizedColumn` flags alongside `showCurrentColumn`.
- Compute `colCount` / `colSpan` dynamically from the count of visible strategy columns + 1 (for the Metric label).
- Wrap the Baseline `<th>` and each Baseline `<td>` cell in `{showBaselineColumn && ...}`.
- Wrap the Optimized `<th>` and each Optimized `<td>` cell in `{showOptimizedColumn && ...}`.
- Update the group-header rows (`Tax Efficiency`, `Longevity`) to use the dynamic `colSpan`.
- The auto-max column always remains visible (it's the recommended strategy).

The Survivor Tax Impact section below uses Baseline + Current + Survivor Smoothed and is unrelated — leave it alone.

No changes to calculations, recommendations cards, or any other component.
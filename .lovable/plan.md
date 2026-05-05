## Remove "Optimization Goal" from Tax Settings

The `optimizationGoal` field doesn't drive any projection math — it only changes the wording of one recommendation card and toggles a couple of cosmetic badges in `StrategyComparison`. The actual strategy is set by `rothConversionStrategy` (which now includes the auto-pick `maximize_after_tax` option). So the dropdown can go.

### Changes

**1. `src/components/TaxSettings.tsx`**
- Remove the entire "Optimization Goal" `<Select>` block (lines ~498–520, the section above the Standard Deduction line). Keep the Standard Deduction row inside the same `pt-4 border-t` container.
- Remove `optimizationGoal?: string` from the local props/type.

**2. `src/pages/Index.tsx`**
- Remove `optimizationGoal: "minimize-taxes"` from default tax settings (line 101).
- Remove the `optimizationGoal={taxSettings.optimizationGoal}` prop passed to `StrategyComparison` (line 838).

**3. `src/components/StrategyComparison.tsx`** — switch from one goal-driven card to three side-by-side recommendation cards:
- Drop `optimizationGoal` from the props interface and destructuring.
- Replace `getRecommendation()` (single object) with three computed recommendations: `taxRecommendation`, `longevityRecommendation`, `balancedRecommendation`. Each picks its winner across baseline / current / optimized / autoMax using the existing `taxWinner`, `longevityWinner`, `balanceWinner` values, and produces `{ title, strategy, savings, tradeoff, icon, color }` exactly like today.
- Replace the single "Goal-Based Recommendation" block (lines ~334–373) with a `grid gap-4 md:grid-cols-3` of three cards reusing the existing color/icon styling (green / blue / purple).
- Header badge: change `hasImprovement && optimizationGoal === 'minimize-taxes'` to just `hasImprovement` so the "Potential Savings" badge always shows when relevant.
- Bottom Summary Section: drop the `optimizationGoal !== 'maximize-longevity'` and `optimizationGoal === 'minimize-taxes'` guards so those tip cards show whenever their numeric conditions are met.

**4. Persisted setup CSV / scenarios**
- `optimizationGoal` is read off `taxSettings` only inside `StrategyComparison`. No tests or storage code reference it. Existing saved drafts that still contain the field will simply be ignored — no migration needed.

### Out of scope
- No changes to projection math, `useProjections`, or `strategyOptimizer`.
- No changes to the `rothConversionStrategy` dropdown itself.

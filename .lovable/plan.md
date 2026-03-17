

# Code Optimization & Cleanup Plan

## Overview
After a thorough analysis of the entire codebase, here are the optimization opportunities organized by impact.

---

## 1. Cache Intl.NumberFormat (Quick Win - All Currency Formatting)

`formatCurrency()` in `src/lib/utils.ts` creates a **new `Intl.NumberFormat` object on every call**. Since this formatter is used hundreds of times per render (every cell in ProjectionTable, every SummaryCard, Monte Carlo results), caching it at module level is a free performance win.

**Change**: Create the formatter once at module scope and reuse it.

---

## 2. Memoize `handleAccountsChange` with `useCallback` (Index.tsx)

Currently defined as a plain function, so it's recreated every render and causes `SetupWizard` to re-render unnecessarily.

**Change**: Wrap in `useCallback` with `[accounts.rothReturn]` dependency.

---

## 3. Fix Monte Carlo Debounce Effect Dependencies (MonteCarloResults.tsx)

The two debounce `useEffect` hooks reference `settings` in their body but don't list it in the dependency array. This can cause stale closure bugs where changing `numSimulations` and then a slider produces wrong settings.

**Change**: Add `settings` to the dependency arrays or use a ref for the latest settings value.

---

## 4. Replace `JSON.parse(JSON.stringify())` with `structuredClone` (useScenarios.ts)

The deep clone in `addScenario` uses the JSON round-trip hack. Modern browsers support `structuredClone` which is cleaner and handles edge cases better (e.g., `Date` objects, which are actually used in `createdAt`).

**Change**: `structuredClone(ssData)` and `structuredClone(taxSettings)`.

---

## 5. Single-Pass Histogram in Monte Carlo (MonteCarloResults.tsx)

The histogram computation runs 3 `.filter()` calls per bin (30 total filter passes over outcome arrays). This can be done in a single pass by bucketing each outcome as it's visited.

**Change**: Replace the nested loop+filter with a single iteration over each strategy's outcomes, assigning each to its bin by index calculation.

---

## 6. Deduplicate `calculateMetrics` Depletion Logic (useProjections.ts)

`calculateMetrics` (lines 881-965) duplicates the same depletion-detection loop that already exists in the `summary` useMemo in `Index.tsx` (lines 237-273). The Index.tsx version is only used for the dashboard, while `calculateMetrics` is used for strategy comparison -- so they serve different consumers, but the logic is identical.

**Change**: Extract a shared `findDepletionAges(projections)` utility function used by both, reducing ~40 lines of duplication.

---

## 7. Remove Unused `src/App.css`

`src/App.css` contains leftover Vite boilerplate styles (logo spin animation, `.read-the-docs`, etc.) that are not used anywhere in the application. It can be safely deleted.

**Change**: Delete `src/App.css`. Verify no imports reference it.

---

## 8. Consolidate Repeated `inflationMultiplier` Calculations (taxCalculations.ts)

`Math.pow(1 + inflationRate, yearIndex)` is computed independently in every tax function called per projection year (`calculateFederalTax`, `calculateIRMAA`, `calculateCapitalGainsTax`, `calculateNIIT`, `calculateAMT`, `getMarginalTaxBracket`, etc.). For a 40-year projection, this means ~240+ redundant `Math.pow` calls.

**Change**: Pre-compute `inflationMultiplier` once per year in `calculateProjections` and pass it to tax functions as a parameter (or create an internal helper that accepts the pre-computed value). This is a moderate refactor but eliminates the most frequently repeated computation.

---

## Summary of Changes

| File | Change | Impact |
|------|--------|--------|
| `src/lib/utils.ts` | Cache `Intl.NumberFormat` | Reduces GC pressure on every render |
| `src/pages/Index.tsx` | `useCallback` for `handleAccountsChange` | Prevents unnecessary SetupWizard re-renders |
| `src/components/MonteCarloResults.tsx` | Fix stale closure in debounce effects; single-pass histogram | Correctness fix + minor perf |
| `src/hooks/useScenarios.ts` | `structuredClone` instead of JSON hack | Cleaner, handles Date objects |
| `src/hooks/useProjections.ts` | Extract shared depletion utility | ~40 lines deduplication |
| `src/App.css` | Delete unused file | Cleanup |
| `src/lib/taxCalculations.ts` | Pre-compute inflation multiplier | Eliminates ~240 redundant `Math.pow` calls per calculation |




## Fix: Bracket Badge Showing 35% Instead of 24%

### Root Cause

The `getBracketRoom()` function in `src/lib/incomeAlerts.ts` has a boundary condition bug. When taxable income equals **exactly** the top of a bracket (e.g., $383,900 for married filing jointly at 24%), the algorithm fails to match the bracket correctly.

**The bug is on line 108:**
```typescript
if (taxableIncome >= inflatedMin && taxableIncome < inflatedMax)
```

When income = $383,900 (the 24% bracket max for married):
- 24% bracket: min=$201,050, max=$383,900 → `383,900 < 383,900` is FALSE, so it skips
- 32% bracket: min=$383,900, max=$487,450 → `383,900 >= 383,900 && 383,900 < 487,450` is TRUE

So technically, at the exact boundary, the algorithm correctly identifies the **next** bracket (32%). But the "Fill to 24%" strategy should fill **up to but not exceeding** the 24% bracket top, meaning taxable income should be `$383,899` or slightly less, not exactly `$383,900`.

This suggests the **real bug** might be in how the Roth conversion strategy calculates the target income - it may be filling to the bracket top **inclusive** rather than staying just below it.

---

### Two-Part Fix

#### Part 1: Fix `getBracketRoom()` Edge Case Handling

**File: `src/lib/incomeAlerts.ts`**

Update the bracket-finding logic to handle the edge case more gracefully. When income is exactly at a bracket boundary, treat it as still being in the lower bracket for display purposes:

```typescript
// Find current bracket
let currentBracketIndex = 0;
for (let i = 0; i < brackets.length; i++) {
  const inflatedMin = brackets[i].min * inflationMultiplier;
  const inflatedMax = brackets[i].max * inflationMultiplier;
  // Use <= for max to include the exact boundary in the lower bracket
  if (taxableIncome >= inflatedMin && taxableIncome <= inflatedMax) {
    currentBracketIndex = i;
    break;
  }
  if (i === brackets.length - 1) {
    currentBracketIndex = i;
  }
}
```

#### Part 2: Verify Roth Conversion Strategy Logic

**File: `src/hooks/useProjections.ts`** (needs investigation)

Check that the "Fill to 24%" strategy calculates conversions to stay **within** the bracket, not at the exact boundary. The conversion amount should target:
```
conversionAmount = bracketTop - currentTaxableIncome - 1
```
(subtracting $1 to stay safely inside the bracket)

---

### Expected Result

After these fixes:
- When you select "Fill to 24%", the bracket badge will correctly show **24%**
- The gauge will show ~100% filled in the 24% bracket
- The "Room Remaining" will show $0 or a very small amount


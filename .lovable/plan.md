
# Fix Input Lag on Setup Tab

## Problem
Typing in text fields on the Setup tab causes noticeable lag because every keystroke immediately triggers the full projection engine. The `useTwoPassProjections` hook runs up to 4 complete projection calculations (each iterating 40+ years with binary search per year) synchronously on every state change.

Some input components already use `DebouncedInput` (HouseholdInputs, AccountInputs), but several others use raw `<Input>` and trigger recalculations instantly:
- TaxSettings (target take-home, state rate, custom Roth amount, relocation age)
- EmploymentInputs (salary, retirement age, 401k contributions, employer match)
- SocialSecurityPlanner (estimated benefit)
- ACASettings (custom benchmark premium)

## Solution

Rather than adding debouncing to each individual input (whack-a-mole), debounce the **inputs to the projection engine itself**. This is a single, centralized fix that protects against lag from any input -- current or future.

### Step 1: Debounce the projection inputs

In `Index.tsx`, apply the existing `useDebouncedValue` hook to the three state objects that feed `useTwoPassProjections`:

```text
const debouncedAccounts = useDebouncedValue(accounts, 400);
const debouncedSSData = useDebouncedValue(ssData, 400);
const debouncedTaxSettings = useDebouncedValue(taxSettings, 400);
```

Then pass the debounced values to the projection hook:

```text
const twoPassResults = useTwoPassProjections(debouncedAccounts, debouncedSSData, debouncedTaxSettings);
```

### Step 2: Update downstream consumers

Other heavy consumers that depend on `projections` already derive from `twoPassResults`, so they automatically benefit. The Monte Carlo simulation already has its own debouncing, but its inputs should also use the debounced values:

```text
const monteCarloResults = useMonteCarloSimulation(
  debouncedAccounts, debouncedSSData, debouncedTaxSettings, debouncedMonteCarloSettings
);
```

### Step 3: Convert remaining raw Inputs to DebouncedInput

For consistent immediate visual feedback (characters appearing instantly while typing), switch the remaining raw `<Input>` components to `<DebouncedInput>`:

- **EmploymentInputs.tsx** - 8 Input fields (salary, retirement age, 401k amounts, employer match for both spouses)
- **SocialSecurityPlanner.tsx** - 2 Input fields (estimated benefit for each spouse)
- **TaxSettings.tsx** - 3 Input fields (target take-home, state rate, custom Roth conversion amount, relocation age)
- **ACASettings.tsx** - 1 Input field (custom benchmark premium)

This ensures users see their keystrokes immediately without waiting for the debounce.

## What stays the same
- All Select dropdowns, Switches, Checkboxes, and Sliders will continue to trigger updates immediately (they're discrete choices, not typing)
- The UI components on the Setup tab continue to show the un-debounced (immediate) values for responsive feedback
- The Dashboard, Projections, and Analysis tabs update after a 400ms pause in typing

## Technical details

Files to modify:
1. **src/pages/Index.tsx** - Add 3 `useDebouncedValue` calls, pass debounced values to projection/Monte Carlo hooks
2. **src/components/EmploymentInputs.tsx** - Replace `Input` with `DebouncedInput` on numeric fields
3. **src/components/SocialSecurityPlanner.tsx** - Replace `Input` with `DebouncedInput` on benefit fields
4. **src/components/TaxSettings.tsx** - Replace `Input` with `DebouncedInput` on numeric fields
5. **src/components/ACASettings.tsx** - Replace `Input` with `DebouncedInput` on premium field

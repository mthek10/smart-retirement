

# Run Calculations Only on "Go to Dashboard" Click

## Problem
Even with debouncing, the projection engine still recalculates while users are editing fields on the Setup tab. Users want calculations to run only when they explicitly click the "Go to Dashboard" button.

## Solution
Introduce a "committed inputs" pattern: the projection engine reads from a frozen snapshot of the inputs, and that snapshot only updates when the user clicks "Go to Dashboard" (or switches tabs manually).

### Step 1: Replace debounced values with committed state

In `src/pages/Index.tsx`:
- Remove the three `useDebouncedValue` calls for `accounts`, `ssData`, and `taxSettings`
- Add "committed" versions of these state objects using `useState`:
  ```text
  const [committedAccounts, setCommittedAccounts] = useState(accounts);
  const [committedSSData, setCommittedSSData] = useState(ssData);
  const [committedTaxSettings, setCommittedTaxSettings] = useState(taxSettings);
  ```
- Create a `commitInputs` function that snapshots the current values:
  ```text
  const commitInputs = () => {
    setCommittedAccounts(accounts);
    setCommittedSSData(ssData);
    setCommittedTaxSettings(taxSettings);
  };
  ```

### Step 2: Wire up the "Go to Dashboard" button

Update the "Go to Dashboard" button's `onClick` to call `commitInputs` before switching tabs:
```text
<Button onClick={() => { commitInputs(); setActiveTab("dashboard"); }}>
  Go to Dashboard ->
</Button>
```

Also commit inputs when the user clicks directly on the Dashboard, Projections, or Analysis tab triggers (not Setup), so switching tabs always gives fresh results:
```text
<TabsList>
  <TabsTrigger value="setup">Setup</TabsTrigger>
  <TabsTrigger value="dashboard" onClick={commitInputs}>Dashboard</TabsTrigger>
  <TabsTrigger value="projections" onClick={commitInputs}>Projections</TabsTrigger>
  <TabsTrigger value="analysis" onClick={commitInputs}>Analysis</TabsTrigger>
</TabsList>
```

### Step 3: Pass committed values to heavy hooks

Replace the debounced inputs with the committed ones:
```text
const twoPassResults = useTwoPassProjections(committedAccounts, committedSSData, committedTaxSettings);
const monteCarloResults = useMonteCarloSimulation(committedAccounts, committedSSData, committedTaxSettings, ...);
```

The `useMemo` inside these hooks will only recalculate when the committed values change -- which only happens on explicit user action.

### Step 4: Keep DebouncedInput components

The `DebouncedInput` components added in the previous change still serve a purpose: they give immediate typing feedback in the text fields. They stay as-is since they handle the local display value vs. the state update. The key difference is that even when the state updates (after debounce), no projection runs until the user commits.

## What changes for the user
- Typing on the Setup tab will feel completely instant -- zero lag, zero background calculations
- Clicking "Go to Dashboard" (or any other tab) triggers the full calculation
- Clicking directly on Dashboard/Projections/Analysis tabs also triggers recalculation, so users always see up-to-date results

## Files to modify
1. **src/pages/Index.tsx** -- Remove `useDebouncedValue` calls, add committed state + `commitInputs` function, wire up buttons and tab triggers, pass committed values to hooks

## Short answer

No — it does not make sense, and the result is still biased. My previous fix solved one bug but introduced another, and there are additional structural problems. There are **four distinct issues** still pushing the comparison against Roth conversions.

## Why "No Conversions" is still winning unfairly

### 1. The previous "fix" now double-charges conversion tax (the new bug)

The deterministic projection in `useProjections.ts` handles conversion taxes two ways:

- **Default (`rothConversionTaxSource === "brokerage"`)**: tax is paid out of the brokerage withdrawal, and the **full gross conversion** is credited to Roth (line 1097: `rothBalance += rothConversion`). The tax is *already baked into* `baselineRow.withdrawals` and `baselineRow.totalTaxes`.
- **"conversion" mode**: tax is netted out of the Roth credit (line 1095).

My recent MC change *always* credits Roth net-of-tax (`actualConversion * (1 - conversionRate)`). In the default brokerage-tax mode, this means the conversion tax is now subtracted **twice**: once via the withdrawal (which we already replay through `baselineRow.withdrawals`) and again from the Roth credit. This systematically shrinks the Roth balance for every conversion strategy.

### 2. The terminal tax rate is computed off the **wrong projection**

Each strategy uses its own `baselineProjections` (the deterministic run for that strategy). For `none`, late-life ordinary income is dominated by RMDs on a huge un-converted Traditional balance — pushing the tail rate up. For `fill_24`, the Traditional balance is much smaller late in life, so the tail rate is lower. We then apply that lower rate to that strategy's *much smaller* Trad remainder. That's correct in spirit, but combined with bug #1 it isn't enough to overcome the double-tax penalty.

More importantly: `totalTaxes / ordinaryIncome` is an **average** rate, not a marginal rate. Liquidating a $1.5M Trad balance at death wouldn't happen at the average rate — it would push into top brackets. So we systematically *under-tax* the No-Conversion strategy's massive terminal Traditional balance, which is the opposite of what we want.

### 3. Lifetime tax is sampled from the deterministic projection, not the simulation

`lifetimeTax += baselineRow.totalTaxes` uses the deterministic tax bill regardless of how the random returns played out. That means in down-market simulations where a Roth conversion strategy *should* have paid less tax (smaller balances → smaller RMDs → lower brackets), we still book the full deterministic tax. This understates the lifetime-tax advantage of conversions in bad markets.

### 4. Returns are applied **after** withdrawals all year

The MC loop withdraws first, then applies the random return to the post-withdrawal balance. Roth balances (which conversions build up) are the *last* dollars touched, so they sit in the account longer and benefit most from compounding. By applying the random return uniformly across all three accounts after withdrawals, we don't lose anything here — but we also lose the tax-free compounding *advantage* that makes Roth valuable in the first place: in the simulation, $1 in Trad and $1 in Roth grow identically, and only the terminal haircut differentiates them. Over 30+ years of variance, the terminal haircut is small noise compared to the lifetime tax differential — which we just established (#3) is being mis-attributed.

## The fix

### A. Stop double-counting conversion tax

Match the deterministic engine exactly: only net out tax from the Roth credit when `rothConversionTaxSource === "conversion"`. Otherwise credit the gross (the brokerage already paid).

```ts
// in runSingleSimulation, replace the current conversion block
if (rothConversion > 0 && traditionalBalance > 0) {
  const actualConversion = Math.min(rothConversion, traditionalBalance);
  traditionalBalance -= actualConversion;
  if (taxSettings.rothConversionTaxSource === "conversion") {
    rothBalance += actualConversion * (1 - strategyConversionRate(strategy));
  } else {
    rothBalance += actualConversion; // tax already came out of withdrawals
  }
}
```

### B. Use a **liquidation** rate for terminal Trad, not an average rate

The After-Tax Equivalent assumes you cash out the remaining Trad balance. That's a lump-sum event that runs through the brackets from $0 up. Replace `totalTaxes / ordinaryIncome` with a real bracket walk on the median terminal Trad balance using the user's filing status (and projected inflation-adjusted brackets at the terminal year). This will:

- Raise the effective rate on the No-Conversion strategy's huge terminal Trad pile (correctly).
- Keep the rate modest on conversion strategies whose terminal Trad is small.

`src/lib/taxCalculations.ts` already has the bracket utilities — we'll add a `calculateLumpSumOrdinaryTax(amount, filingStatus, year, inflationRate)` helper.

### C. Scale lifetime tax by simulated ordinary income

In each simulated year, scale the deterministic year's `totalTaxes` by how much smaller/larger our actual Trad withdrawal ended up vs. the deterministic one (proxy: `balanceRatio` we already compute). This gives strategies credit for *actually* paying less tax in poor markets where their balances shrank.

### D. Update the on-card explainer and tooltip

The After-Tax Equivalent tooltip should explain it now uses a lump-sum liquidation rate. The "Why these depletion ages differ" footer should point users at **Lifetime Net Wealth** as the headline, and explicitly note that Success Rate is the most important number.

### E. Refresh the guardrail tests

Update `src/hooks/useMonteCarloSimulation.test.ts` to:
- Assert that with `rothConversionTaxSource === "brokerage"` (the default), gross conversion is credited to Roth (not net).
- Assert that the lump-sum liquidation tax on $1.5M single-filer is meaningfully higher than 22% (somewhere ~30%+).
- Assert directionally that `fill_24` now has higher `medianLifetimeNetWealth` than `none` in a high-Trad-balance scenario.

## Files changed

- `src/hooks/useMonteCarloSimulation.ts` — fixes A, B, C
- `src/lib/taxCalculations.ts` — add `calculateLumpSumOrdinaryTax` helper
- `src/components/MonteCarloResults.tsx` — fix D (tooltip + footer)
- `src/hooks/useMonteCarloSimulation.test.ts` — fix E

## What I am **not** changing

- The simulation's withdrawal-first / return-second loop (issue #4 is structural; fixing it would be a larger rewrite and the bracket-correct terminal tax in fix B largely compensates).
- The deterministic projection itself.
- The 50% gain assumption for taxable accounts (out of scope here).

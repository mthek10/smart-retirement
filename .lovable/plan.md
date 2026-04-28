## What's wrong today

The After-Tax Equivalent metric haircuts the terminal Taxable balance with a flat assumption:

```ts
medianFinalTaxable * (1 − 15% × 50%)   // ≈ 7.5% haircut, forever
```

That 50% gain fraction is reasonable for *today's* brokerage balance (the user enters their cost basis percent in inputs). But the metric applies it to the **terminal** balance 30+ years out, by which point compounding has turned almost the entire balance into gains. Result: huge end-of-plan Taxable balances look ~92.5% spendable when the real number is closer to 80–82%. Strategies that *preserve* a large Taxable pile (No Conversions) get artificially flattered vs. strategies that drain it to fund Roth conversions.

## The fix: decay basis fraction over the horizon

Replace the flat 50% gain fraction with one that grows over time, anchored to the user's actual starting basis from `accounts.taxableCostBasisPercent`.

### Math

For a balance growing at rate `r` over `t` years with starting basis fraction `b₀`:

```text
basisFraction(t) = b₀ / (1 + r)^t
gainFraction(t)  = 1 − basisFraction(t)
```

Intuition: the basis dollars don't compound (they're already after-tax principal), but the balance does. So basis-as-a-share-of-balance shrinks geometrically.

Worked example (your MFJ scenario):
- Starting basis: 67% (= $2M basis on $3M)
- Growth rate: 5% nominal (deterministic)
- Horizon: 35 years
- `basisFraction(35) = 0.67 / 1.05^35 = 0.67 / 5.52 = 12.1%`
- `gainFraction(35) = 87.9%`
- Old haircut: 15% × 50% = **7.5%**
- New haircut: 15% × 87.9% = **13.2%**

On an $18M terminal Taxable balance, that's the difference between an $810K tax reserve and a $2.37M tax reserve — about **$1.56M shaved off** the No-Conversions After-Tax Equivalent. That should flip the ranking to match Lifetime Net Wealth in your scenario.

### Implementation

In `src/hooks/useMonteCarloSimulation.ts`:

1. **Read starting basis from accounts**: `b₀ = accounts.taxableCostBasisPercent / 100`. Default to 0.5 if missing/zero/invalid.
2. **Use the deterministic taxable growth rate**: `r = accounts.taxableReturn / 100`. This matches the projection engine's assumption — not the Monte Carlo sampled rate, because we're computing a metric on the *median* terminal balance.
3. **Compute horizon**: same `yearsToTerminal` we already use for the lump-sum federal tax.
4. **Floor at zero**: `gainFraction = max(0, 1 − b₀ / (1+r)^t)`.
5. **Replace the constant** at the single call site:

```ts
const taxableGainFraction = Math.max(
  0,
  1 - (accounts.taxableCostBasisPercent / 100 || 0.5) / Math.pow(1 + (accounts.taxableReturn / 100), yearsToTerminal)
);

const medianFinalAfterTax =
  (medianFinalTraditional - terminalLumpSumTax) +
  medianFinalRoth +
  medianFinalTaxable * (1 - ASSUMED_LTCG_RATE * taxableGainFraction);
```

6. **Remove the `ASSUMED_GAIN_FRACTION` constant** (no other call sites).

### UI tooltip update

Update the After-Tax Equivalent tooltip in `src/components/MonteCarloResults.tsx` to reflect the dynamic basis decay. New text:

> "Estimated spendable wealth at end of plan: Trad − federal tax owed if liquidated as a lump sum (effective {rate}, computed by walking inflation-adjusted brackets) + Roth + Taxable × (1 − 15% × {gainFraction} estimated unrealized gains). Gain fraction grows with horizon as compounding outpaces the original cost basis. State tax not included."

This requires surfacing the computed `gainFraction` to the UI. Add `medianTaxableGainFraction: number` to `StrategySimulationResults` and thread it through.

### Tests to add (in `src/hooks/useMonteCarloSimulation.test.ts`)

- **Decay produces higher gain fraction than 50% over 30+ years** at 5% growth with 67% basis (should land ~88%).
- **Short horizon stays close to starting basis** (e.g. 1 year, basis 67% → gain fraction ~6%, not 50%).
- **Floor at zero** when `b₀ / (1+r)^t > 1` (e.g. 100% basis, 0% growth → gain fraction = 0).

## What I am NOT changing

- The 15% LTCG rate. Adding NIIT (3.8%) and the 20% bracket would help even more, but it's a separate decision and adds UI complexity (the user might be in a low-income post-conversion year). Doing one fix at a time keeps it auditable.
- The lump-sum Trad bracket walk (already correct).
- Lifetime Net Wealth (already the better headline metric — this fix just brings After-Tax Equivalent into closer agreement with it).
- The deterministic `useProjections.ts` engine. This is purely a metric-display fix.

## Files changed

- `src/hooks/useMonteCarloSimulation.ts` — basis decay logic + new field on results type
- `src/components/MonteCarloResults.tsx` — updated tooltip showing dynamic gain fraction
- `src/hooks/useMonteCarloSimulation.test.ts` — three new guardrail tests

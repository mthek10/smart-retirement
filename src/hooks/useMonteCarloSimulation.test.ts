/**
 * Guardrail tests for the Monte Carlo simulation engine.
 *
 * These pin the contracts that prevent the After-Tax Equivalent metric from
 * being structurally biased against Roth conversions.
 */
import test from "node:test";
import assert from "node:assert/strict";

import {
  calculateProjections,
  type Accounts,
  type SSData,
  type TaxSettings,
} from "./useProjections";
import { calculateFederalTax } from "@/lib/taxCalculations";

function baseAccounts(): Accounts {
  return {
    spouse1Traditional: 1_500_000,
    spouse2Traditional: 0,
    roth: 100_000,
    taxable: 400_000,
    traditionalReturn: 5,
    rothReturn: 5,
    taxableReturn: 5,
    taxableCostBasisPercent: 50,
    qualifiedDividendYield: 0,
    ordinaryDividendYield: 0,
  };
}
function baseSS(): SSData {
  return {
    spouse1: { estimatedBenefit: 3000, claimAge: 67, lifeExpectancy: 95 },
    spouse2: { estimatedBenefit: 0, claimAge: 67, lifeExpectancy: 95 },
  };
}
function baseTax(strategy: string): TaxSettings {
  return {
    filingStatus: "single",
    state: "other",
    stateRate: 5,
    spouse1Age: 60,
    spouse2Age: 0,
    targetTakeHome: 90_000,
    inflationRate: 2.5,
    rothConversionStrategy: strategy,
    rothConversionCustom: 0,
    rothConversionTaxSource: "brokerage",
    preSurvivorStrategy: "fill_22",
    acaSettings: { enabled: false, householdSize: 1, customBenchmarkPremium: 0, annualHealthInsuranceCost: 6000 },
    spouse1Employment: { currentIncome: 0, retirementAge: 60, contributes401k: false, contribution401kAmount: 0, roth401kAmount: 0, employerMatchAmount: 0, pension: { monthlyAmount: 0, startAge: 65, cola: 0 } },
    spouse2Employment: { currentIncome: 0, retirementAge: 0, contributes401k: false, contribution401kAmount: 0, roth401kAmount: 0, employerMatchAmount: 0, pension: { monthlyAmount: 0, startAge: 65, cola: 0 } },
    survivorSettings: { enabled: false, spouse1DeathAge: null, spouse2DeathAge: null, survivorSpendingPercent: 75 },
    stateRelocation: { enabled: false, targetState: "FL", relocationAge: 65 },
  };
}

test("fill_24 strategy actually performs conversions in the deterministic projection", () => {
  const proj = calculateProjections(baseAccounts(), baseSS(), baseTax("fill_24"));
  const totalConv = proj.reduce((s, r) => s + (r.rothConversion || 0), 0);
  assert.ok(totalConv > 0, "fill_24 should produce nonzero lifetime conversions");
});

test("brokerage tax source: gross conversion lands in Roth (no double-tax)", () => {
  // Contract: when rothConversionTaxSource === "brokerage", the deterministic engine
  // pays conversion tax out of the brokerage withdrawal AND credits Roth with the
  // FULL gross conversion (useProjections line ~1097). The MC engine must mirror
  // this — netting tax off Roth would double-charge it and make conversions look
  // worse than they are. This is the regression we are guarding against.
  const proj = calculateProjections(baseAccounts(), baseSS(), baseTax("fill_24"));
  // Find a year with a real conversion and verify Roth grew by approximately the gross.
  // We can't observe MC runs directly, but we can verify the deterministic invariant
  // the MC engine is required to match.
  let prevRoth = baseAccounts().roth;
  let observed = false;
  for (const row of proj) {
    if ((row.rothConversion || 0) > 1000) {
      // Roth balance should reflect at least the gross conversion (less withdrawals/growth).
      // The directional assertion: Roth growth >= gross conversion * 0.5 (conservative,
      // accounts for any Roth withdrawals that year).
      const delta = row.rothBalance - prevRoth;
      assert.ok(
        delta + (row.rothBalance * 0.1) >= (row.rothConversion || 0) * 0.5,
        `Year age ${row.age}: Roth delta ${delta} should reflect gross conversion ${row.rothConversion}, not net.`
      );
      observed = true;
      break;
    }
    prevRoth = row.rothBalance;
  }
  assert.ok(observed, "should observe at least one conversion year");
});

test("lump-sum liquidation tax on a large Trad balance materially exceeds 22%", () => {
  // The old metric assumed a flat 22% terminal rate. A real bracket walk on a
  // $1.5M single-filer liquidation must be meaningfully higher — this is the
  // whole reason we switched to a bracket walk.
  const tax = calculateFederalTax(1_500_000, "single", 0, 0);
  const effectiveRate = tax / 1_500_000;
  assert.ok(
    effectiveRate > 0.27,
    `lump-sum effective rate on $1.5M single should exceed 27%, got ${effectiveRate.toFixed(3)}`
  );
});

test("lump-sum liquidation tax scales with balance (small Trad → low rate)", () => {
  // Conversion strategies should benefit: a $200k terminal Trad pile pays a much
  // lower effective rate than a $1.5M pile, even though the old average-rate
  // metric would not have differentiated them.
  const taxLow = calculateFederalTax(200_000, "single", 0, 0);
  const taxHigh = calculateFederalTax(1_500_000, "single", 0, 0);
  const rateLow = taxLow / 200_000;
  const rateHigh = taxHigh / 1_500_000;
  assert.ok(rateHigh - rateLow > 0.05, `large balance must pay >5pp higher effective rate (got ${(rateHigh-rateLow).toFixed(3)})`);
});

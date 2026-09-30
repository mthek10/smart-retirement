import test from "node:test";
import assert from "node:assert/strict";

import {
  calculateProjections,
  type Accounts,
  type SSData,
  type TaxSettings,
} from "./useProjections";

function buildRegressionScenario(): {
  accounts: Accounts;
  ssData: SSData;
  taxSettings: TaxSettings;
} {
  return {
    accounts: {
      spouse1Traditional: 2500000,
      spouse2Traditional: 0,
      roth: 0,
      taxable: 300000,
      traditionalReturn: 3,
      rothReturn: 3,
      taxableReturn: 3,
      taxableCostBasisPercent: 33,
    },
    ssData: {
      spouse1: {
        estimatedBenefit: 4000,
        claimAge: 70,
        lifeExpectancy: 100,
      },
      spouse2: {
        estimatedBenefit: 0,
        claimAge: 100,
        lifeExpectancy: 100,
      },
    },
    taxSettings: {
      filingStatus: "single",
      state: "other",
      stateRate: 6,
      spouse1Age: 66,
      spouse2Age: 0,
      targetTakeHome: 125000,
      inflationRate: 2.5,
      rothConversionStrategy: "none",
      rothConversionCustom: 0,
      preSurvivorStrategy: "fill_22",
      acaSettings: {
        enabled: false,
        householdSize: 1,
        customBenchmarkPremium: 0,
        annualHealthInsuranceCost: 0,
      },
      spouse1Employment: {
        currentIncome: 150000,
        retirementAge: 69,
        contributes401k: true,
        contribution401kAmount: 15000,
        roth401kAmount: 5000,
        employerMatchAmount: 1000,
        pension: {
          monthlyAmount: 2500,
          startAge: 70,
          cola: 2.5,
        },
      },
      spouse2Employment: {
        currentIncome: 0,
        retirementAge: 0,
        contributes401k: false,
        contribution401kAmount: 0,
        roth401kAmount: 0,
        employerMatchAmount: 0,
        pension: {
          monthlyAmount: 0,
          startAge: 65,
          cola: 0,
        },
      },
      survivorSettings: {
        enabled: false,
        spouse1DeathAge: null,
        spouse2DeathAge: null,
        survivorSpendingPercent: 75,
      },
      stateRelocation: {
        enabled: false,
        targetState: "FL",
        relocationAge: 65,
      },
    },
  };
}

function getInflationAdjustedTarget(
  firstYearTarget: number,
  inflationRate: number,
  yearIndex: number,
): number {
  return firstYearTarget * Math.pow(1 + inflationRate / 100, yearIndex);
}

test("pension start year still meets the inflation-adjusted take-home target", () => {
  const { accounts, ssData, taxSettings } = buildRegressionScenario();
  const projections = calculateProjections(accounts, ssData, taxSettings);

  const age69 = projections.find((row) => row.age === 69);
  const age70 = projections.find((row) => row.age === 70);
  const age71 = projections.find((row) => row.age === 71);

  assert.ok(age69, "expected an age 69 projection row");
  assert.ok(age70, "expected an age 70 projection row");
  assert.ok(age71, "expected an age 71 projection row");

  assert.equal(age69.pensionIncome, 0);
  assert.equal(Math.round(age70.pensionIncome), 30000);
  assert.equal(Math.round(age71.pensionIncome), 30750);

  const target69 = getInflationAdjustedTarget(
    taxSettings.targetTakeHome,
    taxSettings.inflationRate,
    age69.age - taxSettings.spouse1Age,
  );
  const target70 = getInflationAdjustedTarget(
    taxSettings.targetTakeHome,
    taxSettings.inflationRate,
    age70.age - taxSettings.spouse1Age,
  );
  const target71 = getInflationAdjustedTarget(
    taxSettings.targetTakeHome,
    taxSettings.inflationRate,
    age71.age - taxSettings.spouse1Age,
  );

  assert.ok(Math.abs(age69.takeHome - target69) < 2);
  assert.ok(Math.abs(age70.takeHome - target70) < 2);
  assert.ok(Math.abs(age71.takeHome - target71) < 2);

  assert.ok(age70.takeHome > age69.takeHome);
  assert.ok(age71.takeHome > age70.takeHome);
});

test("account withdrawal sources reconcile to total annual withdrawals", () => {
  const { accounts, ssData, taxSettings } = buildRegressionScenario();
  const projections = calculateProjections(accounts, ssData, taxSettings);

  assert.ok(projections.some((row) => row.withdrawals > 0), "expected at least one withdrawal year");

  for (const row of projections) {
    const accountWithdrawals = row.traditionalWithdrawal + row.rothWithdrawal + row.taxableWithdrawal;
    assert.ok(
      Math.abs(accountWithdrawals - row.withdrawals) < 0.01,
      `expected account sources to reconcile at age ${row.age}`,
    );
    assert.ok(row.traditionalWithdrawal >= 0);
    assert.ok(row.rothWithdrawal >= 0);
    assert.ok(row.taxableWithdrawal >= 0);
  }
});

test("already-claiming person receives their actual check from year 1, unadjusted", () => {
  const { accounts, ssData, taxSettings } = buildRegressionScenario();
  taxSettings.spouse1Age = 68;
  ssData.spouse1 = {
    estimatedBenefit: 3000,
    claimAge: 62,
    lifeExpectancy: 100,
    alreadyClaiming: true,
    claimedAtAge: 62,
  };

  const projections = calculateProjections(accounts, ssData, taxSettings);
  const first = projections.find((row) => row.age === 68);
  const second = projections.find((row) => row.age === 69);

  assert.ok(first, "expected an age 68 projection row");
  assert.ok(second, "expected an age 69 projection row");

  // Used exactly as entered in year 1 (no early-claim reduction, no delayed credits)
  assert.equal(Math.round(first.ssIncome), 36000);
  // COLA compounds from today forward
  assert.equal(Math.round(second.ssIncome), Math.round(36000 * 1.025));
});

function buildHarvestScenario() {
  const base = buildRegressionScenario();
  base.accounts = {
    spouse1Traditional: 0,
    spouse2Traditional: 0,
    roth: 0,
    taxable: 1000000,
    traditionalReturn: 3,
    rothReturn: 3,
    taxableReturn: 3,
    taxableCostBasisPercent: 50,
  };
  base.taxSettings.targetTakeHome = 0; // no withdrawals needed → pure harvesting
  base.taxSettings.state = "none";
  base.taxSettings.stateRate = 0;
  base.taxSettings.spouse1Employment = {
    ...base.taxSettings.spouse1Employment,
    currentIncome: 0,
    retirementAge: 66,
    contributes401k: false,
    contribution401kAmount: 0,
    roth401kAmount: 0,
    employerMatchAmount: 0,
    pension: { monthlyAmount: 0, startAge: 100, cola: 0 },
  };
  base.ssData.spouse1 = { estimatedBenefit: 0, claimAge: 100, lifeExpectancy: 100 };
  return base;
}

test("auto-harvest fills the 0% LTCG bracket and steps up basis at $0 federal tax", () => {
  const { accounts, ssData, taxSettings } = buildHarvestScenario();
  taxSettings.autoHarvestCapitalGains = true;

  const projections = calculateProjections(accounts, ssData, taxSettings);
  const first = projections[0];

  // Single filer 0% LTCG top is $47,025 (2024), inflation-indexed.
  // No other income → harvest should fill close to the bracket top.
  assert.ok(first.capitalGainsHarvested > 40000, `expected a large harvest, got ${first.capitalGainsHarvested}`);
  assert.ok(first.capitalGainsHarvested <= 50000, `harvest should stay within the 0% bracket, got ${first.capitalGainsHarvested}`);
  assert.equal(Math.round(first.federalCapitalGainsTax), 0);
  // Basis step-up: second-year harvest should still be possible (gains remain)
  assert.ok(first.taxableBalance > 0);
});

test("auto-harvest disabled produces zero harvest", () => {
  const { accounts, ssData, taxSettings } = buildHarvestScenario();
  taxSettings.autoHarvestCapitalGains = false;

  const projections = calculateProjections(accounts, ssData, taxSettings);
  assert.equal(projections[0].capitalGainsHarvested, 0);
});

test("no harvest when income already fills the 0% bracket", () => {
  const { accounts, ssData, taxSettings } = buildHarvestScenario();
  taxSettings.autoHarvestCapitalGains = true;
  // Large SS benefit pushes ordinary income past the 0% LTCG bracket top
  ssData.spouse1 = { estimatedBenefit: 8000, claimAge: 66, lifeExpectancy: 100 };

  const projections = calculateProjections(accounts, ssData, taxSettings);
  assert.equal(projections[0].capitalGainsHarvested, 0);
});

test("15% bracket harvest fills above the 0% band and pays 15% federal tax", () => {
  const { accounts, ssData, taxSettings } = buildHarvestScenario();
  taxSettings.autoHarvestCapitalGains = true;
  taxSettings.harvestFifteenBracket = true;

  const projections = calculateProjections(accounts, ssData, taxSettings);
  const first = projections[0];

  // 0% band filled first (~$47k single 2024), then the 15% tier on top
  assert.ok(first.capitalGainsHarvested > 40000, `expected 0% harvest, got ${first.capitalGainsHarvested}`);
  assert.ok(first.capitalGainsHarvested15 > 100000, `expected a large 15% harvest, got ${first.capitalGainsHarvested15}`);
  // NIIT guard: total harvest must stay under the $200k single NIIT threshold
  const total = first.capitalGainsHarvested + first.capitalGainsHarvested15;
  assert.ok(total <= 200000, `harvest should stay below the NIIT threshold, got ${total}`);
  // Federal CG tax on the 15% portion: 0% part is free, 15% part taxed at 15%
  assert.equal(Math.round(first.federalCapitalGainsTax), Math.round(first.capitalGainsHarvested15 * 0.15));
});

test("15% harvest is off by default", () => {
  const { accounts, ssData, taxSettings } = buildHarvestScenario();
  taxSettings.autoHarvestCapitalGains = true;

  const projections = calculateProjections(accounts, ssData, taxSettings);
  assert.ok(projections.every(p => p.capitalGainsHarvested15 === 0), "expected zero 15% harvests by default");
});

test("15% harvest respects never-trigger-IRMAA cap", () => {
  const { accounts, ssData, taxSettings } = buildHarvestScenario();
  taxSettings.autoHarvestCapitalGains = true;
  taxSettings.harvestFifteenBracket = true;
  taxSettings.neverTriggerIRMAA = true;

  const projections = calculateProjections(accounts, ssData, taxSettings);
  const first = projections[0];
  const total = first.capitalGainsHarvested + first.capitalGainsHarvested15;

  // First single-filer IRMAA tier is $103k MAGI (2024) — harvest must stay under it
  assert.ok(total > 0, "expected some harvest below the first IRMAA tier");
  assert.ok(total <= 110000, `harvest should be capped near the first IRMAA tier, got ${total}`);
});

test("no 15% harvest when the account has no unrealized gains", () => {
  const { accounts, ssData, taxSettings } = buildHarvestScenario();
  taxSettings.autoHarvestCapitalGains = true;
  taxSettings.harvestFifteenBracket = true;
  accounts.taxableCostBasisPercent = 100; // basis = balance → no gains to harvest

  const projections = calculateProjections(accounts, ssData, taxSettings);
  assert.equal(projections[0].capitalGainsHarvested, 0);
  assert.equal(projections[0].capitalGainsHarvested15, 0);
});

import { getSeniorDeduction } from "@/lib/taxCalculations";

test("65+ additional deduction + OBBBA senior bonus (single, low MAGI)", () => {
  assert.equal(getSeniorDeduction("single", 66, 0, 50000, 0, 0), 2050 + 6000);
});

test("senior bonus phases out at 6% of MAGI over $75k single", () => {
  // 100k MAGI → 6000 - 0.06*25000 = 4500
  assert.equal(getSeniorDeduction("single", 66, 0, 100000, 0, 0), 2050 + 4500);
});

test("married: both spouses 65+ get per-person amounts; single ignores spouse age", () => {
  assert.equal(getSeniorDeduction("married", 66, 67, 100000, 0, 0), 1650 * 2 + 12000);
  assert.equal(getSeniorDeduction("single", 60, 70, 50000, 0, 0), 0);
});

test("senior bonus expires after 2028", () => {
  // yearIndex 3 = 2029 → only the additional standard deduction remains
  assert.equal(getSeniorDeduction("single", 70, 0, 50000, 3, 0), 2050);
});

import { pickBestAfterTaxStrategy } from "@/lib/strategyOptimizer";

function buildSequencingScenario() {
  const base = buildHarvestScenario();
  base.taxSettings.spouse1Age = 60;
  base.accounts.spouse1Traditional = 800000;
  base.accounts.taxable = 800000;
  base.accounts.taxableCostBasisPercent = 20;
  base.taxSettings.targetTakeHome = 40000;
  base.taxSettings.autoHarvestCapitalGains = true;
  base.taxSettings.rothConversionStrategy = "fill_12";
  base.ssData.spouse1 = { estimatedBenefit: 2500, claimAge: 70, lifeExpectancy: 100 };
  return base;
}

test("harvest_first keeps more 0% harvest than conversions_first in the same year", () => {
  const { accounts, ssData, taxSettings } = buildSequencingScenario();
  const convFirst = calculateProjections(accounts, ssData, { ...taxSettings, conversionPriority: "conversions_first" });
  const harvFirst = calculateProjections(accounts, ssData, { ...taxSettings, conversionPriority: "harvest_first" });
  assert.ok(harvFirst[0].capitalGainsHarvested >= convFirst[0].capitalGainsHarvested);
  assert.ok(harvFirst[0].capitalGainsHarvested > 0);
});

test("conversion start age delays conversions", () => {
  const { accounts, ssData, taxSettings } = buildSequencingScenario();
  const proj = calculateProjections(accounts, ssData, { ...taxSettings, rothConversionStartAge: 65 });
  assert.ok(proj.filter(r => r.age < 65).every(r => r.rothConversion === 0));
  assert.ok(proj.some(r => r.age >= 65 && r.rothConversion > 0));
});

test("optimizer returns a sequencing choice with a readable label", () => {
  const { accounts, ssData, taxSettings } = buildSequencingScenario();
  const r = pickBestAfterTaxStrategy(accounts, ssData, taxSettings);
  assert.ok(r.label.length > 0);
  assert.ok(r.ranking.length > 5);
  assert.ok(r.ranking[0].terminalAfterTax >= r.ranking[r.ranking.length - 1].terminalAfterTax);
  console.log("best:", r.label);
});

test("defaults (no start age, conversions first) match explicit conversions_first", () => {
  const { accounts, ssData, taxSettings } = buildSequencingScenario();
  const a = calculateProjections(accounts, ssData, taxSettings);
  const b = calculateProjections(accounts, ssData, { ...taxSettings, rothConversionStartAge: null, conversionPriority: "conversions_first" });
  assert.equal(a[a.length - 1].taxableBalance, b[b.length - 1].taxableBalance);
});

function buildHealthcareScenario() {
  const base = buildHarvestScenario();
  base.taxSettings.spouse1Age = 60;
  base.taxSettings.inflationRate = 0;
  base.taxSettings.targetTakeHome = 40000;
  base.taxSettings.acaSettings = {
    enabled: true,
    householdSize: 1,
    customBenchmarkPremium: 0,
    annualHealthInsuranceCost: 10000,
  };
  return base;
}

test("ACA enabled: entered annual premium is the actual premium before subsidy", () => {
  const { accounts, ssData, taxSettings } = buildHealthcareScenario();
  const projections = calculateProjections(accounts, ssData, taxSettings);
  const year1 = projections.find((row) => row.age === 60);
  assert.ok(year1);
  assert.equal(year1.acaPremium, 10000);
  assert.equal(year1.healthcareCost, Math.max(0, 10000 - year1.acaSubsidy));
});

test("ACA disabled: manual health insurance cost is used as-is pre-Medicare", () => {
  const { accounts, ssData, taxSettings } = buildHealthcareScenario();
  taxSettings.acaSettings.enabled = false;
  const projections = calculateProjections(accounts, ssData, taxSettings);
  const year1 = projections.find((row) => row.age === 60)!;
  assert.equal(year1.healthcareCost, 10000);
  const at65 = projections.find((row) => row.age === 65)!;
  assert.ok(at65.healthcareCost < 10000, "manual cost stops at Medicare age");
});

test("MFJ: entered annual premium is used once rather than per spouse", () => {
  const base = buildHealthcareScenario();
  base.taxSettings.filingStatus = "married";
  base.taxSettings.spouse1Age = 60;
  base.taxSettings.spouse2Age = 61;
  base.taxSettings.acaSettings.householdSize = 2;
  const projections = calculateProjections(base.accounts, base.ssData, base.taxSettings);
  const year1 = projections.find((row) => row.age === 61);
  assert.ok(year1);
  assert.equal(year1.acaPremium, 10000);
  assert.equal(year1.healthcareCost, Math.max(0, 10000 - year1.acaSubsidy));
});

test("MFJ: entered premium replaces a higher modeled benchmark", () => {
  const base = buildHealthcareScenario();
  base.taxSettings.filingStatus = "married";
  base.taxSettings.spouse1Age = 63;
  base.taxSettings.spouse2Age = 64;
  base.taxSettings.acaSettings.householdSize = 2;
  const projections = calculateProjections(base.accounts, base.ssData, base.taxSettings);
  const year1 = projections.find((row) => row.age === 64);
  assert.ok(year1);
  assert.equal(year1.acaPremium, 10000);
  assert.ok(year1.healthcareCost <= 10000);
});

test("mixed-age married year: household premium is allocated to the under-65 spouse", () => {
  const base = buildHealthcareScenario();
  base.taxSettings.filingStatus = "married";
  base.taxSettings.spouse1Age = 64;
  base.taxSettings.spouse2Age = 60;
  base.taxSettings.acaSettings.householdSize = 2;
  const projections = calculateProjections(base.accounts, base.ssData, base.taxSettings);
  const mixedAgeYear = projections.find((row) => row.age === 65);
  assert.ok(mixedAgeYear);
  assert.equal(mixedAgeYear.acaPremium, 5000);
  assert.equal(
    mixedAgeYear.healthcareCost,
    mixedAgeYear.medicarePremiums + mixedAgeYear.irmaa + Math.max(0, 5000 - mixedAgeYear.acaSubsidy),
  );
});

test("ACA subsidy cannot reduce the entered premium below zero", () => {
  const { accounts, ssData, taxSettings } = buildHealthcareScenario();
  taxSettings.acaSettings.annualHealthInsuranceCost = 1000;
  const projections = calculateProjections(accounts, ssData, taxSettings);
  const year1 = projections.find((row) => row.age === 60);
  assert.ok(year1);
  assert.equal(year1.acaSubsidy, 1000);
  assert.equal(year1.healthcareCost, 0);
});

test("ACA enabled without an entered premium falls back to the modeled benchmark", () => {
  const { accounts, ssData, taxSettings } = buildHealthcareScenario();
  taxSettings.acaSettings.annualHealthInsuranceCost = 0;
  const projections = calculateProjections(accounts, ssData, taxSettings);
  const year1 = projections.find((row) => row.age === 60);
  assert.ok(year1);
  assert.ok(year1.acaPremium > 0);
  assert.equal(year1.healthcareCost, year1.acaPremium - year1.acaSubsidy);
});

test("Medicare supplemental premium adds to Part B+D for each person 65+", () => {
  const base = buildHealthcareScenario();
  base.taxSettings.spouse1Age = 70;
  base.taxSettings.acaSettings.enabled = false;
  const without = calculateProjections(base.accounts, base.ssData, base.taxSettings);
  const withSupp = calculateProjections(base.accounts, base.ssData, {
    ...base.taxSettings,
    acaSettings: { ...base.taxSettings.acaSettings, medicareSupplementalMonthlyPerPerson: 200 },
  });
  const a = without.find((row) => row.age === 70)!;
  const b = withSupp.find((row) => row.age === 70)!;
  // inflationRate is 0 in this scenario, so year 1 adds exactly 200*12 for one person
  assert.equal(Math.round(b.medicarePremiums - a.medicarePremiums), 2400);
});

test("Medicare supplemental applies per person for a married 65+ household", () => {
  const base = buildHealthcareScenario();
  base.taxSettings.filingStatus = "married";
  base.taxSettings.spouse1Age = 70;
  base.taxSettings.spouse2Age = 68;
  base.taxSettings.acaSettings.enabled = false;
  const without = calculateProjections(base.accounts, base.ssData, base.taxSettings);
  const withSupp = calculateProjections(base.accounts, base.ssData, {
    ...base.taxSettings,
    acaSettings: { ...base.taxSettings.acaSettings, medicareSupplementalMonthlyPerPerson: 150 },
  });
  const a = without.find((row) => row.age === 70)!;
  const b = withSupp.find((row) => row.age === 70)!;
  assert.equal(Math.round(b.medicarePremiums - a.medicarePremiums), 150 * 12 * 2);
});

test("mixed-age household: supplemental applies only to the spouse who is 65+", () => {
  const base = buildHealthcareScenario();
  base.taxSettings.filingStatus = "married";
  base.taxSettings.spouse1Age = 70;
  base.taxSettings.spouse2Age = 60;
  base.taxSettings.acaSettings.enabled = false;
  const without = calculateProjections(base.accounts, base.ssData, base.taxSettings);
  const withSupp = calculateProjections(base.accounts, base.ssData, {
    ...base.taxSettings,
    acaSettings: { ...base.taxSettings.acaSettings, medicareSupplementalMonthlyPerPerson: 100 },
  });
  const a = without.find((row) => row.age === 70)!;
  const b = withSupp.find((row) => row.age === 70)!;
  assert.equal(Math.round(b.medicarePremiums - a.medicarePremiums), 1200);
});

test("no supplemental premium leaves existing projections unchanged", () => {
  const base = buildHealthcareScenario();
  base.taxSettings.spouse1Age = 70;
  const a = calculateProjections(base.accounts, base.ssData, base.taxSettings);
  const b = calculateProjections(base.accounts, base.ssData, {
    ...base.taxSettings,
    acaSettings: { ...base.taxSettings.acaSettings, medicareSupplementalMonthlyPerPerson: 0 },
  });
  assert.deepEqual(a.map((r) => r.healthcareCost), b.map((r) => r.healthcareCost));
});

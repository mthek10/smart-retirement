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

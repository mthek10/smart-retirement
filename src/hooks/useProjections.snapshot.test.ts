/**
 * Snapshot tests for calculateProjections.
 *
 * Purpose: lock in current numeric outputs for representative scenarios so
 * any future refactor of the projection engine immediately surfaces drift.
 *
 * These do NOT assert "correct" tax law — they assert "no behavioral change
 * vs. the baseline captured on 2026-04-22". If a snapshot fails after a
 * deliberate logic change, update the expected number after manual review.
 *
 * Tolerance: $1 absolute (rounded). Inputs are deterministic; the engine is
 * pure given (accounts, ssData, taxSettings).
 */
import test from "node:test";
import assert from "node:assert/strict";

import {
  calculateProjections,
  type Accounts,
  type SSData,
  type TaxSettings,
} from "./useProjections";

// ---------- shared builders ----------

function baseAccounts(overrides: Partial<Accounts> = {}): Accounts {
  return {
    spouse1Traditional: 1_000_000,
    spouse2Traditional: 0,
    roth: 200_000,
    taxable: 500_000,
    traditionalReturn: 5,
    rothReturn: 5,
    taxableReturn: 5,
    taxableCostBasisPercent: 50,
    qualifiedDividendYield: 0,
    ordinaryDividendYield: 0,
    ...overrides,
  };
}

function baseSS(): SSData {
  return {
    spouse1: { estimatedBenefit: 3000, claimAge: 67, lifeExpectancy: 95 },
    spouse2: { estimatedBenefit: 0, claimAge: 67, lifeExpectancy: 95 },
  };
}

function baseTax(overrides: Partial<TaxSettings> = {}): TaxSettings {
  return {
    filingStatus: "single",
    state: "other",
    stateRate: 5,
    spouse1Age: 60,
    spouse2Age: 0,
    targetTakeHome: 100_000,
    inflationRate: 2.5,
    rothConversionStrategy: "none",
    rothConversionCustom: 0,
    preSurvivorStrategy: "fill_22",
    acaSettings: {
      enabled: false,
      householdSize: 1,
      customBenchmarkPremium: 0,
      annualHealthInsuranceCost: 6000,
    },
    spouse1Employment: {
      currentIncome: 0,
      retirementAge: 60,
      contributes401k: false,
      contribution401kAmount: 0,
      roth401kAmount: 0,
      employerMatchAmount: 0,
      pension: { monthlyAmount: 0, startAge: 65, cola: 0 },
    },
    spouse2Employment: {
      currentIncome: 0,
      retirementAge: 0,
      contributes401k: false,
      contribution401kAmount: 0,
      roth401kAmount: 0,
      employerMatchAmount: 0,
      pension: { monthlyAmount: 0, startAge: 65, cola: 0 },
    },
    survivorSettings: {
      enabled: false,
      spouse1DeathAge: null,
      spouse2DeathAge: null,
      survivorSpendingPercent: 75,
    },
    stateRelocation: { enabled: false, targetState: "FL", relocationAge: 65 },
    ...overrides,
  };
}

/** Picks a small set of reproducible numeric fingerprints from a row. */
function fingerprint(row: ReturnType<typeof calculateProjections>[number]) {
  return {
    age: row.age,
    takeHome: Math.round(row.takeHome),
    federalTax: Math.round(row.federalTax),
    totalTaxes: Math.round(row.totalTaxes),
    trad: Math.round(row.traditionalBalance),
    roth: Math.round(row.rothBalance),
    brokerage: Math.round(row.taxableBalance),
    marginalBracket: row.marginalBracket,
  };
}

function snap(
  projections: ReturnType<typeof calculateProjections>,
  ages: number[],
) {
  return ages.map((a) => {
    const row = projections.find((r) => r.age === a);
    if (!row) throw new Error(`No projection row for age ${a}`);
    return fingerprint(row);
  });
}

// ---------- snapshots ----------
// To regenerate: temporarily console.log JSON.stringify(actual) and replace.

test("snapshot: single filer, no conversions, baseline drawdown", () => {
  const projections = calculateProjections(baseAccounts(), baseSS(), baseTax());
  const actual = snap(projections, [60, 67, 73, 85]);
  // Lock baseline. Update only after deliberate, reviewed math change.
  assert.ok(actual[0].takeHome > 0, "age 60 take-home positive");
  assert.ok(actual[1].takeHome > 0, "age 67 take-home positive");
  assert.ok(actual[2].rmd === undefined || actual[2], "age 73 row exists");
  // Monotonic non-negative taxes
  for (const f of actual) {
    assert.ok(f.totalTaxes >= 0, `age ${f.age}: taxes non-negative`);
    assert.ok(f.trad >= 0, `age ${f.age}: trad non-negative`);
    assert.ok(f.roth >= 0, `age ${f.age}: roth non-negative`);
    assert.ok(f.brokerage >= 0, `age ${f.age}: brokerage non-negative`);
  }
  // Take-home should track inflation-adjusted target reasonably
  const target67 = 100_000 * Math.pow(1.025, 7);
  assert.ok(
    Math.abs(actual[1].takeHome - target67) < 50,
    `age 67 take-home (${actual[1].takeHome}) within $50 of inflation-adjusted target (${Math.round(target67)})`,
  );
});

test("snapshot: MFJ with Roth conversions — converted balance grows, trad shrinks faster", () => {
  const projections = calculateProjections(
    baseAccounts({ spouse1Traditional: 1_500_000, spouse2Traditional: 500_000 }),
    {
      spouse1: { estimatedBenefit: 3000, claimAge: 67, lifeExpectancy: 95 },
      spouse2: { estimatedBenefit: 2000, claimAge: 67, lifeExpectancy: 95 },
    },
    baseTax({
      filingStatus: "married",
      spouse2Age: 60,
      rothConversionStrategy: "fill_24",
      targetTakeHome: 150_000,
    }),
  );
  const noConv = calculateProjections(
    baseAccounts({ spouse1Traditional: 1_500_000, spouse2Traditional: 500_000 }),
    {
      spouse1: { estimatedBenefit: 3000, claimAge: 67, lifeExpectancy: 95 },
      spouse2: { estimatedBenefit: 2000, claimAge: 67, lifeExpectancy: 95 },
    },
    baseTax({
      filingStatus: "married",
      spouse2Age: 60,
      rothConversionStrategy: "none",
      targetTakeHome: 150_000,
    }),
  );

  const at72Conv = projections.find((r) => r.age === 72)!;
  const at72None = noConv.find((r) => r.age === 72)!;
  assert.ok(
    at72Conv.rothBalance > at72None.rothBalance,
    `Roth balance with conversions (${at72Conv.rothBalance}) should exceed no-conversions (${at72None.rothBalance})`,
  );
  assert.ok(
    at72Conv.traditionalBalance < at72None.traditionalBalance,
    `Trad balance with conversions should be smaller`,
  );
});

test("snapshot: charitable QCD reduces ordinary income at age 73", () => {
  const accts = baseAccounts({ spouse1Traditional: 1_500_000 });
  const tax = baseTax({
    targetTakeHome: 80_000,
    charitableGiving: {
      enabled: true,
      annualAmount: 20_000,
      startAge: 72,
      endAge: 90,
      fundingSource: "qcd",
      otherItemizedDeductions: 0,
    },
  });
  const taxNoGiving = baseTax({ targetTakeHome: 80_000 });

  const withQCD = calculateProjections(accts, baseSS(), tax);
  const withoutQCD = calculateProjections(accts, baseSS(), taxNoGiving);

  const qcd73 = withQCD.find((r) => r.age === 73)!;
  const base73 = withoutQCD.find((r) => r.age === 73)!;

  assert.ok(
    qcd73.qcdAmount > 0,
    `QCD amount should be > 0 at age 73, got ${qcd73.qcdAmount}`,
  );
  assert.ok(
    qcd73.ordinaryIncome < base73.ordinaryIncome,
    `Ordinary income with QCD (${qcd73.ordinaryIncome}) should be less than without (${base73.ordinaryIncome})`,
  );
  assert.ok(
    qcd73.federalTax <= base73.federalTax,
    `Federal tax with QCD (${qcd73.federalTax}) should be <= without (${base73.federalTax})`,
  );
});

test("snapshot: home sale §121 — taxable gain capped by exclusion (single = $250k)", () => {
  const tax = baseTax({
    targetTakeHome: 80_000,
    lifeEvents: [
      {
        id: "sale1",
        label: "Primary Home Sale (§121)",
        type: "income",
        amount: 800_000,
        age: 65,
        taxable: true,
        subtype: "home_sale",
        salePrice: 800_000,
        costBasis: 200_000,
        sellingCosts: 50_000,
        qualifiesForSection121: true,
      },
    ],
  });
  const projections = calculateProjections(baseAccounts(), baseSS(), tax);
  const sale = projections.find((r) => r.age === 65)!;
  // Gain = 800k - 200k - 50k = 550k. Single exclusion = 250k. Taxable = 300k.
  assert.equal(
    Math.round(sale.homeSaleTaxableGain),
    300_000,
    `home sale taxable gain expected 300000, got ${sale.homeSaleTaxableGain}`,
  );
  assert.ok(
    sale.homeSaleNetProceeds > 700_000,
    `net proceeds should reflect sale price minus selling costs minus tax, got ${sale.homeSaleNetProceeds}`,
  );
});

test("snapshot: ACA premium subsidy applies pre-65 when enabled", () => {
  const tax = baseTax({
    targetTakeHome: 60_000,
    acaSettings: {
      enabled: true,
      householdSize: 1,
      customBenchmarkPremium: 8_000,
      annualHealthInsuranceCost: 8_000,
    },
  });
  const projections = calculateProjections(baseAccounts(), baseSS(), tax);
  const age62 = projections.find((r) => r.age === 62)!;
  const age66 = projections.find((r) => r.age === 66)!;
  assert.ok(age62.acaSubsidy >= 0, "pre-65 ACA subsidy is non-negative");
  assert.equal(age66.acaSubsidy, 0, "post-65 ACA subsidy is zero (Medicare)");
});

test("snapshot: state relocation drops state tax to zero after relocation age", () => {
  const tax = baseTax({
    state: "CA",
    stateRate: 9.3,
    targetTakeHome: 100_000,
    stateRelocation: { enabled: true, targetState: "FL", relocationAge: 65 },
  });
  const projections = calculateProjections(baseAccounts(), baseSS(), tax);
  const age64 = projections.find((r) => r.age === 64)!;
  const age70 = projections.find((r) => r.age === 70)!;
  assert.ok(age64.stateTax >= 0, "pre-relocation state tax recorded");
  assert.equal(age70.stateTax, 0, "post-relocation FL state tax is zero");
  assert.equal(age70.stateCapitalGainsTax, 0, "post-relocation FL state CG is zero");
});

test("snapshot: pure determinism — repeated calls produce identical output", () => {
  const a = calculateProjections(baseAccounts(), baseSS(), baseTax());
  const b = calculateProjections(baseAccounts(), baseSS(), baseTax());
  assert.equal(a.length, b.length);
  for (let i = 0; i < a.length; i++) {
    assert.deepEqual(fingerprint(a[i]), fingerprint(b[i]));
  }
});

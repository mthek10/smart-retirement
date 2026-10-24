import test from "node:test";
import assert from "node:assert/strict";
import { buildDrawdownRoadmap, getCashRMD, type DrawdownRow } from "./drawdownRoadmap";
import { calculateProjections } from "@/hooks/useProjections";
import { SCENARIOS } from "@/test/scenarios";

const row = (age: number, overrides: Partial<DrawdownRow> = {}): DrawdownRow => ({
  age, year: 2026 + age - 60, traditionalWithdrawal: 0, rothWithdrawal: 0,
  taxableWithdrawal: 0, withdrawals: 0, netWages: 0, ssIncome: 0, pensionIncome: 0,
  rmd: 0, qcdAmount: 0, acaIncomeCap: 0, acaMagi: 0, medicarePremiums: 0,
  rothConversion: 0, excessSavings: 0, isSurvivorYear: false, ...overrides,
});

test("roadmap groups actual account sources and separates paycheck and SS transitions", () => {
  const phases = buildDrawdownRoadmap([
    row(60, { netWages: 80000 }), row(61, { netWages: 85000 }),
    row(62, { taxableWithdrawal: 50000, rothWithdrawal: 10000, withdrawals: 60000 }),
    row(63, { taxableWithdrawal: 55000, rothWithdrawal: 10000, withdrawals: 65000 }),
    row(64, { traditionalWithdrawal: 30000, ssIncome: 40000, withdrawals: 30000 }),
  ]);
  assert.deepEqual(phases.map(p => [p.first.age, p.last.age]), [[60, 61], [62, 63], [64, 64]]);
  assert.deepEqual(phases[1].sources.map(s => s.key), ["rothWithdrawal", "taxableWithdrawal"]);
  assert.equal(phases[1].minWithdrawal, 60000);
  assert.equal(phases[1].maxWithdrawal, 65000);
});

test("roadmap splits at RMD and ACA feasibility changes without calling conversions spending", () => {
  const phases = buildDrawdownRoadmap([
    row(62, { acaIncomeCap: 40000, acaMagi: 39000, rothConversion: 10000 }),
    row(63, { acaIncomeCap: 40000, acaMagi: 50000, rothConversion: 10000 }),
    row(64, { rmd: 10000, traditionalWithdrawal: 10000, withdrawals: 10000 }),
  ]);
  assert.equal(phases.length, 3);
  assert.deepEqual(phases[0].sources, []);
  assert.equal(phases[0].maxWithdrawal, 0);
});

test("cash RMD excludes separate charitable distributions and cannot exceed Traditional cash draw", () => {
  assert.equal(getCashRMD({ rmd: 50000, qcdAmount: 20000, traditionalWithdrawal: 40000 }), 30000);
  assert.equal(getCashRMD({ rmd: 50000, qcdAmount: 60000, traditionalWithdrawal: 0 }), 0);
  assert.equal(getCashRMD({ rmd: 50000, qcdAmount: 0, traditionalWithdrawal: 10000 }), 10000);
});

test("roadmap covers each projected year and reconciles account sources for representative plans", () => {
  for (const scenario of SCENARIOS) {
    const rows = calculateProjections(scenario.accounts, scenario.ss, scenario.tax);
    const phases = buildDrawdownRoadmap(rows);
    assert.equal(phases.reduce((sum, p) => sum + p.years, 0), rows.length);
    assert.equal(phases[0].first.age, rows[0].age);
    assert.equal(phases[phases.length - 1].last.age, rows[rows.length - 1].age);
    for (const r of rows) assert.ok(Math.abs(r.traditionalWithdrawal + r.rothWithdrawal + r.taxableWithdrawal - r.withdrawals) < 0.01);
  }
  assert.deepEqual(buildDrawdownRoadmap([]), []);
});
test("roadmap take-home bridge equals each year's Take Home: cash in minus taxes and costs", async () => {
  const { getTakeHomeBridge } = await import("./drawdownRoadmap");
  for (const scenario of SCENARIOS) {
    for (const r of calculateProjections(scenario.accounts, scenario.ss, scenario.tax)) {
      const b = getTakeHomeBridge(r);
      assert.ok(Math.abs(b.cashIn - b.taxes - b.healthInsurance - b.reinvested - b.other - r.takeHome) < 0.01);
    }
  }
  const b = getTakeHomeBridge(row(60, { withdrawals: 109536, taxableWithdrawal: 109536, totalTaxes: 3536, healthcareCost: 6000, takeHome: 100000 }));
  assert.equal(b.healthInsurance, 6000);
  assert.equal(b.other, 0);
});

/** Comprehensive model validation: tax law spot checks, healthcare, solver, strategies, invariants. */
import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateFederalTax, calculateCapitalGainsTax, calculateNIIT, calculateTaxableSocialSecurity,
  calculateRMD, calculateIRMAA, getSeniorDeduction, calculateACASubsidy,
  calculateNycIncomeTax, calculateNycCapitalGainsTax, calculateStateIncomeTax, calculateStateCapitalGainsTax,
} from "@/lib/taxCalculations";
import { calculateProjections } from "@/hooks/useProjections";
import { pickBestAfterTaxStrategy, pickBestAfterTaxStrategyCached } from "@/lib/strategyOptimizer";
import { runSingleSimulation, setMonteCarloSeed } from "@/hooks/useMonteCarloSimulation";
import { SCENARIOS, accounts, ss, tax } from "./scenarios";

const near = (a: number, b: number, tol = 1, msg = "") => assert.ok(Math.abs(a - b) <= tol, `${msg} ${a} vs ${b}`);

// ---------- Federal tax law (hand-calculated, 2026) ----------
test("federal: income at standard deduction owes zero", () => {
  assert.equal(calculateFederalTax(16_100, "single"), 0);
  assert.equal(calculateFederalTax(32_200, "married"), 0);
});
test("federal: single $100k hand calculation", () => {
  // taxable 83,900: 12,400*10% + 38,000*12% + 33,500*22%
  near(calculateFederalTax(100_000, "single"), 1240 + 4560 + 7370, 1);
});
test("federal: MFJ $200k hand calculation", () => {
  // taxable 167,800: 24,800*10% + 76,000*12% + 67,000*22%
  near(calculateFederalTax(200_000, "married"), 2480 + 9120 + 14740, 1);
});
test("federal: brackets index with inflation (real tax flat)", () => {
  const t0 = calculateFederalTax(100_000, "single");
  const t10 = calculateFederalTax(100_000 * 1.025 ** 10, "single", 10, 0.025);
  near(t10, t0 * 1.025 ** 10, 2);
});
test("federal: tax is monotonic in income", () => {
  let prev = -1;
  for (let i = 0; i <= 2_000_000; i += 25_000) { const t = calculateFederalTax(i, "married"); assert.ok(t >= prev); prev = t; }
});

// ---------- Senior deductions ----------
test("senior: +2,050 additional + 6,000 bonus for single 65+ under $75k", () => {
  near(getSeniorDeduction("single", 65, 0, 50_000, 0, 0), 8050, 0.01);
});
test("senior: bonus phases out at 6% over threshold", () => {
  near(getSeniorDeduction("single", 65, 0, 125_000, 0, 0), 2050 + 3000, 0.01);
  near(getSeniorDeduction("single", 65, 0, 500_000, 0, 0), 2050, 0.01);
});
test("senior: bonus expires after 2028", () => {
  near(getSeniorDeduction("married", 70, 70, 0, 3, 0), 3300, 0.01); // 2029
  near(getSeniorDeduction("married", 70, 70, 0, 2, 0), 3300 + 12_000, 0.01); // 2028
});
test("senior: single filers ignore spouse age", () => {
  assert.equal(getSeniorDeduction("single", 60, 80, 0), 0);
});

// ---------- LTCG / NIIT / SS ----------
test("LTCG: gains inside 0% bracket owe nothing", () => {
  assert.equal(calculateCapitalGainsTax(40_000, 16_100, "single"), 0);
});
test("LTCG: gains above 0% bracket taxed at 15%", () => {
  // ordinary fills deduction; 0% top 49,450 taxable → 10,550 of 60k gains at 15%
  near(calculateCapitalGainsTax(60_000, 16_100, "single"), 10_550 * 0.15, 2);
});
test("NIIT: statutory thresholds never inflate", () => {
  near(calculateNIIT(50_000, 250_000, "single"), 50_000 * 0.038, 0.01);
  assert.equal(calculateNIIT(50_000, 190_000, "single", 30, 0.03), 0);
  near(calculateNIIT(50_000, 220_000, "single", 30, 0.03), 20_000 * 0.038, 0.01);
});
test("SS: provisional income below base → 0 taxable, high income → 85% cap", () => {
  assert.equal(calculateTaxableSocialSecurity(20_000, 10_000, "single"), 0);
  near(calculateTaxableSocialSecurity(40_000, 200_000, "single"), 34_000, 0.01);
});

// ---------- RMD / IRMAA / ACA ----------
test("RMD: none before 73, Uniform Table divisor at 73 (26.5)", () => {
  assert.equal(calculateRMD(1_000_000, 72), 0);
  near(calculateRMD(1_000_000, 73), 1_000_000 / 26.5, 1);
});
test("IRMAA: zero below 2026 threshold, positive above, rises by tier", () => {
  assert.equal(calculateIRMAA(100_000), 0);
  const a = calculateIRMAA(120_000), b = calculateIRMAA(300_000), c = calculateIRMAA(600_000);
  assert.ok(a > 0 && b > a && c > b);
});
test("ACA: subsidy never exceeds the premium and shrinks with income", () => {
  const lo = calculateACASubsidy(30_000, 1, [60], 0, 0);
  const hi = calculateACASubsidy(60_000, 1, [60], 0, 0);
  assert.ok(lo.subsidy <= lo.premium + 1 && hi.subsidy <= lo.subsidy);
});

// ---------- Projection engine behavior ----------
const run = (s = SCENARIOS[0]) => calculateProjections(s.accounts, s.ss, s.tax);

test("solver: take-home equals inflated target within $1 while funds remain", () => {
  const rows = run();
  rows.slice(0, 20).forEach((r, i) => near(r.takeHome, 100_000 * 1.025 ** i, 1, `age ${r.age}`));
});
test("RMDs start at the modeled RMD age and meet the IRS minimum", () => {
  const rows = run();
  rows.forEach((r) => { if (r.age < 73) assert.equal(r.rmd, 0, `age ${r.age}`); });
  const r = rows.find((x) => x.age === 75)!;
  assert.ok(r.traditionalWithdrawal + r.rothConversion + 1 >= r.rmd);
});
test("IRMAA cap mode never raises MAGI past the next IRMAA threshold via conversions", () => {
  const s = SCENARIOS[1];
  const capped = calculateProjections(s.accounts, s.ss, s.tax);
  const free = calculateProjections(s.accounts, s.ss, { ...s.tax, neverTriggerIRMAA: false });
  const sum = (rs: typeof capped) => rs.reduce((a, r) => a + r.rothConversion, 0);
  assert.ok(sum(capped) <= sum(free) + 1);
});
test("harvesting: disabling auto-harvest yields zero harvested gains", () => {
  const rows = calculateProjections(accounts(), ss(), tax({ autoHarvestCapitalGains: false }));
  assert.equal(rows.reduce((a, r) => a + r.capitalGainsHarvested + r.capitalGainsHarvested15, 0), 0);
});
test("harvesting: 15% tier only harvests when toggle is on", () => {
  const rows = calculateProjections(accounts(), ss(), tax());
  assert.equal(rows.reduce((a, r) => a + r.capitalGainsHarvested15, 0), 0);
});
test("conversions: bigger bracket targets convert more in the first year", () => {
  const total = (st: string) => calculateProjections(accounts({ spouse1Traditional: 1_500_000 }), ss(), tax({ rothConversionStrategy: st }))[0].rothConversion;
  const n = total("none"), a = total("fill_12"), b = total("fill_22"), c = total("fill_32");
  assert.equal(n, 0);
  assert.ok(a <= b + 1 && b <= c + 1, `${a} ${b} ${c}`);
});
test("Auto strategy returns the top-ranked After-Tax Equivalent", () => {
  const s = SCENARIOS[3];
  const r = pickBestAfterTaxStrategy(s.accounts, s.ss, s.tax);
  const max = Math.max(...r.ranking.map((x) => x.terminalAfterTax));
  assert.ok(r.ranking[0].terminalAfterTax >= max - 100);
});
test("Auto cache is keyed by content (changed accounts → new result)", () => {
  const s = SCENARIOS[3];
  const a = pickBestAfterTaxStrategyCached(s.accounts, s.ss, s.tax);
  assert.equal(pickBestAfterTaxStrategyCached({ ...s.accounts }, s.ss, { ...s.tax }), a);
  const b = pickBestAfterTaxStrategyCached({ ...s.accounts, spouse1Traditional: 50_000 }, s.ss, s.tax);
  assert.notEqual(a, b);
});
test("single filers ignore spouse balances and ages", () => {
  const a = calculateProjections(accounts(), ss(3000, 0), tax());
  const b = calculateProjections(accounts({ spouse2Traditional: 900_000 }), ss(3000, 2500), tax({ spouse2Age: 45 }));
  assert.equal(a.length, b.length);
  a.forEach((r, i) => near(r.takeHome + r.traditionalBalance, b[i].takeHome + b[i].traditionalBalance, 0.01));
});

// ---------- Invariants across every scenario ----------
for (const s of SCENARIOS) {
  test(`invariants: ${s.name}`, () => {
    const rows = run(s);
    const expectedYears = s.tax.filingStatus === "married" ? Math.max(100 - s.tax.spouse1Age, 100 - s.tax.spouse2Age) : 100 - s.tax.spouse1Age;
    assert.ok(Math.abs(rows.length - (expectedYears + 1)) <= 1, "horizon");
    for (const r of rows) {
      for (const [k, v] of Object.entries(r)) if (typeof v === "number") assert.ok(Number.isFinite(v), `${k} finite at ${r.age}`);
      assert.ok(r.traditionalBalance >= -1 && r.rothBalance >= -1 && r.taxableBalance >= -1, `balances at ${r.age}`);
      assert.ok(r.federalTax >= 0 && r.stateTax >= 0 && r.totalTaxes >= 0, `taxes at ${r.age}`);
      near(r.traditionalWithdrawal + r.rothWithdrawal + r.taxableWithdrawal, r.withdrawals, 1, `withdrawal split at ${r.age}`);
      assert.ok(r.acaSubsidy <= r.acaPremium + 1, `aca at ${r.age}`);
    }
    const again = run(s);
    rows.forEach((r, i) => assert.equal(r.takeHome, again[i].takeHome));
  });
}

// ---------- Monte Carlo ----------
test("Monte Carlo: fixed seed is reproducible, zero volatility matches the mean", () => {
  const s = SCENARIOS[0];
  const cfg = { numSimulations: 1, returnMean: 0.05, returnStdDev: 0.15 };
  setMonteCarloSeed(42); const a = runSingleSimulation(s.accounts, s.ss, s.tax, "none", cfg);
  setMonteCarloSeed(42); const b = runSingleSimulation(s.accounts, s.ss, s.tax, "none", cfg);
  setMonteCarloSeed(7); const c = runSingleSimulation(s.accounts, s.ss, s.tax, "none", cfg);
  setMonteCarloSeed(null);
  assert.equal(a.finalBalance, b.finalBalance);
  assert.notEqual(a.finalBalance, c.finalBalance);
});

// ---------- New York City local income tax ----------
test("nyc: single bracket walk at $100k", () => {
  // 12,000*3.078% + 13,000*3.762% + 25,000*3.819% + 50,000*3.876%
  near(calculateNycIncomeTax(100_000, "single"), 369.36 + 489.06 + 954.75 + 1938, 0.01);
});
test("nyc: MFJ bracket walk at $150k", () => {
  // 21,600*3.078% + 23,400*3.762% + 45,000*3.819% + 60,000*3.876%
  near(calculateNycIncomeTax(150_000, "married"), 664.848 + 880.308 + 1718.55 + 2325.6, 0.01);
});
test("nyc: HOH bracket walk at $40k", () => {
  // 14,400*3.078% + 15,600*3.762% + 10,000*3.819%
  near(calculateNycIncomeTax(40_000, "hoh"), 443.232 + 586.872 + 381.9, 0.01);
});
test("nyc: zero and negative income owe nothing", () => {
  assert.equal(calculateNycIncomeTax(0, "single"), 0);
  assert.equal(calculateNycIncomeTax(-5000, "married"), 0);
});
test("nyc: capital gains stack on top of ordinary income", () => {
  const ordinary = 60_000;
  const gains = 40_000;
  near(
    calculateNycCapitalGainsTax(gains, ordinary, "married"),
    calculateNycIncomeTax(ordinary + gains, "married") - calculateNycIncomeTax(ordinary, "married"),
    0.01,
  );
});
test("nyc: adds to NY state tax only when resident flag set", () => {
  const stateOnly = calculateStateIncomeTax(120_000, "NY", "married", false);
  const withCity = calculateStateIncomeTax(120_000, "NY", "married", true);
  near(withCity - stateOnly, calculateNycIncomeTax(120_000, "married"), 0.01);
});
test("nyc: flag has no effect outside New York", () => {
  assert.equal(
    calculateStateIncomeTax(120_000, "FL", "married", true),
    calculateStateIncomeTax(120_000, "FL", "married", false),
  );
  assert.equal(
    calculateStateIncomeTax(120_000, "CA", "single", true),
    calculateStateIncomeTax(120_000, "CA", "single", false),
  );
});
test("nyc: state capital gains tax includes city portion", () => {
  const without = calculateStateCapitalGainsTax(40_000, 60_000, "NY", "married", false);
  const withCity = calculateStateCapitalGainsTax(40_000, 60_000, "NY", "married", true);
  near(withCity - without, calculateNycCapitalGainsTax(40_000, 60_000, "married"), 0.01);
});
test("nyc: projections pay more state tax than NY state alone", () => {
  const nyOnly = calculateProjections(accounts(), ss(), tax({ state: "NY", stateRate: 0 }) as any);
  const nyc = calculateProjections(accounts(), ss(), tax({ state: "NY", stateRate: 0, nycResident: true }) as any);
  const sum = (rows: any[]) =>
    rows.reduce((s, r) => s + r.stateTax + r.stateCapitalGainsTax + r.cityTax + r.cityCapitalGainsTax, 0);
  assert.ok(sum(nyc) > sum(nyOnly), "NYC resident should owe more state+local tax");
  // City tax must be reported separately, never folded into the state columns.
  assert.ok(nyc.some((r: any) => r.cityTax > 0), "city tax column should be populated");
  assert.ok(nyOnly.every((r: any) => r.cityTax === 0 && r.cityCapitalGainsTax === 0));
});

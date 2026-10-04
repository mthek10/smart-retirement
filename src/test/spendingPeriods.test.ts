import test from "node:test";
import assert from "node:assert/strict";
import { calculateProjections, getActivePeriod } from "@/hooks/useProjections";
import { clampSpendingPeriods } from "@/components/SpendingPeriodsEditor";
import { accounts, ss, tax } from "./scenarios";

const periods = { enabled: true, periods: [
  { startAge: 60, takeHome: 100_000, state: "CA" },
  { startAge: 70, takeHome: 80_000, state: "FL" },
  { startAge: 80, takeHome: 60_000, state: "NY", nycResident: true },
] };

test("active period switches at start ages", () => {
  assert.equal(getActivePeriod({ spendingPeriods: periods }, 69)?.takeHome, 100_000);
  assert.equal(getActivePeriod({ spendingPeriods: periods }, 70)?.state, "FL");
  assert.equal(getActivePeriod({ spendingPeriods: periods }, 85)?.state, "NY");
  assert.equal(getActivePeriod({ spendingPeriods: { ...periods, enabled: false } }, 85), null);
});

test("projection uses each period's take-home and state", () => {
  const rows = calculateProjections(accounts(), ss(), tax({ spendingPeriods: periods }));
  const at = (a: number) => rows.find((r: any) => r.age === a) as any;
  assert.ok(at(69).stateTax > 0, "CA taxed");
  assert.equal(Math.round(at(70).stateTax), 0, "FL no tax");
  assert.ok(at(80).cityTax > 0, "NYC city tax");
  const infl = (y: number) => Math.pow(1.025, y);
  assert.ok(Math.abs(at(70).takeHome - 80_000 * infl(10)) < 5);
  assert.ok(Math.abs(at(60).takeHome - 100_000) < 5);
});

test("clampSpendingPeriods enforces ordering and caps (dashboard commit path)", () => {
  const clamped = clampSpendingPeriods([
    { startAge: 75, takeHome: 100_000, state: "CA" },
    { startAge: 40, takeHome: 80_000, state: "FL" },
    { startAge: 200, takeHome: 60_000, state: "NY" },
  ], 60, 100);
  assert.equal(clamped[0].startAge, 60, "period 1 pinned to current age");
  assert.equal(clamped[1].startAge, 61, "period 2 at least current age + 1");
  assert.equal(clamped[2].startAge, 100, "period 3 capped at end age");
});

test("excludeMedicare zeroes Medicare premiums and IRMAA for that period only", () => {
  const overseas = { enabled: true, periods: [
    { startAge: 60, takeHome: 100_000, state: "FL" },
    { startAge: 70, takeHome: 80_000, state: "none", excludeMedicare: true },
    { startAge: 80, takeHome: 60_000, state: "FL" },
  ] };
  const rows = calculateProjections(accounts(), ss(), tax({ spendingPeriods: overseas }));
  const at = (a: number) => rows.find((r: any) => r.age === a) as any;
  assert.ok(at(66).medicarePremiums > 0, "Medicare applies before overseas period");
  assert.equal(at(70).medicarePremiums, 0, "no Medicare premiums while overseas");
  assert.equal(at(75).irmaa, 0, "no IRMAA while overseas");
  assert.ok(at(80).medicarePremiums > 0, "Medicare resumes after overseas period");
});

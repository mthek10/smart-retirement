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

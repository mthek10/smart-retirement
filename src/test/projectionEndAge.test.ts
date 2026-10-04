import test from "node:test";
import assert from "node:assert/strict";
import { calculateProjections } from "@/hooks/useProjections";
import { accounts, ss, tax } from "./scenarios";

test("single filer age 60 planning to 90 includes ages 60-90", () => {
  assert.equal(calculateProjections(accounts(), ss(), tax({ projectionEndAge: 90 })).length, 31);
});
test("married runs until younger spouse (58) reaches 90", () => {
  assert.equal(calculateProjections(accounts(), ss(3000, 2000), tax({ filingStatus: "married", spouse2Age: 58, projectionEndAge: 90 })).length, 33);
});
test("end age is capped at 100", () => {
  assert.equal(calculateProjections(accounts(), ss(), tax({ projectionEndAge: 110 })).length, 41);
});

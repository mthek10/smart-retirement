/**
 * Golden-output regression test. Every scenario's full year-by-year numeric
 * output must match the stored fixture within $1. Regenerate deliberately with:
 *   UPDATE_GOLDEN=1 npm test
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { calculateProjections } from "@/hooks/useProjections";
import { SCENARIOS } from "./scenarios";

const FILE = path.resolve("src/test/fixtures/golden.json");

const pick = (rows: ReturnType<typeof calculateProjections>) =>
  rows.map((r) => Object.fromEntries(Object.entries(r).filter(([, v]) => typeof v === "number").map(([k, v]) => [k, Math.round(v as number)])));

const actual = Object.fromEntries(SCENARIOS.map((s) => [s.name, pick(calculateProjections(s.accounts, s.ss, s.tax))]));

if (process.env.UPDATE_GOLDEN || !fs.existsSync(FILE)) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(actual));
}
const golden = JSON.parse(fs.readFileSync(FILE, "utf8"));

for (const s of SCENARIOS) {
  test(`golden: ${s.name}`, () => {
    const exp = golden[s.name], got = actual[s.name];
    assert.equal(got.length, exp.length, "row count");
    got.forEach((row: Record<string, number>, i: number) => {
      for (const k of Object.keys(exp[i])) {
        assert.ok(Math.abs((row[k] ?? 0) - exp[i][k]) <= 1, `${s.name} year ${i} ${k}: ${row[k]} vs ${exp[i][k]}`);
      }
    });
  });
}

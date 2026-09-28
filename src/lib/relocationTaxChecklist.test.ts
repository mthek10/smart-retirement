import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildRelocationTaxChecklist, type RelocationTaxChecklistInput, type TaxChecklistRow } from './relocationTaxChecklist';

const rows = (startAge: number, n: number): TaxChecklistRow[] =>
  Array.from({ length: n }, (_, i) => ({
    age: startAge + i, year: 2026 + i, rothConversion: 20000, capitalGainsHarvested: 0, capitalGainsHarvested15: 0,
    ssIncome: 0, pensionIncome: 0, ordinaryIncome: 60000, capitalGainsIncome: 5000,
    taxableBalance: 500000, taxableCostBasis: 300000, traditionalBalance: 400000,
  }));

const base = (o: Partial<RelocationTaxChecklistInput> = {}): RelocationTaxChecklistInput => ({
  fromState: 'TX', toState: 'CA', relocationAge: 62, currentAge: 60, spouseAge: 70, filingStatus: 'single',
  direction: 'higher', currentStateRate: 0, targetStateRate: 0.093, rows: rows(60, 20),
  inflationRate: 0.025, acaEnabled: true, ssClaimAge: 67, ...o,
});
const text = (s: ReturnType<typeof buildRelocationTaxChecklist>) => s.flatMap(x => x.items.map(i => `${i.text} ${i.detail ?? ''}`)).join('\n');
const titles = (s: ReturnType<typeof buildRelocationTaxChecklist>) => s.map(x => x.title);

test('higher-tax move says convert before', () => {
  assert.match(text(buildRelocationTaxChecklist(base())), /Convert about .* before 2028/);
});

test('zero-tax move says pause/delay', () => {
  const t = text(buildRelocationTaxChecklist(base({ fromState: 'CA', toState: 'FL', direction: 'zero', currentStateRate: 0.093, targetStateRate: 0 })));
  assert.match(t, /Pause or shrink Roth conversions/);
  assert.match(t, /Hold appreciated positions/);
});

test('IRMAA only when 63+ around the move; single ignores spouse age', () => {
  assert.ok(!titles(buildRelocationTaxChecklist(base())).includes('IRMAA & Medicare'));
  assert.ok(titles(buildRelocationTaxChecklist(base({ relocationAge: 66, currentAge: 64, rows: rows(64, 20) }))).includes('IRMAA & Medicare'));
});

test('ACA section only when under 65 at move', () => {
  assert.ok(titles(buildRelocationTaxChecklist(base())).includes('ACA health insurance'));
  assert.ok(!titles(buildRelocationTaxChecklist(base({ relocationAge: 67, currentAge: 66, rows: rows(66, 20) }))).includes('ACA health insurance'));
});

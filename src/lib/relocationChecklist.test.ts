import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildRelocationChecklist, type RelocationChecklistInput } from './relocationChecklist';

const base: RelocationChecklistInput = {
  fromState: 'CA', toState: 'FL', relocationAge: 62, currentAge: 60, spouseAge: null,
  filingStatus: 'single', direction: 'zero', hasEmployment: false, claimingSS: false,
  hasPension: false, rothPlanned: 0, gainsPlanned: 0, baseYear: 2026,
};
const all = (p: ReturnType<typeof buildRelocationChecklist>) => p.flatMap(x => x.items.map(i => `${i.text} ${i.detail ?? ''}`)).join('\n');

test('under-65 mover gets ACA item, not Medicare', () => {
  const t = all(buildRelocationChecklist(base));
  assert.match(t, /ACA Marketplace/);
  assert.doesNotMatch(t, /Medicare Advantage/);
});

test('65+ mover gets Medicare item', () => {
  const t = all(buildRelocationChecklist({ ...base, relocationAge: 67, currentAge: 66 }));
  assert.match(t, /Medicare Advantage/);
  assert.doesNotMatch(t, /ACA Marketplace/);
});

test('zero-tax destination hides new-state estimated payments; FL domicile + CA audit shown', () => {
  const t = all(buildRelocationChecklist(base));
  assert.doesNotMatch(t, /Set up FL estimated payments/);
  assert.match(t, /Declaration of Domicile/);
  assert.match(t, /CA residency audits/);
});

test('higher-tax move advises accelerating planned conversions', () => {
  const t = all(buildRelocationChecklist({ ...base, fromState: 'TX', toState: 'CA', direction: 'higher', rothPlanned: 50000 }));
  assert.match(t, /Complete planned moves while still a TX resident: \$50,000 of Roth conversions/);
  assert.match(t, /Set up CA estimated payments/);
});

# Relocation Tax Planning Checklist

## Goal
Add a second expandable list, **"Tax Planning Checklist — before & after the move"**, on the relocation card in Personalized Action Items. It sits next to the existing Relocation Checklist. Each item is a specific recommendation that uses the person's own projected numbers (by year and age). Items are grouped by topic and marked **Before move** or **After move**.

## What the user will see
Sections (a section is hidden when it doesn't apply):

**1. Roth conversions**
- Moving to a higher-tax state: the amount to convert each year before the move, the bracket it fills, and the state tax saved compared with converting after the move.
- Moving to a lower or zero-tax state: pause or shrink conversions in the move year and restart after it. Shows the state tax saved per $10k converted.
- Remaining pre-RMD years after the move and the planned conversion total.

**2. Capital gains and tax-loss harvesting**
- Unrealized gains at the move date, and whether to realize them before the move (higher-tax destination) or after it (lower-tax destination), with the state tax difference.
- 0% bracket room in the years around the move; note whether Auto-harvest is on.
- Harvest losses in the higher-tax state year so the deduction is worth more; carryforward note.
- Washington: capital gains excise above about $250k.

**3. State income tax**
- Old and new state rates and estimated tax in the year before and after the move.
- Split move-year income by date on part-year returns; pro-rate IRA and pension income.
- Pension and IRA exclusions in the new state, and whether it taxes Social Security.
- Old-state source rules: pensions can't be taxed by the old state once you move (federal source-tax law), but deferred comp and rental income can.

**4. Social Security**
- Whether the new state taxes benefits, and the claim age compared with the move age.
- Keep provisional income low in the years when move-related gains or conversions might push up how much of your benefit is taxed.

**5. IRMAA and Medicare**
- Two-year lookback: move-year income from gains or conversions at age 63 and up affects premiums two years later. Shows the next threshold and your projected MAGI for those years.
- A life-changing event (retirement, not a move) allows an appeal on Form SSA-44.

**6. ACA (only if under 65 at the move)**
- New-area benchmark premium; keep MAGI under 400% of the poverty level in the move year.

**7. After-move follow-up**
- Update withholding and estimated payments; recheck the Roth and harvest plan against the new state's rate; rerun the projections in the app.

Each item shows its dollar figures and years from the plan. A closing line reminds the user that these are estimates to confirm with a tax professional.

## Technical details
- New pure module `src/lib/relocationTaxChecklist.ts`: `buildRelocationTaxChecklist(input)`. Input: states, move age, direction, current and target state rate estimates, and the projection rows (reads `rothConversion`, `capitalGainsHarvested(15)`, `ssIncome`, `pensionIncome`, `magi`/ordinary income, `age`, `year`, `taxableBalance`, `taxableCostBasis`). Also takes the IRMAA threshold helper (`getNextIRMAAThreshold`), filing status, spouse age (ignored for single filers), `acaEnabled` and the harvest toggles. Returns `{ title, items: { text, detail?, timing: 'before'|'after' }[] }[]`.
- Reuse the checklist rendering in `ActionItems.tsx`: generalize it to a `checklists: { label, phases }[]` field so the relocation card shows both lists. Add a Before/After badge per item using existing Badge styles, with solid-black text.
- Tests in `src/lib/relocationTaxChecklist.test.ts`: higher-tax move gives "convert before"; zero-tax move gives "delay"; IRMAA section only when age is 63+ around the move; ACA section only when under 65; single filer ignores spouse.

# Detailed Before/After Move Checklist for State Relocation

## Goal
When a relocation is planned (Advanced Options > Plan State Relocation), the Personalized Action Items show a specific, personalized checklist of what to do before and after the move, using the person's own numbers (move age/year, states, balances, Social Security, pensions, conversions).

## What the user will see
A new collapsible **"Relocation Checklist"** added to the relocation action card, split into timed phases. Each item is a checkbox-style line with a short "why" and, where possible, a dollar amount or date from the plan.

**1. 12+ months before the move (tax planning)**
- Finish planned Roth conversions and capital-gain sales in the lower-tax state (shows amounts from the plan; reversed advice if moving to a higher-tax state — i.e. delay them until after the move).
- Time big one-off income (bonus, stock options, property sale) for the lower-tax state.
- Review the old state's rules on pension/IRA taxation and the new state's retirement income exclusions.
- Get a professional review if the old state is known for aggressive residency audits (CA, NY, NJ, MA, MN, OR, IL etc.).

**2. 3–6 months before**
- Pick a move date; note the part-year returns required in both states for that year.
- Line up housing, compare property tax and homeowner's insurance in the new state.
- Healthcare: if under 65 on ACA, a move is a qualifying life event — plan a new marketplace plan (60-day window); if on Medicare, check Medigap/Advantage/Part D networks in the new area.
- Update estate documents plan: will, trust, power of attorney, healthcare directive (state-specific).

**3. Moving month**
- Keep receipts and dated records (moving contract, lease/closing papers).
- Update mailing address with USPS, IRS (Form 8822), SSA, pension payers, brokerages, IRA custodians.
- Change state tax withholding on pension, IRA distributions and wages (W-4P / state forms); stop old-state estimated payments.

**4. First 30–90 days after (establish domicile)**
- New driver's license, vehicle registration, voter registration.
- File a declaration of domicile if the new state offers one (e.g. Florida).
- Move doctors, bank, safe-deposit box, memberships, and religious/community ties.
- Homestead exemption application on the new home.
- Sell or convert the old home to a rental, and track days spent in each state.

**5. First tax season after**
- File part-year resident returns in both states; allocate income by date.
- Confirm new-state estimated payments (if any) and retirement income exclusions applied.
- Keep a residency file (day logs, bills, license) for at least 3–4 years.

Items are filtered by the plan: ACA items only if someone is under 65 at move, Medicare items only if 65+, wage/withholding only if employed, homestead only for owners (generic phrasing otherwise), Social Security address update only when claiming, zero-tax destination hides new-state estimated payment items, WA shows its capital gains excise note.

Also: moves to a **lower but not zero-tax state** currently get no relocation card at all; they will get a card with savings estimate plus this checklist.

## Technical details
- New file `src/lib/relocationChecklist.ts`: pure function `buildRelocationChecklist({ fromState, toState, relocationAge, currentAge, spouseAge, filingStatus, direction: 'higher'|'lower'|'zero', hasEmployment, claimingSS, hasPension, rothPlanned, gainsPlanned, baseYear })` returning phases of `{ title, items: { text, detail? }[] }`. Includes a small list of high-audit states and domicile-declaration states.
- `ActionItems.tsx`: render a `RelocationChecklist` collapsible (reusing existing Collapsible UI, left-accent styling, solid-black text) inside all relocation branches; add a new branch for lower-tax non-zero destinations.
- Unit tests in `src/lib/relocationChecklist.test.ts` (node:test) for filtering: ACA vs Medicare, zero-tax destination, higher-tax reversal.
- Informational only; wording notes that residency rules vary and a tax professional should confirm.

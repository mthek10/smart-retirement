# Support people already receiving Social Security

Today the model assumes everyone claims in the future. If someone is 68 and already claiming, the claiming-age floor pins them to 68 and shows an inflated *delayed-credit* benefit instead of their real check. This adds an explicit "already claiming" mode.

## Behavior

Per person (spouse 1 and spouse 2 independently), a toggle: **"Already receiving Social Security"**.

When ON:
- The benefit field becomes **"Current monthly benefit"** — the actual amount they receive today.
- A second field captures **"Age you started claiming"** (62 to current age, capped at 70).
- No early-reduction or delayed-credit adjustment is applied — the entered amount is used as-is, with COLA growth from today forward.
- Benefits are treated as already in payment, so they appear in year 1 of the projection.
- The claiming-age dropdown and the "claiming can't start in the past" note are hidden.
- Breakeven analysis is hidden for that person (the decision is already made) and replaced with a short note.

When OFF (default, and forced for anyone under 62):
- Exactly today's behavior: FRA estimate + claiming-age dropdown with the current-age floor.

The toggle only appears when the person's current age is 62 or older.

## Technical notes

- Extend the `ssData` per-spouse shape with `alreadyClaiming: boolean` and `claimedAtAge: number` in `src/pages/Index.tsx` defaults, the props interface in `src/components/SocialSecurityPlanner.tsx`, and the `ssData` type in `src/hooks/useProjections.ts`.
- `src/hooks/useProjections.ts` (around the SS block at lines 535-570): when `alreadyClaiming`, skip `calculateSocialSecurityBenefit` and use `estimatedBenefit` directly; set the effective claim age to `claimedAtAge` so the years-since-claiming COLA compounding stays correct and the benefit is active from year 1.
- `src/components/SocialSecurityPlanner.tsx`: add the `Switch`, swap labels, hide the claiming-age select and `SSBreakevenAnalysis` when the toggle is on; keep the existing clamp effect running only when the toggle is off.
- Migration for existing saved scenarios: treat missing `alreadyClaiming` as `false`, so nothing changes for current users.
- Update the age-floor guardrail tests in `src/hooks/useProjections.test.ts` with a case covering an already-claiming 68-year-old.

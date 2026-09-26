# Update tax rules to 2026 (incl. One Big Beautiful Bill Act)

Today the model uses 2024 IRS figures as the "year 1" base, which means every number is roughly 2 years behind. The plan swaps in the official 2026 figures (IRS Rev. Proc. 2025-32, CMS 2026, SSA 2026) and adds the new laws that aren't modeled at all yet.

## 1. Update existing 2024 figures to 2026

| Item | 2024 (current) | 2026 (new) |
|---|---|---|
| Standard deduction – Single / MFJ / HOH | 14,600 / 29,200 / 21,900 | 16,100 / 32,200 / 24,150 |
| Ordinary brackets (Single tops) | 11,600 / 47,150 / 100,525 / 191,950 / 243,725 / 609,350 | 12,400 / 50,400 / 105,700 / 201,775 / 256,225 / 640,600 |
| Ordinary brackets (MFJ tops) | 23,200 / 94,300 / 201,050 / 383,900 / 487,450 / 731,200 | 24,800 / 100,800 / 211,400 / 403,550 / 512,450 / 768,700 |
| HOH brackets | 2024 | 17,700 / 67,450 / 105,700 / 201,750 / 256,200 / 640,600 |
| 0% LTCG top – S / MFJ / HOH | 47,025 / 94,050 / 63,000 | 49,450 / 98,900 / 66,200 |
| 15% LTCG top – S / MFJ / HOH | 518,900 / 583,750 / 551,350 | 545,500 / 613,700 / 579,600 |
| IRMAA tiers + Part B premium | 103k / 206k, $174.70 | 109k / 218k (all tiers updated), $202.90 |
| 401(k) limit / catch-up / age 60-63 | 23,000 / 7,500 / 11,250 | 24,500 / 8,000 / 11,250 |
| QCD limit | 105,000 | 111,000 |
| SS wage base | 168,600 | 184,500 |
| AMT exemption / phase-out | 2024 | 90,100 / 140,200; phase-out 500k / 1M (new law) |
| Federal Poverty Level (ACA) | 2024 table | 2025 guidelines (used for 2026 coverage) |

NIIT thresholds (200k/250k) stay unchanged — they are fixed by law and should NOT be inflated (current code inflates them; will fix).

## 2. New laws not currently modeled

- **Age 65+ additional standard deduction** (long-standing, missing today): +$2,050 Single/HOH, +$1,650 per spouse 65+ when married.
- **OBBBA "senior bonus" deduction, 2025–2028**: +$6,000 per person age 65+, phased out at 6% of MAGI above $75k (Single) / $150k (MFJ). Applies only in calendar years 2026–2028 of the projection, then expires.
- **ACA enhanced subsidies expired after 2025**: restore the 400% FPL cliff and the 2026 required-contribution table (about 2.10%–9.96% of income). The ACA explainer text will note this.
- **Permanent TCJA rates**: no 2026 "sunset" — brackets simply index with inflation (confirms current approach; any sunset comments get removed).
- **SALT cap $40,400** (2026): mentioned in the "other itemized deductions" helper text only; SALT itself isn't modeled.

## 3. Labels and text

- Rename "2024 limits/thresholds" wording across Tax Settings, ACA, Action Items, Income Alerts, and RMD planner to 2026.
- Update the harvest-note approximate 0% thresholds (~$49k / ~$99k).

## 4. Tests

- Update test expectations tied to 2024 values (e.g. harvest caps, IRMAA cap near $109k).
- Add tests: 65+ additional deduction, senior bonus phase-out, and senior bonus ending after 2028.

## Technical details

- `src/lib/taxCalculations.ts`: rename `*2024` constants to `*2026` (keep year-0 = 2026, inflation indexing unchanged); add `getStandardDeduction(filingStatus, yearIndex, inflation, ages, magi, calendarYear)` used everywhere `standardDeductions2024` is referenced today (~10 call sites, plus `useProjections.ts`).
- Calendar year derived as `2026 + yearIndex` for the 2025–2028 senior-bonus window; single filers ignore spouse age (per project rule).
- MAGI for the phase-out uses the same MAGI already computed for IRMAA/NIIT; one-pass approximation (prior-iteration MAGI) inside the take-home solver to avoid circular loops.
- Remove inflation from NIIT threshold in `calculateNIIT`.
- Update memory `defaults/financial-assumptions` to 2026 standards.
- Exact figures re-verified against IRS/CMS/SSA sources during implementation.

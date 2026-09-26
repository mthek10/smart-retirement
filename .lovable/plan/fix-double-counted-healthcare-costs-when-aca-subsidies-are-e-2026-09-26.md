# Fix double-counted healthcare costs when ACA subsidies are enabled

## Root cause (confirmed in code)

In `src/hooks/useProjections.ts` (~lines 1359–1393), each pre-Medicare year adds **both**:

1. **Your manual "Annual Health Insurance Cost"** — `calculateManualHealthInsuranceCost()` returns your entered amount (inflation-adjusted) whenever anyone is under 65, regardless of whether ACA is enabled.
2. **The ACA marketplace premium** — when "Enable ACA Subsidy Calculation" is on, `calculateACASubsidy()` computes a full benchmark silver-plan premium (from national age-based averages, e.g. ~$700–$1,100/month per person) and subtracts only the subsidy.

So the projection's Healthcare Cost = your manual premium **+** the ACA premium − subsidy. The two are meant to be alternatives (your own premium estimate vs. the modeled marketplace premium), but today they stack — which is why the projected cost is much higher than what you entered.

## Fix: one premium source per year

When ACA subsidy calculation is enabled, the ACA model becomes the single source of the pre-65 premium; the manual Annual Health Insurance Cost is no longer added on top:

- **ACA enabled:** healthcare cost = ACA benchmark premium − subsidy. If a Custom Benchmark Premium is set, it overrides the national average (already supported). The manual cost field is ignored for those years (and the UI says so).
- **ACA disabled (or no pre-65 enrollees):** healthcare cost = the manual Annual Health Insurance Cost, exactly as today.
- Mixed-age married years keep current behavior: Medicare for the 65+ spouse, ACA for the under-65 spouse, manual cost skipped.

## UI changes (Healthcare Settings card)

- When the ACA toggle is on, show a note under the Annual Health Insurance Cost field: "Ignored while ACA subsidy calculation is enabled — the modeled marketplace premium (or your Custom Benchmark Premium) is used instead." Optionally grey the field out.
- Keep the existing explanation that costs inflate annually and stop at Medicare age.

## Tests

- ACA enabled + manual cost entered → healthcare cost equals net ACA premium only (no stacking).
- ACA disabled + manual cost entered → healthcare cost equals the manual amount (unchanged).
- Mixed-age married year → manual cost still excluded, ACA covers under-65 spouse.

## Technical details

- `src/hooks/useProjections.ts`: skip `calculateManualHealthInsuranceCost` (or zero it) when `acaSettings.enabled` and `solverEnrolleeAges.length > 0`; apply the same rule in the take-home solver path (~line 450) so the solver and the final projection agree.
- `src/components/ACASettings.tsx`: conditional helper text / disabled state on the manual cost field.
- `src/hooks/useProjections.test.ts`: add the three cases above.

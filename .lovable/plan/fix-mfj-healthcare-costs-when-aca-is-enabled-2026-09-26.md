# Fix MFJ healthcare costs when ACA is enabled

## Goal

Treat **Annual Health Care Cost** as the married household’s actual annual ACA premium **before subsidies**, rather than ignoring it and substituting a higher national age-based premium.

## Changes

1. **Use the entered premium as the actual plan cost**
   - When ACA is enabled and the annual amount is greater than zero, inflate that amount each year and use it as the household’s gross pre-Medicare premium.
   - Calculate the ACA premium tax credit from household MAGI, household size, and the benchmark Silver premium.
   - Apply the credit to the entered premium, capped so healthcare cost never falls below zero.
   - Keep the modeled age-based premium as a fallback only when no annual premium was entered.

2. **Handle married and mixed-age years correctly**
   - Treat the entered amount as a household total, not a per-person amount that is multiplied by two.
   - When both spouses begin under 65, allocate the household premium across covered spouses so the cost falls appropriately after one spouse moves to Medicare.
   - Continue adding Medicare and any IRMAA costs only for the spouse who is Medicare-eligible.

3. **Keep the withdrawal calculation consistent**
   - Use one shared healthcare calculation for both the take-home withdrawal solver and the final projection rows, preventing the two paths from producing different results.

4. **Clarify the Healthcare screen**
   - Rename or describe the field as the total annual household premium before ACA subsidies.
   - Explain that the benchmark premium determines the credit, while the entered annual premium determines the actual plan cost.
   - Preserve the Custom Benchmark Premium option for users who know their local benchmark rate.

## Tests

- MFJ, both spouses under 65: entered annual premium is used once, then the ACA credit is subtracted.
- MFJ with a high modeled benchmark: projection does not replace or multiply the entered household premium.
- Mixed-age couple: ACA applies only to the under-65 spouse and Medicare applies only to the 65+ spouse.
- Subsidy cannot reduce the entered premium below zero.
- No annual premium entered: the current modeled benchmark fallback remains available.
- ACA disabled: the entered annual healthcare cost continues to work as it does now.

## Technical details

Update the ACA calculation in `src/hooks/useProjections.ts` in both the withdrawal-solver and final-projection paths. Add a shared helper if needed to centralize gross premium, subsidy, enrollee allocation, and net premium rules. Update `src/components/ACASettings.tsx`, the setup schema description, and focused projection tests.

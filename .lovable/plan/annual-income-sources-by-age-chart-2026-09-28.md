# Annual Income Sources by Age chart

## Goal
Add a stacked chart in the Charts tab, similar to **Account Balances by Age**, showing where each year's available income comes from.

## What will be shown
Each age will have one stacked column containing:
- Traditional account withdrawals
- Roth withdrawals
- Brokerage withdrawals
- Social Security
- Pension income
- Employment income

The chart will use the existing projection years and calculation results. It will not count Roth conversions, reinvested dividends, capital-gains harvesting, or excess savings as spendable income sources.

## User experience
- Place the new chart directly after **Account Balances by Age** in the Charts tab.
- Title it **Annual Income Sources by Age** and clearly describe that each column is the year's total, split by source.
- Use the established chart colors, compact currency axis labels, horizontal gridlines, and high-contrast labels.
- Add a tooltip that lists each active source and the total annual income for the selected age.
- Hide zero-value sources cleanly while keeping the legend and chart layout stable across the projection horizon.

## Technical details
- Extend each projection row with the already-calculated Traditional, Roth, and Brokerage withdrawal amounts; today only their combined `withdrawals` total is exposed.
- Create a focused chart component using the same responsive stacked-column pattern as the existing balance chart.
- Use net employment wages because that is the employment cash available in the existing total-income calculation; use the existing Social Security and pension values.
- Render the component from the Charts tab without changing any financial calculation or withdrawal-order logic.
- Add tests confirming the three account-source fields reconcile to total withdrawals and remain correct across representative projection years.

## Validation
- Confirm the chart renders on desktop and mobile without clipped labels or legends.
- Confirm each tooltip total equals the sum of its displayed sources.
- Run the projection tests and verify the app builds without errors.

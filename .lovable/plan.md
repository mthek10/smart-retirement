

# Usability Improvement Suggestions

Here are actionable improvements I'd recommend for making the Retirement Drawdown Planner easier and more intuitive to use, organized by impact:

---

## 1. Add Helpful Tooltips and Contextual Help Throughout

**Problem:** Many inputs use financial jargon (IRMAA, NIIT, AMT, cost basis, marginal bracket, etc.) that most users won't understand without explanation.

**Solution:** Add info-icon tooltips next to key labels in Setup, Dashboard, and Analysis. For example:
- "Cost Basis (%)" -- tooltip: "The portion of your brokerage account that represents your original investment (not gains). A 33% cost basis means 67% is unrealized gains."
- "IRMAA" -- tooltip: "Income-Related Monthly Adjustment Amount -- a surcharge on Medicare premiums for higher-income retirees."
- "NIIT" -- tooltip: "Net Investment Income Tax -- a 3.8% surtax on investment income above certain thresholds."

**Changes:**
- Create a small reusable `InfoTooltip` component (an info circle icon wrapped in a Tooltip)
- Add it to labels in `AccountInputs`, `TaxSettings`, `HouseholdInputs`, `SummaryCards`, and `ProjectionTable` headers

---

## 2. Add a "Quick Summary" to the Projections Tab

**Problem:** The Projections tab jumps straight into a massive 25-column table with no orientation. Users can feel lost scrolling through decades of data.

**Solution:** Add a brief narrative summary paragraph above the table that highlights 3-4 key takeaways, such as:
- "Your portfolio lasts through age 100 with a final balance of $X."
- "Traditional IRA is depleted at age 78, triggering Roth withdrawals."
- "You'll pay $X in total lifetime taxes, averaging $Y/year."

**Changes:**
- Add a `ProjectionSummary` section at the top of the Projections `TabsContent` in `Index.tsx`
- Pull key data points from the existing `summary` useMemo

---

## 3. Improve the Projection Table with Column Grouping and Toggles

**Problem:** The projection table has 25 columns, making it very wide and hard to read. Most users only care about a subset of columns at any given time.

**Solution:** Add toggle buttons to show/hide column groups (e.g., "Balances", "Income", "Taxes", "Healthcare"), so users can focus on what matters to them. Default to showing only the most important columns.

**Changes:**
- Add a row of toggle chips above the table in `ProjectionTable.tsx`
- Group columns into categories and conditionally render them based on toggle state
- Default: show Balances, Withdrawals, Total Taxes, Take Home. Hide: individual tax breakdowns, Medicare details

---

## 4. Add Descriptive Step Introductions to the Setup Wizard

**Problem:** Each setup step drops you into a form with no context about why these inputs matter or what they affect. The wizard UI is there but it doesn't guide the user.

**Solution:** Add a brief 1-2 sentence description at the top of each step explaining what the section does and why it matters.

**Changes:**
- Add a `description` field to each step in the `STEPS` array in `SetupWizard.tsx`
- Render it as a callout/intro paragraph above the step content
- Examples:
  - Household: "Tell us about your household so we can determine your filing status and model your timeline."
  - Accounts: "Enter your current retirement account balances. These are the starting point for all projections."
  - Tax Settings: "Set your desired take-home income and Roth conversion strategy. This drives the entire withdrawal plan."

---

## 5. Add a "Back to Setup" Button on Dashboard/Analysis

**Problem:** If a user sees results they want to tweak, they have to click the Setup tab, remember which step to go to, and navigate there. There's no quick way to jump back and adjust a specific input.

**Solution:** Add small "Edit" or "Adjust" links on Dashboard cards that take the user back to the relevant Setup wizard step.

**Changes:**
- Pass `setActiveTab` and `setCurrentStep` (from SetupWizard) up to Index via callbacks
- Add subtle edit icons/links on key Dashboard sections (e.g., account depletion cards link back to Accounts step, tax section links to Tax Settings step)

---

## Technical Details

| File | Changes |
|------|---------|
| `src/components/ui/InfoTooltip.tsx` | New reusable tooltip component with info icon |
| `src/components/SetupWizard.tsx` | Add step descriptions to STEPS array, render intro text, expose step navigation callback |
| `src/components/AccountInputs.tsx` | Add InfoTooltips to key labels (cost basis, returns) |
| `src/components/TaxSettings.tsx` | Add InfoTooltips (IRMAA, Roth conversion strategies, optimization goal) |
| `src/components/HouseholdInputs.tsx` | Add InfoTooltip for survivor scenario |
| `src/components/SummaryCards.tsx` | Add InfoTooltips to collapsible section badges, add edit links |
| `src/components/ProjectionTable.tsx` | Add column group toggles, add InfoTooltips to column headers |
| `src/pages/Index.tsx` | Add ProjectionSummary above table, wire up edit-navigation callbacks |

All changes follow existing patterns (Radix Tooltip, Tailwind styling, component composition) and require no new dependencies.


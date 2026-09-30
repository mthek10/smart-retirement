import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  federalTaxBrackets2024,
  standardDeductions2024,
  capitalGainsBrackets2024,
  niitThresholds2024,
  irmaaBracketsSingle2024,
  irmaaBracketsMarried2024,
  medicarePartBPremium2024,
  medicarePartDPremium2024,
  federalPovertyLevel2024,
  acaContributionRates2024,
  socialSecurityWageBase2024,
  contribution401kLimit2024,
  contribution401kCatchup2024,
  contribution401kSuperCatchup2024,
  qcdAnnualLimit2024,
  uniformLifetimeTable,
  amtBrackets2024,
  amtExemptions2024,
  TAX_BASE_YEAR,
  type TaxBracket,
} from "@/lib/taxCalculations";

const currency0 = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const currency2 = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

const fmt = (value: number) => (value === Infinity ? "and above" : currency0.format(value));
const pct = (rate: number) => `${(rate * 100).toFixed(rate * 100 % 1 === 0 ? 0 : 3)}%`;

const FILING_LABELS: Record<string, string> = {
  single: "Single",
  married: "Married Filing Jointly",
  hoh: "Head of Household",
};

const FILING_ORDER = ["single", "married", "hoh"];

function BracketTable({ brackets, label }: { brackets: TaxBracket[]; label: string }) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-foreground">{label}</p>
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-foreground">Rate</TableHead>
              <TableHead className="text-foreground">Taxable income from</TableHead>
              <TableHead className="text-foreground">Up to</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {brackets.map((bracket) => (
              <TableRow key={`${label}-${bracket.min}`}>
                <TableCell className="font-semibold text-foreground">{pct(bracket.rate)}</TableCell>
                <TableCell className="text-foreground">{currency0.format(bracket.min)}</TableCell>
                <TableCell className="text-foreground">{fmt(bracket.max)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border-l-4 border-l-primary bg-muted/40 p-3">
      <p className="text-xs text-foreground/80">{children}</p>
    </div>
  );
}

export function TaxRulesReference() {
  const rmdAges = Object.keys(uniformLifetimeTable)
    .map(Number)
    .filter((age) => age <= 100)
    .sort((a, b) => a - b);

  return (
    <div className="space-y-6">
      <Card className="border-l-4 border-l-primary">
        <CardHeader>
          <CardTitle>Tax Rules Reference ({TAX_BASE_YEAR})</CardTitle>
          <CardDescription>
            Every figure below is the exact value this planner uses in your projections. In future years these
            amounts grow with the inflation rate set in Tax Settings, except where noted as fixed by law.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Federal ordinary income tax */}
      <Card className="border-l-4 border-l-primary">
        <CardHeader>
          <CardTitle>Federal Income Tax Brackets</CardTitle>
          <CardDescription>
            Applies to IRA and 401(k) withdrawals, Roth conversions, pensions, wages, and taxable Social Security.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {FILING_ORDER.map((status) => (
            <BracketTable
              key={status}
              label={FILING_LABELS[status]}
              brackets={federalTaxBrackets2024[status]}
            />
          ))}
          <Note>
            Brackets apply to income after your deduction. Roth conversion strategies such as "Fill to 22%" convert
            just enough to reach the top of the chosen bracket.
          </Note>
        </CardContent>
      </Card>

      {/* Standard deduction */}
      <Card className="border-l-4 border-l-primary">
        <CardHeader>
          <CardTitle>Federal Standard Deduction</CardTitle>
          <CardDescription>Subtracted from income before brackets are applied.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-foreground">Filing status</TableHead>
                  <TableHead className="text-foreground">Standard deduction</TableHead>
                  <TableHead className="text-foreground">Additional if age 65+</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {FILING_ORDER.map((status) => (
                  <TableRow key={status}>
                    <TableCell className="text-foreground">{FILING_LABELS[status]}</TableCell>
                    <TableCell className="font-semibold text-foreground">
                      {currency0.format(standardDeductions2024[status])}
                    </TableCell>
                    <TableCell className="text-foreground">
                      {status === "married" ? "$1,650 per spouse" : "$2,050"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <Note>
            Senior bonus deduction: an extra $6,000 per person age 65 or older applies for tax years 2025 through
            2028 only. It phases out by 6 cents per dollar of income above $75,000 (Single or Head of Household) or
            $150,000 (Married Filing Jointly), and applies only when you take the standard deduction.
          </Note>
        </CardContent>
      </Card>

      {/* Capital gains */}
      <Card className="border-l-4 border-l-primary">
        <CardHeader>
          <CardTitle>Long-Term Capital Gains</CardTitle>
          <CardDescription>
            Rates for gains on investments held more than one year. Gains stack on top of your ordinary income.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {FILING_ORDER.map((status) => (
            <BracketTable
              key={status}
              label={FILING_LABELS[status]}
              brackets={capitalGainsBrackets2024[status]}
            />
          ))}
          <Note>
            The 0% band is what capital gains harvesting targets: selling appreciated shares up to the top of this
            band realizes the gain tax free and raises your cost basis. Ordinary income uses up the band first, so
            large withdrawals or conversions shrink the harvesting room.
          </Note>
        </CardContent>
      </Card>

      {/* NIIT */}
      <Card className="border-l-4 border-l-primary">
        <CardHeader>
          <CardTitle>Net Investment Income Tax</CardTitle>
          <CardDescription>An extra 3.8% on investment income above these income levels.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-foreground">Filing status</TableHead>
                  <TableHead className="text-foreground">Income threshold</TableHead>
                  <TableHead className="text-foreground">Rate above threshold</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {FILING_ORDER.map((status) => (
                  <TableRow key={status}>
                    <TableCell className="text-foreground">{FILING_LABELS[status]}</TableCell>
                    <TableCell className="font-semibold text-foreground">
                      {currency0.format(niitThresholds2024[status])}
                    </TableCell>
                    <TableCell className="text-foreground">3.8%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <Note>
            These thresholds are fixed by law and never rise with inflation, so more households cross them over
            time. Roth conversions do not count as investment income, but they raise the income used to test the
            threshold.
          </Note>
        </CardContent>
      </Card>

      {/* Social Security taxation */}
      <Card className="border-l-4 border-l-primary">
        <CardHeader>
          <CardTitle>Social Security Taxation</CardTitle>
          <CardDescription>
            How much of your benefit becomes taxable, based on "provisional income": half your benefit plus all
            other income, including tax-exempt interest.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-foreground">Filing status</TableHead>
                  <TableHead className="text-foreground">None taxable below</TableHead>
                  <TableHead className="text-foreground">Up to 50% taxable</TableHead>
                  <TableHead className="text-foreground">Up to 85% taxable above</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="text-foreground">Single / Head of Household</TableCell>
                  <TableCell className="text-foreground">$25,000</TableCell>
                  <TableCell className="text-foreground">$25,000 – $34,000</TableCell>
                  <TableCell className="font-semibold text-foreground">$34,000</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="text-foreground">Married Filing Jointly</TableCell>
                  <TableCell className="text-foreground">$32,000</TableCell>
                  <TableCell className="text-foreground">$32,000 – $44,000</TableCell>
                  <TableCell className="font-semibold text-foreground">$44,000</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
          <Note>
            These thresholds have never been adjusted for inflation, which is why most retirees eventually pay tax
            on 85% of their benefit. Extra income in a year can make more of your benefit taxable, an effect often
            called the tax torpedo.
          </Note>
        </CardContent>
      </Card>

      {/* Medicare and IRMAA */}
      <Card className="border-l-4 border-l-primary">
        <CardHeader>
          <CardTitle>Medicare Premiums and IRMAA Surcharges</CardTitle>
          <CardDescription>
            Base Part B is {currency2.format(medicarePartBPremium2024)} per month and Part D averages{" "}
            {currency2.format(medicarePartDPremium2024)} per month, per person age 65 or older. Higher earners pay a
            surcharge on top.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">Single / Head of Household</p>
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-foreground">Income from</TableHead>
                    <TableHead className="text-foreground">Up to</TableHead>
                    <TableHead className="text-foreground">Extra per month</TableHead>
                    <TableHead className="text-foreground">Extra per year</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {irmaaBracketsSingle2024.map((tier) => (
                    <TableRow key={`s-${tier.min}`}>
                      <TableCell className="text-foreground">{currency0.format(tier.min)}</TableCell>
                      <TableCell className="text-foreground">{fmt(tier.max)}</TableCell>
                      <TableCell className="font-semibold text-foreground">
                        {currency2.format(tier.premium)}
                      </TableCell>
                      <TableCell className="text-foreground">{currency0.format(tier.premium * 12)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">Married Filing Jointly</p>
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-foreground">Income from</TableHead>
                    <TableHead className="text-foreground">Up to</TableHead>
                    <TableHead className="text-foreground">Extra per month</TableHead>
                    <TableHead className="text-foreground">Extra per year</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {irmaaBracketsMarried2024.map((tier) => (
                    <TableRow key={`m-${tier.min}`}>
                      <TableCell className="text-foreground">{currency0.format(tier.min)}</TableCell>
                      <TableCell className="text-foreground">{fmt(tier.max)}</TableCell>
                      <TableCell className="font-semibold text-foreground">
                        {currency2.format(tier.premium)}
                      </TableCell>
                      <TableCell className="text-foreground">{currency0.format(tier.premium * 12)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <Note>
            Surcharges are per person and use your income from two years earlier, so income at age 63 sets your
            premium at 65. Crossing a tier by even one dollar raises the premium for the whole year. If a one-time
            event such as retirement caused the spike, Form SSA-44 can ask Social Security to use current income.
          </Note>
        </CardContent>
      </Card>

      {/* ACA */}
      <Card className="border-l-4 border-l-primary">
        <CardHeader>
          <CardTitle>ACA Marketplace Subsidies (before age 65)</CardTitle>
          <CardDescription>
            Premium credits depend on income as a percentage of the federal poverty level.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">Federal poverty level by household size</p>
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-foreground">Household size</TableHead>
                    <TableHead className="text-foreground">Poverty level</TableHead>
                    <TableHead className="text-foreground">400% cliff</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(federalPovertyLevel2024).map(([size, amount]) => (
                    <TableRow key={size}>
                      <TableCell className="text-foreground">
                        {size === "8" ? "8 or more" : `${size} ${size === "1" ? "person" : "people"}`}
                      </TableCell>
                      <TableCell className="text-foreground">{currency0.format(amount)}</TableCell>
                      <TableCell className="font-semibold text-foreground">
                        {currency0.format(amount * 4)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">Expected share of income toward premiums</p>
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-foreground">Income as % of poverty level</TableHead>
                    <TableHead className="text-foreground">You pay this share of income</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {acaContributionRates2024.map((tier) => (
                    <TableRow key={tier.minFPL}>
                      <TableCell className="text-foreground">
                        {tier.maxFPL === Infinity ? "Above 400%" : `${tier.minFPL}% – ${tier.maxFPL}%`}
                      </TableCell>
                      <TableCell className="font-semibold text-foreground">
                        {tier.rate === Infinity ? "No subsidy (cliff)" : `${(tier.rate * 100).toFixed(2)}%`}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <Note>
            Enhanced subsidies expired after 2025, so the 400% cliff is back: one dollar of income above the cliff
            removes the entire credit. Coverage and credits end at age 65 when Medicare begins.
          </Note>
        </CardContent>
      </Card>

      {/* RMDs */}
      <Card className="border-l-4 border-l-primary">
        <CardHeader>
          <CardTitle>Required Minimum Distributions</CardTitle>
          <CardDescription>
            Withdrawals from traditional retirement accounts must begin at age 73. The yearly amount is your balance
            divided by the factor for your age.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border overflow-hidden max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-foreground">Age</TableHead>
                  <TableHead className="text-foreground">Divide balance by</TableHead>
                  <TableHead className="text-foreground">Roughly this share</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rmdAges.map((age) => (
                  <TableRow key={age}>
                    <TableCell className="text-foreground">{age}</TableCell>
                    <TableCell className="text-foreground">{uniformLifetimeTable[age].toFixed(1)}</TableCell>
                    <TableCell className="font-semibold text-foreground">
                      {(100 / uniformLifetimeTable[age]).toFixed(1)}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <Note>
            Roth accounts have no required withdrawals during your lifetime. Missing a required withdrawal carries a
            penalty of 25% of the shortfall, reduced to 10% if corrected promptly.
          </Note>
        </CardContent>
      </Card>

      {/* Contribution limits & payroll */}
      <Card className="border-l-4 border-l-primary">
        <CardHeader>
          <CardTitle>Savings Limits and Payroll Taxes</CardTitle>
          <CardDescription>Applies while you or your spouse are still working.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableBody>
                <TableRow>
                  <TableCell className="text-foreground">401(k) contribution limit</TableCell>
                  <TableCell className="font-semibold text-foreground text-right">
                    {currency0.format(contribution401kLimit2024)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="text-foreground">Catch-up, age 50 and over</TableCell>
                  <TableCell className="font-semibold text-foreground text-right">
                    {currency0.format(contribution401kCatchup2024)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="text-foreground">Higher catch-up, ages 60 to 63</TableCell>
                  <TableCell className="font-semibold text-foreground text-right">
                    {currency0.format(contribution401kSuperCatchup2024)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="text-foreground">Charitable transfer from an IRA, age 70½ and over</TableCell>
                  <TableCell className="font-semibold text-foreground text-right">
                    {currency0.format(qcdAnnualLimit2024)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="text-foreground">Social Security tax applies on wages up to</TableCell>
                  <TableCell className="font-semibold text-foreground text-right">
                    {currency0.format(socialSecurityWageBase2024)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="text-foreground">Social Security tax rate (employee share)</TableCell>
                  <TableCell className="font-semibold text-foreground text-right">6.2%</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="text-foreground">Medicare tax rate (employee share)</TableCell>
                  <TableCell className="font-semibold text-foreground text-right">1.45%</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="text-foreground">
                    Extra Medicare tax on wages above $200,000 (Single) or $250,000 (Joint)
                  </TableCell>
                  <TableCell className="font-semibold text-foreground text-right">0.9%</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* AMT */}
      <Card className="border-l-4 border-l-primary">
        <CardHeader>
          <CardTitle>Alternative Minimum Tax</CardTitle>
          <CardDescription>A parallel calculation that mainly affects very high incomes.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-foreground">Filing status</TableHead>
                  <TableHead className="text-foreground">Exemption</TableHead>
                  <TableHead className="text-foreground">Exemption phases out above</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {FILING_ORDER.map((status) => (
                  <TableRow key={status}>
                    <TableCell className="text-foreground">{FILING_LABELS[status]}</TableCell>
                    <TableCell className="font-semibold text-foreground">
                      {currency0.format(amtExemptions2024[status].exemption)}
                    </TableCell>
                    <TableCell className="text-foreground">
                      {currency0.format(amtExemptions2024[status].phaseoutStart)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <Note>
            Rates are {pct(amtBrackets2024[0].rate)} up to {currency0.format(amtBrackets2024[0].max)} of income
            subject to this calculation, and {pct(amtBrackets2024[1].rate)} above it.
          </Note>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-primary">
        <CardContent className="pt-6">
          <p className="text-xs text-foreground/80">
            These figures reflect {TAX_BASE_YEAR} federal rules as modeled by this planner and are shown for general
            reference. State and city taxes are handled separately in Tax Settings. This is planning guidance, not
            tax advice; confirm anything important with your tax professional before acting on it.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

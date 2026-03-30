import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { formatCurrency } from "@/lib/utils";
import type { ProjectionRow } from "@/hooks/useProjections";
import {
  TrendingDown,
  ShieldCheck,
  ArrowRightLeft,
  Banknote,
  BarChart3,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface TaxLossHarvestingTrackerProps {
  projections: ProjectionRow[];
  taxableBalance: number;
  costBasisPercent: number;
  taxableReturn: number;
  filingStatus: string;
  spouse1Age: number;
}

interface TLHYearData {
  age: number;
  year: number;
  capitalGainsRealized: number;
  ordinaryIncome: number;
  marginalBracket: number;
  lossesNeededToOffsetGains: number;
  ordinaryIncomeOffset: number; // $3,000 cap
  totalTaxBenefit: number;
  cumulativeBenefit: number;
  taxableBalance: number;
}

interface TLHScenarioYear {
  age: number;
  year: number;
  marketReturn: number;
  portfolioValue: number;
  unrealizedLoss: number;
  harvestableAmount: number;
  taxSavings: number;
  lossCarryforward: number;
}

const ORDINARY_INCOME_LOSS_CAP = 3000;

export function TaxLossHarvestingTracker({
  projections,
  taxableBalance,
  costBasisPercent,
  taxableReturn,
  filingStatus,
  spouse1Age,
}: TaxLossHarvestingTrackerProps) {
  const [drawdownPercent, setDrawdownPercent] = useState(25); // hypothetical market drop
  const [drawdownYear, setDrawdownYear] = useState(2); // years from now

  const costBasis = taxableBalance * (costBasisPercent / 100);
  const unrealizedGains = taxableBalance - costBasis;
  const hasUnrealizedGains = unrealizedGains > 1000;

  // Analyze each projection year for TLH opportunities
  const yearlyAnalysis = useMemo<TLHYearData[]>(() => {
    let cumulativeBenefit = 0;
    return projections
      .filter(p => p.taxableBalance > 1000)
      .slice(0, 25) // 25-year horizon
      .map((p) => {
        const capitalGainsRealized = p.capitalGainsIncome;
        const ordinaryIncomeOffset = Math.min(ORDINARY_INCOME_LOSS_CAP, p.ordinaryIncome * 0.01); // limited to $3k
        const lossesNeededToOffsetGains = capitalGainsRealized;

        // Tax benefit: gains offset at CG rate + $3k at marginal rate
        const cgRate = p.marginalBracket <= 0.12 ? 0 : p.marginalBracket <= 0.35 ? 0.15 : 0.20;
        const gainsBenefit = capitalGainsRealized * cgRate;
        const ordinaryBenefit = ORDINARY_INCOME_LOSS_CAP * p.marginalBracket;
        const totalTaxBenefit = gainsBenefit + ordinaryBenefit;
        cumulativeBenefit += totalTaxBenefit;

        return {
          age: p.age,
          year: p.year,
          capitalGainsRealized,
          ordinaryIncome: p.ordinaryIncome,
          marginalBracket: p.marginalBracket,
          lossesNeededToOffsetGains,
          ordinaryIncomeOffset: ORDINARY_INCOME_LOSS_CAP,
          totalTaxBenefit,
          cumulativeBenefit,
          taxableBalance: p.taxableBalance,
        };
      });
  }, [projections]);

  // Model a hypothetical market downturn scenario
  const downturnScenario = useMemo<TLHScenarioYear[]>(() => {
    const results: TLHScenarioYear[] = [];
    let portfolioValue = taxableBalance;
    let basis = costBasis;
    let lossCarryforward = 0;
    let cumulativeSavings = 0;

    for (let i = 0; i < Math.min(10, projections.length); i++) {
      const p = projections[i];
      const isDrawdownYear = i === drawdownYear;
      const marketReturn = isDrawdownYear ? -(drawdownPercent / 100) : taxableReturn / 100;

      portfolioValue *= (1 + marketReturn);

      const unrealizedLoss = Math.max(0, basis - portfolioValue);
      let harvestableAmount = 0;
      let taxSavings = 0;

      if (unrealizedLoss > 1000) {
        // Harvest all unrealized losses
        harvestableAmount = unrealizedLoss;

        // Offset this year's capital gains first
        const gainsOffset = Math.min(harvestableAmount, p.capitalGainsIncome);
        let remainingLoss = harvestableAmount - gainsOffset;

        // Then $3,000 against ordinary income
        const ordinaryOffset = Math.min(ORDINARY_INCOME_LOSS_CAP, remainingLoss);
        remainingLoss -= ordinaryOffset;

        // Carryforward unused losses
        lossCarryforward += remainingLoss;

        const cgRate = p.marginalBracket <= 0.12 ? 0 : p.marginalBracket <= 0.35 ? 0.15 : 0.20;
        taxSavings = gainsOffset * cgRate + ordinaryOffset * p.marginalBracket;
        cumulativeSavings += taxSavings;

        // Reset basis to current market value (after harvest)
        basis = portfolioValue;
      } else if (lossCarryforward > 0) {
        // Use carryforward losses
        const gainsOffset = Math.min(lossCarryforward, p.capitalGainsIncome);
        let remainingCarryforward = lossCarryforward - gainsOffset;
        const ordinaryOffset = Math.min(ORDINARY_INCOME_LOSS_CAP, remainingCarryforward);
        remainingCarryforward -= ordinaryOffset;

        const cgRate = p.marginalBracket <= 0.12 ? 0 : p.marginalBracket <= 0.35 ? 0.15 : 0.20;
        taxSavings = gainsOffset * cgRate + ordinaryOffset * p.marginalBracket;
        cumulativeSavings += taxSavings;
        lossCarryforward = remainingCarryforward;
      }

      results.push({
        age: p.age,
        year: p.year,
        marketReturn: marketReturn * 100,
        portfolioValue,
        unrealizedLoss,
        harvestableAmount,
        taxSavings,
        lossCarryforward,
      });

      // Growth resumes after drawdown
      if (!isDrawdownYear) {
        basis *= (1 + taxableReturn / 100); // basis doesn't grow, but track cost basis of new contributions
      }
    }

    return results;
  }, [taxableBalance, costBasis, drawdownPercent, drawdownYear, taxableReturn, projections]);

  const totalScenarioSavings = downturnScenario.reduce((sum, y) => sum + y.taxSavings, 0);
  const peakHarvestYear = downturnScenario.reduce((best, y) =>
    y.harvestableAmount > best.harvestableAmount ? y : best,
    downturnScenario[0]
  );

  // Years with meaningful capital gains that could be offset
  const highGainsYears = yearlyAnalysis.filter(y => y.capitalGainsRealized > 5000);
  const totalProjectedGains = yearlyAnalysis.reduce((sum, y) => sum + y.capitalGainsRealized, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <TrendingDown className="h-5 w-5 text-primary" />
          <CardTitle>Tax-Loss Harvesting Tracker</CardTitle>
        </div>
        <CardDescription>
          Identify opportunities to realize investment losses to offset capital gains and reduce ordinary income taxes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Position Summary */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-dashed">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Banknote className="h-3.5 w-3.5" />
                Brokerage Balance
              </div>
              <div className="text-xl font-bold">{formatCurrency(taxableBalance)}</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Cost basis: {formatCurrency(costBasis)} ({costBasisPercent}%)
              </div>
            </CardContent>
          </Card>

          <Card className="border-dashed">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                {hasUnrealizedGains ? (
                  <BarChart3 className="h-3.5 w-3.5 text-success" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5 text-destructive" />
                )}
                Unrealized {hasUnrealizedGains ? "Gains" : "Losses"}
              </div>
              <div className={`text-xl font-bold ${hasUnrealizedGains ? "text-success" : "text-destructive"}`}>
                {hasUnrealizedGains ? "+" : ""}{formatCurrency(unrealizedGains)}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {hasUnrealizedGains
                  ? "Gains would be taxable if realized"
                  : "Losses available to harvest now"}
              </div>
            </CardContent>
          </Card>

          <Card className="border-dashed">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <ArrowRightLeft className="h-3.5 w-3.5" />
                Projected Gains
                <InfoTooltip text="Total capital gains expected from brokerage withdrawals over the projection period" />
              </div>
              <div className="text-xl font-bold">{formatCurrency(totalProjectedGains)}</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Across {highGainsYears.length} years with significant gains
              </div>
            </CardContent>
          </Card>

          <Card className="border-dashed">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                Annual Income Offset
                <InfoTooltip text="Net capital losses can offset up to $3,000 of ordinary income per year, with unlimited carryforward" />
              </div>
              <div className="text-xl font-bold">{formatCurrency(ORDINARY_INCOME_LOSS_CAP)}/yr</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Federal limit on ordinary income offset
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Downturn Scenario Modeler */}
        <Card className="bg-muted/30">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Market Downturn Scenario</CardTitle>
                <CardDescription className="text-xs">
                  Model a hypothetical market drop to see potential tax-loss harvesting benefits
                </CardDescription>
              </div>
              {totalScenarioSavings > 0 && (
                <Badge variant="secondary" className="text-sm">
                  Potential savings: {formatCurrency(totalScenarioSavings)}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Market Drop</label>
                  <span className="text-sm font-bold text-destructive">-{drawdownPercent}%</span>
                </div>
                <Slider
                  value={[drawdownPercent]}
                  onValueChange={([v]) => setDrawdownPercent(v)}
                  min={10}
                  max={50}
                  step={5}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>-10%</span>
                  <span>-50%</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Year of Drop</label>
                  <span className="text-sm font-bold">
                    Year {drawdownYear + 1} (Age {spouse1Age + drawdownYear})
                  </span>
                </div>
                <Slider
                  value={[drawdownYear]}
                  onValueChange={([v]) => setDrawdownYear(v)}
                  min={0}
                  max={Math.min(9, projections.length - 1)}
                  step={1}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>This year</span>
                  <span>Year 10</span>
                </div>
              </div>
            </div>

            {/* Scenario Table */}
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Age</TableHead>
                    <TableHead className="text-right">Return</TableHead>
                    <TableHead className="text-right">Portfolio</TableHead>
                    <TableHead className="text-right">Unrealized Loss</TableHead>
                    <TableHead className="text-right">Harvested</TableHead>
                    <TableHead className="text-right">Tax Savings</TableHead>
                    <TableHead className="text-right">Loss Carryforward</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {downturnScenario.map((y) => (
                    <TableRow
                      key={y.year}
                      className={y.harvestableAmount > 0 ? "bg-primary/5" : ""}
                    >
                      <TableCell className="font-medium">{y.age}</TableCell>
                      <TableCell className={`text-right ${y.marketReturn < 0 ? "text-destructive font-semibold" : ""}`}>
                        {y.marketReturn >= 0 ? "+" : ""}{y.marketReturn.toFixed(1)}%
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(y.portfolioValue)}</TableCell>
                      <TableCell className="text-right">
                        {y.unrealizedLoss > 0 ? (
                          <span className="text-destructive">{formatCurrency(y.unrealizedLoss)}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {y.harvestableAmount > 0 ? (
                          <span className="font-semibold text-primary">{formatCurrency(y.harvestableAmount)}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {y.taxSavings > 0 ? (
                          <span className="font-semibold text-success">{formatCurrency(y.taxSavings)}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {y.lossCarryforward > 0 ? (
                          formatCurrency(y.lossCarryforward)
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {peakHarvestYear && peakHarvestYear.harvestableAmount > 0 && (
              <div className="bg-primary/5 rounded-lg p-3 text-sm">
                <p className="font-medium">
                  💡 A {drawdownPercent}% drop at age {spouse1Age + drawdownYear} would create{" "}
                  <span className="font-bold">{formatCurrency(peakHarvestYear.harvestableAmount)}</span>{" "}
                  in harvestable losses, generating{" "}
                  <span className="font-bold text-success">{formatCurrency(totalScenarioSavings)}</span>{" "}
                  in total tax savings over 10 years.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Capital Gains Offset Schedule */}
        {highGainsYears.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
              Projected Capital Gains by Year
              <InfoTooltip content="Years where your brokerage withdrawals generate taxable capital gains. Harvested losses from a downturn could offset these gains dollar-for-dollar." />
            </h3>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Age</TableHead>
                    <TableHead className="text-right">Capital Gains</TableHead>
                    <TableHead className="text-right">Marginal Rate</TableHead>
                    <TableHead className="text-right">Losses Needed to Offset</TableHead>
                    <TableHead className="text-right">Potential Tax Benefit</TableHead>
                    <TableHead className="text-right">Cumulative Benefit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {yearlyAnalysis
                    .filter(y => y.capitalGainsRealized > 1000)
                    .slice(0, 15)
                    .map((y) => (
                      <TableRow key={y.year}>
                        <TableCell className="font-medium">{y.age}</TableCell>
                        <TableCell className="text-right">{formatCurrency(y.capitalGainsRealized)}</TableCell>
                        <TableCell className="text-right">{(y.marginalBracket * 100).toFixed(0)}%</TableCell>
                        <TableCell className="text-right">{formatCurrency(y.lossesNeededToOffsetGains)}</TableCell>
                        <TableCell className="text-right font-semibold text-success">
                          {formatCurrency(y.totalTaxBenefit)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {formatCurrency(y.cumulativeBenefit)}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Key Rules Reminder */}
        <div className="bg-muted/30 rounded-lg p-4 space-y-2">
          <h4 className="text-sm font-semibold">Tax-Loss Harvesting Rules</h4>
          <ul className="text-xs text-muted-foreground space-y-1.5 list-disc pl-4">
            <li>Capital losses first offset capital gains dollar-for-dollar (short-term losses offset short-term gains first)</li>
            <li>Net capital losses can offset up to <strong>$3,000</strong> of ordinary income per year ({filingStatus === "married" ? "$3,000 joint" : "$3,000 single / $1,500 married filing separately"})</li>
            <li>Unused losses carry forward indefinitely until fully used</li>
            <li><strong>Wash-sale rule:</strong> Cannot repurchase a "substantially identical" security within 30 days before or after the sale</li>
            <li>Consider buying a similar (but not identical) ETF to maintain market exposure while harvesting the loss</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

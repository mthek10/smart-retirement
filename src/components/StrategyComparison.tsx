import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingDown, TrendingUp, Equal, ArrowRightLeft, Clock, DollarSign, Trophy, AlertTriangle } from "lucide-react";
import type { StrategyMetrics } from "@/hooks/useProjections";
import { formatCurrency, formatPercent, formatAge } from "@/lib/utils";

interface StrategyComparisonProps {
  baselineMetrics: StrategyMetrics;
  optimizedMetrics: StrategyMetrics;
  currentMetrics: StrategyMetrics;
  autoMaxMetrics: StrategyMetrics;
  autoMaxStrategy: string;
  survivorSmoothedMetrics: StrategyMetrics | null;
  currentStrategyName: string;
  showOptimization: boolean;
  
  survivorEnabled?: boolean;
}

const STRATEGY_LABEL: Record<string, string> = {
  none: "No Conversions",
  fill_12: "Fill to 12%",
  fill_22: "Fill to 22%",
  fill_24: "Fill to 24%",
  fill_32: "Fill to 32%",
};

export function StrategyComparison({ 
  baselineMetrics,
  optimizedMetrics,
  currentMetrics,
  autoMaxMetrics,
  autoMaxStrategy,
  survivorSmoothedMetrics,
  currentStrategyName,
  showOptimization,
  survivorEnabled = false,
}: StrategyComparisonProps) {

  const autoMaxName = `Maximize Lifetime Wealth (${STRATEGY_LABEL[autoMaxStrategy] ?? autoMaxStrategy})`;

  // Hide the "current" column when it duplicates baseline, optimized, or auto-max
  const currentName = currentStrategyName.toLowerCase().trim();
  const showCurrentColumn = currentName !== 'no conversions'
    && currentName !== 'fill to 22%'
    && currentName !== autoMaxName.toLowerCase().trim();
  const colCount = showCurrentColumn ? 5 : 4;
  const gridCols = showCurrentColumn ? 'grid-cols-5' : 'grid-cols-4';

  // Calculate savings comparing baseline (no conversions) to optimized (fill-22)
  const taxSavings = baselineMetrics.lifetimeTotalTax - optimizedMetrics.lifetimeTotalTax;
  const hasImprovement = taxSavings > 1000;

  // Also show how current compares to optimized
  const currentVsOptimized = currentMetrics.lifetimeTotalTax - optimizedMetrics.lifetimeTotalTax;
  const currentIsOptimal = Math.abs(currentVsOptimized) < 1000;

  // Calculate longevity comparison
  const baselineDepletion = baselineMetrics.allFundsDepletionAge;
  const optimizedDepletion = optimizedMetrics.allFundsDepletionAge;
  const currentDepletion = currentMetrics.allFundsDepletionAge;

  // Determine which strategy wins each objective
  const getWinner = (metric: 'taxes' | 'longevity' | 'balance'): 'baseline' | 'optimized' | 'current' | 'autoMax' | 'tie' => {
    if (metric === 'taxes') {
      const min = Math.min(baselineMetrics.lifetimeTotalTax, optimizedMetrics.lifetimeTotalTax, currentMetrics.lifetimeTotalTax, autoMaxMetrics.lifetimeTotalTax);
      if (autoMaxMetrics.lifetimeTotalTax === min) return 'autoMax';
      if (optimizedMetrics.lifetimeTotalTax === min) return 'optimized';
      if (currentMetrics.lifetimeTotalTax === min) return 'current';
      return 'baseline';
    }
    if (metric === 'longevity') {
      const ages = [
        { name: 'baseline' as const, age: baselineDepletion },
        { name: 'optimized' as const, age: optimizedDepletion },
        { name: 'current' as const, age: currentDepletion },
        { name: 'autoMax' as const, age: autoMaxMetrics.allFundsDepletionAge },
      ];
      const neverDepleted = ages.filter(a => a.age === null);
      if (neverDepleted.length > 0) return neverDepleted[0].name;
      ages.sort((a, b) => (b.age ?? 0) - (a.age ?? 0));
      return ages[0].name;
    }
    const max = Math.max(baselineMetrics.finalTotalBalance, optimizedMetrics.finalTotalBalance, currentMetrics.finalTotalBalance, autoMaxMetrics.finalTotalBalance);
    if (autoMaxMetrics.finalTotalBalance === max) return 'autoMax';
    if (optimizedMetrics.finalTotalBalance === max) return 'optimized';
    if (currentMetrics.finalTotalBalance === max) return 'current';
    return 'baseline';
  };

  const taxWinner = getWinner('taxes');
  const longevityWinner = getWinner('longevity');
  const balanceWinner = getWinner('balance');

  const getDifferenceIcon = (current: number, optimized: number, lowerIsBetter: boolean = true) => {
    const diff = current - optimized;
    if (Math.abs(diff) < 0.01) return <Equal className="h-4 w-4 text-muted-foreground" />;
    if (lowerIsBetter) {
      return diff > 0 ? <TrendingDown className="h-4 w-4 text-green-600" /> : <TrendingUp className="h-4 w-4 text-destructive" />;
    }
    return diff < 0 ? <TrendingUp className="h-4 w-4 text-green-600" /> : <TrendingDown className="h-4 w-4 text-destructive" />;
  };

  const getWinnerBadge = (winner: string, column: 'baseline' | 'optimized' | 'current' | 'autoMax') => {
    if (winner === column) {
      return <Trophy className="h-3 w-3 text-amber-500 ml-1" />;
    }
    return null;
  };

  const allMetrics = [
    { label: "Lifetime Total Tax", group: "tax", baseline: formatCurrency(baselineMetrics.lifetimeTotalTax), current: formatCurrency(currentMetrics.lifetimeTotalTax), optimized: formatCurrency(optimizedMetrics.lifetimeTotalTax), autoMax: formatCurrency(autoMaxMetrics.lifetimeTotalTax), icon: getDifferenceIcon(baselineMetrics.lifetimeTotalTax, optimizedMetrics.lifetimeTotalTax), diff: baselineMetrics.lifetimeTotalTax - optimizedMetrics.lifetimeTotalTax, formatDiff: (d: number) => formatCurrency(Math.abs(d)), winner: taxWinner },
    { label: "Lifetime Federal Tax", group: "tax", baseline: formatCurrency(baselineMetrics.lifetimeFederalTax), current: formatCurrency(currentMetrics.lifetimeFederalTax), optimized: formatCurrency(optimizedMetrics.lifetimeFederalTax), autoMax: formatCurrency(autoMaxMetrics.lifetimeFederalTax), icon: getDifferenceIcon(baselineMetrics.lifetimeFederalTax, optimizedMetrics.lifetimeFederalTax), diff: baselineMetrics.lifetimeFederalTax - optimizedMetrics.lifetimeFederalTax, formatDiff: (d: number) => formatCurrency(Math.abs(d)), winner: taxWinner },
    { label: "Bracket Consistency Score", group: "tax", baseline: baselineMetrics.bracketScore.toFixed(1), current: currentMetrics.bracketScore.toFixed(1), optimized: optimizedMetrics.bracketScore.toFixed(1), autoMax: autoMaxMetrics.bracketScore.toFixed(1), icon: getDifferenceIcon(baselineMetrics.bracketScore, optimizedMetrics.bracketScore), diff: baselineMetrics.bracketScore - optimizedMetrics.bracketScore, formatDiff: (d: number) => Math.abs(d).toFixed(1), winner: null },
    { label: "Avg Marginal Bracket", group: "tax", baseline: formatPercent(baselineMetrics.avgBracket), current: formatPercent(currentMetrics.avgBracket), optimized: formatPercent(optimizedMetrics.avgBracket), autoMax: formatPercent(autoMaxMetrics.avgBracket), icon: getDifferenceIcon(baselineMetrics.avgBracket, optimizedMetrics.avgBracket), diff: baselineMetrics.avgBracket - optimizedMetrics.avgBracket, formatDiff: (d: number) => formatPercent(Math.abs(d)), winner: null },
    { label: "All Funds Depleted", group: "longevity", baseline: formatAge(baselineMetrics.allFundsDepletionAge), current: formatAge(currentMetrics.allFundsDepletionAge), optimized: formatAge(optimizedMetrics.allFundsDepletionAge), autoMax: formatAge(autoMaxMetrics.allFundsDepletionAge), icon: null, diff: 0, formatDiff: () => '', winner: longevityWinner },
    { label: "Traditional Depleted", group: "longevity", baseline: formatAge(baselineMetrics.tradDepletionAge), current: formatAge(currentMetrics.tradDepletionAge), optimized: formatAge(optimizedMetrics.tradDepletionAge), autoMax: formatAge(autoMaxMetrics.tradDepletionAge), icon: null, diff: 0, formatDiff: () => '', winner: null },
    { label: "Roth Depleted", group: "longevity", baseline: formatAge(baselineMetrics.rothDepletionAge), current: formatAge(currentMetrics.rothDepletionAge), optimized: formatAge(optimizedMetrics.rothDepletionAge), autoMax: formatAge(autoMaxMetrics.rothDepletionAge), icon: null, diff: 0, formatDiff: () => '', winner: null },
    { label: "Final Balance (Age 100, before taxes)", group: "longevity", baseline: formatCurrency(baselineMetrics.finalTotalBalance), current: formatCurrency(currentMetrics.finalTotalBalance), optimized: formatCurrency(optimizedMetrics.finalTotalBalance), autoMax: formatCurrency(autoMaxMetrics.finalTotalBalance), icon: null, diff: 0, formatDiff: () => '', winner: balanceWinner },
    { label: "Final Balance (Age 100, after taxes)", group: "longevity", baseline: formatCurrency(baselineMetrics.finalTotalBalanceAfterTax), current: formatCurrency(currentMetrics.finalTotalBalanceAfterTax), optimized: formatCurrency(optimizedMetrics.finalTotalBalanceAfterTax), autoMax: formatCurrency(autoMaxMetrics.finalTotalBalanceAfterTax), icon: null, diff: 0, formatDiff: () => '', winner: null },
    { label: "Max Annual Withdrawal to Zero", group: "longevity", baseline: formatCurrency(baselineMetrics.maxAnnualWithdrawalToZero), current: formatCurrency(currentMetrics.maxAnnualWithdrawalToZero), optimized: formatCurrency(optimizedMetrics.maxAnnualWithdrawalToZero), autoMax: formatCurrency(autoMaxMetrics.maxAnnualWithdrawalToZero), icon: null, diff: 0, formatDiff: () => '', winner: null },
  ];

  // Resolve a winner key to a human label
  const winnerLabel = (w: 'baseline' | 'optimized' | 'current' | 'autoMax' | 'tie'): string => {
    if (w === 'optimized') return 'Fill to 22% bracket';
    if (w === 'current') return currentStrategyName;
    if (w === 'autoMax') return autoMaxName;
    return 'No conversions';
  };
  const winnerFinalBalance = (w: 'baseline' | 'optimized' | 'current' | 'autoMax' | 'tie'): number => {
    if (w === 'optimized') return optimizedMetrics.finalTotalBalance;
    if (w === 'current') return currentMetrics.finalTotalBalance;
    if (w === 'autoMax') return autoMaxMetrics.finalTotalBalance;
    return baselineMetrics.finalTotalBalance;
  };
  const winnerDepletionAge = (w: 'baseline' | 'optimized' | 'current' | 'autoMax' | 'tie'): number | null => {
    if (w === 'optimized') return optimizedDepletion;
    if (w === 'current') return currentDepletion;
    if (w === 'autoMax') return autoMaxMetrics.allFundsDepletionAge;
    return baselineDepletion;
  };

  const taxRecommendation = {
    title: "Tax Minimization",
    strategy: winnerLabel(taxWinner),
    savings: taxSavings > 0 ? `Saves ${formatCurrency(taxSavings)} vs. no conversions` : null,
    tradeoff: longevityWinner !== taxWinner && longevityWinner !== 'tie'
      ? `Trade-off: longevity winner is "${winnerLabel(longevityWinner)}"`
      : null,
    icon: <DollarSign className="h-5 w-5" />,
    color: 'green' as const,
  };

  const longevityRecommendation = (() => {
    const age = winnerDepletionAge(longevityWinner);
    return {
      title: "Longevity",
      strategy: winnerLabel(longevityWinner),
      savings: age === null ? 'Funds never deplete' : `Funds last until age ${age}`,
      tradeoff: taxWinner !== longevityWinner && taxWinner !== 'tie'
        ? `Trade-off: tax-minimizing winner is "${winnerLabel(taxWinner)}"`
        : null,
      icon: <Clock className="h-5 w-5" />,
      color: 'blue' as const,
    };
  })();

  const balancedRecommendation = {
    title: "Balanced (Final Balance)",
    strategy: winnerLabel(balanceWinner),
    savings: `Final balance: ${formatCurrency(winnerFinalBalance(balanceWinner))}`,
    tradeoff: null as string | null,
    icon: <ArrowRightLeft className="h-5 w-5" />,
    color: 'purple' as const,
  };

  const recommendations = [taxRecommendation, longevityRecommendation, balancedRecommendation];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowRightLeft className="h-5 w-5" />
          Two-Pass Strategy Comparison
          {hasImprovement && (
            <Badge variant="default" className="bg-green-600">
              Potential Savings: {formatCurrency(taxSavings)}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Compare baseline (no conversions), your current strategy, and optimized (fill to 22% bracket)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Unified Strategy Metrics Table */}
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left font-medium text-muted-foreground px-3 py-2 border-r">Metric</th>
                  <th className="text-center font-medium text-muted-foreground px-3 py-2 border-r">Baseline - No Conversion</th>
                  {showCurrentColumn && <th className="text-center font-medium text-muted-foreground px-3 py-2 border-r">{currentStrategyName}</th>}
                  <th className="text-center font-medium text-muted-foreground px-3 py-2 border-r">Optimized - Fill to 22%</th>
                  <th className="text-center font-medium text-primary px-3 py-2">⭐ {autoMaxName}</th>
                </tr>
              </thead>
              <tbody>
                {allMetrics.map((metric, idx) => {
                  const prevGroup = idx > 0 ? allMetrics[idx - 1].group : null;
                  const showSeparator = prevGroup && prevGroup !== metric.group;
                  const colSpan = showCurrentColumn ? 5 : 4;
                  return (
                    <>
                      {idx === 0 && (
                        <tr key="tax-header" className="bg-muted/20">
                          <td colSpan={colSpan} className="px-3 py-1.5 text-xs font-semibold text-muted-foreground border-b">
                            <span className="flex items-center gap-1.5"><DollarSign className="h-3 w-3" /> Tax Efficiency</span>
                          </td>
                        </tr>
                      )}
                      {showSeparator && (
                        <tr key="longevity-header" className="bg-muted/20">
                          <td colSpan={colSpan} className="px-3 py-1.5 text-xs font-semibold text-muted-foreground border-b border-t">
                            <span className="flex items-center gap-1.5"><Clock className="h-3 w-3" /> Longevity</span>
                          </td>
                        </tr>
                      )}
                      {(() => {
                        const isAfterTax = metric.label.includes('after taxes');
                        const rowBg = isAfterTax ? 'bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30' : 'hover:bg-muted/10';
                        return (
                      <tr key={metric.label} className={`border-b last:border-b-0 ${rowBg}`}>
                        <td className="px-3 py-2 font-medium border-r">{metric.label}</td>
                        <td className="px-3 py-2 text-center text-muted-foreground border-r">
                          <span className="inline-flex items-center justify-center gap-1">
                            {metric.baseline}
                            {metric.winner && getWinnerBadge(metric.winner, 'baseline')}
                          </span>
                        </td>
                        {showCurrentColumn && (
                          <td className={`px-3 py-2 text-center border-r ${metric.group === 'tax' && currentIsOptimal ? 'text-green-600 font-semibold' : ''}`}>
                            <span className="inline-flex items-center justify-center gap-1">
                              {metric.current}
                              {metric.winner && getWinnerBadge(metric.winner, 'current')}
                            </span>
                          </td>
                        )}
                        <td className={`px-3 py-2 text-center border-r ${metric.group === 'tax' ? 'font-semibold text-green-600' : ''}`}>
                          <span className="inline-flex items-center justify-center gap-1">
                            {metric.optimized}
                            {metric.winner && getWinnerBadge(metric.winner, 'optimized')}
                          </span>
                        </td>
                        <td className={`px-3 py-2 text-center font-semibold text-foreground ${isAfterTax ? '' : 'bg-primary/5'}`}>
                          <span className="inline-flex items-center justify-center gap-1">
                            {metric.autoMax}
                            {metric.winner && getWinnerBadge(metric.winner, 'autoMax')}
                          </span>
                        </td>
                      </tr>
                        );
                      })()}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Survivor Impact Section */}
          {survivorEnabled && survivorSmoothedMetrics && (
            <div className="mt-6">
              <h4 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Survivor Tax Impact Analysis
              </h4>
              <div className="grid grid-cols-4 gap-4 text-sm font-medium text-muted-foreground pb-2 border-b">
                <div>Metric</div>
                <div className="text-center">Baseline</div>
                <div className="text-center">Current</div>
                <div className="text-center">Survivor Smoothed</div>
              </div>
              
              <div className="grid grid-cols-4 gap-4 items-center text-sm py-2 border-b border-muted/50">
                <div className="font-medium">Peak Marginal Bracket</div>
                <div className="text-center text-muted-foreground">{formatPercent(baselineMetrics.peakMarginalBracket)}</div>
                <div className="text-center">{formatPercent(currentMetrics.peakMarginalBracket)}</div>
                <div className="text-center text-green-600 font-semibold">{formatPercent(survivorSmoothedMetrics.peakMarginalBracket)}</div>
              </div>
              
              <div className="grid grid-cols-4 gap-4 items-center text-sm py-2 border-b border-muted/50">
                <div className="font-medium">Years at 32%+ Bracket</div>
                <div className="text-center text-muted-foreground">{baselineMetrics.yearsInHighBracket}</div>
                <div className="text-center">{currentMetrics.yearsInHighBracket}</div>
                <div className="text-center text-green-600 font-semibold">{survivorSmoothedMetrics.yearsInHighBracket}</div>
              </div>
              
              <div className="grid grid-cols-4 gap-4 items-center text-sm py-2 border-b border-muted/50">
                <div className="font-medium">Survivor Bracket Range</div>
                <div className="text-center text-muted-foreground">
                  {formatPercent(baselineMetrics.survivorBracketRange.min)} - {formatPercent(baselineMetrics.survivorBracketRange.max)}
                </div>
                <div className="text-center">
                  {formatPercent(currentMetrics.survivorBracketRange.min)} - {formatPercent(currentMetrics.survivorBracketRange.max)}
                </div>
                <div className="text-center text-green-600 font-semibold">
                  {formatPercent(survivorSmoothedMetrics.survivorBracketRange.min)} - {formatPercent(survivorSmoothedMetrics.survivorBracketRange.max)}
                </div>
              </div>
              
              <div className="grid grid-cols-4 gap-4 items-center text-sm py-2 border-b border-muted/50">
                <div className="font-medium">Survivor Years Taxes</div>
                <div className="text-center text-muted-foreground">{formatCurrency(baselineMetrics.survivorYearsTaxes)}</div>
                <div className="text-center">{formatCurrency(currentMetrics.survivorYearsTaxes)}</div>
                <div className="text-center text-green-600 font-semibold">{formatCurrency(survivorSmoothedMetrics.survivorYearsTaxes)}</div>
              </div>
              
              {baselineMetrics.survivorYearsTaxes - survivorSmoothedMetrics.survivorYearsTaxes > 1000 && (
                <div className="mt-3 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 text-green-700 dark:text-green-300 text-sm">
                    <TrendingDown className="h-4 w-4" />
                    <span className="font-medium">
                      Survivor Tax Smoothing saves {formatCurrency(baselineMetrics.survivorYearsTaxes - survivorSmoothedMetrics.survivorYearsTaxes)} during survivor years
                    </span>
                  </div>
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                    Aggressive Roth conversions after spouse passing prevent tax bracket spikes and maintain consistent 22-24% rates.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Recommendations across all three goals */}
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {recommendations.map((rec) => (
            <div
              key={rec.title}
              className={`p-4 rounded-lg border ${
                rec.color === 'green' ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' :
                rec.color === 'blue' ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' :
                'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800'
              }`}
            >
              <div className={`flex items-center gap-2 font-medium ${
                rec.color === 'green' ? 'text-green-700 dark:text-green-300' :
                rec.color === 'blue' ? 'text-blue-700 dark:text-blue-300' :
                'text-purple-700 dark:text-purple-300'
              }`}>
                {rec.icon}
                <span>{rec.title}</span>
              </div>
              <div className="mt-2 space-y-1">
                <p className={`text-sm font-semibold ${
                  rec.color === 'green' ? 'text-green-800 dark:text-green-200' :
                  rec.color === 'blue' ? 'text-blue-800 dark:text-blue-200' :
                  'text-purple-800 dark:text-purple-200'
                }`}>
                  Recommended: {rec.strategy}
                </p>
                {rec.savings && (
                  <p className={`text-sm ${
                    rec.color === 'green' ? 'text-green-600 dark:text-green-400' :
                    rec.color === 'blue' ? 'text-blue-600 dark:text-blue-400' :
                    'text-purple-600 dark:text-purple-400'
                  }`}>
                    {rec.savings}
                  </p>
                )}
                {rec.tradeoff && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {rec.tradeoff}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Summary Section */}
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {hasImprovement && (
            <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                <TrendingDown className="h-5 w-5" />
                <span className="font-medium">
                  Bracket-filling saves {formatCurrency(taxSavings)} vs. no conversions
                </span>
              </div>
              <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                By accelerating Roth conversions during low-income years, you can fill unused lower tax brackets 
                instead of paying higher rates later.
              </p>
            </div>
          )}
          
          {currentIsOptimal ? (
            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                <Equal className="h-5 w-5" />
                <span className="font-medium">Your current strategy is optimal</span>
              </div>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                Your selected Roth conversion strategy achieves results similar to the optimized approach.
              </p>
            </div>
          ) : showOptimization && currentVsOptimized > 1000 && optimizationGoal === 'minimize-taxes' && (
            <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                <TrendingUp className="h-5 w-5" />
                <span className="font-medium">
                  Switch to "Fill to 22%" to save {formatCurrency(currentVsOptimized)} more
                </span>
              </div>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                Your current strategy leaves money on the table. Consider enabling bracket-filling Roth conversions.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingDown, TrendingUp, Equal, ArrowRightLeft, Clock, DollarSign, Trophy, AlertTriangle } from "lucide-react";
import type { StrategyMetrics } from "@/hooks/useProjections";
import { formatCurrency, formatPercent, formatAge } from "@/lib/utils";

interface StrategyComparisonProps {
  baselineMetrics: StrategyMetrics;
  optimizedMetrics: StrategyMetrics;
  currentMetrics: StrategyMetrics;
  survivorSmoothedMetrics: StrategyMetrics | null;
  currentStrategyName: string;
  showOptimization: boolean;
  optimizationGoal?: string;
  survivorEnabled?: boolean;
}

export function StrategyComparison({ 
  baselineMetrics,
  optimizedMetrics,
  currentMetrics,
  survivorSmoothedMetrics,
  currentStrategyName,
  showOptimization,
  optimizationGoal = 'minimize-taxes',
  survivorEnabled = false,
}: StrategyComparisonProps) {

  // Hide the "current" column when it duplicates baseline or optimized
  const currentName = currentStrategyName.toLowerCase().trim();
  const showCurrentColumn = currentName !== 'no conversions' && currentName !== 'fill to 22%';
  const colCount = showCurrentColumn ? 4 : 3;
  const gridCols = showCurrentColumn ? 'grid-cols-4' : 'grid-cols-3';

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
  const getWinner = (metric: 'taxes' | 'longevity' | 'balance'): 'baseline' | 'optimized' | 'current' | 'tie' => {
    if (metric === 'taxes') {
      const min = Math.min(baselineMetrics.lifetimeTotalTax, optimizedMetrics.lifetimeTotalTax, currentMetrics.lifetimeTotalTax);
      if (optimizedMetrics.lifetimeTotalTax === min) return 'optimized';
      if (currentMetrics.lifetimeTotalTax === min) return 'current';
      return 'baseline';
    }
    if (metric === 'longevity') {
      // null means never depleted (best), otherwise higher age is better
      const ages = [
        { name: 'baseline' as const, age: baselineDepletion },
        { name: 'optimized' as const, age: optimizedDepletion },
        { name: 'current' as const, age: currentDepletion },
      ];
      // Never depleted wins
      const neverDepleted = ages.filter(a => a.age === null);
      if (neverDepleted.length > 0) return neverDepleted[0].name;
      // Otherwise highest age wins
      ages.sort((a, b) => (b.age ?? 0) - (a.age ?? 0));
      return ages[0].name;
    }
    // Balanced: compare final total balance
    const max = Math.max(baselineMetrics.finalTotalBalance, optimizedMetrics.finalTotalBalance, currentMetrics.finalTotalBalance);
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

  const getWinnerBadge = (winner: string, column: 'baseline' | 'optimized' | 'current') => {
    if (winner === column) {
      return <Trophy className="h-3 w-3 text-amber-500 ml-1" />;
    }
    return null;
  };

  const allMetrics = [
    // Tax metrics
    { label: "Lifetime Total Tax", group: "tax", baseline: formatCurrency(baselineMetrics.lifetimeTotalTax), current: formatCurrency(currentMetrics.lifetimeTotalTax), optimized: formatCurrency(optimizedMetrics.lifetimeTotalTax), icon: getDifferenceIcon(baselineMetrics.lifetimeTotalTax, optimizedMetrics.lifetimeTotalTax), diff: baselineMetrics.lifetimeTotalTax - optimizedMetrics.lifetimeTotalTax, formatDiff: (d: number) => formatCurrency(Math.abs(d)), winner: taxWinner },
    { label: "Lifetime Federal Tax", group: "tax", baseline: formatCurrency(baselineMetrics.lifetimeFederalTax), current: formatCurrency(currentMetrics.lifetimeFederalTax), optimized: formatCurrency(optimizedMetrics.lifetimeFederalTax), icon: getDifferenceIcon(baselineMetrics.lifetimeFederalTax, optimizedMetrics.lifetimeFederalTax), diff: baselineMetrics.lifetimeFederalTax - optimizedMetrics.lifetimeFederalTax, formatDiff: (d: number) => formatCurrency(Math.abs(d)), winner: taxWinner },
    { label: "Bracket Consistency Score", group: "tax", baseline: baselineMetrics.bracketScore.toFixed(1), current: currentMetrics.bracketScore.toFixed(1), optimized: optimizedMetrics.bracketScore.toFixed(1), icon: getDifferenceIcon(baselineMetrics.bracketScore, optimizedMetrics.bracketScore), diff: baselineMetrics.bracketScore - optimizedMetrics.bracketScore, formatDiff: (d: number) => Math.abs(d).toFixed(1), winner: null },
    { label: "Avg Marginal Bracket", group: "tax", baseline: formatPercent(baselineMetrics.avgBracket), current: formatPercent(currentMetrics.avgBracket), optimized: formatPercent(optimizedMetrics.avgBracket), icon: getDifferenceIcon(baselineMetrics.avgBracket, optimizedMetrics.avgBracket), diff: baselineMetrics.avgBracket - optimizedMetrics.avgBracket, formatDiff: (d: number) => formatPercent(Math.abs(d)), winner: null },
    // Longevity metrics
    { label: "All Funds Depleted", group: "longevity", baseline: formatAge(baselineMetrics.allFundsDepletionAge), current: formatAge(currentMetrics.allFundsDepletionAge), optimized: formatAge(optimizedMetrics.allFundsDepletionAge), icon: null, diff: 0, formatDiff: () => '', winner: longevityWinner },
    { label: "Traditional Depleted", group: "longevity", baseline: formatAge(baselineMetrics.tradDepletionAge), current: formatAge(currentMetrics.tradDepletionAge), optimized: formatAge(optimizedMetrics.tradDepletionAge), icon: null, diff: 0, formatDiff: () => '', winner: null },
    { label: "Roth Depleted", group: "longevity", baseline: formatAge(baselineMetrics.rothDepletionAge), current: formatAge(currentMetrics.rothDepletionAge), optimized: formatAge(optimizedMetrics.rothDepletionAge), icon: null, diff: 0, formatDiff: () => '', winner: null },
    { label: "Final Balance (Age 100)", group: "longevity", baseline: formatCurrency(baselineMetrics.finalTotalBalance), current: formatCurrency(currentMetrics.finalTotalBalance), optimized: formatCurrency(optimizedMetrics.finalTotalBalance), icon: null, diff: 0, formatDiff: () => '', winner: balanceWinner },
  ];

  // Determine recommendation based on goal
  const getRecommendation = () => {
    if (optimizationGoal === 'minimize-taxes') {
      const winner = taxWinner === 'optimized' ? 'Fill to 22% bracket' : 
                     taxWinner === 'current' ? currentStrategyName : 'No conversions';
      const savings = taxWinner === 'optimized' ? taxSavings : 0;
      return {
        title: "Tax Minimization Recommendation",
        strategy: winner,
        savings: savings > 0 ? `Saves ${formatCurrency(savings)} in lifetime taxes` : null,
        tradeoff: longevityWinner !== taxWinner && longevityWinner !== 'tie'
          ? `Trade-off: Funds may deplete ${longevityWinner === 'baseline' ? 'earlier' : 'differently'} than other strategies`
          : null,
        icon: <DollarSign className="h-5 w-5" />,
        color: 'green',
      };
    }
    if (optimizationGoal === 'maximize-longevity') {
      const winner = longevityWinner === 'optimized' ? 'Fill to 22% bracket' : 
                     longevityWinner === 'current' ? currentStrategyName : 'No conversions';
      const depletionAge = longevityWinner === 'optimized' ? optimizedDepletion :
                           longevityWinner === 'current' ? currentDepletion : baselineDepletion;
      return {
        title: "Longevity Recommendation",
        strategy: winner,
        savings: depletionAge === null ? 'Funds never deplete' : `Funds last until age ${depletionAge}`,
        tradeoff: taxWinner !== longevityWinner && taxWinner !== 'tie'
          ? `Trade-off: May pay ${formatCurrency(Math.abs(baselineMetrics.lifetimeTotalTax - optimizedMetrics.lifetimeTotalTax))} more in lifetime taxes`
          : null,
        icon: <Clock className="h-5 w-5" />,
        color: 'blue',
      };
    }
    // Balanced
    const winner = balanceWinner === 'optimized' ? 'Fill to 22% bracket' : 
                   balanceWinner === 'current' ? currentStrategyName : 'No conversions';
    return {
      title: "Balanced Recommendation",
      strategy: winner,
      savings: `Final balance: ${formatCurrency(
        balanceWinner === 'optimized' ? optimizedMetrics.finalTotalBalance :
        balanceWinner === 'current' ? currentMetrics.finalTotalBalance : baselineMetrics.finalTotalBalance
      )}`,
      tradeoff: null,
      icon: <ArrowRightLeft className="h-5 w-5" />,
      color: 'purple',
    };
  };

  const recommendation = getRecommendation();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowRightLeft className="h-5 w-5" />
          Two-Pass Strategy Comparison
          {hasImprovement && optimizationGoal === 'minimize-taxes' && (
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
                  <th className="text-center font-medium text-muted-foreground px-3 py-2">Optimized - Fill to 22%</th>
                </tr>
              </thead>
              <tbody>
                {allMetrics.map((metric, idx) => {
                  const prevGroup = idx > 0 ? allMetrics[idx - 1].group : null;
                  const showSeparator = prevGroup && prevGroup !== metric.group;
                  const colSpan = showCurrentColumn ? 4 : 3;
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
                      <tr key={metric.label} className="border-b last:border-b-0 hover:bg-muted/10">
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
                        <td className={`px-3 py-2 text-center ${metric.group === 'tax' ? 'font-semibold text-green-600' : ''}`}>
                          <span className="inline-flex items-center justify-center gap-1">
                            {metric.optimized}
                            {metric.winner && getWinnerBadge(metric.winner, 'optimized')}
                          </span>
                        </td>
                      </tr>
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

        {/* Goal-Based Recommendation */}
        <div className="mt-6">
          <div className={`p-4 rounded-lg border ${
            recommendation.color === 'green' ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' :
            recommendation.color === 'blue' ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' :
            'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800'
          }`}>
            <div className={`flex items-center gap-2 font-medium ${
              recommendation.color === 'green' ? 'text-green-700 dark:text-green-300' :
              recommendation.color === 'blue' ? 'text-blue-700 dark:text-blue-300' :
              'text-purple-700 dark:text-purple-300'
            }`}>
              {recommendation.icon}
              <span>{recommendation.title}</span>
            </div>
            <div className="mt-2 space-y-1">
              <p className={`text-sm font-semibold ${
                recommendation.color === 'green' ? 'text-green-800 dark:text-green-200' :
                recommendation.color === 'blue' ? 'text-blue-800 dark:text-blue-200' :
                'text-purple-800 dark:text-purple-200'
              }`}>
                Recommended: {recommendation.strategy}
              </p>
              {recommendation.savings && (
                <p className={`text-sm ${
                  recommendation.color === 'green' ? 'text-green-600 dark:text-green-400' :
                  recommendation.color === 'blue' ? 'text-blue-600 dark:text-blue-400' :
                  'text-purple-600 dark:text-purple-400'
                }`}>
                  {recommendation.savings}
                </p>
              )}
              {recommendation.tradeoff && (
                <p className="text-xs text-muted-foreground mt-1">
                  {recommendation.tradeoff}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Summary Section */}
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {hasImprovement && optimizationGoal !== 'maximize-longevity' && (
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

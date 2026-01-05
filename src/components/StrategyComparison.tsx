import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingDown, TrendingUp, Equal, ArrowRightLeft } from "lucide-react";
import type { StrategyMetrics } from "@/hooks/useProjections";

interface StrategyComparisonProps {
  baselineMetrics: StrategyMetrics;
  optimizedMetrics: StrategyMetrics;
  currentMetrics: StrategyMetrics;
  currentStrategyName: string;
  showOptimization: boolean;
}

export function StrategyComparison({ 
  baselineMetrics,
  optimizedMetrics,
  currentMetrics,
  currentStrategyName,
  showOptimization,
}: StrategyComparisonProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  // Calculate savings comparing baseline (no conversions) to optimized (fill-22)
  const taxSavings = baselineMetrics.lifetimeTotalTax - optimizedMetrics.lifetimeTotalTax;
  const hasImprovement = taxSavings > 1000;

  // Also show how current compares to optimized
  const currentVsOptimized = currentMetrics.lifetimeTotalTax - optimizedMetrics.lifetimeTotalTax;
  const currentIsOptimal = Math.abs(currentVsOptimized) < 1000;

  const getDifferenceIcon = (current: number, optimized: number, lowerIsBetter: boolean = true) => {
    const diff = current - optimized;
    if (Math.abs(diff) < 0.01) return <Equal className="h-4 w-4 text-muted-foreground" />;
    if (lowerIsBetter) {
      return diff > 0 ? <TrendingDown className="h-4 w-4 text-green-600" /> : <TrendingUp className="h-4 w-4 text-destructive" />;
    }
    return diff < 0 ? <TrendingUp className="h-4 w-4 text-green-600" /> : <TrendingDown className="h-4 w-4 text-destructive" />;
  };

  const metrics = [
    {
      label: "Lifetime Total Tax",
      baseline: formatCurrency(baselineMetrics.lifetimeTotalTax),
      current: formatCurrency(currentMetrics.lifetimeTotalTax),
      optimized: formatCurrency(optimizedMetrics.lifetimeTotalTax),
      icon: getDifferenceIcon(baselineMetrics.lifetimeTotalTax, optimizedMetrics.lifetimeTotalTax),
      diff: baselineMetrics.lifetimeTotalTax - optimizedMetrics.lifetimeTotalTax,
      formatDiff: (d: number) => formatCurrency(Math.abs(d)),
    },
    {
      label: "Lifetime Federal Tax",
      baseline: formatCurrency(baselineMetrics.lifetimeFederalTax),
      current: formatCurrency(currentMetrics.lifetimeFederalTax),
      optimized: formatCurrency(optimizedMetrics.lifetimeFederalTax),
      icon: getDifferenceIcon(baselineMetrics.lifetimeFederalTax, optimizedMetrics.lifetimeFederalTax),
      diff: baselineMetrics.lifetimeFederalTax - optimizedMetrics.lifetimeFederalTax,
      formatDiff: (d: number) => formatCurrency(Math.abs(d)),
    },
    {
      label: "Bracket Consistency Score",
      baseline: baselineMetrics.bracketScore.toFixed(1),
      current: currentMetrics.bracketScore.toFixed(1),
      optimized: optimizedMetrics.bracketScore.toFixed(1),
      icon: getDifferenceIcon(baselineMetrics.bracketScore, optimizedMetrics.bracketScore),
      diff: baselineMetrics.bracketScore - optimizedMetrics.bracketScore,
      formatDiff: (d: number) => Math.abs(d).toFixed(1),
    },
    {
      label: "Avg Marginal Bracket",
      baseline: formatPercent(baselineMetrics.avgBracket),
      current: formatPercent(currentMetrics.avgBracket),
      optimized: formatPercent(optimizedMetrics.avgBracket),
      icon: getDifferenceIcon(baselineMetrics.avgBracket, optimizedMetrics.avgBracket),
      diff: baselineMetrics.avgBracket - optimizedMetrics.avgBracket,
      formatDiff: (d: number) => formatPercent(Math.abs(d)),
    },
    {
      label: "Years in Low Bracket (≤12%)",
      baseline: `${baselineMetrics.yearsInLowBracket}`,
      current: `${currentMetrics.yearsInLowBracket}`,
      optimized: `${optimizedMetrics.yearsInLowBracket}`,
      icon: getDifferenceIcon(baselineMetrics.yearsInLowBracket, optimizedMetrics.yearsInLowBracket, false),
      diff: optimizedMetrics.yearsInLowBracket - baselineMetrics.yearsInLowBracket,
      formatDiff: (d: number) => `${Math.abs(d)}`,
    },
  ];

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
        <div className="space-y-4">
          {/* Header Row */}
          <div className="grid grid-cols-5 gap-4 text-sm font-medium text-muted-foreground pb-2 border-b">
            <div>Metric</div>
            <div className="text-center">Baseline<br /><span className="text-xs">(No Conversions)</span></div>
            <div className="text-center">{currentStrategyName}<br /><span className="text-xs">(Current)</span></div>
            <div className="text-center">Optimized<br /><span className="text-xs">(Fill to 22%)</span></div>
            <div className="text-center">Savings<br /><span className="text-xs">(vs Baseline)</span></div>
          </div>

          {/* Metric Rows */}
          {metrics.map((metric) => (
            <div key={metric.label} className="grid grid-cols-5 gap-4 items-center text-sm py-2 border-b border-muted/50">
              <div className="font-medium">{metric.label}</div>
              <div className="text-center text-muted-foreground">{metric.baseline}</div>
              <div className={`text-center ${currentIsOptimal ? 'text-green-600 font-semibold' : ''}`}>
                {metric.current}
              </div>
              <div className="text-center font-semibold text-green-600">{metric.optimized}</div>
              <div className="flex items-center justify-center gap-1">
                {metric.icon}
                <span className={metric.diff > 0 ? "text-green-600" : metric.diff < 0 ? "text-destructive" : "text-muted-foreground"}>
                  {metric.formatDiff(metric.diff)}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Summary Section */}
        <div className="mt-6 grid gap-4 md:grid-cols-2">
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
          ) : showOptimization && currentVsOptimized > 1000 && (
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

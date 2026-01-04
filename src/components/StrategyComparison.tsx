import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, TrendingDown, TrendingUp, Equal } from "lucide-react";

interface StrategyMetrics {
  lifetimeFederalTax: number;
  lifetimeTotalTax: number;
  bracketScore: number;
  avgBracket: number;
  yearsInLowBracket: number;
}

interface StrategyComparisonProps {
  currentStrategy: StrategyMetrics;
  optimizedStrategy: StrategyMetrics | null;
  currentStrategyName: string;
}

export function StrategyComparison({ 
  currentStrategy, 
  optimizedStrategy, 
  currentStrategyName 
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

  if (!optimizedStrategy) {
    return null;
  }

  const taxSavings = currentStrategy.lifetimeTotalTax - optimizedStrategy.lifetimeTotalTax;
  const hasImprovement = taxSavings > 0;

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
      current: formatCurrency(currentStrategy.lifetimeTotalTax),
      optimized: formatCurrency(optimizedStrategy.lifetimeTotalTax),
      icon: getDifferenceIcon(currentStrategy.lifetimeTotalTax, optimizedStrategy.lifetimeTotalTax),
      diff: currentStrategy.lifetimeTotalTax - optimizedStrategy.lifetimeTotalTax,
      formatDiff: (d: number) => formatCurrency(Math.abs(d)),
    },
    {
      label: "Lifetime Federal Tax",
      current: formatCurrency(currentStrategy.lifetimeFederalTax),
      optimized: formatCurrency(optimizedStrategy.lifetimeFederalTax),
      icon: getDifferenceIcon(currentStrategy.lifetimeFederalTax, optimizedStrategy.lifetimeFederalTax),
      diff: currentStrategy.lifetimeFederalTax - optimizedStrategy.lifetimeFederalTax,
      formatDiff: (d: number) => formatCurrency(Math.abs(d)),
    },
    {
      label: "Bracket Consistency Score",
      current: currentStrategy.bracketScore.toFixed(1),
      optimized: optimizedStrategy.bracketScore.toFixed(1),
      icon: getDifferenceIcon(currentStrategy.bracketScore, optimizedStrategy.bracketScore),
      diff: currentStrategy.bracketScore - optimizedStrategy.bracketScore,
      formatDiff: (d: number) => Math.abs(d).toFixed(1),
    },
    {
      label: "Avg Marginal Bracket",
      current: formatPercent(currentStrategy.avgBracket),
      optimized: formatPercent(optimizedStrategy.avgBracket),
      icon: getDifferenceIcon(currentStrategy.avgBracket, optimizedStrategy.avgBracket),
      diff: currentStrategy.avgBracket - optimizedStrategy.avgBracket,
      formatDiff: (d: number) => formatPercent(Math.abs(d)),
    },
    {
      label: "Years in Low Bracket (≤12%)",
      current: `${currentStrategy.yearsInLowBracket}`,
      optimized: `${optimizedStrategy.yearsInLowBracket}`,
      icon: getDifferenceIcon(currentStrategy.yearsInLowBracket, optimizedStrategy.yearsInLowBracket, false),
      diff: optimizedStrategy.yearsInLowBracket - currentStrategy.yearsInLowBracket,
      formatDiff: (d: number) => `${Math.abs(d)}`,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Strategy Comparison
          {hasImprovement && (
            <Badge variant="default" className="bg-green-600">
              Save {formatCurrency(taxSavings)}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Compare your current strategy with an optimized bracket-filling approach
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Header Row */}
          <div className="grid grid-cols-4 gap-4 text-sm font-medium text-muted-foreground pb-2 border-b">
            <div>Metric</div>
            <div className="text-center">{currentStrategyName}</div>
            <div className="text-center">Optimized</div>
            <div className="text-center">Difference</div>
          </div>

          {/* Metric Rows */}
          {metrics.map((metric) => (
            <div key={metric.label} className="grid grid-cols-4 gap-4 items-center text-sm py-2 border-b border-muted/50">
              <div className="font-medium">{metric.label}</div>
              <div className="text-center">{metric.current}</div>
              <div className="text-center font-semibold">{metric.optimized}</div>
              <div className="flex items-center justify-center gap-1">
                {metric.icon}
                <span className={metric.diff > 0 ? "text-green-600" : metric.diff < 0 ? "text-destructive" : "text-muted-foreground"}>
                  {metric.formatDiff(metric.diff)}
                </span>
              </div>
            </div>
          ))}
        </div>

        {hasImprovement && (
          <div className="mt-6 p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
              <TrendingDown className="h-5 w-5" />
              <span className="font-medium">
                Switching to bracket-filling could save you {formatCurrency(taxSavings)} in lifetime taxes
              </span>
            </div>
            <p className="text-xs text-green-600 dark:text-green-400 mt-2">
              This is achieved by accelerating Roth conversions during low-income years to fill unused bracket space.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

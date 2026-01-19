import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Activity, Shield, AlertTriangle, CheckCircle2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import type { MonteCarloResult, MonteCarloSettings } from "@/hooks/useMonteCarloSimulation";
import { formatCurrency, formatCurrencyCompact, formatPercent, getSuccessColor } from "@/lib/utils";

interface MonteCarloResultsProps {
  results: MonteCarloResult;
  settings: MonteCarloSettings;
  onSettingsChange: (settings: MonteCarloSettings) => void;
}

export function MonteCarloResults({ results, settings, onSettingsChange }: MonteCarloResultsProps) {
  const getSuccessBadge = (rate: number) => {
    if (rate >= 0.9) return <Badge className="bg-green-600">Excellent</Badge>;
    if (rate >= 0.75) return <Badge className="bg-amber-600">Good</Badge>;
    if (rate >= 0.5) return <Badge className="bg-orange-600">Fair</Badge>;
    return <Badge variant="destructive">Poor</Badge>;
  };

  // Memoize histogram calculation - expensive operation
  const histogramData = useMemo(() => {
    const bins = 10;
    const allBalances = [
      ...results.baseline.outcomes.map(o => o.finalBalance),
      ...results.current.outcomes.map(o => o.finalBalance),
      ...results.optimized.outcomes.map(o => o.finalBalance),
    ];
    
    const maxBalance = Math.max(...allBalances);
    const minBalance = Math.min(...allBalances.filter(b => b > 0));
    const range = maxBalance - minBalance;
    const binWidth = range / bins;
    
    const histData = [];
    
    for (let i = 0; i < bins; i++) {
      const binStart = minBalance + i * binWidth;
      const binEnd = binStart + binWidth;
      const binLabel = formatCurrencyCompact(binStart);
      
      const baselineCount = results.baseline.outcomes.filter(
        o => o.finalBalance >= binStart && o.finalBalance < binEnd
      ).length;
      const currentCount = results.current.outcomes.filter(
        o => o.finalBalance >= binStart && o.finalBalance < binEnd
      ).length;
      const optimizedCount = results.optimized.outcomes.filter(
        o => o.finalBalance >= binStart && o.finalBalance < binEnd
      ).length;
      
      histData.push({
        range: binLabel,
        baseline: baselineCount,
        current: currentCount,
        optimized: optimizedCount,
      });
    }
    
    return histData;
  }, [results.baseline.outcomes, results.current.outcomes, results.optimized.outcomes]);

  // Strategy cards data
  const strategies = [
    { key: 'baseline', name: 'No Conversions', data: results.baseline, color: 'slate' },
    { key: 'current', name: results.current.strategyName, data: results.current, color: 'blue' },
    { key: 'optimized', name: 'Fill to 22%', data: results.optimized, color: 'green' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Monte Carlo Simulation
          <Badge variant="outline">{settings.numSimulations} runs</Badge>
        </CardTitle>
        <CardDescription>
          Stress-test strategies against {settings.numSimulations} randomized market scenarios 
          (μ={formatPercent(settings.returnMean)}, σ={formatPercent(settings.returnStdDev)})
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Settings Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
          <div className="space-y-2">
            <Label htmlFor="numSimulations">Simulations</Label>
            <Input
              id="numSimulations"
              type="number"
              min={50}
              max={500}
              step={50}
              value={settings.numSimulations}
              onChange={(e) => onSettingsChange({
                ...settings,
                numSimulations: parseInt(e.target.value) || 100,
              })}
            />
          </div>
          <div className="space-y-2">
            <Label>Expected Return: {formatPercent(settings.returnMean)}</Label>
            <Slider
              value={[settings.returnMean * 100]}
              min={0}
              max={15}
              step={0.5}
              onValueChange={([v]) => onSettingsChange({
                ...settings,
                returnMean: v / 100,
              })}
            />
          </div>
          <div className="space-y-2">
            <Label>Volatility (σ): {formatPercent(settings.returnStdDev)}</Label>
            <Slider
              value={[settings.returnStdDev * 100]}
              min={5}
              max={30}
              step={1}
              onValueChange={([v]) => onSettingsChange({
                ...settings,
                returnStdDev: v / 100,
              })}
            />
          </div>
        </div>

        {/* Strategy Comparison Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {strategies.map((s) => (
            <Card key={s.key} className={`border-2 ${
              s.key === 'optimized' ? 'border-green-500/50' :
              s.key === 'current' ? 'border-blue-500/50' : 
              'border-muted'
            }`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                  {s.name}
                  {getSuccessBadge(s.data.successRate)}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Success Rate</span>
                  <span className={`font-bold ${getSuccessColor(s.data.successRate)}`}>
                    {formatPercent(s.data.successRate)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Median Final</span>
                  <span className="font-medium">{formatCurrency(s.data.medianFinalBalance)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">10th-90th %ile</span>
                  <span className="text-xs">
                    {formatCurrency(s.data.percentile10FinalBalance)} - {formatCurrency(s.data.percentile90FinalBalance)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Avg Lifetime Tax</span>
                  <span className="font-medium">{formatCurrency(s.data.avgLifetimeTax)}</span>
                </div>
                {s.data.medianDepletionAge && (
                  <div className="flex items-center justify-between text-amber-600 dark:text-amber-400">
                    <span className="text-sm flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Median Depletion
                    </span>
                    <span className="font-medium">Age {s.data.medianDepletionAge}</span>
                  </div>
                )}
                {!s.data.medianDepletionAge && (
                  <div className="flex items-center justify-between text-green-600 dark:text-green-400">
                    <span className="text-sm flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Funds Persist
                    </span>
                    <span className="font-medium">Past 100</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Histogram */}
        <div>
          <h4 className="text-sm font-semibold text-muted-foreground mb-3">
            Final Balance Distribution
          </h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={histogramData} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="range" 
                  tick={{ fontSize: 10 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  formatter={(value: number, name: string) => [value, name]}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    borderColor: 'hsl(var(--border))',
                  }}
                />
                <Legend />
                <Bar dataKey="baseline" name="No Conversions" fill="hsl(var(--muted-foreground))" opacity={0.6} />
                <Bar dataKey="current" name={results.current.strategyName} fill="hsl(210, 100%, 50%)" opacity={0.8} />
                <Bar dataKey="optimized" name="Fill to 22%" fill="hsl(142, 71%, 45%)" opacity={0.8} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Key Insight */}
        <div className="p-4 rounded-lg bg-muted/50 border">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <h4 className="font-medium">Simulation Insight</h4>
              <p className="text-sm text-muted-foreground mt-1">
                {results.optimized.successRate > results.baseline.successRate ? (
                  <>
                    The <span className="font-medium text-green-600 dark:text-green-400">Fill to 22%</span> strategy 
                    shows a {formatPercent(results.optimized.successRate - results.baseline.successRate)} higher 
                    success rate than no conversions across {settings.numSimulations} market scenarios.
                  </>
                ) : results.baseline.successRate > results.optimized.successRate ? (
                  <>
                    <span className="font-medium">No Conversions</span> shows better resilience 
                    with a {formatPercent(results.baseline.successRate - results.optimized.successRate)} higher 
                    success rate in volatile markets.
                  </>
                ) : (
                  <>
                    Both strategies show similar success rates ({formatPercent(results.optimized.successRate)}) 
                    across market scenarios. Consider tax savings as the deciding factor.
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

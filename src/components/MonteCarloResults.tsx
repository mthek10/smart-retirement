import { useMemo, useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Activity, Shield, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import type { MonteCarloResult, MonteCarloSettings } from "@/hooks/useMonteCarloSimulation";
import { formatCurrency, formatCurrencyCompact, formatPercent, getSuccessColor } from "@/lib/utils";
import { InfoTooltip } from "@/components/ui/InfoTooltip";

interface MonteCarloResultsProps {
  results: MonteCarloResult;
  settings: MonteCarloSettings;
  onSettingsChange: (settings: MonteCarloSettings) => void;
}

export function MonteCarloResults({ results, settings, onSettingsChange }: MonteCarloResultsProps) {
  // Local state for sliders to give instant feedback without triggering recalculations
  const [localReturnMean, setLocalReturnMean] = useState(settings.returnMean * 100);
  const [localReturnStdDev, setLocalReturnStdDev] = useState(settings.returnStdDev * 100);
  const [isCalculating, setIsCalculating] = useState(false);

  // Sync local state when external settings change
  useEffect(() => {
    setLocalReturnMean(settings.returnMean * 100);
    setIsCalculating(false);
  }, [settings.returnMean]);

  useEffect(() => {
    setLocalReturnStdDev(settings.returnStdDev * 100);
    setIsCalculating(false);
  }, [settings.returnStdDev]);

  // Debounce: propagate slider changes after 400ms of inactivity
  useEffect(() => {
    const newMean = localReturnMean / 100;
    if (newMean === settings.returnMean) return;
    setIsCalculating(true);
    const timer = setTimeout(() => {
      onSettingsChange({ ...settings, returnMean: newMean });
    }, 400);
    return () => clearTimeout(timer);
  }, [localReturnMean, settings, onSettingsChange]);

  useEffect(() => {
    const newStdDev = localReturnStdDev / 100;
    if (newStdDev === settings.returnStdDev) return;
    setIsCalculating(true);
    const timer = setTimeout(() => {
      onSettingsChange({ ...settings, returnStdDev: newStdDev });
    }, 400);
    return () => clearTimeout(timer);
  }, [localReturnStdDev, settings, onSettingsChange]);

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
    
    // Initialize bins
    const histData = Array.from({ length: bins }, (_, i) => ({
      range: formatCurrencyCompact(minBalance + i * binWidth),
      baseline: 0,
      current: 0,
      optimized: 0,
    }));

    // Single-pass bucketing for each strategy
    const bucketOutcome = (balance: number, key: 'baseline' | 'current' | 'optimized') => {
      if (balance <= 0) return;
      const idx = Math.min(bins - 1, Math.floor((balance - minBalance) / binWidth));
      if (idx >= 0) histData[idx][key]++;
    };

    for (const o of results.baseline.outcomes) bucketOutcome(o.finalBalance, 'baseline');
    for (const o of results.current.outcomes) bucketOutcome(o.finalBalance, 'current');
    for (const o of results.optimized.outcomes) bucketOutcome(o.finalBalance, 'optimized');
    
    return histData;
  }, [results.baseline.outcomes, results.current.outcomes, results.optimized.outcomes]);

  // Strategy cards data – deduplicate when current strategy matches another by name
  const strategies = useMemo(() => {
    const all = [
      { key: 'baseline', name: 'No Conversions', data: results.baseline, color: 'slate' },
      { key: 'current', name: results.current.strategyName, data: results.current, color: 'blue' },
      { key: 'optimized', name: 'Fill to 24%', data: results.optimized, color: 'green' },
    ];

    const currentName = results.current.strategyName.toLowerCase().trim();
    const baselineName = 'no conversions';
    const optimizedName = 'fill to 24%';

    // If current matches baseline or optimized by name, remove the duplicate current card
    if (currentName === baselineName || currentName === optimizedName) {
      return all.filter(s => s.key !== 'current');
    }
    return all;
  }, [results]);

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
            <Label>Expected Return: {formatPercent(localReturnMean / 100)}</Label>
            <Slider
              value={[localReturnMean]}
              min={0}
              max={15}
              step={0.5}
              onValueChange={([v]) => setLocalReturnMean(v)}
            />
          </div>
          <div className="space-y-2">
            <Label>Volatility (σ): {formatPercent(localReturnStdDev / 100)}</Label>
            <Slider
              value={[localReturnStdDev]}
              min={5}
              max={30}
              step={1}
              onValueChange={([v]) => setLocalReturnStdDev(v)}
            />
          </div>
        </div>

        {/* Calculating indicator */}
        {isCalculating && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground animate-pulse">
            <Loader2 className="h-4 w-4 animate-spin" />
            <strong>Recalculating simulations…</strong>
          </div>
        )}

        {/* Strategy Comparison Cards */}
        <div className={`grid grid-cols-1 ${strategies.length === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-4`}>
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
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    Success Rate
                    <InfoTooltip text="Percentage of simulations where your funds lasted until age 100. Higher is better." side="right" />
                  </span>
                  <span className={`font-bold ${getSuccessColor(s.data.successRate)}`}>
                    {formatPercent(s.data.successRate)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    Median Final (nominal)
                    <InfoTooltip text="The middle outcome for total ending balance across all simulations. Pre-tax — does not reflect taxes still owed on Traditional/401(k) withdrawals." side="right" />
                  </span>
                  <span className="font-medium">{formatCurrency(s.data.medianFinalBalance)}</span>
                </div>
                <div className="pl-3 space-y-1 border-l-2 border-muted">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-foreground/70 flex items-center gap-1">
                      Pre-tax (Trad/401k)
                      <InfoTooltip text="Median Traditional/401(k) balance across simulations. Withdrawals are taxed as ordinary income (assumed 22%)." side="right" />
                    </span>
                    <span className="text-xs font-medium text-foreground">{formatCurrency(s.data.medianFinalTraditional)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-foreground/70 flex items-center gap-1">
                      Post-tax (Roth)
                      <InfoTooltip text="Median Roth balance across simulations. Already taxed — fully spendable." side="right" />
                    </span>
                    <span className="text-xs font-medium text-foreground">{formatCurrency(s.data.medianFinalRoth)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-foreground/70 flex items-center gap-1">
                      Taxable (brokerage)
                      <InfoTooltip text="Median taxable/brokerage balance. Gains owe LTCG (assumed 15% on ~50% of balance)." side="right" />
                    </span>
                    <span className="text-xs font-medium text-foreground">{formatCurrency(s.data.medianFinalTaxable)}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-1 border-t">
                  <span className="text-sm font-semibold text-foreground flex items-center gap-1">
                    After-Tax Equivalent
                    <InfoTooltip text={`Estimated spendable wealth at end of plan: Trad − federal tax owed if liquidated as a lump sum (effective ${formatPercent(s.data.medianEffectiveTerminalRate)}, computed by walking inflation-adjusted brackets) + Roth + Taxable × (1 − 15% × ${formatPercent(s.data.medianTaxableGainFraction)} estimated unrealized gains). The gain fraction grows with horizon as compounding outpaces the original cost basis. State tax not included.`} side="right" />
                  </span>
                  <span className="font-bold text-foreground">{formatCurrency(s.data.medianFinalAfterTax)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground flex items-center gap-1">
                    Lifetime Net Wealth
                    <InfoTooltip text="After-Tax Equivalent minus average lifetime taxes paid. This is the apples-to-apples number for comparing strategies because it credits Roth conversions for paying tax at lower brackets earlier in life." side="right" />
                  </span>
                  <span className="font-bold text-primary">{formatCurrency(s.data.medianLifetimeNetWealth)}</span>
                </div>
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs text-muted-foreground flex items-center gap-1 whitespace-nowrap">
                    10th-90th %ile
                    <InfoTooltip text="The range covering 80% of nominal-balance outcomes. The 10th percentile is a poor-market result; the 90th is a strong-market result." side="right" />
                  </span>
                  <span className="text-xs whitespace-nowrap">
                    {formatCurrencyCompact(s.data.percentile10FinalBalance)} – {formatCurrencyCompact(s.data.percentile90FinalBalance)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    Avg Lifetime Tax
                    <InfoTooltip text="The average total taxes paid over your lifetime across all simulated market scenarios." side="right" />
                  </span>
                  <span className="font-medium">{formatCurrency(s.data.avgLifetimeTax)}</span>
                </div>
                {s.data.medianDepletionAge && (
                  <div className="flex items-center justify-between text-amber-600 dark:text-amber-400">
                    <span className="text-sm flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Median Depletion
                      <InfoTooltip text="The median age at which funds run out across simulations where depletion occurred." side="right" />
                    </span>
                    <span className="font-medium">Age {s.data.medianDepletionAge}</span>
                  </div>
                )}
                {!s.data.medianDepletionAge && (
                  <div className="flex items-center justify-between text-green-600 dark:text-green-400">
                    <span className="text-sm flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Funds Persist
                      <InfoTooltip text="In the majority of simulations, your funds lasted past age 100 — no depletion detected." side="right" />
                    </span>
                    <span className="font-medium">Past 100</span>
                  </div>
                )}

                {/* Per-account median depletion ages — comparable to Strategy Comparison */}
                <div className="pt-2 mt-1 border-t space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-foreground/70 flex items-center gap-1">
                      Median Traditional Depleted
                      <InfoTooltip text="Median age across simulations when the combined Traditional / 401(k) balance first falls below $1,000. 'Never' means most simulations preserve a balance past age 100." side="right" />
                    </span>
                    <span className="text-xs font-medium text-foreground">
                      {s.data.medianTradDepletionAge ? `Age ${s.data.medianTradDepletionAge}` : 'Never'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-foreground/70 flex items-center gap-1">
                      Median Roth Depleted
                      <InfoTooltip text="Median age across simulations when the Roth balance first falls below $1,000." side="right" />
                    </span>
                    <span className="text-xs font-medium text-foreground">
                      {s.data.medianRothDepletionAge ? `Age ${s.data.medianRothDepletionAge}` : 'Never'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-foreground/70 flex items-center gap-1">
                      Median Taxable Depleted
                      <InfoTooltip text="Median age across simulations when the Taxable / Brokerage balance first falls below $1,000." side="right" />
                    </span>
                    <span className="text-xs font-medium text-foreground">
                      {s.data.medianTaxableDepletionAge ? `Age ${s.data.medianTaxableDepletionAge}` : 'Never'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Explainer: why Monte Carlo medians differ from Strategy Comparison */}
        <div className="p-3 rounded-md bg-muted/40 border text-xs text-foreground/80 space-y-2">
          <div>
            <span className="font-medium text-foreground">Why these depletion ages differ from Strategy Comparison:</span>{' '}
            Monte Carlo medians reflect random-return variance, so they typically deplete earlier than the deterministic
            Strategy Comparison even when centered on the same average return — this is sequence-of-returns risk.
          </div>
          <div>
            <span className="font-medium text-foreground">How to compare strategies:</span>{' '}
            <strong>After-Tax Equivalent</strong> is a terminal snapshot — it doesn't credit a strategy for paying less tax over its lifetime, so it can make
            "No Conversions" look misleadingly strong. Use <strong>Success Rate</strong> together with <strong>Lifetime Net Wealth</strong>
            (which subtracts the lifetime taxes you actually paid) as the headline comparison.
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
                    The <span className="font-medium text-green-600 dark:text-green-400">Fill to 24%</span> strategy 
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

import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Trophy, TrendingDown, TrendingUp, Clock, DollarSign, Wallet, Target } from "lucide-react";
import type { Scenario } from "@/hooks/useScenarios";
import type { StrategyMetrics } from "@/hooks/useProjections";
import { formatCurrency, formatPercent } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface ScenarioComparisonProps {
  scenarios: Scenario[];
  currentMetrics: StrategyMetrics;
  currentStrategyName: string;
}

// Use CSS variables for theming - these will be resolved at runtime
const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-1))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--chart-3))",
];

export function ScenarioComparison({ scenarios, currentMetrics, currentStrategyName }: ScenarioComparisonProps) {
  // Combine current with saved scenarios for comparison
  const allScenarios = useMemo(() => {
    const current: Scenario = {
      id: 'current',
      name: `Current: ${currentStrategyName}`,
      createdAt: new Date(),
      accounts: {} as any,
      ssData: {} as any,
      taxSettings: {} as any,
      metrics: currentMetrics,
    };
    return [current, ...scenarios];
  }, [scenarios, currentMetrics, currentStrategyName]);

  // Find winners for each metric
  const winners = useMemo(() => {
    if (allScenarios.length < 2) return { taxes: null, longevity: null, balance: null };

    // Lowest lifetime tax wins
    const taxWinner = allScenarios.reduce((best, s) => 
      s.metrics.lifetimeTotalTax < best.metrics.lifetimeTotalTax ? s : best
    );

    // Null depletion (never) or highest age wins
    const longevityWinner = allScenarios.reduce((best, s) => {
      if (s.metrics.allFundsDepletionAge === null && best.metrics.allFundsDepletionAge !== null) return s;
      if (best.metrics.allFundsDepletionAge === null && s.metrics.allFundsDepletionAge !== null) return best;
      if (s.metrics.allFundsDepletionAge === null && best.metrics.allFundsDepletionAge === null) return best;
      return (s.metrics.allFundsDepletionAge ?? 999) > (best.metrics.allFundsDepletionAge ?? 999) ? s : best;
    });

    // Highest final balance wins
    const balanceWinner = allScenarios.reduce((best, s) => 
      s.metrics.finalTotalBalance > best.metrics.finalTotalBalance ? s : best
    );

    return {
      taxes: taxWinner.id,
      longevity: longevityWinner.id,
      balance: balanceWinner.id,
    };
  }, [allScenarios]);

  // Chart data
  const taxChartData = useMemo(() => 
    allScenarios.map((s, i) => ({
      name: s.name.length > 20 ? s.name.substring(0, 20) + '...' : s.name,
      value: s.metrics.lifetimeTotalTax,
      fill: CHART_COLORS[i % CHART_COLORS.length],
    }))
  , [allScenarios]);

  const balanceChartData = useMemo(() => 
    allScenarios.map((s, i) => ({
      name: s.name.length > 20 ? s.name.substring(0, 20) + '...' : s.name,
      value: s.metrics.finalTotalBalance,
      fill: CHART_COLORS[i % CHART_COLORS.length],
    }))
  , [allScenarios]);

  if (scenarios.length === 0) {
    return null;
  }

  const formatDepletion = (age: number | null) => 
    age === null ? "Never" : `Age ${age}`;

  const getWinnerBadge = (scenarioId: string, metric: 'taxes' | 'longevity' | 'balance') => {
    if (winners[metric] === scenarioId) {
      return (
        <Badge className="ml-2 bg-chart-4 text-primary-foreground">
          <Trophy className="h-3 w-3 mr-1" />
          Best
        </Badge>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Scenario Comparison
          <Badge variant="outline">{allScenarios.length} scenarios</Badge>
        </CardTitle>
        <CardDescription>
          Compare saved scenarios to find the optimal retirement strategy
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Comparison Table */}
        <div className="rounded-lg border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[180px]">Scenario</TableHead>
                <TableHead className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <DollarSign className="h-4 w-4" />
                    Lifetime Tax
                  </div>
                </TableHead>
                <TableHead className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Clock className="h-4 w-4" />
                    Depletion Age
                  </div>
                </TableHead>
                <TableHead className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Wallet className="h-4 w-4" />
                    Final Balance
                  </div>
                </TableHead>
                <TableHead className="text-right">Avg Bracket</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allScenarios.map((scenario, index) => (
                <TableRow 
                  key={scenario.id}
                  className={scenario.id === 'current' ? 'bg-primary/5' : ''}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                      />
                      <span className="font-medium">{scenario.name}</span>
                      {scenario.id === 'current' && (
                        <Badge variant="secondary" className="text-xs">Active</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end">
                      {formatCurrency(scenario.metrics.lifetimeTotalTax)}
                      {getWinnerBadge(scenario.id, 'taxes')}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end">
                      {formatDepletion(scenario.metrics.allFundsDepletionAge)}
                      {getWinnerBadge(scenario.id, 'longevity')}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end">
                      {formatCurrency(scenario.metrics.finalTotalBalance)}
                      {getWinnerBadge(scenario.id, 'balance')}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {formatPercent(scenario.metrics.avgBracket)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Difference from Best */}
        {allScenarios.length > 1 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-2 border-dashed">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-success" />
                  Tax Savings Range
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-success">
                  {formatCurrency(
                    Math.max(...allScenarios.map(s => s.metrics.lifetimeTotalTax)) -
                    Math.min(...allScenarios.map(s => s.metrics.lifetimeTotalTax))
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Difference between highest and lowest tax scenarios
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 border-dashed">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  Longevity Spread
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  const ages = allScenarios
                    .map(s => s.metrics.allFundsDepletionAge)
                    .filter((a): a is number => a !== null);
                  const hasNever = allScenarios.some(s => s.metrics.allFundsDepletionAge === null);
                  
                  if (ages.length === 0) {
                    return (
                      <>
                        <div className="text-2xl font-bold text-primary">All Never Deplete</div>
                        <p className="text-xs text-muted-foreground mt-1">
                          All scenarios maintain funds past age 100
                        </p>
                      </>
                    );
                  }
                  
                  const spread = hasNever ? `${Math.min(...ages)}+` : `${Math.max(...ages) - Math.min(...ages)} years`;
                  return (
                    <>
                      <div className="text-2xl font-bold text-primary">{spread}</div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {hasNever ? "Earliest depletion vs never" : "Between earliest and latest depletion"}
                      </p>
                    </>
                  );
                })()}
              </CardContent>
            </Card>

            <Card className="border-2 border-dashed">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-accent-foreground" />
                  Balance Range
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-accent-foreground">
                  {formatCurrency(
                    Math.max(...allScenarios.map(s => s.metrics.finalTotalBalance)) -
                    Math.min(...allScenarios.map(s => s.metrics.finalTotalBalance))
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Difference in final balances at age 100
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-semibold text-muted-foreground mb-3">
              Lifetime Tax Comparison
            </h4>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={taxChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    type="number" 
                    tickFormatter={(v) => `$${(v / 1000000).toFixed(1)}M`}
                  />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    width={120}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip 
                    formatter={(value: number) => [formatCurrency(value), 'Lifetime Tax']}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      borderColor: 'hsl(var(--border))',
                    }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {taxChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-muted-foreground mb-3">
              Final Balance Comparison
            </h4>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={balanceChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    type="number" 
                    tickFormatter={(v) => `$${(v / 1000000).toFixed(1)}M`}
                  />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    width={120}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip 
                    formatter={(value: number) => [formatCurrency(value), 'Final Balance']}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      borderColor: 'hsl(var(--border))',
                    }}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {balanceChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Recommendation */}
        {allScenarios.length > 1 && (
          <div className="p-4 rounded-lg bg-muted/50 border">
            <h4 className="font-medium mb-2">Scenario Analysis</h4>
            <p className="text-sm text-muted-foreground">
              {(() => {
                const taxWinner = allScenarios.find(s => s.id === winners.taxes);
                const balanceWinner = allScenarios.find(s => s.id === winners.balance);
                
                if (winners.taxes === winners.balance && winners.taxes === winners.longevity) {
                  return (
                    <>
                      <strong className="text-foreground">{taxWinner?.name}</strong> dominates 
                      across all metrics—minimizing taxes while maximizing longevity and final balance.
                    </>
                  );
                }
                
                if (winners.taxes === winners.balance) {
                  return (
                    <>
                      <strong className="text-foreground">{taxWinner?.name}</strong> offers the 
                      best combination of tax efficiency and terminal wealth.
                    </>
                  );
                }
                
                return (
                  <>
                    Trade-offs exist: <strong className="text-foreground">{taxWinner?.name}</strong> minimizes 
                    taxes while <strong className="text-foreground">{balanceWinner?.name}</strong> maximizes 
                    final balance. Consider your priorities when choosing.
                  </>
                );
              })()}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Calculator, 
  TrendingDown, 
  Calendar, 
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Target,
  DollarSign,
  PiggyBank,
  ArrowRight
} from "lucide-react";
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Bar,
  ReferenceLine,
  Area,
  AreaChart,
  ComposedChart
} from "recharts";
import { analyzeRMD, type RMDStrategy, type RMDProjection } from "@/lib/rmdPlanning";
import { formatCurrency, formatCurrencyCompact } from "@/lib/utils";

interface RMDPlannerProps {
  spouse1TradBalance: number;
  spouse2TradBalance: number;
  rothBalance: number;
  spouse1Age: number;
  spouse2Age: number;
  filingStatus: string;
  rothConversionStrategy: string;
  growthRate?: number;
  inflationRate?: number;
  otherIncome?: number;
  visibleTabs?: ('chart' | 'table' | 'strategies')[];
  showSummary?: boolean;
}

const getDifficultyColor = (difficulty: RMDStrategy['difficulty']) => {
  switch (difficulty) {
    case 'easy': return 'bg-success/20 text-success border-success/30';
    case 'moderate': return 'bg-warning/20 text-warning border-warning/30';
    case 'complex': return 'bg-destructive/20 text-destructive border-destructive/30';
  }
};

const getTaxImpactColor = (impact: RMDProjection['taxBracketImpact']) => {
  switch (impact) {
    case 'low': return 'text-success';
    case 'medium': return 'text-warning';
    case 'high': return 'text-destructive';
  }
};

export function RMDPlanner({
  spouse1TradBalance,
  spouse2TradBalance,
  rothBalance,
  spouse1Age,
  spouse2Age,
  filingStatus,
  rothConversionStrategy,
  growthRate = 5,
  inflationRate = 2.5,
  otherIncome = 30000,
  visibleTabs = ['chart', 'table', 'strategies'],
  showSummary = true,
}: RMDPlannerProps) {
  const [expandedStrategy, setExpandedStrategy] = useState<string | null>(null);
  
  const analysis = useMemo(() => {
    return analyzeRMD(
      spouse1TradBalance,
      spouse2TradBalance,
      spouse1Age,
      spouse2Age,
      filingStatus,
      rothBalance,
      rothConversionStrategy,
      growthRate,
      inflationRate,
      otherIncome
    );
  }, [spouse1TradBalance, spouse2TradBalance, spouse1Age, spouse2Age, filingStatus, rothBalance, rothConversionStrategy, growthRate, inflationRate, otherIncome]);
  
  // Filter projections for chart (only ages 70-100)
  const chartData = useMemo(() => {
    return analysis.projections
      .filter(p => p.age >= 70 && p.age <= 100)
      .map(p => ({
        age: p.age,
        year: p.year,
        rmd: p.totalRMD,
        balance: p.totalTradBalance,
        tax: p.projectedTax,
        bracket: p.marginalBracket,
        cumulative: p.cumulativeRMD,
      }));
  }, [analysis.projections]);
  
  // Table data (ages 73-95)
  const tableData = useMemo(() => {
    return analysis.projections.filter(p => p.age >= 73 && p.age <= 95);
  }, [analysis.projections]);
  
  const totalTradBalance = spouse1TradBalance + spouse2TradBalance;
  
  if (totalTradBalance < 1000) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            <CardTitle>RMD Planning</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            No significant Traditional IRA/401(k) balance to plan RMDs for.
          </p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          <CardTitle>RMD Planning Center</CardTitle>
        </div>
        <CardDescription>
          Required Minimum Distributions analysis and tax optimization strategies
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {showSummary && <>
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Calendar className="h-4 w-4" />
              <span>Years to RMD</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {analysis.yearsUntilRMD > 0 ? analysis.yearsUntilRMD : 'Now'}
            </p>
            <p className="text-xs text-muted-foreground">
              {analysis.yearsUntilRMD > 0 ? `Starts at age 73` : `RMDs are required`}
            </p>
          </div>
          
          <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <DollarSign className="h-4 w-4" />
              <span>First RMD</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {analysis.projections.find(p => p.age === 73)?.totalRMD 
                ? formatCurrencyCompact(analysis.projections.find(p => p.age === 73)!.totalRMD)
                : '-'}
            </p>
            <p className="text-xs text-muted-foreground">
              Projected at age 73
            </p>
          </div>
          
          <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Target className="h-4 w-4" />
              <span>Peak RMD</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {analysis.peakRMDYear 
                ? formatCurrencyCompact(analysis.peakRMDYear.totalRMD)
                : '-'}
            </p>
            <p className="text-xs text-muted-foreground">
              {analysis.peakRMDYear ? `At age ${analysis.peakRMDYear.age}` : '-'}
            </p>
          </div>
          
          <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <TrendingDown className="h-4 w-4" />
              <span>Lifetime RMDs</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {formatCurrencyCompact(analysis.totalLifetimeRMD)}
            </p>
            <p className="text-xs text-muted-foreground">
              Est. tax: {formatCurrencyCompact(analysis.totalLifetimeTax)}
            </p>
          </div>
        </div>
        
        {/* Pre-RMD Window Alert */}
        {analysis.yearsUntilRMD > 0 && analysis.yearsUntilRMD <= 15 && (
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Lightbulb className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <h4 className="font-medium text-primary">Pre-RMD Optimization Window</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  You have <strong>{analysis.yearsUntilRMD} years</strong> before RMDs begin. 
                  This is your opportunity to reduce your Traditional IRA balance through Roth conversions 
                  at potentially lower tax rates than you'll face once RMDs start.
                </p>
              </div>
            </div>
          </div>
        )}
        </>}
        <Tabs defaultValue={visibleTabs[0]} className="w-full">
          <TabsList className={`grid w-full grid-cols-${visibleTabs.length}`}>
            {visibleTabs.includes('chart') && <TabsTrigger value="chart">RMD Projections</TabsTrigger>}
            {visibleTabs.includes('table') && <TabsTrigger value="table">Year-by-Year</TabsTrigger>}
            {visibleTabs.includes('strategies') && <TabsTrigger value="strategies">Tax Strategies</TabsTrigger>}
          </TabsList>
          
          <TabsContent value="chart" className="space-y-4 mt-4">
            {/* RMD and Balance Chart */}
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="age" 
                    tick={{ fontSize: 12 }} 
                    className="fill-muted-foreground"
                    label={{ value: 'Age', position: 'insideBottom', offset: -5 }}
                  />
                  <YAxis 
                    yAxisId="left"
                    tick={{ fontSize: 12 }} 
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                    className="fill-muted-foreground"
                    label={{ value: 'RMD Amount', angle: -90, position: 'insideLeft' }}
                  />
                  <YAxis 
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 12 }} 
                    tickFormatter={(v) => `$${(v / 1000000).toFixed(1)}M`}
                    className="fill-muted-foreground"
                    label={{ value: 'Balance', angle: 90, position: 'insideRight' }}
                  />
                  <Tooltip 
                    formatter={(value: number, name: string) => [
                      formatCurrency(value),
                      name === 'rmd' ? 'RMD' : name === 'balance' ? 'Balance' : name
                    ]}
                    labelFormatter={(age) => `Age ${age}`}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <ReferenceLine 
                    x={73} 
                    yAxisId="left"
                    stroke="hsl(var(--destructive))" 
                    strokeDasharray="5 5"
                    label={{ value: 'RMD Start', position: 'top', fill: 'hsl(var(--destructive))' }}
                  />
                  <Area
                    yAxisId="right"
                    type="monotone"
                    dataKey="balance"
                    name="Traditional Balance"
                    fill="hsl(var(--primary) / 0.2)"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                  />
                  <Bar
                    yAxisId="left"
                    dataKey="rmd"
                    name="Annual RMD"
                    fill="hsl(var(--warning))"
                    radius={[4, 4, 0, 0]}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            
            {/* Tax Bracket Over Time */}
            <div className="mt-6">
              <h4 className="font-medium mb-3">Marginal Tax Bracket Impact</h4>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="age" 
                      tick={{ fontSize: 12 }} 
                      className="fill-muted-foreground"
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }} 
                      tickFormatter={(v) => `${v}%`}
                      domain={[0, 40]}
                      className="fill-muted-foreground"
                    />
                    <Tooltip 
                      formatter={(value: number) => [`${value}%`, 'Marginal Bracket']}
                      labelFormatter={(age) => `Age ${age}`}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Area
                      type="stepAfter"
                      dataKey="bracket"
                      name="Marginal Tax Bracket"
                      fill="hsl(var(--destructive) / 0.3)"
                      stroke="hsl(var(--destructive))"
                      strokeWidth={2}
                    />
                    <ReferenceLine 
                      y={22} 
                      stroke="hsl(var(--success))" 
                      strokeDasharray="5 5"
                      label={{ value: '22% Target', position: 'right', fill: 'hsl(var(--success))' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="table" className="mt-4">
            <div className="rounded-lg border overflow-auto max-h-[500px]">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="text-left p-3 font-medium">Age</th>
                    <th className="text-right p-3 font-medium">Year</th>
                    <th className="text-right p-3 font-medium">Trad Balance</th>
                    <th className="text-right p-3 font-medium">RMD</th>
                    <th className="text-right p-3 font-medium">RMD %</th>
                    <th className="text-right p-3 font-medium">Est. Tax</th>
                    <th className="text-right p-3 font-medium">Bracket</th>
                  </tr>
                </thead>
                <tbody>
                  {tableData.map((row) => (
                    <tr key={row.age} className="border-t border-border/50 hover:bg-muted/30">
                      <td className="p-3 font-medium">{row.age}</td>
                      <td className="p-3 text-right text-muted-foreground">{row.year}</td>
                      <td className="p-3 text-right">{formatCurrency(row.totalTradBalance)}</td>
                      <td className="p-3 text-right font-medium text-warning">
                        {formatCurrency(row.totalRMD)}
                      </td>
                      <td className="p-3 text-right text-muted-foreground">
                        {row.rmdPercent.toFixed(1)}%
                      </td>
                      <td className="p-3 text-right text-destructive">
                        {formatCurrency(row.projectedTax)}
                      </td>
                      <td className="p-3 text-right">
                        <span className={getTaxImpactColor(row.taxBracketImpact)}>
                          {row.marginalBracket}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              * Projections assume {growthRate}% annual growth and {inflationRate}% inflation
            </p>
          </TabsContent>
          
          <TabsContent value="strategies" className="space-y-4 mt-4">
            <div className="text-sm text-muted-foreground mb-4">
              <AlertTriangle className="h-4 w-4 inline mr-1" />
              Strategies to minimize lifetime taxes on Required Minimum Distributions
            </div>
            
            {analysis.strategies.map((strategy) => (
              <Collapsible 
                key={strategy.id}
                open={expandedStrategy === strategy.id}
                onOpenChange={(open) => setExpandedStrategy(open ? strategy.id : null)}
              >
                <div className="border rounded-lg overflow-hidden">
                  <CollapsibleTrigger asChild>
                    <button className="w-full p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <PiggyBank className="h-5 w-5 text-primary" />
                        <div className="text-left">
                          <h4 className="font-medium">{strategy.name}</h4>
                          <p className="text-sm text-muted-foreground">{strategy.impact}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={getDifficultyColor(strategy.difficulty)} variant="outline">
                          {strategy.difficulty}
                        </Badge>
                        {expandedStrategy === strategy.id ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="p-4 pt-0 border-t bg-muted/20">
                      <p className="text-sm text-muted-foreground mb-3">
                        {strategy.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm">
                          <DollarSign className="h-4 w-4 text-success" />
                          <span>Potential savings: </span>
                          <span className="font-medium text-success">
                            {formatCurrency(strategy.potentialSavings)}
                          </span>
                        </div>
                      </div>
                      <div className="mt-3 p-3 bg-primary/10 rounded-lg">
                        <div className="flex items-start gap-2">
                          <ArrowRight className="h-4 w-4 text-primary mt-0.5" />
                          <p className="text-sm text-primary">{strategy.recommendation}</p>
                        </div>
                      </div>
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            ))}
            
            {analysis.strategies.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <PiggyBank className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No specific strategies available for your current situation.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

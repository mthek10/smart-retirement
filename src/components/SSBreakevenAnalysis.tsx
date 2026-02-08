import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, ReferenceLine, ResponsiveContainer } from 'recharts';
import { TrendingUp, Target, Clock, DollarSign } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { calculateFullRetirementAge } from '@/lib/taxCalculations';
import {
  calculateAllClaimingScenarios,
  calculateBreakevenMatrix,
  findOptimalClaimingAge,
  generateCumulativeBenefitsData,
  ClaimingScenario,
} from '@/lib/ssOptimization';

interface SSBreakevenAnalysisProps {
  monthlyBenefitAtFRA: number;
  currentAge: number;
  lifeExpectancy: number;
  selectedClaimAge: number;
}

const LIFE_EXPECTANCIES = [80, 85, 90, 95, 100];

const chartConfig = {
  age62: { label: 'Claim at 62', color: 'hsl(var(--destructive))' },
  age67: { label: 'Claim at FRA', color: 'hsl(var(--primary))' },
  age70: { label: 'Claim at 70', color: 'hsl(var(--success))' },
};

export function SSBreakevenAnalysis({
  monthlyBenefitAtFRA,
  currentAge,
  lifeExpectancy,
  selectedClaimAge,
}: SSBreakevenAnalysisProps) {
  const fullRetirementAge = calculateFullRetirementAge(currentAge);
  
  const scenarios = useMemo(() => 
    calculateAllClaimingScenarios(monthlyBenefitAtFRA, fullRetirementAge, LIFE_EXPECTANCIES),
    [monthlyBenefitAtFRA, fullRetirementAge]
  );
  
  const breakevenMatrix = useMemo(() => 
    calculateBreakevenMatrix(monthlyBenefitAtFRA, fullRetirementAge),
    [monthlyBenefitAtFRA, fullRetirementAge]
  );
  
  const optimalResult = useMemo(() => 
    findOptimalClaimingAge(monthlyBenefitAtFRA, fullRetirementAge, lifeExpectancy),
    [monthlyBenefitAtFRA, fullRetirementAge, lifeExpectancy]
  );
  
  const chartData = useMemo(() => 
    generateCumulativeBenefitsData(monthlyBenefitAtFRA, fullRetirementAge, [62, 67, 70], 100),
    [monthlyBenefitAtFRA, fullRetirementAge]
  );
  
  // Find which life expectancies each claiming age is optimal for
  const getOptimalRanges = (scenario: ClaimingScenario): string => {
    const optimalAges: number[] = [];
    LIFE_EXPECTANCIES.forEach(le => {
      const bestForLE = findOptimalClaimingAge(monthlyBenefitAtFRA, fullRetirementAge, le);
      if (bestForLE.age === scenario.claimAge) {
        optimalAges.push(le);
      }
    });
    
    if (optimalAges.length === 0) return '';
    if (optimalAges.length === 1) return `Best if living to ${optimalAges[0]}`;
    return `Best for ages ${optimalAges[0]}-${optimalAges[optimalAges.length - 1]}`;
  };
  
  // Calculate benefit difference vs current selection
  const selectedScenario = scenarios.find(s => s.claimAge === selectedClaimAge);
  const optimalScenario = scenarios.find(s => s.claimAge === optimalResult.age);
  const benefitDifference = optimalScenario && selectedScenario
    ? optimalScenario.lifetimeBenefits[lifeExpectancy] - selectedScenario.lifetimeBenefits[lifeExpectancy]
    : 0;
  
  if (monthlyBenefitAtFRA <= 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Recommendation Panel */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Optimal Claiming Age</p>
                <p className="text-2xl font-bold text-primary">Age {optimalResult.age}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-success/10">
                <DollarSign className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Lifetime Benefits (to {lifeExpectancy})</p>
                <p className="text-2xl font-bold text-success">{formatCurrency(optimalResult.totalBenefits)}</p>
              </div>
            </div>
            
            {benefitDifference > 0 && selectedClaimAge !== optimalResult.age && (
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-warning/10">
                  <TrendingUp className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Potential Additional Benefits</p>
                  <p className="text-2xl font-bold text-warning">+{formatCurrency(benefitDifference)}</p>
                </div>
              </div>
            )}
          </div>
          
          {selectedClaimAge !== optimalResult.age && benefitDifference > 0 && (
            <Alert className="mt-4 border-none bg-warning/10">
              <TrendingUp className="h-4 w-4 text-warning" />
              <AlertDescription className="text-foreground">
                Based on a life expectancy of {lifeExpectancy}, claiming at age {optimalResult.age} instead of {selectedClaimAge} would 
                provide an additional {formatCurrency(benefitDifference)} in lifetime benefits.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Breakeven Ages */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Breakeven Analysis
          </CardTitle>
          <CardDescription>
            How long you need to live for delaying to pay off
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {breakevenMatrix.map((comparison) => (
              <div 
                key={`${comparison.earlyAge}-${comparison.delayedAge}`}
                className="p-4 rounded-lg bg-muted/50 space-y-2"
              >
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">
                    Age {comparison.earlyAge} vs {comparison.delayedAge}
                  </span>
                  <Badge variant={lifeExpectancy >= comparison.breakevenAge ? "default" : "secondary"}>
                    {lifeExpectancy >= comparison.breakevenAge ? "Delay wins" : "Early wins"}
                  </Badge>
                </div>
                <p className="text-2xl font-bold">
                  Age {comparison.breakevenAge.toFixed(1)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {comparison.yearsToBreakeven.toFixed(1)} years after claiming at {comparison.delayedAge}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Cumulative Benefits Chart */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Cumulative Benefits by Claiming Age</CardTitle>
          <CardDescription>
            Compare total lifetime benefits at different claiming ages
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <XAxis 
                dataKey="age" 
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}`}
              />
              <YAxis 
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent 
                    formatter={(value, name) => {
                      const label = name === 'age62' ? 'Claim at 62' : name === 'age67' ? 'Claim at FRA' : 'Claim at 70';
                      return [formatCurrency(value as number), label];
                    }}
                  />
                }
              />
              <ReferenceLine 
                x={lifeExpectancy} 
                stroke="hsl(var(--muted-foreground))" 
                strokeDasharray="5 5"
                label={{ value: `Life Exp: ${lifeExpectancy}`, position: 'top', fill: 'hsl(var(--muted-foreground))' }}
              />
              <Line
                type="monotone"
                dataKey="age62"
                stroke="hsl(var(--destructive))"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="age67"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="age70"
                stroke="hsl(var(--success))"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ChartContainer>
          
          <div className="flex justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-destructive" />
              <span className="text-sm">Claim at 62</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary" />
              <span className="text-sm">Claim at FRA</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-success" />
              <span className="text-sm">Claim at 70</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lifetime Benefits Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Lifetime Benefits Comparison</CardTitle>
          <CardDescription>
            Total benefits by claiming age and life expectancy
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Claim Age</TableHead>
                  <TableHead className="text-right">Monthly</TableHead>
                  <TableHead className="text-right">Annual</TableHead>
                  {LIFE_EXPECTANCIES.map(le => (
                    <TableHead key={le} className="text-right">
                      Age {le}
                      {le === lifeExpectancy && <span className="ml-1 text-primary">★</span>}
                    </TableHead>
                  ))}
                  <TableHead>Optimal For</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scenarios.filter(s => [62, 65, 67, 70].includes(s.claimAge)).map((scenario) => {
                  const isOptimal = scenario.claimAge === optimalResult.age;
                  const isSelected = scenario.claimAge === selectedClaimAge;
                  
                  return (
                    <TableRow 
                      key={scenario.claimAge}
                      className={isOptimal ? 'bg-success/10' : isSelected ? 'bg-primary/10' : ''}
                    >
                      <TableCell className="font-medium">
                        Age {scenario.claimAge}
                        {scenario.claimAge === Math.round(fullRetirementAge) && (
                          <Badge variant="outline" className="ml-2 text-xs">FRA</Badge>
                        )}
                        {isOptimal && (
                          <Badge className="ml-2 text-xs bg-success">Optimal</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(scenario.monthlyBenefit)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(scenario.annualBenefit)}
                      </TableCell>
                      {LIFE_EXPECTANCIES.map(le => {
                        const best = findOptimalClaimingAge(monthlyBenefitAtFRA, fullRetirementAge, le);
                        const isBestForLE = best.age === scenario.claimAge;
                        
                        return (
                          <TableCell 
                            key={le} 
                            className={`text-right font-mono ${
                              isBestForLE ? 'text-success font-semibold' : ''
                            } ${le === lifeExpectancy ? 'bg-primary/5' : ''}`}
                          >
                            {formatCurrency(scenario.lifetimeBenefits[le])}
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-xs text-muted-foreground">
                        {getOptimalRanges(scenario)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

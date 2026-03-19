import { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, formatCurrency } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Target, Download } from "lucide-react";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { CustomScrollbar } from "@/components/ui/CustomScrollbar";
import { exportProjectionsToCSV } from "@/lib/exportUtils";
import type { ProjectionRow } from "@/hooks/useProjections";

interface YearProjection {
  year: number;
  age: number;
  traditionalBalance: number;
  rothBalance: number;
  taxableBalance: number;
  ssIncome: number;
  employmentIncome?: number;
  pensionIncome?: number;
  netWages?: number;
  excessSavings?: number;
  payrollTax?: number;
  contributions401k?: number;
  employerMatch?: number;
  withdrawals: number;
  federalTax: number;
  federalCapitalGainsTax: number;
  stateTax: number;
  stateCapitalGainsTax: number;
  irmaa: number;
  medicarePremiums?: number;
  acaPremium?: number;
  acaSubsidy?: number;
  healthcareCost?: number;
  niit: number;
  amt: number;
  totalTaxes: number;
  takeHome: number;
  rmd: number;
  totalIncome: number;
  rothConversion?: number;
  marginalBracket?: number;
  lifeEventExpense?: number;
  lifeEventIncome?: number;
}

interface ProjectionTableProps {
  projections: YearProjection[];
}

type ColumnGroup = "balances" | "income" | "taxes" | "healthcare" | "lifeEvents";

const COLUMN_GROUPS: { id: ColumnGroup; label: string; description: string }[] = [
  { id: "balances", label: "Balances", description: "Account balances and withdrawals" },
  { id: "income", label: "Income", description: "Wages, SS, conversions, and RMDs" },
  { id: "taxes", label: "Tax Details", description: "Individual tax breakdowns" },
  { id: "healthcare", label: "Healthcare", description: "Medicare, IRMAA, and ACA details" },
  { id: "lifeEvents", label: "Life Events", description: "One-time expenses and income events" },
];

export function ProjectionTable({ projections }: ProjectionTableProps) {
  const [activeGroups, setActiveGroups] = useState<Set<ColumnGroup>>(
    new Set(["balances", "income"])
  );

  const tableScrollRef = useRef<HTMLDivElement>(null);

  const show = (group: ColumnGroup) => activeGroups.has(group);

  const toggleGroup = (group: ColumnGroup) => {
    setActiveGroups(prev => {
      const next = new Set(prev);
      if (next.has(group)) {
        next.delete(group);
      } else {
        next.add(group);
      }
      return next;
    });
  };

  const showAll = activeGroups.size === COLUMN_GROUPS.length;
  const toggleAll = () => {
    if (showAll) {
      setActiveGroups(new Set(["balances"]));
    } else {
      setActiveGroups(new Set(COLUMN_GROUPS.map(g => g.id)));
    }
  };


  const hasIRMAAWarning = (irmaa: number) => irmaa > 0;

  const handleExportToCSV = () => {
    if (projections.length === 0) return;
    exportProjectionsToCSV(projections as ProjectionRow[]);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>Year-by-Year Projections</CardTitle>
            <CardDescription>
              Detailed breakdown of income, taxes, and account balances over time
            </CardDescription>
          </div>
          {projections.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportToCSV}
              className="gap-1"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Column group toggles */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={toggleAll}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer border",
              showAll
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-muted-foreground border-border hover:bg-muted"
            )}
          >
            All Columns
          </button>
          {COLUMN_GROUPS.map(group => (
            <button
              key={group.id}
              onClick={() => toggleGroup(group.id)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer border",
                activeGroups.has(group.id)
                  ? "bg-primary/15 text-primary border-primary/30"
                  : "bg-background text-muted-foreground border-border hover:bg-muted"
              )}
            >
              {group.label}
            </button>
          ))}
        </div>

        <div className="rounded-md border flex flex-col">
          {/* Top horizontal scrollbar */}
          <div className="border-b px-1 py-1 flex-shrink-0">
            <CustomScrollbar scrollRef={tableScrollRef} orientation="horizontal" />
          </div>
          <div className="flex flex-row flex-1 min-h-0">
            <div ref={tableScrollRef} className="max-h-[600px] overflow-scroll hide-native-scrollbar flex-1">
            <table className="caption-bottom text-sm min-w-max">
              <thead>
                <tr className="border-b transition-colors hover:bg-muted/50">
                  <th className="h-12 px-4 text-left align-middle font-semibold sticky top-0 left-0 z-40 bg-background border-b">Year</th>
                  <th className="h-12 px-4 text-left align-middle font-semibold sticky top-0 z-30 bg-background border-b">Age</th>
                  {show("balances") && (
                    <>
                      <th className="h-12 px-4 text-right align-middle font-semibold sticky top-0 z-30 bg-background border-b">Traditional</th>
                      <th className="h-12 px-4 text-right align-middle font-semibold sticky top-0 z-30 bg-background border-b">Roth</th>
                      <th className="h-12 px-4 text-right align-middle font-semibold sticky top-0 z-30 bg-background border-b">Brokerage</th>
                      <th className="h-12 px-4 text-right align-middle font-semibold sticky top-0 z-30 bg-background border-b">Withdrawals</th>
                    </>
                  )}
                  {show("income") && (
                    <>
                      <th className="h-12 px-4 text-right align-middle font-semibold sticky top-0 z-30 bg-background border-b">SS Income</th>
                      <th className="h-12 px-4 text-right align-middle font-semibold sticky top-0 z-30 bg-background border-b">Wages</th>
                      <th className="h-12 px-4 text-right align-middle font-semibold sticky top-0 z-30 bg-background border-b">
                        <span className="inline-flex items-center gap-1">Pension <InfoTooltip text="Annual pension income (pre-tax). Treated as ordinary taxable income and reduces required portfolio withdrawals." /></span>
                      </th>
                      <th className="h-12 px-4 text-right align-middle font-semibold sticky top-0 z-30 bg-background border-b">Excess Saved</th>
                      <th className="h-12 px-4 text-right align-middle font-semibold sticky top-0 z-30 bg-background border-b">
                        <span className="inline-flex items-center gap-1">RMD <InfoTooltip text="Required Minimum Distribution — mandatory annual withdrawals from Traditional IRA starting at age 73." /></span>
                      </th>
                      <th className="h-12 px-4 text-right align-middle font-semibold sticky top-0 z-30 bg-background border-b">Conversion</th>
                      <th className="h-12 px-4 text-right align-middle font-semibold sticky top-0 z-30 bg-background border-b">Tax Bracket</th>
                    </>
                  )}
                  {show("taxes") && (
                    <>
                      <th className="h-12 px-4 text-right align-middle font-semibold sticky top-0 z-30 bg-background border-b">Payroll Tax</th>
                      <th className="h-12 px-4 text-right align-middle font-semibold sticky top-0 z-30 bg-background border-b">Fed Tax</th>
                      <th className="h-12 px-4 text-right align-middle font-semibold sticky top-0 z-30 bg-background border-b">Fed CG Tax</th>
                      <th className="h-12 px-4 text-right align-middle font-semibold sticky top-0 z-30 bg-background border-b">State Tax</th>
                      <th className="h-12 px-4 text-right align-middle font-semibold sticky top-0 z-30 bg-background border-b">State CG Tax</th>
                      <th className="h-12 px-4 text-right align-middle font-semibold sticky top-0 z-30 bg-background border-b">
                        <span className="inline-flex items-center gap-1">NIIT <InfoTooltip text="Net Investment Income Tax — a 3.8% surtax on investment income above $200K (single) or $250K (married)." /></span>
                      </th>
                      <th className="h-12 px-4 text-right align-middle font-semibold sticky top-0 z-30 bg-background border-b">
                        <span className="inline-flex items-center gap-1">AMT <InfoTooltip text="Alternative Minimum Tax — ensures high-income taxpayers pay a minimum amount of tax regardless of deductions." /></span>
                      </th>
                    </>
                  )}
                  {show("healthcare") && (
                    <>
                      <th className="h-12 px-4 text-right align-middle font-semibold sticky top-0 z-30 bg-background border-b">
                        <span className="inline-flex items-center gap-1">IRMAA <InfoTooltip text="Income-Related Monthly Adjustment Amount — a surcharge on Medicare premiums for higher-income retirees (based on income from 2 years prior)." /></span>
                      </th>
                      <th className="h-12 px-4 text-right align-middle font-semibold sticky top-0 z-30 bg-background border-b">Medicare B & D</th>
                      <th className="h-12 px-4 text-right align-middle font-semibold sticky top-0 z-30 bg-background border-b">ACA Subsidy</th>
                      <th className="h-12 px-4 text-right align-middle font-semibold sticky top-0 z-30 bg-background border-b">Healthcare Cost</th>
                    </>
                  )}
                  {show("lifeEvents") && (
                    <>
                      <th className="h-12 px-4 text-right align-middle font-semibold sticky top-0 z-30 bg-background border-b">Life Event Expense</th>
                      <th className="h-12 px-4 text-right align-middle font-semibold sticky top-0 z-30 bg-background border-b">Life Event Income</th>
                    </>
                  )}
                  <th className="h-12 px-4 text-right align-middle font-semibold sticky top-0 z-30 bg-background border-b">Total Taxes</th>
                  <th className="h-12 px-4 text-right align-middle font-semibold sticky top-0 z-30 bg-background border-b">Take Home</th>
                </tr>
              </thead>
              <tbody>
              {projections.length === 0 ? (
                <tr className="border-b transition-colors hover:bg-muted/50">
                  <td colSpan={30} className="p-4 align-middle text-center text-muted-foreground">
                    Enter your account information to see projections
                  </td>
                </tr>
              ) : (
                projections.map((projection, index) => {
                  const tradDepleted = projection.traditionalBalance < 1000 && index > 0 && projections[index - 1].traditionalBalance >= 1000;
                  const taxableDepleted = projection.taxableBalance < 1000 && index > 0 && projections[index - 1].taxableBalance >= 1000;
                  const rothUsageStart = index > 0 && projection.rothBalance < projections[0].rothBalance - 1000 && projections[index - 1].rothBalance >= projections[0].rothBalance - 1000;
                  const rothDepleted = projection.rothBalance < 1000 && index > 0 && projections[index - 1].rothBalance >= 1000;
                  const isKeyTransition = tradDepleted || taxableDepleted || rothUsageStart || rothDepleted;

                  return (
                    <tr 
                      key={projection.year} 
                      className={cn("border-b transition-colors hover:bg-muted/50", isKeyTransition && "bg-accent/50")}
                    >
                    <td className="p-4 align-middle font-medium sticky left-0 z-10 bg-background">{projection.year}</td>
                    <td className="p-4 align-middle">{projection.age}</td>
                    {show("balances") && (
                      <>
                        <td className="p-4 align-middle text-right">
                          {formatCurrency(projection.traditionalBalance)}
                        </td>
                        <td className="p-4 align-middle text-right">
                          {formatCurrency(projection.rothBalance)}
                          {rothDepleted && (
                            <Badge variant="destructive" className="ml-2 text-xs">
                              Depleted
                            </Badge>
                          )}
                        </td>
                        <td className="p-4 align-middle text-right">
                          {formatCurrency(projection.taxableBalance)}
                        </td>
                        <td className="p-4 align-middle text-right font-medium">
                          {formatCurrency(projection.withdrawals)}
                        </td>
                      </>
                    )}
                    {show("income") && (
                      <>
                        <td className="p-4 align-middle text-right">
                          {formatCurrency(projection.ssIncome)}
                        </td>
                        <td className="p-4 align-middle text-right">
                          {projection.employmentIncome && projection.employmentIncome > 0 ? (
                            <span className="text-green-600 dark:text-green-400">
                              {formatCurrency(projection.employmentIncome)}
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="p-4 align-middle text-right">
                          {projection.pensionIncome && projection.pensionIncome > 0 ? (
                            <span className="text-blue-600 dark:text-blue-400 font-medium">
                              {formatCurrency(projection.pensionIncome)}
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="p-4 align-middle text-right">
                          {projection.excessSavings && projection.excessSavings > 0 ? (
                            <span className="text-green-600 dark:text-green-400 font-medium">
                              +{formatCurrency(projection.excessSavings)}
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="p-4 align-middle text-right">
                          {projection.rmd > 0 ? (
                            <span className="text-orange-600 dark:text-orange-400 font-medium">
                              {formatCurrency(projection.rmd)}
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="p-4 align-middle text-right">
                          {projection.rothConversion && projection.rothConversion > 0 ? (
                            <span className="text-primary font-medium">
                              {formatCurrency(projection.rothConversion)}
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="p-4 align-middle text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className="font-medium">
                              {projection.marginalBracket ? 
                                `${(projection.marginalBracket * 100).toFixed(0)}%` : 
                                '0%'
                              }
                            </span>
                            {projection.rothConversion && projection.rothConversion > 10000 && (
                              <div title="Targeted conversion">
                                <Target className="h-3 w-3 text-primary" />
                              </div>
                            )}
                          </div>
                        </td>
                      </>
                    )}
                    {show("taxes") && (
                      <>
                        <td className="p-4 align-middle text-right">
                          {projection.payrollTax && projection.payrollTax > 0 ? (
                            <span className="text-destructive">
                              {formatCurrency(projection.payrollTax)}
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="p-4 align-middle text-right text-destructive">
                          {formatCurrency(projection.federalTax)}
                        </td>
                        <td className="p-4 align-middle text-right text-destructive">
                          {formatCurrency(projection.federalCapitalGainsTax)}
                        </td>
                        <td className="p-4 align-middle text-right text-destructive">
                          {formatCurrency(projection.stateTax)}
                        </td>
                        <td className="p-4 align-middle text-right text-destructive">
                          {formatCurrency(projection.stateCapitalGainsTax)}
                        </td>
                        <td className="p-4 align-middle text-right text-destructive">
                          {formatCurrency(projection.niit)}
                        </td>
                        <td className="p-4 align-middle text-right text-destructive">
                          {formatCurrency(projection.amt)}
                        </td>
                      </>
                    )}
                    {show("healthcare") && (
                      <>
                        <td className="p-4 align-middle text-right">
                          {hasIRMAAWarning(projection.irmaa) ? (
                            <span className="flex items-center justify-end gap-1 text-warning">
                              <AlertTriangle className="h-3 w-3" />
                              {formatCurrency(projection.irmaa)}
                            </span>
                          ) : (
                            formatCurrency(projection.irmaa)
                          )}
                        </td>
                        <td className="p-4 align-middle text-right">
                          {projection.medicarePremiums && projection.medicarePremiums > 0 ? (
                            formatCurrency(projection.medicarePremiums)
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="p-4 align-middle text-right">
                          {projection.acaSubsidy && projection.acaSubsidy > 0 ? (
                            <span className="text-green-600 dark:text-green-400 font-medium">
                              {formatCurrency(projection.acaSubsidy)}
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="p-4 align-middle text-right font-medium">
                          {projection.healthcareCost && projection.healthcareCost > 0 ? (
                            formatCurrency(projection.healthcareCost)
                          ) : (
                            '-'
                          )}
                        </td>
                      </>
                    )}
                    {show("lifeEvents") && (
                      <>
                        <td className="p-4 align-middle text-right">
                          {(projection as any).lifeEventExpense && (projection as any).lifeEventExpense > 0 ? (
                            <span className="text-destructive font-medium">
                              -{formatCurrency((projection as any).lifeEventExpense)}
                            </span>
                          ) : '-'}
                        </td>
                        <td className="p-4 align-middle text-right">
                          {(projection as any).lifeEventIncome && (projection as any).lifeEventIncome > 0 ? (
                            <span className="text-primary font-medium">
                              +{formatCurrency((projection as any).lifeEventIncome)}
                            </span>
                          ) : '-'}
                        </td>
                      </>
                    )}
                    <td className="p-4 align-middle text-right font-bold text-destructive">
                      {formatCurrency(projection.totalTaxes)}
                    </td>
                    <td className="p-4 align-middle text-right font-semibold text-primary">
                      {formatCurrency(projection.takeHome)}
                    </td>
                  </tr>
                  );
                })
              )}
              </tbody>
            </table>
            </div>
            {/* Vertical scrollbar */}
            <div className="flex-shrink-0 py-1 pr-1">
              <CustomScrollbar scrollRef={tableScrollRef} orientation="vertical" />
            </div>
          </div>
        </div>
        
        {projections.some(p => hasIRMAAWarning(p.irmaa)) && (
          <Alert className="mt-4 border-warning/50 bg-warning/10">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <AlertDescription className="text-foreground font-medium">
              IRMAA surcharges detected in some years. Consider adjusting withdrawal strategies to reduce MAGI and minimize Medicare premium increases.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

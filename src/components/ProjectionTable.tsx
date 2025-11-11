import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Target } from "lucide-react";

interface YearProjection {
  year: number;
  age: number;
  traditionalBalance: number;
  rothBalance: number;
  taxableBalance: number;
  ssIncome: number;
  withdrawals: number;
  federalTax: number;
  federalCapitalGainsTax: number;
  stateTax: number;
  stateCapitalGainsTax: number;
  irmaa: number;
  rmd: number;
  totalIncome: number;
  rothConversion?: number;
  marginalBracket?: number;
}

interface ProjectionTableProps {
  projections: YearProjection[];
}

export function ProjectionTable({ projections }: ProjectionTableProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const hasIRMAAWarning = (irmaa: number) => irmaa > 0;
  const hasRMD = (rmd: number) => rmd > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Year-by-Year Projections</CardTitle>
        <CardDescription>
          Detailed breakdown of income, taxes, and account balances over time
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-semibold">Year</TableHead>
                <TableHead className="font-semibold">Age</TableHead>
                <TableHead className="font-semibold text-right">Traditional</TableHead>
                <TableHead className="font-semibold text-right">Roth</TableHead>
                <TableHead className="font-semibold text-right">Brokerage</TableHead>
                <TableHead className="font-semibold text-right">SS Income</TableHead>
                <TableHead className="font-semibold text-right">Withdrawals</TableHead>
                <TableHead className="font-semibold text-right">Conversion</TableHead>
                <TableHead className="font-semibold text-right">Tax Bracket</TableHead>
                <TableHead className="font-semibold text-right">Fed Tax</TableHead>
                <TableHead className="font-semibold text-right">Fed CG Tax</TableHead>
                <TableHead className="font-semibold text-right">State Tax</TableHead>
                <TableHead className="font-semibold text-right">State CG Tax</TableHead>
                <TableHead className="font-semibold text-right">IRMAA</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projections.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={14} className="text-center text-muted-foreground">
                    Enter your account information to see projections
                  </TableCell>
                </TableRow>
              ) : (
                projections.map((projection, index) => {
                  const hasIRMAAWarning = (irmaaAmount: number) => irmaaAmount > 0;
                  const tradDepleted = projection.traditionalBalance < 1000 && index > 0 && projections[index - 1].traditionalBalance >= 1000;
                  const taxableDepleted = projection.taxableBalance < 1000 && index > 0 && projections[index - 1].taxableBalance >= 1000;
                  const rothUsageStart = index > 0 && projection.rothBalance < projections[0].rothBalance - 1000 && projections[index - 1].rothBalance >= projections[0].rothBalance - 1000;
                  const isKeyTransition = tradDepleted || taxableDepleted || rothUsageStart;

                  return (
                    <TableRow 
                      key={projection.year} 
                      className={isKeyTransition ? "bg-accent/50" : ""}
                    >
                    <TableCell className="font-medium">{projection.year}</TableCell>
                    <TableCell>{projection.age}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(projection.traditionalBalance)}
                      {hasRMD(projection.rmd) && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          RMD
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(projection.rothBalance)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(projection.taxableBalance)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(projection.ssIncome)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(projection.withdrawals)}
                    </TableCell>
                    <TableCell className="text-right">
                      {projection.rothConversion && projection.rothConversion > 0 ? (
                        <span className="text-primary font-medium">
                          {formatCurrency(projection.rothConversion)}
                        </span>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell className="text-right">
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
                    </TableCell>
                    <TableCell className="text-right text-destructive">
                      {formatCurrency(projection.federalTax)}
                    </TableCell>
                    <TableCell className="text-right text-destructive">
                      {formatCurrency(projection.federalCapitalGainsTax)}
                    </TableCell>
                    <TableCell className="text-right text-destructive">
                      {formatCurrency(projection.stateTax)}
                    </TableCell>
                    <TableCell className="text-right text-destructive">
                      {formatCurrency(projection.stateCapitalGainsTax)}
                    </TableCell>
                    <TableCell className="text-right">
                      {hasIRMAAWarning(projection.irmaa) ? (
                        <span className="flex items-center justify-end gap-1 text-warning">
                          <AlertTriangle className="h-3 w-3" />
                          {formatCurrency(projection.irmaa)}
                        </span>
                      ) : (
                        formatCurrency(projection.irmaa)
                      )}
                    </TableCell>
                  </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
        
        {projections.some(p => hasIRMAAWarning(p.irmaa)) && (
          <Alert className="mt-4 border-warning/50 bg-warning/10">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <AlertDescription className="text-warning-foreground">
              IRMAA surcharges detected in some years. Consider adjusting withdrawal strategies to reduce MAGI and minimize Medicare premium increases.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

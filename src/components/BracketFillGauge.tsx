import { memo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, TrendingUp, DollarSign } from "lucide-react";
import { getBracketRoom, type BracketRoomInfo } from "@/lib/incomeAlerts";
import { formatCurrency } from "@/lib/utils";

interface BracketFillGaugeProps {
  grossIncome: number;
  filingStatus: string;
  yearIndex?: number;
  inflationRate?: number;
  projectedFutureBracket?: number;
}

export function BracketFillGauge({
  grossIncome,
  filingStatus,
  yearIndex = 0,
  inflationRate = 0,
  projectedFutureBracket = 24,
}: BracketFillGaugeProps) {
  const bracketInfo = getBracketRoom(grossIncome, filingStatus, yearIndex, inflationRate);
  
  // Calculate potential tax savings from filling the bracket
  const conversionTaxCost = bracketInfo.recommendedConversion * (bracketInfo.currentBracket / 100);
  const futureTaxSavings = bracketInfo.recommendedConversion * (projectedFutureBracket / 100);
  const netSavings = futureTaxSavings - conversionTaxCost;

  const getBracketColor = (rate: number) => {
    if (rate <= 12) return 'bg-success';
    if (rate <= 22) return 'bg-warning';
    if (rate <= 24) return 'bg-orange-500';
    return 'bg-destructive';
  };

  const getProgressColor = (rate: number) => {
    if (rate <= 12) return 'bg-success';
    if (rate <= 22) return 'bg-warning';
    if (rate <= 24) return 'bg-orange-500';
    return 'bg-destructive';
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Tax Bracket Fill Gauge
            </CardTitle>
            <CardDescription>
              Taxable income (including Roth conversions) vs. bracket threshold
            </CardDescription>
          </div>
          <Badge 
            variant="outline" 
            className={`text-lg px-3 py-1 ${getBracketColor(bracketInfo.currentBracket)} text-white border-0`}
          >
            {bracketInfo.currentBracket}%
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Taxable Income</span>
            <span className="font-medium">{formatCurrency(bracketInfo.taxableIncome)}</span>
          </div>
          <div className="relative">
            <Progress 
              value={bracketInfo.percentFilled} 
              className="h-4"
            />
            <div 
              className={`absolute inset-0 h-4 rounded-full ${getProgressColor(bracketInfo.currentBracket)}`}
              style={{ width: `${Math.min(100, bracketInfo.percentFilled)}%` }}
            />
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {Math.round(bracketInfo.percentFilled)}% filled
            </span>
            <span className="text-muted-foreground">
              Top: {formatCurrency(bracketInfo.currentBracketTop)}
            </span>
          </div>
        </div>

        {/* Room Remaining */}
        {bracketInfo.roomInBracket > 0 && (
          <div className="rounded-lg bg-muted/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-success" />
                <span className="font-medium">Room Remaining</span>
              </div>
              <span className="text-xl font-bold text-success">
                {formatCurrency(bracketInfo.roomInBracket)}
              </span>
            </div>
            
            <div className="text-sm text-muted-foreground">
              Convert up to {formatCurrency(bracketInfo.roomInBracket)} from Traditional to Roth 
              while staying in the {bracketInfo.currentBracket}% bracket.
            </div>

            {/* Tax Impact Projection */}
            {netSavings > 0 && (
              <div className="pt-2 border-t border-border">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">If you convert {formatCurrency(bracketInfo.recommendedConversion)}:</span>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded bg-background p-2">
                    <div className="text-xs text-muted-foreground">Tax Now</div>
                    <div className="font-medium text-destructive">
                      {formatCurrency(conversionTaxCost)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      @ {bracketInfo.currentBracket}%
                    </div>
                  </div>
                  <div className="flex items-center justify-center">
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="rounded bg-background p-2">
                    <div className="text-xs text-muted-foreground">Future Savings</div>
                    <div className="font-medium text-success">
                      {formatCurrency(futureTaxSavings)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      @ {projectedFutureBracket}%
                    </div>
                  </div>
                </div>
                <div className="mt-2 text-center">
                  <span className="text-sm text-muted-foreground">Net Benefit: </span>
                  <span className="font-bold text-success">{formatCurrency(netSavings)}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* At bracket limit */}
        {bracketInfo.roomInBracket <= 0 && (
          <div className="rounded-lg bg-warning/10 p-4 text-center">
            <p className="text-sm text-warning-foreground">
              ⚠️ You're at the top of the {bracketInfo.currentBracket}% bracket. 
              Additional income will be taxed at {bracketInfo.nextBracketRate}%.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

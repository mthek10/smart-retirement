import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { TrendingUp, AlertTriangle, DollarSign, Calendar, Lightbulb } from "lucide-react";

interface ProjectionSummaryProps {
  projections: Array<{
    age: number;
    traditionalBalance: number;
    rothBalance: number;
    taxableBalance: number;
    totalTaxes: number;
    takeHome: number;
    rothConversion?: number;
    ssIncome: number;
  }>;
  tradDepletionAge: number | null;
  taxableDepletionAge: number | null;
  rothDepletionAge: number | null;
  lifetimeTotalTaxes: number;
  finalAge: number;
  finalTraditionalBalance: number;
  finalRothBalance: number;
  finalTaxableBalance: number;
  spouse1Age?: number;
}

export function ProjectionSummary({
  projections,
  tradDepletionAge,
  taxableDepletionAge,
  rothDepletionAge,
  lifetimeTotalTaxes,
  finalAge,
  finalTraditionalBalance,
  finalRothBalance,
  finalTaxableBalance,
  spouse1Age,
}: ProjectionSummaryProps) {
  if (projections.length === 0) return null;

  const finalTotal = finalTraditionalBalance + finalRothBalance + finalTaxableBalance;
  const avgAnnualTaxes = lifetimeTotalTaxes / projections.length;

  // Find first year of SS income
  const ssStartProjection = projections.find(p => p.ssIncome > 0);

  // Total Roth conversions
  const totalRothConversions = projections.reduce((sum, p) => sum + (p.rothConversion || 0), 0);

  const insights: Array<{ icon: React.ElementType; text: string; color: string }> = [];

  // Portfolio longevity
  const anyDepleted = tradDepletionAge || taxableDepletionAge || rothDepletionAge;
  if (!anyDepleted) {
    insights.push({
      icon: TrendingUp,
      text: `Your portfolio lasts through age ${finalAge} with a final balance of ${formatCurrency(finalTotal)}.`,
      color: "text-green-600 dark:text-green-400",
    });
  } else {
    insights.push({
      icon: Calendar,
      text: `Portfolio sustains through age ${finalAge} with ${formatCurrency(finalTotal)} remaining.`,
      color: "text-primary",
    });
  }

  // Depletion milestones
  if (tradDepletionAge) {
    insights.push({
      icon: AlertTriangle,
      text: `Traditional IRA is depleted at age ${tradDepletionAge}, shifting withdrawals to other accounts.`,
      color: "text-amber-600 dark:text-amber-400",
    });
  }

  if (taxableDepletionAge) {
    insights.push({
      icon: AlertTriangle,
      text: `Brokerage account is depleted at age ${taxableDepletionAge}.`,
      color: "text-amber-600 dark:text-amber-400",
    });
  }

  // Lifetime taxes
  insights.push({
    icon: DollarSign,
    text: `You'll pay ${formatCurrency(lifetimeTotalTaxes)} in total lifetime taxes, averaging ${formatCurrency(avgAnnualTaxes)}/year.`,
    color: "text-muted-foreground",
  });

  // Roth conversions
  if (totalRothConversions > 0) {
    insights.push({
      icon: TrendingUp,
      text: `Total Roth conversions of ${formatCurrency(totalRothConversions)} shift tax-deferred assets into tax-free growth.`,
      color: "text-primary",
    });
  }

  // Pre-RMD optimization window
  if (spouse1Age && spouse1Age < 73 && finalTraditionalBalance > 1000) {
    const yearsUntilRMD = 73 - spouse1Age;
    if (yearsUntilRMD > 0 && yearsUntilRMD <= 15) {
      insights.push({
        icon: Lightbulb,
        text: `You have ${yearsUntilRMD} years before RMDs begin at age 73. Consider accelerating Roth conversions now at potentially lower tax rates to reduce future Required Minimum Distributions.`,
        color: "text-primary",
      });
    }
  }

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="pt-5 pb-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">Key Takeaways</h3>
        <ul className="space-y-2">
          {insights.slice(0, 5).map((insight, i) => {
            const Icon = insight.icon;
            return (
              <li key={i} className="flex items-start gap-2 text-sm">
                <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${insight.color}`} />
                <span className="text-foreground/90">{insight.text}</span>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

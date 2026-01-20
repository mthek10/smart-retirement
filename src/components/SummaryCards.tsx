import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingDown, Landmark, Activity, Target, AlertTriangle, CheckCircle2, Shield } from "lucide-react";
import type { BracketAnalysis } from "@/lib/taxCalculations";
import { formatCurrency } from "@/lib/utils";

interface SurvivorAnalysis {
  peakBracket: number;
  yearsInHighBracket: number;
  bracketRange: { min: number; max: number };
  potentialSavings: number;
}

interface SummaryCardsProps {
  totalPortfolio: number;
  lifetimeTotalTaxes: number;
  totalFederalTax: number;
  totalFederalCGTax: number;
  totalStateTax: number;
  totalStateCGTax: number;
  totalMedicareCosts: number;
  totalACASubsidy?: number;
  totalACAPremium?: number;
  totalNIIT: number;
  totalAMT: number;
  totalPayrollTax: number;
  totalEmploymentIncome?: number;
  total401kContributions?: number;
  avgWithdrawal: number;
  tradDepletionAge?: number | null;
  taxableDepletionAge?: number | null;
  rothUsageAge?: number | null;
  rothDepletionAge?: number | null;
  bracketConsistency?: BracketAnalysis | null;
  survivorAnalysis?: SurvivorAnalysis | null;
  finalTraditionalBalance?: number;
  finalRothBalance?: number;
  finalTaxableBalance?: number;
  finalAge?: number;
}

export function SummaryCards({ 
  totalPortfolio, 
  lifetimeTotalTaxes,
  totalFederalTax,
  totalFederalCGTax,
  totalStateTax,
  totalStateCGTax,
  totalMedicareCosts, 
  totalACASubsidy,
  totalACAPremium,
  totalNIIT,
  totalAMT,
  totalPayrollTax,
  totalEmploymentIncome,
  total401kContributions,
  avgWithdrawal,
  tradDepletionAge,
  taxableDepletionAge,
  rothUsageAge,
  rothDepletionAge,
  bracketConsistency,
  survivorAnalysis,
  finalTraditionalBalance = 0,
  finalRothBalance = 0,
  finalTaxableBalance = 0,
  finalAge = 100
}: SummaryCardsProps) {

  const baseCards = [
    {
      title: "Total Portfolio",
      value: totalPortfolio,
      icon: Landmark,
      color: "text-primary",
      isAge: false,
      subtitle: undefined,
    },
    {
      title: "Avg Annual Withdrawal",
      value: avgWithdrawal,
      icon: Activity,
      color: "text-secondary",
      isAge: false,
      subtitle: undefined,
    },
    ...(totalEmploymentIncome && totalEmploymentIncome > 0 ? [{
      title: "Total Employment Income",
      value: totalEmploymentIncome,
      icon: DollarSign,
      color: "text-green-600",
      isAge: false,
      subtitle: undefined,
    }] : []),
    ...(total401kContributions && total401kContributions > 0 ? [{
      title: "Total 401(k) Contributions",
      value: total401kContributions,
      icon: Landmark,
      color: "text-primary",
      isAge: false,
      subtitle: undefined,
    }] : []),
  ];

  const taxCards = [
    {
      title: "Lifetime Total Taxes",
      value: lifetimeTotalTaxes,
      icon: TrendingDown,
      color: "text-destructive",
      isAge: false,
      subtitle: "All taxes combined",
    },
    {
      title: "Federal Income Tax",
      value: totalFederalTax,
      icon: TrendingDown,
      color: "text-destructive",
      isAge: false,
      subtitle: undefined,
    },
    {
      title: "Federal Cap Gains Tax",
      value: totalFederalCGTax,
      icon: TrendingDown,
      color: "text-destructive",
      isAge: false,
      subtitle: undefined,
    },
    {
      title: "State Income Tax",
      value: totalStateTax,
      icon: TrendingDown,
      color: "text-destructive",
      isAge: false,
      subtitle: undefined,
    },
    {
      title: "State Cap Gains Tax",
      value: totalStateCGTax,
      icon: TrendingDown,
      color: "text-destructive",
      isAge: false,
      subtitle: undefined,
    },
    ...(totalPayrollTax > 0 ? [{
      title: "Payroll Tax",
      value: totalPayrollTax,
      icon: TrendingDown,
      color: "text-destructive",
      isAge: false,
      subtitle: undefined,
    }] : []),
    {
      title: "Total Medicare Costs",
      value: totalMedicareCosts,
      icon: DollarSign,
      color: "text-warning",
      isAge: false,
      subtitle: "Part B, D & IRMAA",
    },
    ...(totalACASubsidy && totalACASubsidy > 0 ? [{
      title: "Total ACA Subsidy",
      value: totalACASubsidy,
      icon: DollarSign,
      color: "text-green-600",
      isAge: false,
      subtitle: "Pre-Medicare premium credits",
    }] : []),
    ...(totalACAPremium && totalACAPremium > 0 ? [{
      title: "Total Healthcare (Pre-65)",
      value: totalACAPremium - (totalACASubsidy || 0),
      icon: DollarSign,
      color: "text-warning",
      isAge: false,
      subtitle: "ACA net cost (premium - subsidy)",
    }] : []),
    {
      title: "NIIT",
      value: totalNIIT,
      icon: TrendingDown,
      color: "text-destructive",
      isAge: false,
      subtitle: undefined,
    },
    {
      title: "AMT",
      value: totalAMT,
      icon: TrendingDown,
      color: "text-destructive",
      isAge: false,
      subtitle: undefined,
    },
  ];

  // Bracket consistency card
  const bracketCard = bracketConsistency ? {
    title: "Bracket Consistency",
    value: bracketConsistency.score,
    subtitle: `Avg ${(bracketConsistency.avgBracket * 100).toFixed(0)}% bracket • ${bracketConsistency.yearsInTarget} years consistent`,
    icon: bracketConsistency.score < 4 ? CheckCircle2 : bracketConsistency.score < 6 ? Target : AlertTriangle,
    color: bracketConsistency.score < 3 ? "text-green-600" : bracketConsistency.score < 6 ? "text-yellow-600" : "text-destructive",
    isScore: true,
    isAge: false,
  } : null;

  const optimizationCards = bracketConsistency ? [
    ...(bracketCard ? [bracketCard] : []),
    ...(bracketConsistency.potentialSavings > 0 ? [{
      title: "Potential Tax Savings",
      value: bracketConsistency.potentialSavings,
      subtitle: "Via bracket optimization",
      icon: TrendingDown,
      color: "text-green-600",
      isAge: false,
      isScore: false,
    }] : []),
    {
      title: "Traditional Depleted",
      value: tradDepletionAge || 0,
      subtitle: tradDepletionAge 
        ? `Age ${tradDepletionAge}` 
        : `Not depleted at age ${finalAge}: ${formatCurrency(finalTraditionalBalance)}`,
      icon: TrendingDown,
      color: "text-muted-foreground",
      isAge: true,
      isScore: false,
    },
    {
      title: "Brokerage Fully Depleted",
      value: taxableDepletionAge || 0,
      subtitle: taxableDepletionAge 
        ? `Age ${taxableDepletionAge}` 
        : `Not depleted at age ${finalAge}: ${formatCurrency(finalTaxableBalance)}`,
      icon: Landmark,
      color: "text-success",
      isAge: true,
      isScore: false,
    },
    {
      title: "Roth Fully Depleted",
      value: rothDepletionAge || 0,
      subtitle: rothDepletionAge 
        ? `Age ${rothDepletionAge}` 
        : `Not depleted at age ${finalAge}: ${formatCurrency(finalRothBalance)}`,
      icon: DollarSign,
      color: "text-warning",
      isAge: true,
      isScore: false,
    },
  ] : [];

  // Survivor smoothing card
  const survivorCard = survivorAnalysis ? {
    title: "Survivor Tax Impact",
    value: survivorAnalysis.peakBracket * 100,
    subtitle: `Peak ${(survivorAnalysis.peakBracket * 100).toFixed(0)}% • ${survivorAnalysis.yearsInHighBracket} years at 32%+${survivorAnalysis.potentialSavings > 0 ? ` • Save ${formatCurrency(survivorAnalysis.potentialSavings)}` : ''}`,
    icon: survivorAnalysis.yearsInHighBracket === 0 ? Shield : AlertTriangle,
    color: survivorAnalysis.yearsInHighBracket === 0 ? "text-green-600" : survivorAnalysis.yearsInHighBracket <= 3 ? "text-yellow-600" : "text-destructive",
    isScore: false,
    isAge: false,
    isPercent: true,
  } : null;

  const cards = [...baseCards, ...taxCards, ...optimizationCards, ...(survivorCard ? [survivorCard] : [])];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {card.title}
              </CardTitle>
              <Icon className={`h-4 w-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${card.color}`}>
                {'isScore' in card && card.isScore ? (
                  `${card.value.toFixed(1)} / 10`
                ) : 'isPercent' in card && card.isPercent ? (
                  `${card.value.toFixed(0)}%`
                ) : card.isAge ? (
                  card.value > 0 ? `Age ${card.value}` : "N/A"
                ) : (
                  formatCurrency(card.value)
                )}
              </div>
              {card.subtitle && (
                <p className="text-xs text-muted-foreground mt-1">
                  {card.subtitle}
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

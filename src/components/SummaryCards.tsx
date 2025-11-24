import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingDown, Landmark, Activity } from "lucide-react";

interface SummaryCardsProps {
  totalPortfolio: number;
  lifetimeTotalTaxes: number;
  totalFederalTax: number;
  totalFederalCGTax: number;
  totalStateTax: number;
  totalStateCGTax: number;
  totalMedicareCosts: number;
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
  bracketConsistency?: any;
}

export function SummaryCards({ 
  totalPortfolio, 
  lifetimeTotalTaxes,
  totalFederalTax,
  totalFederalCGTax,
  totalStateTax,
  totalStateCGTax,
  totalMedicareCosts, 
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
  bracketConsistency
}: SummaryCardsProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

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

  const optimizationCards = bracketConsistency ? [
    {
      title: "Traditional Depleted",
      value: tradDepletionAge || 0,
      subtitle: tradDepletionAge ? `Age ${tradDepletionAge}` : "Not depleted",
      icon: TrendingDown,
      color: "text-muted-foreground",
      isAge: true,
    },
    {
      title: "Brokerage Fully Depleted",
      value: taxableDepletionAge || 0,
      subtitle: taxableDepletionAge ? `Age ${taxableDepletionAge}` : "Not depleted",
      icon: Landmark,
      color: "text-success",
      isAge: true,
    },
    {
      title: "Roth Fully Depleted",
      value: rothDepletionAge || 0,
      subtitle: rothDepletionAge ? `Age ${rothDepletionAge}` : "Not depleted",
      icon: DollarSign,
      color: "text-warning",
      isAge: true,
    },
  ] : [];

  const cards = [...baseCards, ...taxCards, ...optimizationCards];

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
                {card.isAge ? (
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

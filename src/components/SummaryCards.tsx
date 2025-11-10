import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingDown, Landmark, Activity } from "lucide-react";

interface SummaryCardsProps {
  totalPortfolio: number;
  totalTaxes: number;
  totalIRMAA: number;
  avgWithdrawal: number;
  tradDepletionAge?: number | null;
  taxableDepletionAge?: number | null;
  rothUsageAge?: number | null;
  rothDepletionAge?: number | null;
  bracketConsistency?: any;
}

export function SummaryCards({ 
  totalPortfolio, 
  totalTaxes, 
  totalIRMAA, 
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
    {
      title: "Total Taxes (Lifetime)",
      value: totalTaxes,
      icon: TrendingDown,
      color: "text-destructive",
      isAge: false,
      subtitle: undefined,
    },
    {
      title: "Total IRMAA (Lifetime)",
      value: totalIRMAA,
      icon: DollarSign,
      color: "text-warning",
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
      title: "Roth Usage Begins",
      value: rothUsageAge || 0,
      subtitle: rothUsageAge ? `Age ${rothUsageAge}` : "Not used",
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

  const cards = [...baseCards, ...optimizationCards];

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

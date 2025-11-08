import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingDown, Landmark, Activity } from "lucide-react";

interface SummaryCardsProps {
  totalPortfolio: number;
  totalTaxes: number;
  totalIRMAA: number;
  avgWithdrawal: number;
}

export function SummaryCards({ totalPortfolio, totalTaxes, totalIRMAA, avgWithdrawal }: SummaryCardsProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const cards = [
    {
      title: "Total Portfolio",
      value: totalPortfolio,
      icon: Landmark,
      color: "text-primary",
    },
    {
      title: "Avg Annual Withdrawal",
      value: avgWithdrawal,
      icon: Activity,
      color: "text-secondary",
    },
    {
      title: "Total Taxes (Lifetime)",
      value: totalTaxes,
      icon: TrendingDown,
      color: "text-destructive",
    },
    {
      title: "Total IRMAA (Lifetime)",
      value: totalIRMAA,
      icon: DollarSign,
      color: "text-warning",
    },
  ];

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
                {formatCurrency(card.value)}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

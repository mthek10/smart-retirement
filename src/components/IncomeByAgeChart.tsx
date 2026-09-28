import { memo, useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ProjectionRow } from "@/hooks/useProjections";
import { formatCurrency } from "@/lib/utils";

interface IncomeByAgeChartProps {
  projections: ProjectionRow[];
}

const INCOME_SERIES = [
  { key: "Traditional", color: "hsl(var(--chart-1))" },
  { key: "Roth", color: "hsl(var(--chart-2))" },
  { key: "Brokerage", color: "hsl(var(--chart-3))" },
  { key: "Social Security", color: "hsl(var(--chart-4))" },
  { key: "Pension", color: "hsl(var(--chart-5))" },
  { key: "Employment", color: "hsl(var(--foreground))" },
] as const;

type IncomeSeriesKey = (typeof INCOME_SERIES)[number]["key"];
type IncomeChartRow = { age: number } & Record<IncomeSeriesKey, number>;

const formatCompactCurrency = (value: number) => {
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(0)}k`;
  return `$${Math.round(value)}`;
};

interface TooltipPayloadItem {
  dataKey?: IncomeSeriesKey;
  value?: number;
  color?: string;
}

function IncomeTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: number;
}) {
  const activeItems = payload?.filter((item) => (item.value ?? 0) > 0) ?? [];
  if (!active || activeItems.length === 0) return null;

  const total = activeItems.reduce((sum, item) => sum + (item.value ?? 0), 0);

  return (
    <div className="rounded-md border bg-card p-3 text-xs text-foreground shadow-sm">
      <p className="mb-2 font-semibold">Age {label}</p>
      <div className="space-y-1.5">
        {activeItems.map((item) => (
          <div key={item.dataKey} className="flex min-w-52 items-center justify-between gap-6">
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
              {item.dataKey}
            </span>
            <span className="font-medium">{formatCurrency(item.value ?? 0)}</span>
          </div>
        ))}
        <div className="flex items-center justify-between gap-6 border-t pt-1.5 font-semibold">
          <span>Total annual income</span>
          <span>{formatCurrency(total)}</span>
        </div>
      </div>
    </div>
  );
}

export const IncomeByAgeChart = memo(function IncomeByAgeChart({ projections }: IncomeByAgeChartProps) {
  const chartData = useMemo<IncomeChartRow[]>(() => projections.map((projection) => ({
    age: projection.age,
    Traditional: projection.traditionalWithdrawal,
    Roth: projection.rothWithdrawal,
    Brokerage: projection.taxableWithdrawal,
    "Social Security": projection.ssIncome,
    Pension: projection.pensionIncome,
    Employment: projection.netWages,
  })), [projections]);

  const activeSeries = useMemo(() => INCOME_SERIES.filter((series) =>
    chartData.some((row) => row[series.key] > 0)
  ), [chartData]);

  if (chartData.length === 0 || activeSeries.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Annual Income Sources by Age</CardTitle>
        <CardDescription>
          Annual spendable income split across account withdrawals, benefits, pensions, and net employment income
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={420}>
          <BarChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid vertical={false} stroke="hsl(var(--foreground))" strokeOpacity={0.1} />
            <XAxis
              dataKey="age"
              tick={{ fill: "hsl(var(--foreground))", fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              label={{ value: "Age", position: "insideBottom", offset: -2, style: { fill: "hsl(var(--foreground))", fontSize: 12 } }}
            />
            <YAxis
              tick={{ fill: "hsl(var(--foreground))", fontSize: 12 }}
              tickFormatter={formatCompactCurrency}
              tickLine={false}
              axisLine={false}
              width={68}
              label={{ value: "Annual Income", angle: -90, position: "insideLeft", style: { fill: "hsl(var(--foreground))", fontSize: 12 } }}
            />
            <Tooltip content={<IncomeTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
            {activeSeries.map((series, index) => (
              <Bar
                key={series.key}
                dataKey={series.key}
                stackId="income"
                fill={series.color}
                radius={index === activeSeries.length - 1 ? [4, 4, 0, 0] : undefined}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
});
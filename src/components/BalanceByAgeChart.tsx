import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { formatCurrency } from "@/lib/utils";

interface BalanceByAgeChartProps {
  projections: Array<{
    age: number;
    traditionalBalance: number;
    rothBalance: number;
    taxableBalance: number;
  }>;
}

export function BalanceByAgeChart({ projections }: BalanceByAgeChartProps) {
  const chartData = useMemo(() => {
    return projections.map(p => ({
      age: p.age,
      "Traditional 401(k)": p.traditionalBalance,
      "Roth IRA": p.rothBalance,
      "Brokerage": p.taxableBalance,
      Total: p.traditionalBalance + p.rothBalance + p.taxableBalance,
    }));
  }, [projections]);

  if (chartData.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account Balances by Age</CardTitle>
        <CardDescription>
          How your Traditional 401(k), Roth IRA, and Brokerage balances evolve over time
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="age"
              tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
              label={{ value: 'Age', position: 'insideBottom', offset: -2, style: { fill: 'hsl(var(--foreground))' } }}
            />
            <YAxis
              tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
              tickFormatter={(v) => `$${(v / 1_000_000).toFixed(1)}M`}
              label={{
                value: 'Balance',
                angle: -90,
                position: 'insideLeft',
                style: { fill: 'hsl(var(--foreground))' },
              }}
            />
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              labelFormatter={(age) => `Age ${age}`}
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '0.5rem',
              }}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="Traditional 401(k)"
              stackId="1"
              stroke="hsl(var(--chart-1))"
              fill="hsl(var(--chart-1))"
              fillOpacity={0.6}
            />
            <Area
              type="monotone"
              dataKey="Roth IRA"
              stackId="1"
              stroke="hsl(var(--chart-2))"
              fill="hsl(var(--chart-2))"
              fillOpacity={0.6}
            />
            <Area
              type="monotone"
              dataKey="Brokerage"
              stackId="1"
              stroke="hsl(var(--chart-3))"
              fill="hsl(var(--chart-3))"
              fillOpacity={0.6}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { formatCurrency } from "@/lib/utils";

interface ChartDataPoint {
  year: number;
  Traditional: number;
  Roth: number;
  Taxable: number;
  "Social Security": number;
}

interface ProjectionChartProps {
  data: ChartDataPoint[];
}

export function ProjectionChart({ data }: ProjectionChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Portfolio & Income Projection</CardTitle>
        <CardDescription>
          Visualize how your account balances and Social Security income change over time
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="year" 
              className="text-xs"
              tick={{ fill: 'hsl(var(--foreground))' }}
            />
            <YAxis 
              className="text-xs"
              tick={{ fill: 'hsl(var(--foreground))' }}
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip 
              formatter={(value: number) => formatCurrency(value)}
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '0.5rem',
              }}
            />
            <Legend />
            <Area 
              type="monotone" 
              dataKey="Traditional" 
              stackId="1"
              stroke="hsl(var(--chart-1))" 
              fill="hsl(var(--chart-1))"
              fillOpacity={0.6}
            />
            <Area 
              type="monotone" 
              dataKey="Roth" 
              stackId="1"
              stroke="hsl(var(--chart-2))" 
              fill="hsl(var(--chart-2))"
              fillOpacity={0.6}
            />
            <Area 
              type="monotone" 
              dataKey="Taxable" 
              stackId="1"
              stroke="hsl(var(--chart-3))" 
              fill="hsl(var(--chart-3))"
              fillOpacity={0.6}
            />
            <Area 
              type="monotone" 
              dataKey="Social Security" 
              stackId="1"
              stroke="hsl(var(--chart-4))" 
              fill="hsl(var(--chart-4))"
              fillOpacity={0.6}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

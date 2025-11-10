import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

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
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

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
          <LineChart data={data} margin={{ top: 5, right: 80, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="year" 
              className="text-xs"
              tick={{ fill: 'hsl(var(--foreground))' }}
            />
            <YAxis 
              yAxisId="left"
              className="text-xs"
              tick={{ fill: 'hsl(var(--foreground))' }}
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            />
            <YAxis 
              yAxisId="right"
              orientation="right"
              className="text-xs"
              tick={{ fill: 'hsl(var(--foreground))' }}
              tickFormatter={(value) => formatCurrency(value)}
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
            <Line 
              type="monotone" 
              dataKey="Traditional" 
              stroke="hsl(var(--chart-1))" 
              strokeWidth={2}
              dot={false}
              yAxisId="left"
            />
            <Line 
              type="monotone" 
              dataKey="Roth" 
              stroke="hsl(var(--chart-2))" 
              strokeWidth={2}
              dot={false}
              yAxisId="left"
            />
            <Line 
              type="monotone" 
              dataKey="Taxable" 
              stroke="hsl(var(--chart-3))" 
              strokeWidth={2}
              dot={false}
              yAxisId="left"
            />
            <Line 
              type="monotone" 
              dataKey="Social Security" 
              stroke="hsl(var(--chart-4))" 
              strokeWidth={2}
              dot={false}
              yAxisId="right"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { formatCurrency } from "@/lib/utils";

interface TaxChartDataPoint {
  year: number;
  "Federal Tax": number;
  "State Tax": number;
  "Federal CG Tax": number;
  "State CG Tax": number;
  "IRMAA": number;
  "NIIT": number;
  "AMT": number;
  "Payroll Tax": number;
}

interface TaxChartProps {
  data: TaxChartDataPoint[];
}

export function TaxChart({ data }: TaxChartProps) {

  return (
    <Card>
      <CardHeader>
        <CardTitle>Taxes</CardTitle>
        <CardDescription>
          Federal and state tax projections over time
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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
              tickFormatter={(value) => formatCurrency(value)}
              label={{ 
                value: 'State & CG Taxes', 
                angle: -90, 
                position: 'insideLeft',
                style: { fill: 'hsl(var(--foreground))' }
              }}
            />
            <YAxis 
              yAxisId="right"
              orientation="right"
              className="text-xs"
              tick={{ fill: 'hsl(var(--foreground))' }}
              tickFormatter={(value) => formatCurrency(value)}
              label={{ 
                value: 'Federal Tax', 
                angle: 90, 
                position: 'insideRight',
                style: { fill: 'hsl(var(--foreground))' }
              }}
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
              dataKey="Federal Tax" 
              stroke="hsl(var(--chart-1))" 
              strokeWidth={3}
              dot={false}
              yAxisId="right"
            />
            <Line 
              type="monotone" 
              dataKey="State Tax" 
              stroke="hsl(var(--chart-2))" 
              strokeWidth={2}
              dot={false}
              yAxisId="left"
            />
            <Line 
              type="monotone" 
              dataKey="Federal CG Tax" 
              stroke="hsl(var(--chart-3))" 
              strokeWidth={2}
              dot={false}
              yAxisId="left"
            />
            <Line 
              type="monotone" 
              dataKey="State CG Tax" 
              stroke="hsl(var(--chart-4))" 
              strokeWidth={2}
              dot={false}
              yAxisId="left"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
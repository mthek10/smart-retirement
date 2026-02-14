import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
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

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;

  const total = payload.reduce((sum: number, p: any) => sum + (p.value || 0), 0);

  return (
    <div style={{
      backgroundColor: 'hsl(var(--card))',
      border: '1px solid hsl(var(--border))',
      borderRadius: '0.5rem',
      padding: '12px 16px',
      fontSize: '13px',
    }}>
      <p style={{ fontWeight: 600, marginBottom: 8, color: 'hsl(var(--foreground))' }}>Year {label}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {payload.map((item: any) => (
          <div key={item.dataKey} style={{ display: 'flex', justifyContent: 'space-between', gap: 24 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: item.color, display: 'inline-block' }} />
              <span style={{ color: 'hsl(var(--foreground))' }}>{item.dataKey}</span>
            </span>
            <span style={{ fontWeight: 500, color: 'hsl(var(--foreground))' }}>{formatCurrency(item.value)}</span>
          </div>
        ))}
        <div style={{ borderTop: '1px solid hsl(var(--border))', marginTop: 4, paddingTop: 6, display: 'flex', justifyContent: 'space-between', gap: 24 }}>
          <span style={{ fontWeight: 600, color: 'hsl(var(--foreground))' }}>Total Taxes</span>
          <span style={{ fontWeight: 600, color: 'hsl(var(--foreground))' }}>{formatCurrency(total)}</span>
        </div>
      </div>
    </div>
  );
};

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
        <ResponsiveContainer width="100%" height={420}>
          <AreaChart data={data} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
            <defs>
              <linearGradient id="gradFedTax" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={0.7} />
                <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0.2} />
              </linearGradient>
              <linearGradient id="gradStateTax" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--chart-2))" stopOpacity={0.7} />
                <stop offset="100%" stopColor="hsl(var(--chart-2))" stopOpacity={0.2} />
              </linearGradient>
              <linearGradient id="gradFedCG" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--chart-3))" stopOpacity={0.7} />
                <stop offset="100%" stopColor="hsl(var(--chart-3))" stopOpacity={0.2} />
              </linearGradient>
              <linearGradient id="gradStateCG" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--chart-4))" stopOpacity={0.7} />
                <stop offset="100%" stopColor="hsl(var(--chart-4))" stopOpacity={0.2} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--foreground))" strokeOpacity={0.1} />
            <XAxis 
              dataKey="year" 
              tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
              tickFormatter={(value) => value >= 1000 ? `$${(value / 1000).toFixed(0)}k` : `$${value}`}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
            <Area 
              type="monotone" 
              dataKey="Federal Tax" 
              stackId="1"
              stroke="hsl(var(--chart-1))" 
              fill="url(#gradFedTax)"
              strokeWidth={1.5}
            />
            <Area 
              type="monotone" 
              dataKey="State Tax" 
              stackId="1"
              stroke="hsl(var(--chart-2))" 
              fill="url(#gradStateTax)"
              strokeWidth={1.5}
            />
            <Area 
              type="monotone" 
              dataKey="Federal CG Tax" 
              stackId="1"
              stroke="hsl(var(--chart-3))" 
              fill="url(#gradFedCG)"
              strokeWidth={1.5}
            />
            <Area 
              type="monotone" 
              dataKey="State CG Tax" 
              stackId="1"
              stroke="hsl(var(--chart-4))" 
              fill="url(#gradStateCG)"
              strokeWidth={1.5}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

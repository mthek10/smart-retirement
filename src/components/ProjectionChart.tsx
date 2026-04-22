import { memo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
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

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  
  const balanceItems = payload.filter((p: any) => p.dataKey !== "Social Security");
  const ssItem = payload.find((p: any) => p.dataKey === "Social Security");
  const totalBalance = balanceItems.reduce((sum: number, p: any) => sum + (p.value || 0), 0);

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
        {balanceItems.map((item: any) => (
          <div key={item.dataKey} style={{ display: 'flex', justifyContent: 'space-between', gap: 24 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: item.color, display: 'inline-block' }} />
              <span style={{ color: 'hsl(var(--foreground))' }}>{item.dataKey}</span>
            </span>
            <span style={{ fontWeight: 500, color: 'hsl(var(--foreground))' }}>{formatCurrency(item.value)}</span>
          </div>
        ))}
        <div style={{ borderTop: '1px solid hsl(var(--border))', marginTop: 4, paddingTop: 6, display: 'flex', justifyContent: 'space-between', gap: 24 }}>
          <span style={{ fontWeight: 600, color: 'hsl(var(--foreground))' }}>Total Portfolio</span>
          <span style={{ fontWeight: 600, color: 'hsl(var(--foreground))' }}>{formatCurrency(totalBalance)}</span>
        </div>
        {ssItem && ssItem.value > 0 && (
          <div style={{ borderTop: '1px solid hsl(var(--border))', marginTop: 4, paddingTop: 6, display: 'flex', justifyContent: 'space-between', gap: 24 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 10, height: 2, backgroundColor: ssItem.color, display: 'inline-block' }} />
              <span style={{ color: 'hsl(var(--foreground))' }}>Social Security</span>
            </span>
            <span style={{ fontWeight: 500, color: 'hsl(var(--foreground))' }}>{formatCurrency(ssItem.value)}/yr</span>
          </div>
        )}
      </div>
    </div>
  );
};

export const ProjectionChart = memo(function ProjectionChart({ data }: ProjectionChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Portfolio & Income Projection</CardTitle>
        <CardDescription>
          Stacked balances show portfolio composition; dashed line shows annual Social Security income
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={420}>
          <ComposedChart data={data} margin={{ top: 10, right: 60, left: 20, bottom: 5 }}>
            <defs>
              <linearGradient id="gradTraditional" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={0.7} />
                <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0.2} />
              </linearGradient>
              <linearGradient id="gradRoth" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--chart-2))" stopOpacity={0.7} />
                <stop offset="100%" stopColor="hsl(var(--chart-2))" stopOpacity={0.2} />
              </linearGradient>
              <linearGradient id="gradTaxable" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--chart-3))" stopOpacity={0.7} />
                <stop offset="100%" stopColor="hsl(var(--chart-3))" stopOpacity={0.2} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--foreground))" strokeOpacity={0.1} />
            <XAxis 
              dataKey="year" 
              className="text-xs"
              tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              yAxisId="left"
              className="text-xs"
              tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
              tickFormatter={(value) => value >= 1000000 ? `$${(value / 1000000).toFixed(1)}M` : `$${(value / 1000).toFixed(0)}k`}
              tickLine={false}
              axisLine={false}
              label={{ 
                value: 'Portfolio Balance', 
                angle: -90, 
                position: 'insideLeft',
                style: { fill: 'hsl(var(--foreground))', fontSize: 12 }
              }}
            />
            <YAxis 
              yAxisId="right"
              orientation="right"
              className="text-xs"
              tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
              tickFormatter={(value) => formatCurrency(value)}
              tickLine={false}
              axisLine={false}
              label={{ 
                value: 'SS Income / yr', 
                angle: 90, 
                position: 'insideRight',
                style: { fill: 'hsl(var(--foreground))', fontSize: 12 }
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            />
            <Area 
              type="monotone" 
              dataKey="Traditional" 
              stackId="1"
              yAxisId="left"
              stroke="hsl(var(--chart-1))" 
              fill="url(#gradTraditional)"
              strokeWidth={1.5}
            />
            <Area 
              type="monotone" 
              dataKey="Roth" 
              stackId="1"
              yAxisId="left"
              stroke="hsl(var(--chart-2))" 
              fill="url(#gradRoth)"
              strokeWidth={1.5}
            />
            <Area 
              type="monotone" 
              dataKey="Taxable" 
              stackId="1"
              yAxisId="left"
              stroke="hsl(var(--chart-3))" 
              fill="url(#gradTaxable)"
              strokeWidth={1.5}
            />
            <Line 
              type="stepAfter" 
              dataKey="Social Security" 
              yAxisId="right"
              stroke="hsl(var(--chart-4))" 
              strokeWidth={2.5}
              strokeDasharray="6 3"
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
});

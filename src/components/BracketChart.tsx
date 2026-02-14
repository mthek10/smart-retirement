import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";

interface BracketChartProps {
  data: Array<{
    year: number;
    age: number;
    marginalBracket: number;
  }>;
}

const bracketColors: Record<number, { color: string; label: string }> = {
  0.10: { color: "hsl(142, 76%, 36%)", label: "10%" },
  0.12: { color: "hsl(152, 68%, 40%)", label: "12%" },
  0.22: { color: "hsl(45, 93%, 47%)", label: "22%" },
  0.24: { color: "hsl(32, 95%, 44%)", label: "24%" },
  0.32: { color: "hsl(15, 90%, 50%)", label: "32%" },
  0.35: { color: "hsl(0, 84%, 55%)", label: "35%" },
  0.37: { color: "hsl(0, 84%, 42%)", label: "37%" },
};

function getBracketColor(rate: number): string {
  return bracketColors[rate]?.color ?? "hsl(var(--muted))";
}

export function BracketChart({ data }: BracketChartProps) {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    const mapped = data.map(d => ({
      age: d.age,
      bracket: d.marginalBracket * 100,
      rate: d.marginalBracket,
    }));

    // Trim trailing zero-bracket years
    let lastNonZero = mapped.length - 1;
    for (let i = mapped.length - 1; i >= 0; i--) {
      if (mapped[i].bracket > 0) { lastNonZero = i; break; }
    }
    return mapped.slice(0, Math.min(lastNonZero + 3, mapped.length));
  }, [data]);

  if (chartData.length === 0) return null;

  // Determine which brackets appear in the data for the legend
  const uniqueRates = [...new Set(chartData.map(d => d.rate).filter(r => r > 0))].sort();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Marginal Tax Bracket Over Time</CardTitle>
        <CardDescription>
          Each bar is colored by its federal marginal bracket. Consistent colors indicate a smooth tax strategy.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 8, right: 12, left: 12, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
            <XAxis
              dataKey="age"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
              label={{ value: 'Age', position: 'insideBottom', offset: -4, style: { fill: 'hsl(var(--muted-foreground))', fontSize: 12 } }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              domain={[0, 40]}
              tickFormatter={(v) => `${v}%`}
              tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
            />
            <Tooltip
              cursor={{ fill: 'hsl(var(--muted) / 0.3)' }}
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '0.5rem',
              }}
              formatter={(value: number, _name: string, props: any) => {
                const age = props.payload?.age;
                return [`${value}%`, `Bracket (Age ${age})`];
              }}
            />
            <Bar dataKey="bracket" radius={[4, 4, 0, 0]} maxBarSize={24}>
              {chartData.map((entry, index) => (
                <Cell key={index} fill={getBracketColor(entry.rate)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-4 justify-center">
          {uniqueRates.map((rate) => (
            <div key={rate} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: getBracketColor(rate) }} />
              <span className="text-xs text-muted-foreground">{bracketColors[rate]?.label ?? `${rate * 100}%`} Bracket</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

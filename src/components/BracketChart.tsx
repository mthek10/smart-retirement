import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Area, AreaChart, CartesianGrid, ReferenceLine, XAxis, YAxis } from "recharts";

interface BracketChartProps {
  data: Array<{
    year: number;
    age: number;
    marginalBracket: number;
  }>;
}

const chartConfig = {
  marginalBracket: {
    label: "Marginal Bracket",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

const bracketThresholds = [
  { rate: 0.10, label: "10%", color: "hsl(142, 76%, 36%)" },
  { rate: 0.12, label: "12%", color: "hsl(142, 76%, 46%)" },
  { rate: 0.22, label: "22%", color: "hsl(45, 93%, 47%)" },
  { rate: 0.24, label: "24%", color: "hsl(32, 95%, 44%)" },
  { rate: 0.32, label: "32%", color: "hsl(0, 84%, 60%)" },
];

export function BracketChart({ data }: BracketChartProps) {
  if (!data || data.length === 0) {
    return null;
  }

  const chartData = data.map(d => ({
    year: d.year,
    age: d.age,
    bracket: d.marginalBracket * 100,
  }));

  // Find the range of years with non-zero brackets
  let lastNonZeroIndex = chartData.length - 1;
  for (let i = chartData.length - 1; i >= 0; i--) {
    if (chartData[i].bracket > 0) {
      lastNonZeroIndex = i;
      break;
    }
  }
  
  const displayData = chartData.slice(0, Math.min(lastNonZeroIndex + 3, chartData.length));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Marginal Tax Bracket Over Time</CardTitle>
        <CardDescription>
          Your federal marginal tax bracket by year. Consistent brackets indicate optimized tax strategy.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <AreaChart data={displayData} margin={{ left: 12, right: 12, top: 12, bottom: 12 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis 
              dataKey="year" 
              tickLine={false} 
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => value.toString()}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              domain={[0, 40]}
              tickFormatter={(value) => `${value}%`}
            />
            
            {/* Bracket threshold reference lines */}
            {bracketThresholds.map((threshold) => (
              <ReferenceLine
                key={threshold.label}
                y={threshold.rate * 100}
                stroke={threshold.color}
                strokeDasharray="5 5"
                strokeOpacity={0.5}
              />
            ))}
            
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, name, props) => {
                    const age = props.payload?.age;
                    return (
                      <div className="flex flex-col gap-1">
                        <span className="font-medium">{value}% Bracket</span>
                        {age && <span className="text-xs text-muted-foreground">Age {age}</span>}
                      </div>
                    );
                  }}
                />
              }
            />
            
            <Area
              type="stepAfter"
              dataKey="bracket"
              stroke="hsl(var(--primary))"
              fill="hsl(var(--primary))"
              fillOpacity={0.3}
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
        
        {/* Legend for bracket thresholds */}
        <div className="flex flex-wrap gap-4 mt-4 justify-center">
          {bracketThresholds.map((threshold) => (
            <div key={threshold.label} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: threshold.color }}
              />
              <span className="text-xs text-muted-foreground">{threshold.label} Bracket</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

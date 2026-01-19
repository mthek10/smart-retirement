import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TrendingDown, Target, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { BracketAnalysis } from "@/lib/taxCalculations";
import { formatCurrency, getScoreColor, getScoreLabel } from "@/lib/utils";

interface BracketAnalysisProps {
  analysis: BracketAnalysis | null;
  projections: Array<{
    year: number;
    age: number;
    marginalBracket: number;
    totalIncome?: number;
  }>;
}

export function BracketAnalysisCard({ analysis, projections }: BracketAnalysisProps) {
  if (!analysis || projections.length === 0) {
    return null;
  }

  const getScoreIcon = (score: number) => {
    if (score < 4) return <CheckCircle2 className="h-5 w-5 text-green-600" />;
    if (score < 6) return <Target className="h-5 w-5 text-yellow-600" />;
    return <AlertTriangle className="h-5 w-5 text-destructive" />;
  };

  // Group yearly brackets into ranges for visualization
  const bracketRanges = [
    { label: "0-10%", min: 0, max: 0.10, color: "bg-green-500" },
    { label: "12%", min: 0.10, max: 0.12, color: "bg-green-400" },
    { label: "22%", min: 0.12, max: 0.22, color: "bg-yellow-400" },
    { label: "24%", min: 0.22, max: 0.24, color: "bg-orange-400" },
    { label: "32%+", min: 0.24, max: 1.0, color: "bg-red-500" },
  ];

  const getBracketYears = (min: number, max: number) => {
    return projections.filter(p => p.marginalBracket > min && p.marginalBracket <= max).length;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Tax Bracket Analysis
        </CardTitle>
        <CardDescription>
          Analyze bracket consistency and optimization opportunities
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Score Section */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
          <div className="flex items-center gap-3">
            {getScoreIcon(analysis.score)}
            <div>
              <p className="text-sm text-muted-foreground">Consistency Score</p>
              <p className={`text-2xl font-bold ${getScoreColor(analysis.score)}`}>
                {analysis.score.toFixed(1)} / 10
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Rating</p>
            <p className={`text-lg font-semibold ${getScoreColor(analysis.score)}`}>
              {getScoreLabel(analysis.score)}
            </p>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 rounded-lg border">
            <p className="text-xs text-muted-foreground">Average Marginal Bracket</p>
            <p className="text-xl font-bold">{(analysis.avgBracket * 100).toFixed(1)}%</p>
          </div>
          <div className="p-3 rounded-lg border">
            <p className="text-xs text-muted-foreground">Years at Target</p>
            <p className="text-xl font-bold">{analysis.yearsInTarget} / {projections.length}</p>
          </div>
        </div>

        {/* Bracket Distribution */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Bracket Distribution</p>
          <div className="space-y-2">
            {bracketRanges.map(range => {
              const years = getBracketYears(range.min, range.max);
              const percentage = (years / projections.length) * 100;
              return (
                <div key={range.label} className="flex items-center gap-2">
                  <span className="text-xs w-12">{range.label}</span>
                  <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${range.color} transition-all`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-xs w-16 text-right">{years} years</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Optimization Opportunities */}
        {analysis.potentialSavings > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Optimization Opportunity</p>
            <div className="p-3 rounded-lg border border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-700 dark:text-green-300">
                  Potential tax savings: <strong>{formatCurrency(analysis.potentialSavings)}</strong>
                </span>
              </div>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                Unused lower-bracket room: {formatCurrency(analysis.wastedBracketRoom)}
              </p>
            </div>
          </div>
        )}

        {/* Recommendation */}
        <Alert>
          <AlertDescription className="text-sm">
            {analysis.recommendation}
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}

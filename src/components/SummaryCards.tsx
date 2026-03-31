import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { DebouncedInput } from "@/components/ui/DebouncedInput";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  DollarSign,
  TrendingDown,
  Landmark,
  Activity,
  Target,
  AlertTriangle,
  CheckCircle2,
  Shield,
  ChevronDown,
  HeartPulse,
  Receipt,
  BarChart3,
  Pencil,
  RefreshCw,
} from "lucide-react";
import type { BracketAnalysis } from "@/lib/taxCalculations";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useState, useCallback, memo } from "react";

interface SurvivorAnalysis {
  peakBracket: number;
  yearsInHighBracket: number;
  bracketRange: { min: number; max: number };
  potentialSavings: number;
}

interface SummaryCardsProps {
  totalPortfolio: number;
  lifetimeTotalTaxes: number;
  totalFederalTax: number;
  totalFederalCGTax: number;
  totalStateTax: number;
  totalStateCGTax: number;
  totalMedicareCosts: number;
  totalACASubsidy?: number;
  totalACAPremium?: number;
  totalNIIT: number;
  totalAMT: number;
  totalPayrollTax: number;
  totalEmploymentIncome?: number;
  total401kContributions?: number;
  avgWithdrawal: number;
  tradDepletionAge?: number | null;
  taxableDepletionAge?: number | null;
  rothUsageAge?: number | null;
  rothDepletionAge?: number | null;
  bracketConsistency?: BracketAnalysis | null;
  survivorAnalysis?: SurvivorAnalysis | null;
  finalTraditionalBalance?: number;
  finalRothBalance?: number;
  finalTaxableBalance?: number;
  finalAge?: number;
  onNavigateToSetup?: (stepIndex: number) => void;
  children?: React.ReactNode;
  accountReturns?: {
    traditionalReturn: number;
    rothReturn: number;
    taxableReturn: number;
  };
  isMarried?: boolean;
  onAccountReturnsChange?: (field: string, value: number) => void;
  onAccountReturnsCommit?: (field: string, value: number) => void;
  onRecalculate?: () => void;
  targetTakeHome?: number;
  onTargetTakeHomeChange?: (value: number) => void;
}

interface CardData {
  title: string;
  value: number;
  icon: React.ElementType;
  color: string;
  subtitle?: string;
  isAge?: boolean;
  isScore?: boolean;
  isPercent?: boolean;
}

const SummaryCard = memo(function SummaryCard({ card }: { card: CardData }) {
  const Icon = card.icon;
  const borderColor = card.color.includes("destructive") ? "border-l-destructive" 
    : card.color.includes("green") ? "border-l-success" 
    : card.color.includes("warning") ? "border-l-warning"
    : "border-l-primary";
  return (
    <Card className={cn("card-hover border-l-4", borderColor)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
        <Icon className={cn("h-4 w-4", card.color)} />
      </CardHeader>
      <CardContent>
        {!card.isAge && (
          <div className={cn("text-2xl font-bold", card.color)}>
            {card.isScore
              ? `${(10 - card.value).toFixed(1)} / 10`
              : card.isPercent
              ? `${card.value.toFixed(0)}%`
              : formatCurrency(card.value)}
          </div>
        )}
        {card.subtitle && (
          <p className={cn(
            "mt-1",
            card.isAge ? cn("text-lg font-semibold", card.color) : "text-xs text-muted-foreground"
          )}>{card.subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
});

function ReturnRateSliders({
  accountReturns,
  onAccountReturnsChange,
  onAccountReturnsCommit,
  onRecalculate,
  targetTakeHome,
  onTargetTakeHomeChange,
}: {
  accountReturns: { traditionalReturn: number; rothReturn: number; taxableReturn: number };
  onAccountReturnsChange?: (field: string, value: number) => void;
  onAccountReturnsCommit?: (field: string, value: number) => void;
  onRecalculate?: () => void;
  targetTakeHome?: number;
  onTargetTakeHomeChange?: (value: number) => void;
}) {
  const [localReturns, setLocalReturns] = useState(accountReturns);
  const [localTakeHome, setLocalTakeHome] = useState(targetTakeHome || 0);
  const [dirty, setDirty] = useState(false);

  const handleChange = useCallback((field: string, value: number) => {
    setLocalReturns(prev => ({ ...prev, [field]: value }));
    setDirty(true);
  }, []);

  const handleTakeHomeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    const num = parseInt(raw, 10);
    setLocalTakeHome(isNaN(num) ? 0 : num);
    setDirty(true);
  }, []);

  const handleRecalculate = useCallback(() => {
    onAccountReturnsChange?.('traditionalReturn', localReturns.traditionalReturn);
    onAccountReturnsChange?.('rothReturn', localReturns.rothReturn);
    onAccountReturnsChange?.('taxableReturn', localReturns.taxableReturn);
    onAccountReturnsCommit?.('rothReturn', localReturns.rothReturn);
    if (onTargetTakeHomeChange && localTakeHome !== targetTakeHome) {
      onTargetTakeHomeChange(localTakeHome);
    }
    setDirty(false);
    Promise.resolve().then(() => onRecalculate?.());
  }, [localReturns, localTakeHome, targetTakeHome, onAccountReturnsChange, onAccountReturnsCommit, onTargetTakeHomeChange, onRecalculate]);

  return (
    <Card className="border-dashed">
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="text-sm font-medium text-muted-foreground">Annual Returns (%)</span>
            <p className="text-xs text-muted-foreground mt-0.5">EASY UPDATE - Adjust expected growth rates for each account type and Annual Take Home, then click Recalculate to easily update all projections.</p>
          </div>
          {onRecalculate && (
            <Button size="sm" variant={dirty ? "default" : "outline"} onClick={handleRecalculate} className="gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" />
              Recalculate
            </Button>
          )}
        </div>
        <div className="grid gap-6 grid-cols-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Traditional IRA/401(k)</Label>
              <span className="text-xs font-semibold text-muted-foreground">{(localReturns.traditionalReturn || 0).toFixed(1)}%</span>
            </div>
            <Slider
              min={0}
              max={15}
              step={0.1}
              value={[localReturns.traditionalReturn || 0]}
              onValueChange={([v]) => handleChange('traditionalReturn', v)}
              className="py-1"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Roth IRA</Label>
              <span className="text-xs font-semibold text-muted-foreground">{(localReturns.rothReturn || 0).toFixed(1)}%</span>
            </div>
            <Slider
              min={0}
              max={15}
              step={0.1}
              value={[localReturns.rothReturn || 0]}
              onValueChange={([v]) => handleChange('rothReturn', v)}
              className="py-1"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Brokerage</Label>
              <span className="text-xs font-semibold text-muted-foreground">{(localReturns.taxableReturn || 0).toFixed(1)}%</span>
            </div>
            <Slider
              min={0}
              max={15}
              step={0.1}
              value={[localReturns.taxableReturn || 0]}
              onValueChange={([v]) => handleChange('taxableReturn', v)}
              className="py-1"
            />
          </div>
        </div>
        {targetTakeHome !== undefined && (
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex items-center gap-3">
              <Label className="text-xs whitespace-nowrap">Annual Take Home</Label>
              <div className="relative max-w-[180px]">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                <Input
                  type="text"
                  value={localTakeHome.toLocaleString()}
                  onChange={handleTakeHomeChange}
                  className="pl-6 h-8 text-sm"
                />
              </div>
              <span className="text-xs text-muted-foreground">after all taxes (Year 1)</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EditLink({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer"
      title={`Edit ${label}`}
    >
      <Pencil className="h-3 w-3" />
      <span>Edit</span>
    </button>
  );
}

function CollapsibleSection({
  title,
  icon: Icon,
  children,
  defaultOpen = false,
  badge,
  editAction,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: string;
  editAction?: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className={cn("flex w-full items-center justify-between rounded-lg border bg-card px-4 py-3 text-left hover:bg-accent/50 transition-all duration-200 cursor-pointer", open && "border-l-4 border-l-primary")}>
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">{title}</span>
          {badge && (
            <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {badge}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {editAction && (
            <span onClick={(e) => e.stopPropagation()}>
              {editAction}
            </span>
          )}
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform duration-200",
              open && "rotate-180"
            )}
          />
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-3">{children}</CollapsibleContent>
    </Collapsible>
  );
}

export function SummaryCards({
  totalPortfolio,
  lifetimeTotalTaxes,
  totalFederalTax,
  totalFederalCGTax,
  totalStateTax,
  totalStateCGTax,
  totalMedicareCosts,
  totalACASubsidy,
  totalACAPremium,
  totalNIIT,
  totalAMT,
  totalPayrollTax,
  totalEmploymentIncome,
  total401kContributions,
  avgWithdrawal,
  tradDepletionAge,
  taxableDepletionAge,
  rothUsageAge,
  rothDepletionAge,
  bracketConsistency,
  survivorAnalysis,
  finalTraditionalBalance = 0,
  finalRothBalance = 0,
  finalTaxableBalance = 0,
  finalAge = 100,
  onNavigateToSetup,
  children,
  accountReturns,
  isMarried,
  onAccountReturnsChange,
  onAccountReturnsCommit,
  onRecalculate,
  targetTakeHome,
  onTargetTakeHomeChange,
}: SummaryCardsProps) {
  // ── Account Depletion (hero cards) ──
  const accountCards: CardData[] = [
    {
      title: "Traditional IRA",
      value: tradDepletionAge || 0,
      subtitle: tradDepletionAge
        ? `Depleted at age ${tradDepletionAge}`
        : `The remaining balance at age ${finalAge} is ${formatCurrency(finalTraditionalBalance)}`,
      icon: Landmark,
      color: tradDepletionAge ? "text-destructive" : "text-green-600",
      isAge: true,
    },
    {
      title: "Brokerage",
      value: taxableDepletionAge || 0,
      subtitle: taxableDepletionAge
        ? `Depleted at age ${taxableDepletionAge}`
        : `The remaining balance at age ${finalAge} is ${formatCurrency(finalTaxableBalance)}`,
      icon: BarChart3,
      color: taxableDepletionAge ? "text-destructive" : "text-green-600",
      isAge: true,
    },
    {
      title: "Roth IRA",
      value: rothDepletionAge || 0,
      subtitle: rothDepletionAge
        ? `Depleted at age ${rothDepletionAge}`
        : `The remaining balance at age ${finalAge} is ${formatCurrency(finalRothBalance)}`,
      icon: Shield,
      color: rothDepletionAge ? "text-destructive" : "text-green-600",
      isAge: true,
    },
  ];

  // ── Portfolio Overview ──
  const overviewCards: CardData[] = [
    {
      title: "Total Portfolio",
      value: totalPortfolio,
      icon: Landmark,
      color: "text-primary",
    },
    {
      title: "Avg Annual Withdrawal",
      value: avgWithdrawal,
      icon: Activity,
      color: "text-secondary",
    },
    ...(totalEmploymentIncome && totalEmploymentIncome > 0
      ? [
          {
            title: "Total Employment Income",
            value: totalEmploymentIncome,
            icon: DollarSign,
            color: "text-green-600",
          },
        ]
      : []),
    ...(total401kContributions && total401kContributions > 0
      ? [
          {
            title: "Total 401(k) Contributions",
            value: total401kContributions,
            icon: Landmark,
            color: "text-primary",
          },
        ]
      : []),
  ];

  // ── Tax Cards ──
  const taxCards: CardData[] = [
    {
      title: "Lifetime Total Taxes",
      value: lifetimeTotalTaxes,
      icon: TrendingDown,
      color: "text-destructive",
      subtitle: "All taxes combined",
    },
    {
      title: "Federal Income Tax",
      value: totalFederalTax,
      icon: TrendingDown,
      color: "text-destructive",
    },
    {
      title: "Federal Cap Gains Tax",
      value: totalFederalCGTax,
      icon: TrendingDown,
      color: "text-destructive",
    },
    {
      title: "State Income Tax",
      value: totalStateTax,
      icon: TrendingDown,
      color: "text-destructive",
    },
    {
      title: "State Cap Gains Tax",
      value: totalStateCGTax,
      icon: TrendingDown,
      color: "text-destructive",
    },
    ...(totalPayrollTax > 0
      ? [
          {
            title: "Payroll Tax",
            value: totalPayrollTax,
            icon: TrendingDown,
            color: "text-destructive",
          },
        ]
      : []),
    {
      title: "NIIT",
      value: totalNIIT,
      icon: TrendingDown,
      color: "text-destructive",
    },
    {
      title: "AMT",
      value: totalAMT,
      icon: TrendingDown,
      color: "text-destructive",
    },
  ];

  // ── Healthcare Cards ──
  const healthcareCards: CardData[] = [
    {
      title: "Total Medicare Costs",
      value: totalMedicareCosts,
      icon: HeartPulse,
      color: "text-warning",
      subtitle: "Part B, D & IRMAA",
    },
    ...(totalACASubsidy && totalACASubsidy > 0
      ? [
          {
            title: "Total ACA Subsidy",
            value: totalACASubsidy,
            icon: DollarSign,
            color: "text-green-600",
            subtitle: "Pre-Medicare premium credits",
          },
        ]
      : []),
    ...(totalACAPremium && totalACAPremium > 0
      ? [
          {
            title: "Total Healthcare (Pre-65)",
            value: totalACAPremium - (totalACASubsidy || 0),
            icon: DollarSign,
            color: "text-warning",
            subtitle: "ACA net cost (premium - subsidy)",
          },
        ]
      : []),
  ];

  // ── Optimization Cards ──
  const optimizationCards: CardData[] = [];

  if (bracketConsistency) {
    const displayScore = 10 - bracketConsistency.score;
    optimizationCards.push({
      title: "Bracket Consistency",
      value: bracketConsistency.score,
      subtitle: `Avg ${(bracketConsistency.avgBracket * 100).toFixed(0)}% bracket • ${bracketConsistency.yearsInTarget} years consistent`,
      icon:
        displayScore >= 7
          ? CheckCircle2
          : displayScore >= 4
          ? Target
          : AlertTriangle,
      color:
        displayScore >= 7
          ? "text-green-600"
          : displayScore >= 4
          ? "text-yellow-600"
          : "text-destructive",
      isScore: true,
    });

    if (bracketConsistency.potentialSavings > 0) {
      optimizationCards.push({
        title: "Potential Tax Savings",
        value: bracketConsistency.potentialSavings,
        subtitle: "Via bracket optimization",
        icon: TrendingDown,
        color: "text-green-600",
      });
    }
  }

  if (survivorAnalysis) {
    optimizationCards.push({
      title: "Survivor Tax Impact",
      value: survivorAnalysis.peakBracket * 100,
      subtitle: `Peak ${(survivorAnalysis.peakBracket * 100).toFixed(0)}% • ${survivorAnalysis.yearsInHighBracket} years at 32%+${
        survivorAnalysis.potentialSavings > 0
          ? ` • Save ${formatCurrency(survivorAnalysis.potentialSavings)}`
          : ""
      }`,
      icon:
        survivorAnalysis.yearsInHighBracket === 0 ? Shield : AlertTriangle,
      color:
        survivorAnalysis.yearsInHighBracket === 0
          ? "text-green-600"
          : survivorAnalysis.yearsInHighBracket <= 3
          ? "text-yellow-600"
          : "text-destructive",
      isPercent: true,
    });
  }

  const handleReturnChange = (field: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    onAccountReturnsChange?.(field, numValue);
  };

  return (
    <div className="space-y-4">
      {/* Hero: Account Depletion */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-muted-foreground">Account Depletion Timeline</span>
        {onNavigateToSetup && (
          <EditLink onClick={() => onNavigateToSetup(1)} label="Accounts" />
        )}
      </div>
      <div className="grid gap-4 md:grid-cols-3 animate-fade-in-up">
        {accountCards.map((card) => (
          <SummaryCard key={card.title} card={card} />
        ))}
      </div>

      {/* Annual Return Rates */}
      {accountReturns && onAccountReturnsChange && (
        <ReturnRateSliders
          accountReturns={accountReturns}
          onAccountReturnsChange={onAccountReturnsChange}
          onAccountReturnsCommit={onAccountReturnsCommit}
          onRecalculate={onRecalculate}
          targetTakeHome={targetTakeHome}
          onTargetTakeHomeChange={onTargetTakeHomeChange}
        />
      )}

      {children}

      {/* Portfolio Overview */}
      <CollapsibleSection
        title="Portfolio Overview"
        icon={Landmark}
        defaultOpen
        badge={formatCurrency(totalPortfolio)}
        editAction={onNavigateToSetup && <EditLink onClick={() => onNavigateToSetup(1)} label="Accounts" />}
      >
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {overviewCards.map((card) => (
            <SummaryCard key={card.title} card={card} />
          ))}
        </div>
      </CollapsibleSection>

      {/* Taxes */}
      <CollapsibleSection
        title="Taxes"
        icon={Receipt}
        badge={formatCurrency(lifetimeTotalTaxes)}
        editAction={onNavigateToSetup && <EditLink onClick={() => onNavigateToSetup(4)} label="Tax Settings" />}
      >
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {taxCards.map((card) => (
            <SummaryCard key={card.title} card={card} />
          ))}
        </div>
      </CollapsibleSection>

      {/* Healthcare */}
      <CollapsibleSection
        title="Healthcare"
        icon={HeartPulse}
        badge={formatCurrency(totalMedicareCosts)}
        editAction={onNavigateToSetup && <EditLink onClick={() => onNavigateToSetup(5)} label="Healthcare" />}
      >
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {healthcareCards.map((card) => (
            <SummaryCard key={card.title} card={card} />
          ))}
        </div>
      </CollapsibleSection>

      {/* Optimization */}
      {optimizationCards.length > 0 && (
        <CollapsibleSection
          title="Optimization"
          icon={Target}
          editAction={onNavigateToSetup && <EditLink onClick={() => onNavigateToSetup(4)} label="Tax Settings" />}
        >
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {optimizationCards.map((card) => (
              <SummaryCard key={card.title} card={card} />
            ))}
          </div>
        </CollapsibleSection>
      )}
    </div>
  );
}

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle2, 
  AlertTriangle, 
  TrendingUp, 
  Calendar, 
  DollarSign,
  HeartPulse,
  PiggyBank,
  Coins,
  MapPin
} from "lucide-react";
import { getBracketRoom } from "@/lib/incomeAlerts";
import { calculateCapitalGainsHarvestingRoom, standardDeductions2024 } from "@/lib/taxCalculations";
import { stateTaxData } from "@/lib/stateTaxData";
import { formatCurrency } from "@/lib/utils";
import type { ProjectionRow } from "@/hooks/useProjections";
interface ActionItemsProps {
  projections: ProjectionRow[];
  filingStatus: string;
  inflationRate: number;
  rothConversionStrategy: string;
  spouse1Age: number;
  spouse2Age: number;
  spouse1SSClaimAge: number;
  spouse2SSClaimAge: number;
  acaEnabled: boolean;
  taxableUnrealizedGains?: number;
  stateCode?: string;
  stateRelocation?: {
    enabled: boolean;
    targetState: string;
    relocationAge: number;
  };
}

interface ActionItem {
  id: string;
  priority: 'high' | 'medium' | 'low';
  category: 'roth' | 'ss' | 'irmaa' | 'rmd' | 'aca' | 'general' | 'cg-harvest' | 'state-tax';
  title: string;
  description: string;
  impact?: string;
  icon: React.ReactNode;
}


const getPriorityColor = (priority: ActionItem['priority']) => {
  switch (priority) {
    case 'high': return 'bg-destructive text-destructive-foreground';
    case 'medium': return 'bg-warning text-warning-foreground';
    case 'low': return 'bg-muted text-muted-foreground';
  }
};

const getCategoryIcon = (category: ActionItem['category']) => {
  switch (category) {
    case 'roth': return <TrendingUp className="h-4 w-4" />;
    case 'ss': return <Calendar className="h-4 w-4" />;
    case 'irmaa': return <HeartPulse className="h-4 w-4" />;
    case 'rmd': return <AlertTriangle className="h-4 w-4" />;
    case 'aca': return <HeartPulse className="h-4 w-4" />;
    case 'general': return <DollarSign className="h-4 w-4" />;
    case 'cg-harvest': return <Coins className="h-4 w-4" />;
    case 'state-tax': return <MapPin className="h-4 w-4" />;
  }
};

export function ActionItems({
  projections,
  filingStatus,
  inflationRate,
  rothConversionStrategy,
  spouse1Age,
  spouse2Age,
  spouse1SSClaimAge,
  spouse2SSClaimAge,
  acaEnabled,
  taxableUnrealizedGains,
  stateCode,
  stateRelocation,
}: ActionItemsProps) {
  if (projections.length === 0) return null;

  const currentYear = projections[0];
  const actionItems: ActionItem[] = [];

  // 1. Roth Conversion Opportunity
  const bracketInfo = getBracketRoom(currentYear.totalIncome, filingStatus, 0, inflationRate);
  if (bracketInfo.roomInBracket > 5000 && rothConversionStrategy === 'none') {
    const conversionTax = bracketInfo.roomInBracket * (bracketInfo.currentBracket / 100);
    actionItems.push({
      id: 'roth-conversion',
      priority: 'high',
      category: 'roth',
      title: 'Roth Conversion Opportunity',
      description: `You have ${formatCurrency(bracketInfo.roomInBracket)} of room in your ${bracketInfo.currentBracket}% tax bracket. Consider converting Traditional IRA funds to Roth.`,
      impact: `Tax cost: ${formatCurrency(conversionTax)} now to avoid higher taxes later`,
      icon: <TrendingUp className="h-5 w-5 text-success" />,
    });
  } else if (bracketInfo.roomInBracket > 5000 && rothConversionStrategy !== 'none') {
    actionItems.push({
      id: 'roth-strategy-active',
      priority: 'low',
      category: 'roth',
      title: 'Roth Strategy Active',
      description: `Your current strategy is filling to the ${bracketInfo.currentBracket}% bracket. You're optimizing your tax situation.`,
      icon: <CheckCircle2 className="h-5 w-5 text-success" />,
    });
  }

  // 1b. Capital Gains Harvesting Opportunity (0% LTCG bracket)
  const standardDeduction = standardDeductions2024[filingStatus] || standardDeductions2024.single;
  const taxableIncomeForCG = Math.max(0, currentYear.ordinaryIncome - standardDeduction);
  const cgHarvesting = calculateCapitalGainsHarvestingRoom(
    taxableIncomeForCG,
    filingStatus,
    0,
    inflationRate / 100
  );
  
  if (cgHarvesting.harvestingAvailable && taxableUnrealizedGains && taxableUnrealizedGains > 1000) {
    const harvestableAmount = Math.min(cgHarvesting.roomInZeroBracket, taxableUnrealizedGains);
    actionItems.push({
      id: 'cg-harvesting',
      priority: 'high',
      category: 'cg-harvest',
      title: 'Capital Gains Harvesting Opportunity',
      description: `You have ${formatCurrency(cgHarvesting.roomInZeroBracket)} of room in the 0% LTCG bracket. Consider selling appreciated assets to realize gains tax-free.`,
      impact: `Harvest up to ${formatCurrency(harvestableAmount)} in gains at 0% federal tax`,
      icon: <Coins className="h-5 w-5 text-success" />,
    });
  } else if (cgHarvesting.harvestingAvailable && currentYear.taxableBalance > 10000) {
    // Show opportunity even without knowing exact unrealized gains
    actionItems.push({
      id: 'cg-harvesting-opportunity',
      priority: 'medium',
      category: 'cg-harvest',
      title: '0% Capital Gains Rate Available',
      description: `Your income leaves ${formatCurrency(cgHarvesting.roomInZeroBracket)} room in the 0% LTCG bracket. Review your taxable account for gains you could realize tax-free.`,
      impact: `Potential to reset cost basis on appreciated shares at no federal tax cost`,
      icon: <Coins className="h-5 w-5 text-primary" />,
    });
  }

  // 2. Social Security Timing
  const yearsToSS1 = Math.max(0, spouse1SSClaimAge - spouse1Age);
  const yearsToSS2 = filingStatus === 'married' ? Math.max(0, spouse2SSClaimAge - spouse2Age) : Infinity;
  const yearsToSS = Math.min(yearsToSS1, yearsToSS2);
  
  if (yearsToSS > 0 && yearsToSS <= 5) {
    const optimalAge = 70;
    const currentClaimAge = yearsToSS1 < yearsToSS2 ? spouse1SSClaimAge : spouse2SSClaimAge;
    const delayBenefit = currentClaimAge < optimalAge 
      ? `Delaying from ${currentClaimAge} to 70 could increase benefits by ${Math.round((optimalAge - currentClaimAge) * 8)}%`
      : null;

    actionItems.push({
      id: 'ss-timing',
      priority: yearsToSS <= 2 ? 'high' : 'medium',
      category: 'ss',
      title: 'Social Security Decision Approaching',
      description: `You're ${yearsToSS} ${yearsToSS === 1 ? 'year' : 'years'} from your planned Social Security claim age.`,
      impact: delayBenefit || undefined,
      icon: <Calendar className="h-5 w-5 text-primary" />,
    });
  }

  // 3. RMD Planning
  const yearsToRMD = Math.max(0, 73 - spouse1Age);
  if (yearsToRMD > 0 && yearsToRMD <= 10) {
    // Find projected RMD in first RMD year
    const rmdYearProjection = projections.find(p => p.age === 73);
    const projectedRMD = rmdYearProjection?.rmd || 0;
    
    actionItems.push({
      id: 'rmd-planning',
      priority: yearsToRMD <= 3 ? 'high' : 'medium',
      category: 'rmd',
      title: `RMDs Begin in ${yearsToRMD} Years`,
      description: yearsToRMD <= 5
        ? `Required Minimum Distributions start at age 73. ${projectedRMD > 0 ? `Your projected first RMD is ${formatCurrency(projectedRMD)}.` : ''} Consider accelerating Roth conversions now.`
        : `You have ${yearsToRMD} years before RMDs begin. This is your window to optimize through Roth conversions.`,
      impact: projectedRMD > 50000 
        ? `A ${formatCurrency(projectedRMD)} RMD may push you into a higher tax bracket`
        : undefined,
      icon: <AlertTriangle className="h-5 w-5 text-warning" />,
    });
  }

  // 3b. Pre-RMD Optimization Window
  if (yearsToRMD > 0 && yearsToRMD <= 15 && currentYear.traditionalBalance > 100000) {
    const tradBalance = currentYear.traditionalBalance;
    const annualConversionRoom = bracketInfo.roomInBracket;
    const totalConvertible = annualConversionRoom * yearsToRMD;
    const percentReducible = Math.min(100, Math.round((totalConvertible / tradBalance) * 100));

    actionItems.push({
      id: 'pre-rmd-window',
      priority: yearsToRMD <= 5 ? 'high' : 'medium',
      category: 'rmd',
      title: `Pre-RMD Optimization Window: ${yearsToRMD} Years`,
      description: `You have a ${yearsToRMD}-year window before RMDs begin to reduce your Traditional IRA balance of ${formatCurrency(tradBalance)} through strategic Roth conversions. Converting at today's lower tax rates can avoid forced distributions at potentially higher rates.`,
      impact: annualConversionRoom > 5000
        ? `Up to ${formatCurrency(annualConversionRoom)}/year in conversions within your ${bracketInfo.currentBracket}% bracket could reduce your Traditional balance by ~${percentReducible}%`
        : `Review your tax bracket for Roth conversion opportunities before RMDs begin`,
      icon: <PiggyBank className="h-5 w-5 text-primary" />,
    });
  }

  // 4. ACA Subsidy Optimization (if under 65 and ACA enabled)
  if (acaEnabled && spouse1Age < 65) {
    const acaSubsidy = currentYear.acaSubsidy || 0;
    if (acaSubsidy > 0) {
      actionItems.push({
        id: 'aca-subsidy',
        priority: 'low',
        category: 'aca',
        title: 'ACA Subsidies Active',
        description: `You're receiving ${formatCurrency(acaSubsidy)}/year in ACA premium subsidies. Managing income can maximize your subsidy.`,
        icon: <HeartPulse className="h-5 w-5 text-success" />,
      });
    }
  }

  // 5. IRMAA Warning (if approaching 65 or already on Medicare)
  if (spouse1Age >= 63) {
    const irmaaYear = projections.find(p => p.irmaa > 0);
    if (irmaaYear) {
      actionItems.push({
        id: 'irmaa-warning',
        priority: 'medium',
        category: 'irmaa',
        title: 'IRMAA Surcharges Projected',
        description: `Your income triggers Medicare premium surcharges starting at age ${irmaaYear.age}. Consider income management strategies.`,
        impact: `Additional ${formatCurrency(irmaaYear.irmaa)}/year in Medicare premiums`,
        icon: <HeartPulse className="h-5 w-5 text-destructive" />,
      });
    }
  }

  // 6. State Tax Relocation Savings
  const zeroTaxStates = ['AK', 'FL', 'NV', 'NH', 'SD', 'TN', 'TX', 'WA', 'WY'];
  const isInTaxableState = stateCode && stateCode !== 'none' && !zeroTaxStates.includes(stateCode);
  
  if (isInTaxableState) {
    const lifetimeStateTax = projections.reduce((sum, p) => sum + p.stateTax + p.stateCapitalGainsTax, 0);
    
    if (lifetimeStateTax > 5000) {
      const stateName = stateCode === 'other' ? 'your current state' : stateCode;
      actionItems.push({
        id: 'state-tax-relocation',
        priority: lifetimeStateTax > 100000 ? 'high' : lifetimeStateTax > 25000 ? 'medium' : 'low',
        category: 'state-tax',
        title: 'State Tax Relocation Savings',
        description: `Moving to a zero income-tax state (e.g., FL, TX, NV, WY, NH) could eliminate ${formatCurrency(lifetimeStateTax)} in projected lifetime state taxes from ${stateName}.`,
        impact: `Average savings of ${formatCurrency(Math.round(lifetimeStateTax / projections.length))}/year in state income and capital gains taxes`,
        icon: <MapPin className="h-5 w-5 text-primary" />,
      });
    }
  }

  // 7. Pre-Move Advice: Moving to a Higher Tax State
  const highTaxStates: Record<string, string> = {
    CA: 'California (up to 13.3%)', NY: 'New York (up to 10.9%)', NJ: 'New Jersey (up to 10.75%)',
    OR: 'Oregon (up to 9.9%)', MN: 'Minnesota (up to 9.85%)', DC: 'D.C. (up to 10.75%)',
    HI: 'Hawaii (up to 11%)', CT: 'Connecticut (up to 6.99%)', VT: 'Vermont (up to 8.75%)',
  };

  if (stateRelocation?.enabled && stateRelocation.targetState) {
    const targetIsHighTax = highTaxStates[stateRelocation.targetState];
    const currentIsLowerTax = !stateCode || stateCode === 'none' || stateCode === 'other' || 
      zeroTaxStates.includes(stateCode) || !highTaxStates[stateCode];
    
    if (targetIsHighTax && currentIsLowerTax) {
      const yearsUntilMove = Math.max(0, stateRelocation.relocationAge - spouse1Age);
      const tips: string[] = [];
      tips.push('Realize capital gains before moving to avoid higher state CG taxes');
      tips.push('Accelerate Roth conversions now while in a lower-tax state');
      tips.push('Consider selling appreciated real estate or investments pre-move');
      tips.push('Exercise stock options or RSUs before establishing residency');

      actionItems.push({
        id: 'high-tax-state-move',
        priority: yearsUntilMove <= 3 ? 'high' : 'medium',
        category: 'state-tax',
        title: `Prepare for Move to ${stateRelocation.targetState} (Higher Tax State)`,
        description: `You're planning to move to ${targetIsHighTax} in ${yearsUntilMove} ${yearsUntilMove === 1 ? 'year' : 'years'}. Take these steps before relocating to minimize your tax impact:`,
        impact: `• ${tips.join('\n• ')}`,
        icon: <MapPin className="h-5 w-5 text-warning" />,
      });
    }
  }

  const priorityOrder = { high: 0, medium: 1, low: 2 };
  actionItems.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  if (actionItems.length === 0) {
    actionItems.push({
      id: 'all-good',
      priority: 'low',
      category: 'general',
      title: 'Strategy Looking Good',
      description: 'No immediate action items. Your retirement drawdown strategy appears optimized.',
      icon: <CheckCircle2 className="h-5 w-5 text-success" />,
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <PiggyBank className="h-5 w-5 text-primary" />
          <CardTitle>Personalized Action Items</CardTitle>
        </div>
        <CardDescription>
          Prioritized recommendations based on your current situation
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {actionItems.map((item) => (
            <div 
              key={item.id}
              className="flex gap-4 p-4 rounded-lg bg-muted/30 border border-border/50"
            >
              <div className="flex-shrink-0 mt-1">
                {item.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-medium">{item.title}</h4>
                  <Badge className={getPriorityColor(item.priority)} variant="secondary">
                    {item.priority}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {item.description}
                </p>
                {item.impact && (
                  <div className="text-sm font-medium text-primary mt-2 whitespace-pre-line">
                    💡 {item.impact}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

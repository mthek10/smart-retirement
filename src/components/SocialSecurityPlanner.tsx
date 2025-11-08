import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, TrendingUp } from "lucide-react";
import { calculateSocialSecurityBenefit } from "@/lib/taxCalculations";

interface SocialSecurityPlannerProps {
  ssData: {
    estimatedBenefit: number;
    claimAge: number;
    fullRetirementAge: number;
  };
  onChange: (data: any) => void;
}

export function SocialSecurityPlanner({ ssData, onChange }: SocialSecurityPlannerProps) {
  const handleChange = (field: string, value: number) => {
    onChange({ ...ssData, [field]: value });
  };

  const actualBenefit = calculateSocialSecurityBenefit(
    ssData.estimatedBenefit,
    ssData.claimAge,
    ssData.fullRetirementAge
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const benefitChange = ((actualBenefit - ssData.estimatedBenefit) / ssData.estimatedBenefit) * 100;
  const isDelayed = ssData.claimAge > ssData.fullRetirementAge;
  const isEarly = ssData.claimAge < ssData.fullRetirementAge;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Social Security Planning</CardTitle>
        <CardDescription>
          Model your Social Security claiming strategy and see how timing affects your benefits
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="estimatedBenefit">
            Estimated Monthly Benefit at Full Retirement Age
          </Label>
          <Input
            id="estimatedBenefit"
            type="number"
            placeholder="3000"
            value={ssData.estimatedBenefit || ''}
            onChange={(e) => handleChange('estimatedBenefit', parseFloat(e.target.value) || 0)}
          />
          <p className="text-sm text-muted-foreground">
            Annual: {formatCurrency(ssData.estimatedBenefit * 12)}
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <Label>Claiming Age: {ssData.claimAge}</Label>
            <span className="text-sm text-muted-foreground">
              Range: 62-70
            </span>
          </div>
          <Slider
            value={[ssData.claimAge]}
            onValueChange={([value]) => handleChange('claimAge', value)}
            min={62}
            max={70}
            step={1}
            className="w-full"
          />
        </div>

        <div className="p-4 bg-accent rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Adjusted Monthly Benefit</span>
            <span className="text-2xl font-bold text-primary">
              {formatCurrency(actualBenefit)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Annual Benefit</span>
            <span className="text-xl font-semibold">
              {formatCurrency(actualBenefit * 12)}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <TrendingUp className={`h-4 w-4 ${benefitChange >= 0 ? 'text-success' : 'text-destructive'}`} />
            <span className={benefitChange >= 0 ? 'text-success' : 'text-destructive'}>
              {benefitChange >= 0 ? '+' : ''}{benefitChange.toFixed(1)}% vs. Full Retirement Age
            </span>
          </div>
        </div>

        {isEarly && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Claiming early at age {ssData.claimAge} permanently reduces your monthly benefit by approximately{' '}
              {Math.abs(benefitChange).toFixed(1)}%. Consider if you need income now or can wait for higher benefits.
            </AlertDescription>
          </Alert>
        )}

        {isDelayed && (
          <Alert className="border-success/50 bg-success/10">
            <TrendingUp className="h-4 w-4 text-success" />
            <AlertDescription className="text-success-foreground">
              Delaying until age {ssData.claimAge} increases your monthly benefit by{' '}
              {benefitChange.toFixed(1)}% through delayed retirement credits. This increase is permanent and compounds with cost-of-living adjustments.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="fullRetirementAge">Full Retirement Age</Label>
          <Input
            id="fullRetirementAge"
            type="number"
            min="66"
            max="67"
            value={ssData.fullRetirementAge || ''}
            onChange={(e) => handleChange('fullRetirementAge', parseFloat(e.target.value) || 67)}
          />
          <p className="text-xs text-muted-foreground">
            Typically 67 for those born in 1960 or later
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, TrendingUp } from "lucide-react";
import { calculateSocialSecurityBenefit, calculateFullRetirementAge } from "@/lib/taxCalculations";

interface SocialSecurityPlannerProps {
  ssData: {
    spouse1: {
      estimatedBenefit: number;
      claimAge: number;
    };
    spouse2: {
      estimatedBenefit: number;
      claimAge: number;
    };
  };
  onChange: (data: any) => void;
  filingStatus: string;
  spouse1Age: number;
  spouse2Age: number;
}

export function SocialSecurityPlanner({ ssData, onChange, filingStatus, spouse1Age, spouse2Age }: SocialSecurityPlannerProps) {
  const handleChange = (spouse: 'spouse1' | 'spouse2', field: string, value: number) => {
    onChange({
      ...ssData,
      [spouse]: {
        ...ssData[spouse],
        [field]: value,
      },
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const renderSpouseSection = (spouse: 'spouse1' | 'spouse2', title: string, currentAge: number) => {
    const data = ssData[spouse];
    const fullRetirementAge = calculateFullRetirementAge(currentAge);
    const actualBenefit = calculateSocialSecurityBenefit(
      data.estimatedBenefit,
      data.claimAge,
      fullRetirementAge
    );
    const benefitChange = ((actualBenefit - data.estimatedBenefit) / data.estimatedBenefit) * 100;
    const isDelayed = data.claimAge > fullRetirementAge;
    const isEarly = data.claimAge < fullRetirementAge;

    return (
      <div className="space-y-4">
        <h3 className="font-semibold text-lg">{title}</h3>
        
        <div className="space-y-2">
          <Label htmlFor={`${spouse}-estimatedBenefit`}>
            Estimated Monthly Benefit at Full Retirement Age
          </Label>
          <Input
            id={`${spouse}-estimatedBenefit`}
            type="number"
            placeholder="3000"
            value={data.estimatedBenefit || ''}
            onChange={(e) => handleChange(spouse, 'estimatedBenefit', parseFloat(e.target.value) || 0)}
          />
          <p className="text-sm text-muted-foreground">
            Annual: {formatCurrency(data.estimatedBenefit * 12)}
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <Label>Claiming Age: {data.claimAge}</Label>
            <span className="text-sm text-muted-foreground">
              Range: 62-70
            </span>
          </div>
          <Slider
            value={[data.claimAge]}
            onValueChange={([value]) => handleChange(spouse, 'claimAge', value)}
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
          <Alert className="border-none bg-transparent">
            <Info className="h-4 w-4 text-destructive" />
            <AlertDescription className="text-destructive">
              Claiming early at age {data.claimAge} permanently reduces monthly benefit by approximately{' '}
              {Math.abs(benefitChange).toFixed(1)}%. Consider if income is needed now or can wait for higher benefits.
            </AlertDescription>
          </Alert>
        )}

        {isDelayed && (
          <Alert className="border-none bg-transparent">
            <TrendingUp className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-600">
              Delaying until age {data.claimAge} increases monthly benefit by{' '}
              {benefitChange.toFixed(1)}% through delayed retirement credits. This increase is permanent and compounds with cost-of-living adjustments.
            </AlertDescription>
          </Alert>
        )}

        <div className="p-3 bg-muted/50 rounded-md">
          <p className="text-sm text-muted-foreground">
            Full Retirement Age: <span className="font-medium text-foreground">{fullRetirementAge === Math.floor(fullRetirementAge) ? fullRetirementAge : `${Math.floor(fullRetirementAge)} years ${Math.round((fullRetirementAge % 1) * 12)} months`}</span>
            <br />
            <span className="text-xs">Automatically calculated based on current age ({currentAge})</span>
          </p>
        </div>
      </div>
    );
  };

  const isSingleFiler = filingStatus === 'single' || filingStatus === 'hoh';

  return (
    <Card>
      <CardHeader>
        <CardTitle>Social Security Planning</CardTitle>
        <CardDescription>
          Model Social Security claiming strategies {isSingleFiler ? '' : 'for both spouses '}and see how timing affects benefits
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {renderSpouseSection('spouse1', isSingleFiler ? 'Your Benefits' : 'Spouse 1', spouse1Age)}
        {!isSingleFiler && (
          <div className="border-t pt-6">
            {renderSpouseSection('spouse2', 'Spouse 2', spouse2Age)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

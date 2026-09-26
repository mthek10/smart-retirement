import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { DebouncedInput } from "@/components/ui/DebouncedInput";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ACASettingsProps {
  acaSettings: {
    enabled: boolean;
    householdSize: number;
    customBenchmarkPremium: number;
    annualHealthInsuranceCost: number;
  };
  onChange: (settings: any) => void;
}

export function ACASettings({ acaSettings, onChange }: ACASettingsProps) {
  const handleChange = (field: string, value: string | number | boolean) => {
    onChange({ ...acaSettings, [field]: value });
  };

  const hasHealthInsuranceCost = (acaSettings.annualHealthInsuranceCost || 0) > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Healthcare Settings</CardTitle>
        <CardDescription>Configure pre-Medicare health insurance costs and ACA premium tax credits</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="annualHealthInsuranceCost">Annual Household Health Insurance Premium</Label>
          <DebouncedInput
            id="annualHealthInsuranceCost"
            type="number"
            step="100"
            placeholder="0"
            value={acaSettings.annualHealthInsuranceCost || ''}
            onChange={(value) => handleChange('annualHealthInsuranceCost', parseFloat(value) || 0)}
          />
          <p className="text-xs text-muted-foreground">
            Enter the household's total annual pre-Medicare premium before ACA subsidies. It increases annually with inflation and is never multiplied by the number of spouses.
          </p>
          {acaSettings.enabled && (
            <p className="text-xs text-muted-foreground italic">
              This is your actual plan premium. The modeled marketplace premium (or Custom Benchmark Premium below) is used only to calculate the ACA credit, which is then subtracted from this amount.
            </p>
          )}
          <p className="text-xs text-muted-foreground italic">
            Note: Medicare eligibility begins at age 65. Mixed-age married years use Medicare for the 65+ spouse and ACA modeling for the under-65 spouse instead of this manual premium.
          </p>
        </div>

        {hasHealthInsuranceCost && (
          <>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="acaEnabled">Enable ACA Subsidy Calculation</Label>
                <p className="text-xs text-muted-foreground">
                  Calculate premium tax credits for ages under 65
                </p>
              </div>
              <Switch
                id="acaEnabled"
                checked={acaSettings.enabled}
                onCheckedChange={(checked) => handleChange('enabled', checked)}
              />
            </div>

            {acaSettings.enabled && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="householdSize">Household Size</Label>
                  <Select
                    value={acaSettings.householdSize.toString()}
                    onValueChange={(value) => handleChange('householdSize', parseInt(value))}
                  >
                    <SelectTrigger id="householdSize">
                      <SelectValue placeholder="Select household size" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 person</SelectItem>
                      <SelectItem value="2">2 people</SelectItem>
                      <SelectItem value="3">3 people</SelectItem>
                      <SelectItem value="4">4 people</SelectItem>
                      <SelectItem value="5">5 people</SelectItem>
                      <SelectItem value="6">6 people</SelectItem>
                      <SelectItem value="7">7 people</SelectItem>
                      <SelectItem value="8">8+ people</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Used to determine Federal Poverty Level for subsidy calculation
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customBenchmarkPremium">Custom Benchmark Premium (optional)</Label>
                  <DebouncedInput
                    id="customBenchmarkPremium"
                    type="number"
                    step="10"
                    placeholder="0"
                    value={acaSettings.customBenchmarkPremium || ''}
                    onChange={(value) => handleChange('customBenchmarkPremium', parseFloat(value) || 0)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter the monthly benchmark Silver premium per covered person for subsidy calculation. Leave at 0 to use national age-based averages.
                  </p>
                </div>

                <div className="pt-2 border-t space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Enhanced subsidies:</span>
                    <span className="font-medium">Expired after 2025 (400% FPL cliff)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Max contribution:</span>
                    <span className="font-medium">9.96% of income (up to 400% FPL)</span>
                  </div>
                  <p className="text-xs text-muted-foreground pt-2">
                    Note: Premiums vary by state/county. Using national averages if no custom rate specified.
                  </p>
                </div>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

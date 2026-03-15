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
          <Label htmlFor="annualHealthInsuranceCost">Annual Health Insurance Cost</Label>
          <DebouncedInput
            id="annualHealthInsuranceCost"
            type="number"
            step="100"
            placeholder="0"
            value={acaSettings.annualHealthInsuranceCost || ''}
            onChange={(value) => handleChange('annualHealthInsuranceCost', parseFloat(value) || 0)}
          />
          <p className="text-xs text-muted-foreground">
            Enter your annual pre-Medicare health insurance premium. This cost increases annually at the inflation rate and stops once the covered filer reaches Medicare eligibility.
          </p>
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
                    Override default premium calculation with your local marketplace silver plan rate (monthly). Leave at 0 to use national averages.
                  </p>
                </div>

                <div className="pt-2 border-t space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Enhanced subsidies:</span>
                    <span className="font-medium">Through 2025</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Max contribution:</span>
                    <span className="font-medium">8.5% of income</span>
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

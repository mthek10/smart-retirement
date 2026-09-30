import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { DebouncedInput } from "@/components/ui/DebouncedInput";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { medicarePartBPremium2024, medicarePartDPremium2024 } from "@/lib/taxCalculations";

interface ACASettingsProps {
  acaSettings: {
    enabled: boolean;
    householdSize: number;
    customBenchmarkPremium: number;
    annualHealthInsuranceCost: number;
    medicareSupplementalMonthlyPerPerson?: number;
  };
  onChange: (settings: any) => void;
  filingStatus?: string;
  spouse1Age?: number;
  spouse2Age?: number;
}

const currency0 = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const currency2 = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
});

export function ACASettings({
  acaSettings,
  onChange,
  filingStatus = 'single',
  spouse1Age = 0,
  spouse2Age = 0,
}: ACASettingsProps) {
  const handleChange = (field: string, value: string | number | boolean) => {
    onChange({ ...acaSettings, [field]: value });
  };

  const isMarried = filingStatus === 'married';
  // Single / HOH filers ignore spouse data entirely.
  const ages = isMarried ? [spouse1Age, spouse2Age] : [spouse1Age];
  const validAges = ages.filter((age) => age > 0);
  const hasAges = validAges.length > 0;
  const allMedicareEligible = hasAges && validAges.every((age) => age >= 65);
  const anyMedicareEligible = hasAges && validAges.some((age) => age >= 65);
  const mixedAge = anyMedicareEligible && !allMedicareEligible;

  const showPre65 = !allMedicareEligible;
  const showMedicare = anyMedicareEligible;

  const supplemental = acaSettings.medicareSupplementalMonthlyPerPerson || 0;
  const baseMonthlyPerPerson = medicarePartBPremium2024 + medicarePartDPremium2024;
  const medicarePeople = allMedicareEligible ? validAges.length : validAges.filter((a) => a >= 65).length;
  const annualMedicareHousehold = (baseMonthlyPerPerson + supplemental) * 12 * Math.max(1, medicarePeople);

  const hasHealthInsuranceCost = (acaSettings.annualHealthInsuranceCost || 0) > 0;

  const olderAge = Math.max(...validAges, 0);
  const youngerAge = validAges.length > 1 ? Math.min(...validAges) : olderAge;
  const yearsUntil65 = Math.max(0, 65 - youngerAge);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Healthcare Settings</CardTitle>
        <CardDescription>
          {allMedicareEligible
            ? "Configure Medicare Part B, Part D and supplemental (Medigap / Advantage) premiums"
            : mixedAge
            ? "Configure pre-Medicare coverage for the younger spouse and Medicare premiums for the older spouse"
            : "Configure pre-Medicare health insurance costs and ACA premium tax credits"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {mixedAge && (
          <div className="rounded-lg border-l-4 border-l-primary bg-primary/5 p-3 space-y-1">
            <p className="text-sm font-semibold text-foreground">Mixed-age household</p>
            <p className="text-xs text-foreground/80">
              One spouse (age {olderAge}) is on Medicare. The other (age {youngerAge}) needs pre-Medicare
              coverage for {yearsUntil65} more {yearsUntil65 === 1 ? "year" : "years"}, until age 65.
              Pre-Medicare premiums and any ACA credit apply only to the younger spouse.
            </p>
          </div>
        )}

        {showPre65 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="annualHealthInsuranceCost">Annual Household Health Insurance Premium (pre-Medicare)</Label>
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
                At age 65 this coverage drops to $0 and the model automatically switches to Medicare Part B, Part D and projected IRMAA surcharges.
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
          </div>
        )}

        {showMedicare && (
          <div className={`space-y-4 ${showPre65 ? "pt-4 border-t" : ""}`}>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">Medicare (age 65+)</p>
              <p className="text-xs text-muted-foreground">
                Base Part B {currency2.format(medicarePartBPremium2024)}/mo plus Part D {currency2.format(medicarePartDPremium2024)}/mo
                per person, or {currency0.format(baseMonthlyPerPerson * 12)} per person per year. Both grow with inflation.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="medicareSupplemental">Monthly Supplemental / Medigap Premium (per person)</Label>
              <DebouncedInput
                id="medicareSupplemental"
                type="number"
                step="10"
                placeholder="0"
                value={supplemental || ''}
                onChange={(value) => handleChange('medicareSupplementalMonthlyPerPerson', parseFloat(value) || 0)}
              />
              <p className="text-xs text-muted-foreground">
                Add your actual Medigap (Plan G), Medicare Advantage, or dental/vision premium per person. Leave at 0 to model base Medicare only.
              </p>
              <p className="text-xs text-foreground/80">
                Estimated first-year Medicare cost for this household:{" "}
                <span className="font-semibold">{currency0.format(annualMedicareHousehold)}</span>
                {medicarePeople > 1 ? " (both spouses)" : ""}, before any IRMAA surcharge.
              </p>
            </div>

            <div className="rounded-lg border-l-4 border-l-primary bg-muted/40 p-3">
              <p className="text-xs text-foreground/80">
                IRMAA surcharges are modeled automatically each year from your projected income, using Medicare's
                two-year lookback. Large Roth conversions, pensions and RMDs can push you into a higher surcharge tier.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

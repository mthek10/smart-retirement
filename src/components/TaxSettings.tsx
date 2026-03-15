import { useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DebouncedInput } from "@/components/ui/DebouncedInput";
import { Input } from "@/components/ui/input";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle } from "lucide-react";
import { stateTaxData } from "@/lib/stateTaxData";
import { formatCurrency } from "@/lib/utils";

interface TaxSettingsProps {
  taxSettings: {
    filingStatus: string;
    state: string;
    stateRate: number;
    spouse1Age: number;
    spouse2Age: number;
    targetTakeHome: number;
    inflationRate: number;
    rothConversionStrategy: string;
    rothConversionCustom: number;
    optimizationGoal?: string;
    stateRelocation?: {
      enabled: boolean;
      targetState: string;
      relocationAge: number;
    };
  };
  onChange: (settings: any) => void;
  totalPortfolio?: number;
}
// Inline currency-formatted input with $ and commas
function CurrencyInput({ id, value, onChange, max, placeholder }: {
  id: string;
  value: number;
  onChange: (val: number) => void;
  max?: number;
  placeholder?: string;
}) {
  const [displayValue, setDisplayValue] = useState(formatCurrency(value));
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    setDisplayValue(value.toString());
  }, [value]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    setDisplayValue(raw);
    const num = parseInt(raw, 10);
    if (!isNaN(num)) {
      onChange(Math.min(num, max ?? Infinity));
    }
  }, [onChange, max]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    let num = parseInt(displayValue.replace(/[^0-9]/g, ''), 10);
    if (isNaN(num) || num < 1) num = 1;
    if (max && num > max) num = max;
    onChange(num);
    setDisplayValue(formatCurrency(num));
  }, [displayValue, onChange, max]);

  // Sync display when value changes externally and not focused
  const formattedExternal = formatCurrency(value);
  if (!isFocused && displayValue !== formattedExternal) {
    setDisplayValue(formattedExternal);
  }

  return (
    <Input
      id={id}
      type="text"
      inputMode="numeric"
      value={isFocused ? displayValue : formattedExternal}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      placeholder={placeholder}
    />
  );
}

export function TaxSettings({ taxSettings, onChange, totalPortfolio }: TaxSettingsProps) {
  const handleChange = (field: string, value: string | number | boolean) => {
    // Auto-enable survivor scenario when survivor_smooth strategy is selected
    if (field === 'rothConversionStrategy' && value === 'survivor_smooth') {
      const currentSurvivor = (taxSettings as any).survivorSettings || {
        enabled: false,
        spouse1DeathAge: null,
        spouse2DeathAge: null,
        survivorSpendingPercent: 75,
      };
      onChange({ 
        ...taxSettings, 
        [field]: value,
        survivorSettings: { ...currentSurvivor, enabled: true }
      });
      return;
    }
    onChange({ ...taxSettings, [field]: value });
  };

  const handleSurvivorChange = (field: string, value: boolean | number | null) => {
    const currentSurvivor = (taxSettings as any).survivorSettings || {
      enabled: false,
      spouse1DeathAge: null,
      spouse2DeathAge: null,
      survivorSpendingPercent: 75,
    };
    
    if (field === 'enabled' && value === true) {
      onChange({
        ...taxSettings,
        survivorSettings: { ...currentSurvivor, [field]: value },
        rothConversionStrategy: 'survivor_smooth',
      });
      return;
    }
    
    onChange({
      ...taxSettings,
      survivorSettings: { ...currentSurvivor, [field]: value },
    });
  };

  const survivorSettings = (taxSettings as any).survivorSettings || {
    enabled: false,
    spouse1DeathAge: null,
    spouse2DeathAge: null,
    survivorSpendingPercent: 75,
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tax Settings</CardTitle>
        <CardDescription>Configure state taxes, take-home goals, and conversion strategy</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Label htmlFor="targetTakeHome">Annual Take Home (First Year) After All Taxes</Label>
            <InfoTooltip text="Your desired after-tax income per year. The model calculates how much to withdraw from each account to deliver this amount after all taxes." />
          </div>
          <CurrencyInput
            id="targetTakeHome"
            value={taxSettings.targetTakeHome}
            onChange={(val) => handleChange('targetTakeHome', val)}
            max={totalPortfolio}
            placeholder="$200,000"
          />
          <p className="text-xs text-muted-foreground">
            Your desired after-tax income (including Social Security). Model will calculate withdrawals needed to achieve this.
            {totalPortfolio ? ` Maximum: ${formatCurrency(totalPortfolio)}.` : ''}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="state">State</Label>
          <Select
            value={taxSettings.state || 'none'}
            onValueChange={(value) => handleChange('state', value)}
          >
            <SelectTrigger id="state">
              <SelectValue placeholder="Select state" />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              <SelectItem value="none">No State Income Tax</SelectItem>
              <SelectItem value="AL">Alabama</SelectItem>
              <SelectItem value="AK">Alaska</SelectItem>
              <SelectItem value="AZ">Arizona</SelectItem>
              <SelectItem value="AR">Arkansas</SelectItem>
              <SelectItem value="CA">California</SelectItem>
              <SelectItem value="CO">Colorado</SelectItem>
              <SelectItem value="CT">Connecticut</SelectItem>
              <SelectItem value="DE">Delaware</SelectItem>
              <SelectItem value="DC">District of Columbia</SelectItem>
              <SelectItem value="FL">Florida</SelectItem>
              <SelectItem value="GA">Georgia</SelectItem>
              <SelectItem value="HI">Hawaii</SelectItem>
              <SelectItem value="ID">Idaho</SelectItem>
              <SelectItem value="IL">Illinois</SelectItem>
              <SelectItem value="IN">Indiana</SelectItem>
              <SelectItem value="IA">Iowa</SelectItem>
              <SelectItem value="KS">Kansas</SelectItem>
              <SelectItem value="KY">Kentucky</SelectItem>
              <SelectItem value="LA">Louisiana</SelectItem>
              <SelectItem value="ME">Maine</SelectItem>
              <SelectItem value="MD">Maryland</SelectItem>
              <SelectItem value="MA">Massachusetts</SelectItem>
              <SelectItem value="MI">Michigan</SelectItem>
              <SelectItem value="MN">Minnesota</SelectItem>
              <SelectItem value="MS">Mississippi</SelectItem>
              <SelectItem value="MO">Missouri</SelectItem>
              <SelectItem value="MT">Montana</SelectItem>
              <SelectItem value="NE">Nebraska</SelectItem>
              <SelectItem value="NV">Nevada</SelectItem>
              <SelectItem value="NH">New Hampshire</SelectItem>
              <SelectItem value="NJ">New Jersey</SelectItem>
              <SelectItem value="NM">New Mexico</SelectItem>
              <SelectItem value="NY">New York</SelectItem>
              <SelectItem value="NC">North Carolina</SelectItem>
              <SelectItem value="ND">North Dakota</SelectItem>
              <SelectItem value="OH">Ohio</SelectItem>
              <SelectItem value="OK">Oklahoma</SelectItem>
              <SelectItem value="OR">Oregon</SelectItem>
              <SelectItem value="PA">Pennsylvania</SelectItem>
              <SelectItem value="RI">Rhode Island</SelectItem>
              <SelectItem value="SC">South Carolina</SelectItem>
              <SelectItem value="SD">South Dakota</SelectItem>
              <SelectItem value="TN">Tennessee</SelectItem>
              <SelectItem value="TX">Texas</SelectItem>
              <SelectItem value="UT">Utah</SelectItem>
              <SelectItem value="VT">Vermont</SelectItem>
              <SelectItem value="VA">Virginia</SelectItem>
              <SelectItem value="WA">Washington (CG Excise)</SelectItem>
              <SelectItem value="WV">West Virginia</SelectItem>
              <SelectItem value="WI">Wisconsin</SelectItem>
              <SelectItem value="WY">Wyoming</SelectItem>
              <SelectItem value="other">Other 5% Default</SelectItem>
          </SelectContent>
          </Select>
          {(() => {
            const state = taxSettings.state;
            if (state === 'other') {
              return <p className="text-xs text-muted-foreground">Custom flat rate applied to all taxable income.</p>;
            }
            const data = stateTaxData[state];
            if (!data) return <p className="text-xs text-muted-foreground">Select a state to see tax rate details.</p>;
            if (!data.hasIncomeTax) {
              return data.capitalGainsRate
                ? <p className="text-xs text-muted-foreground">No broad state income tax, but large capital gains may still be taxed.</p>
                : <p className="text-xs text-green-600 font-medium">No state income tax — 0% rate.</p>;
            }
            if (data.taxType === 'flat') {
              return <p className="text-xs text-muted-foreground">Flat tax rate: <span className="font-medium">{((data.flatRate || 0) * 100).toFixed(2)}%</span> on all taxable income.</p>;
            }
            if (data.taxType === 'progressive' && data.brackets) {
              const topRate = data.brackets[data.brackets.length - 1].rate;
              const bottomRate = data.brackets[0].rate;
              return <p className="text-xs text-muted-foreground">Progressive tax: <span className="font-medium">{(bottomRate * 100).toFixed(1)}% – {(topRate * 100).toFixed(1)}%</span> across {data.brackets.length} brackets.</p>;
            }
            return null;
          })()}
        </div>

        {taxSettings.state === 'other' && (
          <div className="space-y-2">
            <Label htmlFor="stateRate">State Income Tax Rate (%)</Label>
            <DebouncedInput
              id="stateRate"
              type="number"
              step="0.1"
              placeholder="0.0"
              value={taxSettings.stateRate || ''}
              onChange={(value) => handleChange('stateRate', parseFloat(value) || 0)}
            />
            <p className="text-xs text-muted-foreground">
              Custom state income tax rate (does not include SS-specific rules)
            </p>
          </div>
        )}

        {/* State Relocation Planning */}
        <div className="space-y-4 pt-4 border-t">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Label htmlFor="stateRelocationEnabled" className="text-sm font-medium">
                Plan State Relocation
              </Label>
              <InfoTooltip text="Model moving to a different state at a specific age. This is an annual model: the target state's tax rules apply starting with the first projection year in which Spouse 1 is at or above the relocation age." />
            </div>
            <input
              type="checkbox"
              id="stateRelocationEnabled"
              checked={taxSettings.stateRelocation?.enabled || false}
              onChange={(e) => {
                const current = taxSettings.stateRelocation || { enabled: false, targetState: 'FL', relocationAge: 65 };
                onChange({ 
                  ...taxSettings, 
                  stateRelocation: { ...current, enabled: e.target.checked } 
                });
              }}
              className="h-4 w-4 rounded border-border"
            />
          </div>
          
          {taxSettings.stateRelocation?.enabled && (
            <>
              <div className="space-y-2">
                <Label htmlFor="relocationAge">Relocation Age Spouse 1</Label>
                <DebouncedInput
                  id="relocationAge"
                  type="number"
                  step="1"
                  min="1"
                  max="100"
                  placeholder="65"
                  value={taxSettings.stateRelocation?.relocationAge || 65}
                  onChange={(value) => {
                    const current = taxSettings.stateRelocation || { enabled: true, targetState: 'FL', relocationAge: 65 };
                    const parsed = parseInt(value) || 65;
                    const clamped = Math.min(Math.max(parsed, 1), 100);
                    onChange({
                      ...taxSettings,
                      stateRelocation: { ...current, relocationAge: clamped }
                    });
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="targetState">Target State</Label>
                <Select
                  value={taxSettings.stateRelocation?.targetState || 'FL'}
                  onValueChange={(value) => {
                    const current = taxSettings.stateRelocation || { enabled: true, targetState: 'FL', relocationAge: 65 };
                    onChange({
                      ...taxSettings,
                      stateRelocation: { ...current, targetState: value }
                    });
                  }}
                >
                  <SelectTrigger id="targetState">
                    <SelectValue placeholder="Select target state" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    <SelectItem value="AK">Alaska (No Income Tax)</SelectItem>
                    <SelectItem value="AZ">Arizona (2.5% Flat)</SelectItem>
                    <SelectItem value="CA">California (up to 13.3%)</SelectItem>
                    <SelectItem value="CO">Colorado (4.4% Flat)</SelectItem>
                    <SelectItem value="CT">Connecticut (up to 6.99%)</SelectItem>
                    <SelectItem value="DC">D.C. (up to 10.75%)</SelectItem>
                    <SelectItem value="FL">Florida (No Income Tax)</SelectItem>
                    <SelectItem value="HI">Hawaii (up to 11%)</SelectItem>
                    <SelectItem value="MN">Minnesota (up to 9.85%)</SelectItem>
                    <SelectItem value="NV">Nevada (No Income Tax)</SelectItem>
                    <SelectItem value="NH">New Hampshire (No Income Tax)</SelectItem>
                    <SelectItem value="NJ">New Jersey (up to 10.75%)</SelectItem>
                    <SelectItem value="NY">New York (up to 10.9%)</SelectItem>
                    <SelectItem value="NC">North Carolina (4.5% Flat)</SelectItem>
                    <SelectItem value="OR">Oregon (up to 9.9%)</SelectItem>
                    <SelectItem value="PA">Pennsylvania (3.07% Flat)</SelectItem>
                    <SelectItem value="SD">South Dakota (No Income Tax)</SelectItem>
                    <SelectItem value="TN">Tennessee (No Income Tax)</SelectItem>
                    <SelectItem value="TX">Texas (No Income Tax)</SelectItem>
                    <SelectItem value="VT">Vermont (up to 8.75%)</SelectItem>
                    <SelectItem value="WA">Washington (No Wage Tax; CG Excise)</SelectItem>
                    <SelectItem value="WY">Wyoming (No Income Tax)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Annual model: the target state's tax rules apply starting in the first projection year when Spouse 1 reaches this age. For higher-tax targets, you'll get pre-move planning advice.
                </p>
              </div>
            </>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Label htmlFor="inflationRate">Inflation Rate (%)</Label>
            <InfoTooltip text="Adjusts Social Security benefits, tax brackets, and standard deduction each year. 2.5% is a common long-term assumption." />
          </div>
          <Select
            value={String(taxSettings.inflationRate || 2.5)}
            onValueChange={(value) => handleChange('inflationRate', parseFloat(value))}
          >
            <SelectTrigger id="inflationRate">
              <SelectValue placeholder="Select inflation rate" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1.5">1.5%</SelectItem>
              <SelectItem value="2">2.0%</SelectItem>
              <SelectItem value="2.5">2.5%</SelectItem>
              <SelectItem value="3">3.0%</SelectItem>
              <SelectItem value="3.5">3.5%</SelectItem>
              <SelectItem value="4">4.0%</SelectItem>
              <SelectItem value="5">5.0%</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Applied to Social Security benefits and standard deduction
          </p>
        </div>

        <div className="pt-4 border-t space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Label htmlFor="rothConversionStrategy">Roth Conversion Strategy</Label>
              <InfoTooltip text="Converting Traditional IRA to Roth pays taxes now to avoid higher taxes later. 'Fill to X% Bracket' converts just enough to fill up to that tax bracket each year." />
            </div>
            <Select
              value={taxSettings.rothConversionStrategy || 'none'}
              onValueChange={(value) => handleChange('rothConversionStrategy', value)}
            >
              <SelectTrigger id="rothConversionStrategy">
                <SelectValue placeholder="Select conversion strategy" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Conversions</SelectItem>
                <SelectItem value="fill_10">Fill to 10% Bracket</SelectItem>
                <SelectItem value="fill_12">Fill to 12% Bracket</SelectItem>
                <SelectItem value="fill_22">Fill to 22% Bracket</SelectItem>
                <SelectItem value="fill_24">Fill to 24% Bracket</SelectItem>
                <SelectItem value="survivor_smooth">Survivor Tax Smoothing</SelectItem>
                <SelectItem value="optimize_consistency">Optimize Bracket Consistency</SelectItem>
                <SelectItem value="custom">Custom Amount</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Convert Traditional to Roth to fill your target tax bracket. "Survivor Tax Smoothing" applies aggressive 24% bracket targeting after a spouse passes to prevent tax spikes.
            </p>
          </div>

          {taxSettings.rothConversionStrategy === 'survivor_smooth' && (
            <div className="space-y-2">
              <Label htmlFor="preSurvivorStrategy">Pre-Survivor Conversion Strategy</Label>
              <Select
                value={(taxSettings as any).preSurvivorStrategy || 'fill_22'}
                onValueChange={(value) => handleChange('preSurvivorStrategy', value)}
              >
                <SelectTrigger id="preSurvivorStrategy">
                  <SelectValue placeholder="Select pre-survivor strategy" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Conversions</SelectItem>
                  <SelectItem value="fill_10">Fill to 10% Bracket</SelectItem>
                  <SelectItem value="fill_12">Fill to 12% Bracket</SelectItem>
                  <SelectItem value="fill_22">Fill to 22% Bracket</SelectItem>
                  <SelectItem value="fill_24">Fill to 24% Bracket</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Your Roth conversion approach before a spouse passes. After the survivor event, the model switches to aggressive 24% bracket filling.
              </p>
            </div>
          )}

          {taxSettings.rothConversionStrategy === 'custom' && (
            <div className="space-y-2">
              <Label htmlFor="rothConversionCustom">Custom Target Income Limit</Label>
              <DebouncedInput
                id="rothConversionCustom"
                type="number"
                step="1000"
                placeholder="94300"
                value={taxSettings.rothConversionCustom || ''}
                onChange={(value) => handleChange('rothConversionCustom', parseFloat(value) || 94300)}
              />
              <p className="text-xs text-muted-foreground">
                Convert up to this taxable income level (adjusted for inflation each year)
              </p>
            </div>
          )}
        </div>

        <div className="pt-4 border-t space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Label htmlFor="optimizationGoal">Optimization Goal</Label>
              <InfoTooltip text="'Minimize Taxes' focuses on reducing total lifetime taxes. 'Maximize Longevity' keeps your portfolio lasting longer. 'Balanced' weighs both objectives." />
            </div>
            <Select
              value={taxSettings.optimizationGoal || 'minimize-taxes'}
              onValueChange={(value) => handleChange('optimizationGoal', value)}
            >
              <SelectTrigger id="optimizationGoal">
                <SelectValue placeholder="Select optimization goal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="minimize-taxes">Minimize Lifetime Taxes</SelectItem>
                <SelectItem value="maximize-longevity">Maximize Fund Longevity</SelectItem>
                <SelectItem value="balanced">Balanced (Both)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Choose whether to prioritize lower taxes, longer fund life, or balance both objectives.
            </p>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">2025 Standard Deduction</span>
            <span className="font-medium">
              {taxSettings.filingStatus === 'married' && '$30,000'}
              {taxSettings.filingStatus === 'single' && '$15,000'}
              {taxSettings.filingStatus === 'hoh' && '$22,500'}
            </span>
          </div>
        </div>

        {taxSettings.filingStatus === 'married' && (
          <>
            <Separator />
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <Label htmlFor="survivorEnabled" className="text-base font-medium">
                      Model Survivor Scenario
                    </Label>
                    <InfoTooltip text="Simulates the financial impact when one spouse passes away. Filing status switches to Single, one Social Security benefit is lost, and spending needs typically decrease to 70-80%." />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Simulate the financial impact when one spouse passes away
                  </p>
                </div>
                <Switch
                  id="survivorEnabled"
                  checked={survivorSettings.enabled}
                  onCheckedChange={(checked) => handleSurvivorChange('enabled', checked)}
                />
              </div>

              {survivorSettings.enabled && (
                <div className="space-y-4 pl-4 border-l-2 border-muted">
                  <div className="flex items-center gap-2 text-sm text-warning">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Survivor scenario affects filing status, Social Security, and spending needs</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="spouse1DeathAge">Spouse 1 Death Age (optional)</Label>
                      <DebouncedInput
                        id="spouse1DeathAge"
                        type="number"
                        min={taxSettings.spouse1Age + 1}
                        max="100"
                        placeholder="Leave blank = lives to 100"
                        value={survivorSettings.spouse1DeathAge || ''}
                        onChange={(value) => {
                          const val = value ? parseInt(value) : null;
                          handleSurvivorChange('spouse1DeathAge', val);
                        }}
                        debounceMs={400}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="spouse2DeathAge">Spouse 2 Death Age (optional)</Label>
                      <DebouncedInput
                        id="spouse2DeathAge"
                        type="number"
                        min={taxSettings.spouse2Age + 1}
                        max="100"
                        placeholder="Leave blank = lives to 100"
                        value={survivorSettings.spouse2DeathAge || ''}
                        onChange={(value) => {
                          const val = value ? parseInt(value) : null;
                          handleSurvivorChange('spouse2DeathAge', val);
                        }}
                        debounceMs={400}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <Label htmlFor="survivorSpending">Survivor Spending Adjustment (%)</Label>
                      <InfoTooltip text="After a spouse passes, living expenses typically drop. 75% means the survivor needs 75% of the couple's original spending." />
                    </div>
                    <DebouncedInput
                      id="survivorSpending"
                      type="number"
                      min="50"
                      max="100"
                      value={survivorSettings.survivorSpendingPercent}
                      onChange={(value) => handleSurvivorChange('survivorSpendingPercent', parseFloat(value) || 75)}
                      debounceMs={400}
                    />
                    <p className="text-xs text-muted-foreground">
                      Typical survivor needs 70-80% of couple's spending (default: 75%)
                    </p>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

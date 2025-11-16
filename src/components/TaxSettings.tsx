import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

interface TaxSettingsProps {
  taxSettings: {
    filingStatus: string;
    state: string;
    stateRate: number;
    spouse1Age: number;
    spouse2Age: number;
    calculationMode: 'expenses' | 'takeHome';
    annualExpenses: number;
    targetTakeHome: number;
    inflationRate: number;
    optimizeRothConversions: boolean;
    rothConversionTarget: number;
    optimizeBracketConsistency: boolean;
    targetBracketStrategy: string;
    customBracketLimit: number;
  };
  onChange: (settings: any) => void;
}

export function TaxSettings({ taxSettings, onChange }: TaxSettingsProps) {
  const handleChange = (field: string, value: string | number | boolean) => {
    onChange({ ...taxSettings, [field]: value });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tax Settings</CardTitle>
        <CardDescription>Configure your tax filing status and state tax rate</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="filingStatus">Filing Status</Label>
          <Select
            value={taxSettings.filingStatus}
            onValueChange={(value) => handleChange('filingStatus', value)}
          >
            <SelectTrigger id="filingStatus">
              <SelectValue placeholder="Select filing status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="single">Single</SelectItem>
              <SelectItem value="married">Married Filing Jointly</SelectItem>
              <SelectItem value="hoh">Head of Household</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="spouse1Age">Spouse 1 Current Age</Label>
            <Input
              id="spouse1Age"
              type="number"
              min="50"
              max="100"
              value={taxSettings.spouse1Age || ''}
              onChange={(e) => handleChange('spouse1Age', parseFloat(e.target.value) || 65)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="spouse2Age">Spouse 2 Current Age</Label>
            <Input
              id="spouse2Age"
              type="number"
              min="50"
              max="100"
              value={taxSettings.spouse2Age || ''}
              onChange={(e) => handleChange('spouse2Age', parseFloat(e.target.value) || 65)}
            />
          </div>
        </div>
        
        <p className="text-xs text-muted-foreground">
          Projections will run until both spouses reach age 100
        </p>

        <div className="space-y-4">
          <Label>Calculation Mode</Label>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => handleChange('calculationMode', 'expenses')}
              className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${
                taxSettings.calculationMode === 'expenses'
                  ? 'border-primary bg-primary/10 text-primary font-semibold'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <div className="text-sm font-medium">Expense Mode</div>
              <div className="text-xs text-muted-foreground mt-1">
                Specify desired spending
              </div>
            </button>
            <button
              type="button"
              onClick={() => handleChange('calculationMode', 'takeHome')}
              className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${
                taxSettings.calculationMode === 'takeHome'
                  ? 'border-primary bg-primary/10 text-primary font-semibold'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <div className="text-sm font-medium">Take Home Mode</div>
              <div className="text-xs text-muted-foreground mt-1">
                Specify after-tax income
              </div>
            </button>
          </div>
        </div>

        {taxSettings.calculationMode === 'expenses' ? (
          <div className="space-y-2">
            <Label htmlFor="annualExpenses">Annual Expenses (After Taxes)</Label>
            <Input
              id="annualExpenses"
              type="number"
              step="1000"
              placeholder="60000"
              value={taxSettings.annualExpenses || ''}
              onChange={(e) => handleChange('annualExpenses', parseFloat(e.target.value) || 60000)}
            />
            <p className="text-xs text-muted-foreground">
              Your target annual spending needs
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="targetTakeHome">Target Take Home Income</Label>
            <Input
              id="targetTakeHome"
              type="number"
              step="1000"
              placeholder="80000"
              value={taxSettings.targetTakeHome || ''}
              onChange={(e) => handleChange('targetTakeHome', parseFloat(e.target.value) || 80000)}
            />
            <p className="text-xs text-muted-foreground">
              Your desired after-tax income (including Social Security). The model will calculate required withdrawals.
            </p>
          </div>
        )}

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
              <SelectItem value="WA">Washington</SelectItem>
              <SelectItem value="WV">West Virginia</SelectItem>
              <SelectItem value="WI">Wisconsin</SelectItem>
              <SelectItem value="WY">Wyoming</SelectItem>
              <SelectItem value="other">Other (Custom Rate)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            State income tax, capital gains tax, and Social Security taxation
          </p>
        </div>

        {taxSettings.state === 'other' && (
          <div className="space-y-2">
            <Label htmlFor="stateRate">State Income Tax Rate (%)</Label>
            <Input
              id="stateRate"
              type="number"
              step="0.1"
              placeholder="0.0"
              value={taxSettings.stateRate || ''}
              onChange={(e) => handleChange('stateRate', parseFloat(e.target.value) || 0)}
            />
            <p className="text-xs text-muted-foreground">
              Custom state income tax rate (does not include SS-specific rules)
            </p>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="inflationRate">Inflation Rate (%)</Label>
          <Input
            id="inflationRate"
            type="number"
            step="0.1"
            placeholder="2.5"
            value={taxSettings.inflationRate || ''}
            onChange={(e) => handleChange('inflationRate', parseFloat(e.target.value) || 2.5)}
          />
          <p className="text-xs text-muted-foreground">
            Applied to Social Security benefits and standard deduction
          </p>
        </div>

        <div className="pt-4 border-t space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="optimizeBracketConsistency">Optimize for Consistent Tax Bracket</Label>
              <input
                id="optimizeBracketConsistency"
                type="checkbox"
                className="h-4 w-4 rounded border-input"
                checked={taxSettings.optimizeBracketConsistency || false}
                onChange={(e) => handleChange('optimizeBracketConsistency', e.target.checked)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Maintain steady tax brackets by intelligently timing withdrawals and conversions
            </p>
          </div>

          {taxSettings.optimizeBracketConsistency && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="targetBracketStrategy">Target Bracket Strategy</Label>
                <Select
                  value={taxSettings.targetBracketStrategy || 'auto'}
                  onValueChange={(value) => handleChange('targetBracketStrategy', value)}
                >
                  <SelectTrigger id="targetBracketStrategy">
                    <SelectValue placeholder="Select strategy" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto-calculate optimal</SelectItem>
                    <SelectItem value="12%">Stay in 12% bracket (up to $94,300 MFJ)</SelectItem>
                    <SelectItem value="22%">Stay in 22% bracket (up to $201,050 MFJ)</SelectItem>
                    <SelectItem value="24%">Stay in 24% bracket (up to $383,900 MFJ)</SelectItem>
                    <SelectItem value="custom">Custom income limit</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Choose how aggressively to convert Traditional to Roth
                </p>
              </div>

              {taxSettings.targetBracketStrategy === 'custom' && (
                <div className="space-y-2">
                  <Label htmlFor="customBracketLimit">Custom Income Limit</Label>
                  <Input
                    id="customBracketLimit"
                    type="number"
                    step="1000"
                    placeholder="150000"
                    value={taxSettings.customBracketLimit || ''}
                    onChange={(e) => handleChange('customBracketLimit', parseFloat(e.target.value) || 150000)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Target maximum income for each year
                  </p>
                </div>
              )}
            </div>
          )}

          {!taxSettings.optimizeBracketConsistency && (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="optimizeRothConversions">Optimize Roth Conversions</Label>
                  <input
                    id="optimizeRothConversions"
                    type="checkbox"
                    className="h-4 w-4 rounded border-input"
                    checked={taxSettings.optimizeRothConversions || false}
                    onChange={(e) => handleChange('optimizeRothConversions', e.target.checked)}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Automatically convert Traditional to Roth in early retirement to minimize lifetime taxes
                </p>
              </div>

              {taxSettings.optimizeRothConversions && (
                <div className="space-y-2">
                  <Label htmlFor="rothConversionTarget">Target Tax Bracket (Income Limit)</Label>
                  <Input
                    id="rothConversionTarget"
                    type="number"
                    step="1000"
                    placeholder="94300"
                    value={taxSettings.rothConversionTarget || ''}
                    onChange={(e) => handleChange('rothConversionTarget', parseFloat(e.target.value) || 94300)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Convert up to this income level (e.g., top of 12% bracket: $94,300 for married)
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="pt-4 border-t space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">2024 Standard Deduction</span>
            <span className="font-medium">
              {taxSettings.filingStatus === 'married' && '$29,200'}
              {taxSettings.filingStatus === 'single' && '$14,600'}
              {taxSettings.filingStatus === 'hoh' && '$21,900'}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

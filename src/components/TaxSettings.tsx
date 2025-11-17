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
    targetTakeHome: number;
    inflationRate: number;
    optimizeRothConversions: boolean;
    rothConversionTarget: number;
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

        <div className={taxSettings.filingStatus === 'married' ? 'grid grid-cols-2 gap-4' : 'space-y-4'}>
          <div className="space-y-2">
            <Label htmlFor="spouse1Age">
              {taxSettings.filingStatus === 'married' ? 'Spouse 1 Current Age' : 'Current Age'}
            </Label>
            <Input
              id="spouse1Age"
              type="number"
              min="50"
              max="100"
              value={taxSettings.spouse1Age || ''}
              onChange={(e) => handleChange('spouse1Age', parseFloat(e.target.value) || 65)}
            />
          </div>
          
          {taxSettings.filingStatus === 'married' && (
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
          )}
        </div>
        
        <p className="text-xs text-muted-foreground">
          {taxSettings.filingStatus === 'married' 
            ? 'Projections will run until both spouses reach age 100'
            : 'Projections will run until age 100'}
        </p>

        <div className="space-y-2">
          <Label htmlFor="targetTakeHome">Annual Take Home (First Year)</Label>
          <Input
            id="targetTakeHome"
            type="number"
            step="1000"
            placeholder="80000"
            value={taxSettings.targetTakeHome || ''}
            onChange={(e) => handleChange('targetTakeHome', parseFloat(e.target.value) || 80000)}
          />
          <p className="text-xs text-muted-foreground">
            Your desired after-tax income (including Social Security). Model will calculate withdrawals needed to achieve this.
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
            min="0"
            max="15"
            placeholder="3.0"
            value={taxSettings.inflationRate || ''}
            onChange={(e) => handleChange('inflationRate', parseFloat(e.target.value) || 3)}
          />
          <p className="text-xs text-muted-foreground">
            Applied to Social Security benefits and standard deduction
          </p>
        </div>

        <div className="pt-4 border-t space-y-4">
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
              <Label htmlFor="rothConversionTarget">Target Income Limit for Conversions</Label>
              <Input
                id="rothConversionTarget"
                type="number"
                step="1000"
                placeholder="94300"
                value={taxSettings.rothConversionTarget || ''}
                onChange={(e) => handleChange('rothConversionTarget', parseFloat(e.target.value) || 94300)}
              />
              <p className="text-xs text-muted-foreground">
                Convert up to this income level (e.g., top of 12% bracket: $94,300 for MFJ)
              </p>
            </div>
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

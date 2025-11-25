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
    rothConversionStrategy: string;
    rothConversionCustom: number;
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
        <CardDescription>Configure state taxes, take-home goals, and conversion strategy</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
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
            <Label htmlFor="rothConversionStrategy">Roth Conversion Strategy</Label>
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
                <SelectItem value="custom">Custom Amount</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Automatically convert Traditional to Roth to fill your target tax bracket. Works at any age, including after RMDs start.
            </p>
          </div>

          {taxSettings.rothConversionStrategy === 'custom' && (
            <div className="space-y-2">
              <Label htmlFor="rothConversionCustom">Custom Target Income Limit</Label>
              <Input
                id="rothConversionCustom"
                type="number"
                step="1000"
                placeholder="94300"
                value={taxSettings.rothConversionCustom || ''}
                onChange={(e) => handleChange('rothConversionCustom', parseFloat(e.target.value) || 94300)}
              />
              <p className="text-xs text-muted-foreground">
                Convert up to this taxable income level (adjusted for inflation each year)
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

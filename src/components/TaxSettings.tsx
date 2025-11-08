import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

interface TaxSettingsProps {
  taxSettings: {
    filingStatus: string;
    stateRate: number;
    spouse1Age: number;
    spouse2Age: number;
    annualExpenses: number;
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
            Enter 0 if you live in a state with no income tax
          </p>
        </div>

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

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DebouncedInput } from "@/components/ui/DebouncedInput";

interface HouseholdInputsProps {
  taxSettings: {
    filingStatus: string;
    spouse1Age: number;
    spouse2Age: number;
  };
  onChange: (settings: any) => void;
}

export function HouseholdInputs({ taxSettings, onChange }: HouseholdInputsProps) {
  const handleChange = (field: string, value: string | number) => {
    onChange({ ...taxSettings, [field]: value });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Household & Demographics</CardTitle>
        <CardDescription>Basic information about your household</CardDescription>
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
            <DebouncedInput
              id="spouse1Age"
              type="number"
              min="50"
              max="99"
              value={taxSettings.spouse1Age ? Math.min(taxSettings.spouse1Age, 99) : ''}
              onChange={(value) => handleChange('spouse1Age', Math.min(parseFloat(value) || 65, 99))}
              debounceMs={400}
            />
          </div>
          
          {taxSettings.filingStatus === 'married' && (
            <div className="space-y-2">
              <Label htmlFor="spouse2Age">Spouse 2 Current Age</Label>
              <DebouncedInput
                id="spouse2Age"
                type="number"
                min="50"
                max="99"
                value={taxSettings.spouse2Age ? Math.min(taxSettings.spouse2Age, 99) : ''}
                onChange={(value) => handleChange('spouse2Age', Math.min(parseFloat(value) || 65, 99))}
                debounceMs={400}
              />
            </div>
          )}
        </div>
        
        <p className="text-xs text-muted-foreground">
          {taxSettings.filingStatus === 'married' 
            ? 'Projections will run until both spouses reach age 100'
            : 'Projections will run until age 100'}
        </p>
      </CardContent>
    </Card>
  );
}

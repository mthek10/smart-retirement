import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DebouncedInput } from "@/components/ui/DebouncedInput";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle } from "lucide-react";

interface SurvivorSettings {
  enabled: boolean;
  spouse1DeathAge: number | null;
  spouse2DeathAge: number | null;
  survivorSpendingPercent: number;
}

interface HouseholdInputsProps {
  taxSettings: {
    filingStatus: string;
    spouse1Age: number;
    spouse2Age: number;
    survivorSettings?: SurvivorSettings;
  };
  onChange: (settings: any) => void;
}

export function HouseholdInputs({ taxSettings, onChange }: HouseholdInputsProps) {
  const handleChange = (field: string, value: string | number) => {
    onChange({ ...taxSettings, [field]: value });
  };

  const handleSurvivorChange = (field: string, value: boolean | number | null) => {
    const currentSurvivor = taxSettings.survivorSettings || {
      enabled: false,
      spouse1DeathAge: null,
      spouse2DeathAge: null,
      survivorSpendingPercent: 75,
    };
    
    // When enabling survivor scenario, auto-select survivor_smooth strategy
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

  const survivorSettings = taxSettings.survivorSettings || {
    enabled: false,
    spouse1DeathAge: null,
    spouse2DeathAge: null,
    survivorSpendingPercent: 75,
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
              max="100"
              value={taxSettings.spouse1Age || ''}
              onChange={(value) => handleChange('spouse1Age', parseFloat(value) || 65)}
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
                max="100"
                value={taxSettings.spouse2Age || ''}
                onChange={(value) => handleChange('spouse2Age', parseFloat(value) || 65)}
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

        {taxSettings.filingStatus === 'married' && (
          <>
            <Separator />
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="survivorEnabled" className="text-base font-medium">
                    Model Survivor Scenario
                  </Label>
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
                    <Label htmlFor="survivorSpending">Survivor Spending Adjustment (%)</Label>
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

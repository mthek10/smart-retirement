import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { DebouncedInput } from "@/components/ui/DebouncedInput";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";

interface EmploymentInputsProps {
  taxSettings: {
    filingStatus: string;
    spouse1Employment: {
      currentIncome: number;
      retirementAge: number;
      contributes401k: boolean;
      contribution401kAmount: number;
      employerMatchAmount: number;
    };
    spouse2Employment: {
      currentIncome: number;
      retirementAge: number;
      contributes401k: boolean;
      contribution401kAmount: number;
      employerMatchAmount: number;
    };
  };
  onChange: (settings: any) => void;
  spouse1Age: number;
  spouse2Age: number;
}
export function EmploymentInputs({ taxSettings, onChange, spouse1Age, spouse2Age }: EmploymentInputsProps) {
  const handleSpouse1Change = (field: string, value: number | boolean) => {
    onChange({
      ...taxSettings,
      spouse1Employment: { ...taxSettings.spouse1Employment, [field]: value }
    });
  };

  const handleSpouse2Change = (field: string, value: number | boolean) => {
    onChange({
      ...taxSettings,
      spouse2Employment: { ...taxSettings.spouse2Employment, [field]: value }
    });
  };

  const isMarried = taxSettings.filingStatus === 'married';

  return (
    <Card>
      <CardHeader>
        <CardTitle>Employment Income</CardTitle>
        <CardDescription>Configure current employment income if still working</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Spouse 1 Employment */}
        <div className="space-y-4 pb-4 border-b">
          <h3 className="font-medium">{isMarried ? 'Spouse 1 Employment' : 'Employment Details'}</h3>
          
          <div className="space-y-2">
            <Label htmlFor="spouse1Income">Current Annual Salary (W-2)</Label>
            <DebouncedInput
              id="spouse1Income"
              type="number"
              step="1000"
              placeholder="0"
              value={taxSettings.spouse1Employment.currentIncome || ''}
              onChange={(value) => handleSpouse1Change('currentIncome', parseFloat(value) || 0)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="spouse1RetirementAge">Expected Retirement Age</Label>
            <div className="flex items-center gap-4">
              <DebouncedInput
                id="spouse1RetirementAge"
                type="number"
                min="50"
                max="75"
                value={taxSettings.spouse1Employment.retirementAge || ''}
                onChange={(value) => handleSpouse1Change('retirementAge', parseFloat(value) || 65)}
                disabled={taxSettings.spouse1Employment.retirementAge === spouse1Age}
                className="flex-1"
              />
              <div className="flex items-center gap-2">
                <Checkbox
                  id="spouse1-use-current-age"
                  checked={taxSettings.spouse1Employment.retirementAge === spouse1Age}
                  onCheckedChange={(checked) => {
                    onChange({
                      ...taxSettings,
                      spouse1Employment: {
                        ...taxSettings.spouse1Employment,
                        retirementAge: checked ? spouse1Age : 65,
                        ...(checked ? { contributes401k: false } : {}),
                      },
                    });
                  }}
                />
                <Label htmlFor="spouse1-use-current-age" className="text-sm whitespace-nowrap cursor-pointer">
                  Already retired
                </Label>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between space-x-2">
            <Label htmlFor="spouse1-401k" className="flex-1">Contributing to 401(k)?</Label>
            <Switch
              id="spouse1-401k"
              checked={taxSettings.spouse1Employment.contributes401k}
              onCheckedChange={(checked) => handleSpouse1Change('contributes401k', checked)}
              disabled={taxSettings.spouse1Employment.retirementAge === spouse1Age}
            />
          </div>

          {taxSettings.spouse1Employment.contributes401k && (
            <>
              <div className="space-y-2">
                <Label htmlFor="spouse1Contribution">Annual Employee 401(k) Contribution ($)</Label>
                <DebouncedInput
                  id="spouse1Contribution"
                  type="number"
                  step="1000"
                  min="0"
                  placeholder="23000"
                  value={taxSettings.spouse1Employment.contribution401kAmount || ''}
                  onChange={(value) => handleSpouse1Change('contribution401kAmount', parseFloat(value) || 0)}
                />
                <p className="text-xs text-muted-foreground">
                  2024 limit: $23,000 ($30,500 if age 50+). Automatically increases with inflation.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="spouse1Match">Annual Employer Match ($)</Label>
                <DebouncedInput
                  id="spouse1Match"
                  type="number"
                  step="1000"
                  min="0"
                  placeholder="10000"
                  value={taxSettings.spouse1Employment.employerMatchAmount || ''}
                  onChange={(value) => handleSpouse1Change('employerMatchAmount', parseFloat(value) || 0)}
                />
                <p className="text-xs text-muted-foreground">
                  Enter your employer's total annual match amount. Automatically increases with inflation.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Spouse 2 Employment */}
        {isMarried && (
          <div className="space-y-4">
            <h3 className="font-medium">Spouse 2 Employment</h3>
            
            <div className="space-y-2">
              <Label htmlFor="spouse2Income">Current Annual Salary (W-2)</Label>
              <DebouncedInput
                id="spouse2Income"
                type="number"
                step="1000"
                placeholder="0"
                value={taxSettings.spouse2Employment.currentIncome || ''}
                onChange={(value) => handleSpouse2Change('currentIncome', parseFloat(value) || 0)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="spouse2RetirementAge">Expected Retirement Age</Label>
              <div className="flex items-center gap-4">
                <DebouncedInput
                  id="spouse2RetirementAge"
                  type="number"
                  min="50"
                  max="75"
                  value={taxSettings.spouse2Employment.retirementAge || ''}
                  onChange={(value) => handleSpouse2Change('retirementAge', parseFloat(value) || 65)}
                  disabled={taxSettings.spouse2Employment.retirementAge === spouse2Age}
                  className="flex-1"
                />
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="spouse2-use-current-age"
                    checked={taxSettings.spouse2Employment.retirementAge === spouse2Age}
                    onCheckedChange={(checked) => {
                      onChange({
                        ...taxSettings,
                        spouse2Employment: {
                          ...taxSettings.spouse2Employment,
                          retirementAge: checked ? spouse2Age : 65,
                          ...(checked ? { contributes401k: false } : {}),
                        },
                      });
                    }}
                  />
                  <Label htmlFor="spouse2-use-current-age" className="text-sm whitespace-nowrap cursor-pointer">
                    Already retired
                  </Label>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between space-x-2">
              <Label htmlFor="spouse2-401k" className="flex-1">Contributing to 401(k)?</Label>
              <Switch
                id="spouse2-401k"
                checked={taxSettings.spouse2Employment.contributes401k}
                onCheckedChange={(checked) => handleSpouse2Change('contributes401k', checked)}
                disabled={taxSettings.spouse2Employment.retirementAge === spouse2Age}
              />
            </div>

            {taxSettings.spouse2Employment.contributes401k && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="spouse2Contribution">Annual Employee 401(k) Contribution ($)</Label>
                  <DebouncedInput
                    id="spouse2Contribution"
                    type="number"
                    step="1000"
                    min="0"
                    placeholder="23000"
                    value={taxSettings.spouse2Employment.contribution401kAmount || ''}
                    onChange={(value) => handleSpouse2Change('contribution401kAmount', parseFloat(value) || 0)}
                  />
                  <p className="text-xs text-muted-foreground">
                    2024 limit: $23,000 ($30,500 if age 50+). Automatically increases with inflation.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="spouse2Match">Annual Employer Match ($)</Label>
                  <DebouncedInput
                    id="spouse2Match"
                    type="number"
                    step="1000"
                    min="0"
                    placeholder="10000"
                    value={taxSettings.spouse2Employment.employerMatchAmount || ''}
                    onChange={(value) => handleSpouse2Change('employerMatchAmount', parseFloat(value) || 0)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter your employer's total annual match amount. Automatically increases with inflation.
                  </p>
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

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
}

export function EmploymentInputs({ taxSettings, onChange }: EmploymentInputsProps) {
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
            <Input
              id="spouse1Income"
              type="number"
              step="1000"
              placeholder="0"
              value={taxSettings.spouse1Employment.currentIncome || ''}
              onChange={(e) => handleSpouse1Change('currentIncome', parseFloat(e.target.value) || 0)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="spouse1RetirementAge">Expected Retirement Age</Label>
            <Input
              id="spouse1RetirementAge"
              type="number"
              min="50"
              max="75"
              value={taxSettings.spouse1Employment.retirementAge || ''}
              onChange={(e) => handleSpouse1Change('retirementAge', parseFloat(e.target.value) || 65)}
            />
          </div>

          <div className="flex items-center justify-between space-x-2">
            <Label htmlFor="spouse1-401k" className="flex-1">Contributing to 401(k)?</Label>
            <Switch
              id="spouse1-401k"
              checked={taxSettings.spouse1Employment.contributes401k}
              onCheckedChange={(checked) => handleSpouse1Change('contributes401k', checked)}
            />
          </div>

          {taxSettings.spouse1Employment.contributes401k && (
            <>
              <div className="space-y-2">
                <Label htmlFor="spouse1Contribution">Annual Employee 401(k) Contribution ($)</Label>
                <Input
                  id="spouse1Contribution"
                  type="number"
                  step="1000"
                  min="0"
                  placeholder="23000"
                  value={taxSettings.spouse1Employment.contribution401kAmount || ''}
                  onChange={(e) => handleSpouse1Change('contribution401kAmount', parseFloat(e.target.value) || 0)}
                />
                <p className="text-xs text-muted-foreground">
                  2024 limit: $23,000 ($30,500 if age 50+). Automatically increases with inflation.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="spouse1Match">Annual Employer Match ($)</Label>
                <Input
                  id="spouse1Match"
                  type="number"
                  step="1000"
                  min="0"
                  placeholder="10000"
                  value={taxSettings.spouse1Employment.employerMatchAmount || ''}
                  onChange={(e) => handleSpouse1Change('employerMatchAmount', parseFloat(e.target.value) || 0)}
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
              <Input
                id="spouse2Income"
                type="number"
                step="1000"
                placeholder="0"
                value={taxSettings.spouse2Employment.currentIncome || ''}
                onChange={(e) => handleSpouse2Change('currentIncome', parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="spouse2RetirementAge">Expected Retirement Age</Label>
              <Input
                id="spouse2RetirementAge"
                type="number"
                min="50"
                max="75"
                value={taxSettings.spouse2Employment.retirementAge || ''}
                onChange={(e) => handleSpouse2Change('retirementAge', parseFloat(e.target.value) || 65)}
              />
            </div>

            <div className="flex items-center justify-between space-x-2">
              <Label htmlFor="spouse2-401k" className="flex-1">Contributing to 401(k)?</Label>
              <Switch
                id="spouse2-401k"
                checked={taxSettings.spouse2Employment.contributes401k}
                onCheckedChange={(checked) => handleSpouse2Change('contributes401k', checked)}
              />
            </div>

            {taxSettings.spouse2Employment.contributes401k && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="spouse2Contribution">Annual Employee 401(k) Contribution ($)</Label>
                  <Input
                    id="spouse2Contribution"
                    type="number"
                    step="1000"
                    min="0"
                    placeholder="23000"
                    value={taxSettings.spouse2Employment.contribution401kAmount || ''}
                    onChange={(e) => handleSpouse2Change('contribution401kAmount', parseFloat(e.target.value) || 0)}
                  />
                  <p className="text-xs text-muted-foreground">
                    2024 limit: $23,000 ($30,500 if age 50+). Automatically increases with inflation.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="spouse2Match">Annual Employer Match ($)</Label>
                  <Input
                    id="spouse2Match"
                    type="number"
                    step="1000"
                    min="0"
                    placeholder="10000"
                    value={taxSettings.spouse2Employment.employerMatchAmount || ''}
                    onChange={(e) => handleSpouse2Change('employerMatchAmount', parseFloat(e.target.value) || 0)}
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

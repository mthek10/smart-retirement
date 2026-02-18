import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { DebouncedInput } from "@/components/ui/DebouncedInput";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { get401kLimit } from "@/lib/taxCalculations";

function AgeInput({ id, value, onChange, disabled, className, minAge }: { id: string; value: number; onChange: (val: number) => void; disabled?: boolean; label?: string; className?: string; minAge?: number }) {
  const [localValue, setLocalValue] = useState(String(value || ''));

  useEffect(() => {
    setLocalValue(String(value || ''));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 2);
    setLocalValue(raw);
    const num = parseInt(raw, 10);
    if (!isNaN(num) && num >= 1 && num <= 99) {
      onChange(num);
    }
  };

  const effectiveMin = minAge ?? 50;

  const handleBlur = () => {
    const num = parseInt(localValue, 10);
    if (isNaN(num) || num < effectiveMin) {
      const clamped = Math.max(value, effectiveMin);
      setLocalValue(String(clamped));
      if (value < effectiveMin) onChange(clamped);
    } else if (num > 99) {
      setLocalValue('99');
      onChange(99);
    }
  };

  return (
    <Input
      id={id}
      type="text"
      inputMode="numeric"
      maxLength={2}
      value={localValue}
      onChange={handleChange}
      onBlur={handleBlur}
      disabled={disabled}
      className={className}
    />
  );
}

interface EmploymentSettings {
  currentIncome: number;
  retirementAge: number;
  contributes401k: boolean;
  contribution401kAmount: number;
  roth401kAmount: number;
  employerMatchAmount: number;
}

interface EmploymentInputsProps {
  taxSettings: {
    filingStatus: string;
    spouse1Employment: EmploymentSettings;
    spouse2Employment: EmploymentSettings;
  };
  onChange: (settings: any) => void;
  spouse1Age: number;
  spouse2Age: number;
}

function getLimitLabel(age: number): string {
  if (age >= 60 && age <= 63) return `age 60-63, SECURE 2.0 super catch-up`;
  if (age >= 50) return `age 50+`;
  return `under 50`;
}

function Spouse401kInputs({
  prefix,
  employment,
  age,
  limit,
  onChange,
}: {
  prefix: string;
  employment: EmploymentSettings;
  age: number;
  limit: number;
  onChange: (field: string, value: number | boolean) => void;
}) {
  const traditionalAmount = employment.contribution401kAmount || 0;
  const rothAmount = employment.roth401kAmount || 0;
  const combined = traditionalAmount + rothAmount;
  const remaining = Math.max(0, limit - combined);

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor={`${prefix}Contribution`}>Traditional 401(k) Contribution ($)</Label>
        <DebouncedInput
          id={`${prefix}Contribution`}
          type="number"
          step="1000"
          min="0"
          placeholder="0"
          value={employment.contribution401kAmount || ''}
          onChange={(value) => {
            const val = parseFloat(value) || 0;
            const maxAllowed = limit - (employment.roth401kAmount || 0);
            onChange('contribution401kAmount', Math.min(Math.max(val, 0), Math.max(maxAllowed, 0)));
          }}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${prefix}Roth`}>Roth 401(k) Contribution ($)</Label>
        <DebouncedInput
          id={`${prefix}Roth`}
          type="number"
          step="1000"
          min="0"
          placeholder="0"
          value={employment.roth401kAmount || ''}
          onChange={(value) => {
            const val = parseFloat(value) || 0;
            const maxAllowed = limit - (employment.contribution401kAmount || 0);
            onChange('roth401kAmount', Math.min(Math.max(val, 0), Math.max(maxAllowed, 0)));
          }}
        />
      </div>

      <p className="text-xs text-muted-foreground">
        Combined limit: <strong>${limit.toLocaleString()}</strong> ({getLimitLabel(age)}).
        {combined > 0 && ` Used: $${combined.toLocaleString()} · Remaining: $${remaining.toLocaleString()}.`}
        {' '}Automatically increases with inflation.
      </p>

      <div className="space-y-2">
        <Label htmlFor={`${prefix}Match`}>Annual Employer Match ($)</Label>
        <DebouncedInput
          id={`${prefix}Match`}
          type="number"
          step="1000"
          min="0"
          placeholder="10000"
          value={employment.employerMatchAmount || ''}
          onChange={(value) => onChange('employerMatchAmount', parseFloat(value) || 0)}
        />
        <p className="text-xs text-muted-foreground">
          Enter your employer's total annual match amount. Automatically increases with inflation.
        </p>
      </div>
    </>
  );
}

export function EmploymentInputs({ taxSettings, onChange, spouse1Age, spouse2Age }: EmploymentInputsProps) {
  const spouse1Limit = get401kLimit(spouse1Age);
  const spouse2Limit = get401kLimit(spouse2Age);

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
              <AgeInput
                id="spouse1RetirementAge"
                value={taxSettings.spouse1Employment.retirementAge}
                onChange={(val) => handleSpouse1Change('retirementAge', val)}
                disabled={taxSettings.spouse1Employment.retirementAge === spouse1Age}
                className="flex-1"
                minAge={spouse1Age + 1}
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
            <p className="text-xs text-muted-foreground">
              Enter an age greater than your current age ({spouse1Age}), or check "Already retired" if you are no longer working.
            </p>
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
            <Spouse401kInputs
              prefix="spouse1"
              employment={taxSettings.spouse1Employment}
              age={spouse1Age}
              limit={spouse1Limit}
              onChange={handleSpouse1Change}
            />
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
                <AgeInput
                  id="spouse2RetirementAge"
                  value={taxSettings.spouse2Employment.retirementAge}
                  onChange={(val) => handleSpouse2Change('retirementAge', val)}
                  disabled={taxSettings.spouse2Employment.retirementAge === spouse2Age}
                  className="flex-1"
                  minAge={spouse2Age + 1}
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
              <p className="text-xs text-muted-foreground">
                Enter an age greater than your current age ({spouse2Age}), or check "Already retired" if you are no longer working.
              </p>
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
              <Spouse401kInputs
                prefix="spouse2"
                employment={taxSettings.spouse2Employment}
                age={spouse2Age}
                limit={spouse2Limit}
                onChange={handleSpouse2Change}
              />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

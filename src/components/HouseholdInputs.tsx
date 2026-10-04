import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

interface HouseholdInputsProps {
  taxSettings: {
    filingStatus: string;
    spouse1Age: number;
    spouse2Age: number;
    projectionEndAge?: number;
  };
  onChange: (settings: any) => void;
}

function AgeInput({ id, value, onChange, label }: { id: string; value: number; onChange: (val: number) => void; label: string }) {
  const [localValue, setLocalValue] = useState(String(value || ''));

  useEffect(() => {
    setLocalValue(String(value || ''));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 2); // digits only, max 2 chars
    setLocalValue(raw);
    const num = parseInt(raw, 10);
    if (!isNaN(num) && num >= 1 && num <= 99) {
      onChange(num);
    }
  };

  const handleBlur = () => {
    const num = parseInt(localValue, 10);
    if (isNaN(num) || num < 50) {
      setLocalValue(String(value));
    } else if (num > 99) {
      setLocalValue('99');
      onChange(99);
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="text"
        inputMode="numeric"
        maxLength={2}
        value={localValue}
        onChange={handleChange}
        onBlur={handleBlur}
      />
    </div>
  );
}

function PlanEndAgeInput({ taxSettings, onCommit }: { taxSettings: HouseholdInputsProps['taxSettings']; onCommit: (val: number) => void }) {
  const isMarried = taxSettings.filingStatus === 'married';
  const youngest = isMarried && taxSettings.spouse2Age > 0 ? Math.min(taxSettings.spouse1Age, taxSettings.spouse2Age) : taxSettings.spouse1Age;
  const min = Math.min(100, (youngest || 0) + 1);
  const value = Math.min(100, Math.max(min, taxSettings.projectionEndAge ?? 100));
  const [local, setLocal] = useState(String(value));
  useEffect(() => { setLocal(String(value)); }, [value]);
  const commit = () => {
    const n = parseInt(local, 10);
    const clamped = isNaN(n) ? value : Math.min(100, Math.max(min, n));
    setLocal(String(clamped));
    if (clamped !== taxSettings.projectionEndAge) onCommit(clamped);
  };
  return (
    <div className="space-y-2">
      <Label htmlFor="projectionEndAge">Plan Until Age</Label>
      <Input id="projectionEndAge" type="text" inputMode="numeric" maxLength={3} value={local}
        onChange={(e) => setLocal(e.target.value.replace(/\D/g, '').slice(0, 3))} onBlur={commit} />
      <p className="text-xs text-muted-foreground">
        {isMarried
          ? `Projections run until the younger spouse reaches age ${value} (between ${min} and 100).`
          : `Projections run until you reach age ${value} (between ${min} and 100).`}
      </p>
    </div>
  );
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
          <AgeInput
            id="spouse1Age"
            value={taxSettings.spouse1Age}
            onChange={(val) => handleChange('spouse1Age', val)}
            label={taxSettings.filingStatus === 'married' ? 'Spouse 1 Current Age' : 'Current Age'}
          />
          
          {taxSettings.filingStatus === 'married' && (
            <AgeInput
              id="spouse2Age"
              value={taxSettings.spouse2Age}
              onChange={(val) => handleChange('spouse2Age', val)}
              label="Spouse 2 Current Age"
            />
          )}
        </div>
        
        <PlanEndAgeInput taxSettings={taxSettings} onCommit={(val) => handleChange('projectionEndAge', val)} />
      </CardContent>
    </Card>
  );
}
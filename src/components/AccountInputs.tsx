import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AccountInputsProps {
  accounts: {
    traditional: number;
    roth: number;
    taxable: number;
    traditionalReturn: number;
    rothReturn: number;
    taxableReturn: number;
  };
  onChange: (accounts: any) => void;
}

export function AccountInputs({ accounts, onChange }: AccountInputsProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const handleChange = (field: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    onChange({ ...accounts, [field]: numValue });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account Balances</CardTitle>
        <CardDescription>Enter your current retirement account balances and expected annual returns</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="traditional">Traditional IRA/401(k)</Label>
            <Input
              id="traditional"
              type="number"
              placeholder="0"
              value={accounts.traditional || ''}
              onChange={(e) => handleChange('traditional', e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              Current: {formatCurrency(accounts.traditional)}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="traditionalReturn">Annual Return (%)</Label>
            <Input
              id="traditionalReturn"
              type="number"
              step="0.1"
              min="0"
              max="15"
              placeholder="3.0"
              value={accounts.traditionalReturn || ''}
              onChange={(e) => handleChange('traditionalReturn', e.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="roth">Roth IRA</Label>
            <Input
              id="roth"
              type="number"
              placeholder="0"
              value={accounts.roth || ''}
              onChange={(e) => handleChange('roth', e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              Current: {formatCurrency(accounts.roth)}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="rothReturn">Annual Return (%)</Label>
            <Input
              id="rothReturn"
              type="number"
              step="0.1"
              min="0"
              max="15"
              placeholder="3.0"
              value={accounts.rothReturn || ''}
              onChange={(e) => handleChange('rothReturn', e.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="taxable">Brokerage</Label>
            <Input
              id="taxable"
              type="number"
              placeholder="0"
              value={accounts.taxable || ''}
              onChange={(e) => handleChange('taxable', e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              Current: {formatCurrency(accounts.taxable)}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="taxableReturn">Annual Return (%)</Label>
            <Input
              id="taxableReturn"
              type="number"
              step="0.1"
              min="0"
              max="15"
              placeholder="3.0"
              value={accounts.taxableReturn || ''}
              onChange={(e) => handleChange('taxableReturn', e.target.value)}
            />
          </div>
        </div>

        <div className="pt-4 border-t">
          <div className="flex justify-between items-center">
            <span className="font-semibold">Total Portfolio</span>
            <span className="text-2xl font-bold text-primary">
              {formatCurrency(accounts.traditional + accounts.roth + accounts.taxable)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

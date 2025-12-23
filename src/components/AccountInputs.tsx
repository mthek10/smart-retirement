import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AccountInputsProps {
  accounts: {
    spouse1Traditional: number;
    spouse2Traditional: number;
    roth: number;
    taxable: number;
    traditionalReturn: number;
    rothReturn: number;
    taxableReturn: number;
    taxableCostBasisPercent: number;
  };
  onChange: (accounts: any) => void;
  filingStatus: string;
}

export function AccountInputs({ accounts, onChange, filingStatus }: AccountInputsProps) {
  const isMarried = filingStatus === 'married';
  const totalTraditional = accounts.spouse1Traditional + (isMarried ? accounts.spouse2Traditional : 0);
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
        {/* Spouse 1 Traditional */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="spouse1Traditional">
              {isMarried ? "Spouse 1 Traditional IRA/401(k)" : "Traditional IRA/401(k)"}
            </Label>
            <Input
              id="spouse1Traditional"
              type="number"
              placeholder="0"
              value={accounts.spouse1Traditional || ''}
              onChange={(e) => handleChange('spouse1Traditional', e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              Current: {formatCurrency(accounts.spouse1Traditional)}
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

        {/* Spouse 2 Traditional (only if married) */}
        {isMarried && (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="spouse2Traditional">Spouse 2 Traditional IRA/401(k)</Label>
              <Input
                id="spouse2Traditional"
                type="number"
                placeholder="0"
                value={accounts.spouse2Traditional || ''}
                onChange={(e) => handleChange('spouse2Traditional', e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Current: {formatCurrency(accounts.spouse2Traditional)}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground pt-6">
                Combined Traditional: {formatCurrency(totalTraditional)}
              </p>
            </div>
          </div>
        )}

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

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="taxableCostBasisPercent">Cost Basis (%)</Label>
            <Input
              id="taxableCostBasisPercent"
              type="number"
              step="1"
              min="0"
              max="100"
              placeholder="50"
              value={accounts.taxableCostBasisPercent || ''}
              onChange={(e) => handleChange('taxableCostBasisPercent', e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              Percentage of brokerage account that is cost basis (default: 50%)
            </p>
          </div>
        </div>

        <div className="pt-4 border-t">
          <div className="flex justify-between items-center">
            <span className="font-semibold">Total Portfolio</span>
            <span className="text-2xl font-bold text-primary">
              {formatCurrency(totalTraditional + accounts.roth + accounts.taxable)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

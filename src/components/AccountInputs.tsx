import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DebouncedInput } from "@/components/ui/DebouncedInput";
import { Label } from "@/components/ui/label";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { formatCurrency } from "@/lib/utils";

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
            <div className="flex items-center gap-1.5">
              <Label htmlFor="spouse1Traditional">
                {isMarried ? "Spouse 1 Traditional IRA/401(k)" : "Traditional IRA/401(k)"}
              </Label>
              <InfoTooltip text="Pre-tax retirement accounts. Withdrawals are taxed as ordinary income. Subject to Required Minimum Distributions (RMDs) starting at age 73." />
            </div>
            <DebouncedInput
              id="spouse1Traditional"
              type="number"
              placeholder="0"
              value={accounts.spouse1Traditional || ''}
              onChange={(value) => handleChange('spouse1Traditional', value)}
              debounceMs={400}
            />
            <p className="text-sm text-muted-foreground">
              Current: {formatCurrency(accounts.spouse1Traditional)}
            </p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Label htmlFor="traditionalReturn">Annual Return (%)</Label>
              <InfoTooltip text="Expected annual growth rate for this account. A conservative 3-4% is typical for retirement planning; historical stock market average is ~7% after inflation." />
            </div>
            <DebouncedInput
              id="traditionalReturn"
              type="number"
              step="0.1"
              min="0"
              max="15"
              placeholder="3.0"
              value={accounts.traditionalReturn || ''}
              onChange={(value) => handleChange('traditionalReturn', value)}
              debounceMs={400}
            />
          </div>
        </div>

        {/* Spouse 2 Traditional (only if married) */}
        {isMarried && (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="spouse2Traditional">Spouse 2 Traditional IRA/401(k)</Label>
              <DebouncedInput
                id="spouse2Traditional"
                type="number"
                placeholder="0"
                value={accounts.spouse2Traditional || ''}
                onChange={(value) => handleChange('spouse2Traditional', value)}
                debounceMs={400}
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
            <div className="flex items-center gap-1.5">
              <Label htmlFor="roth">Roth IRA</Label>
              <InfoTooltip text="After-tax retirement account. Withdrawals are tax-free in retirement. No RMDs required. Ideal for tax-free growth." />
            </div>
            <DebouncedInput
              id="roth"
              type="number"
              placeholder="0"
              value={accounts.roth || ''}
              onChange={(value) => handleChange('roth', value)}
              debounceMs={400}
            />
            <p className="text-sm text-muted-foreground">
              Current: {formatCurrency(accounts.roth)}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="rothReturn">Annual Return (%)</Label>
            <DebouncedInput
              id="rothReturn"
              type="number"
              step="0.1"
              min="0"
              max="15"
              placeholder="3.0"
              value={accounts.rothReturn || ''}
              onChange={(value) => handleChange('rothReturn', value)}
              debounceMs={400}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Label htmlFor="taxable">Brokerage</Label>
              <InfoTooltip text="Taxable investment account. Capital gains are taxed when sold. Long-term gains (held 1+ year) receive favorable tax rates." />
            </div>
            <DebouncedInput
              id="taxable"
              type="number"
              placeholder="0"
              value={accounts.taxable || ''}
              onChange={(value) => handleChange('taxable', value)}
              debounceMs={400}
            />
            <p className="text-sm text-muted-foreground">
              Current: {formatCurrency(accounts.taxable)}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="taxableReturn">Annual Return (%)</Label>
            <DebouncedInput
              id="taxableReturn"
              type="number"
              step="0.1"
              min="0"
              max="15"
              placeholder="3.0"
              value={accounts.taxableReturn || ''}
              onChange={(value) => handleChange('taxableReturn', value)}
              debounceMs={400}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Label htmlFor="taxableCostBasisPercent">Cost Basis (%)</Label>
              <InfoTooltip text="The portion of your brokerage account that represents your original investment (not gains). A 33% cost basis means 67% is unrealized gains that will be taxed when sold." />
            </div>
            <DebouncedInput
              id="taxableCostBasisPercent"
              type="number"
              step="1"
              min="0"
              max="100"
              placeholder="50"
              value={accounts.taxableCostBasisPercent || ''}
              onChange={(value) => handleChange('taxableCostBasisPercent', value)}
              debounceMs={400}
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

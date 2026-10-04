import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { stateTaxData } from "@/lib/stateTaxData";
import type { SpendingPeriod, SpendingPeriodsSettings } from "@/hooks/useProjections";

const STATE_NAMES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California", CO: "Colorado", CT: "Connecticut",
  DE: "Delaware", DC: "District of Columbia", FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho", IL: "Illinois",
  IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
  MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri", MT: "Montana",
  NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico", NY: "New York",
  NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania",
  RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah",
  VT: "Vermont", VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
};
const STATES = Object.keys(stateTaxData).sort((a, b) => STATE_NAMES[a].localeCompare(STATE_NAMES[b]));

interface Props {
  value?: SpendingPeriodsSettings;
  currentAge: number;
  endAge: number;
  defaultTakeHome: number;
  defaultState: string;
  defaultNyc?: boolean;
  onChange: (v: SpendingPeriodsSettings) => void;
}

const fmt = (n: number) => "$" + Math.round(n).toLocaleString("en-US");

// Shared clamping rules: period 1 starts at current age, start ages strictly
// increase, and everything is capped at the plan end age.
export function clampSpendingPeriods(periods: SpendingPeriod[], currentAge: number, endAge: number): SpendingPeriod[] {
  const next = periods.map((p) => ({ ...p }));
  next[0].startAge = currentAge;
  next[1].startAge = Math.max(currentAge + 1, Math.min(endAge, next[1].startAge));
  next[2].startAge = Math.max(next[1].startAge + 1, Math.min(endAge, next[2].startAge));
  return next;
}

export function SpendingPeriodsEditor({ value, currentAge, endAge, defaultTakeHome, defaultState, defaultNyc, onChange }: Props) {
  const enabled = !!value?.enabled;
  const periods: SpendingPeriod[] = value?.periods?.length === 3 ? value.periods : [
    { startAge: currentAge, takeHome: defaultTakeHome, state: defaultState || "none", nycResident: defaultNyc },
    { startAge: Math.min(endAge, currentAge + 10), takeHome: Math.round(defaultTakeHome * 0.85), state: defaultState || "none", nycResident: defaultNyc },
    { startAge: Math.min(endAge, currentAge + 20), takeHome: Math.round(defaultTakeHome * 0.75), state: defaultState || "none", nycResident: defaultNyc },
  ];

  const update = (i: number, patch: Partial<SpendingPeriod>) => {
    const next = periods.map((p, j) => (j === i ? { ...p, ...patch } : p));
    next[0].startAge = currentAge;
    // keep start ages increasing
    next[1].startAge = Math.max(currentAge + 1, Math.min(endAge, next[1].startAge));
    next[2].startAge = Math.max(next[1].startAge + 1, Math.min(endAge, next[2].startAge));
    onChange({ enabled: true, periods: next });
  };

  return (
    <div className="space-y-3 rounded-md border-l-4 border-primary bg-muted/30 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <Label htmlFor="spendingPeriodsEnabled" className="text-base font-medium">Three Spending &amp; State Periods</Label>
          <InfoTooltip text="Set a different yearly take-home and state of residence for three stages of retirement. Amounts are in today's dollars and grow with inflation. When on, this replaces the single take-home amount, the State choice and the relocation planner." />
        </div>
        <Switch id="spendingPeriodsEnabled" checked={enabled} onCheckedChange={(c) => onChange({ enabled: c, periods })} />
      </div>
      {enabled && (
        <div className="space-y-3">
          {periods.map((p, i) => {
            const end = i < 2 ? periods[i + 1].startAge - 1 : endAge;
            return (
              <div key={i} className="grid grid-cols-1 gap-3 rounded-md border bg-card p-3 sm:grid-cols-4">
                <div className="sm:col-span-4 text-sm font-semibold text-foreground">
                  Period {i + 1}: age {p.startAge}–{end}
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`period-start-${i}`} className="text-xs">Starts at age</Label>
                  <Input id={`period-start-${i}`} type="number" disabled={i === 0} defaultValue={p.startAge} key={`${i}-${p.startAge}`}
                    onBlur={(e) => update(i, { startAge: Number(e.target.value) || p.startAge })} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`period-take-${i}`} className="text-xs">Take home / yr (today's $)</Label>
                  <Input id={`period-take-${i}`} inputMode="numeric" defaultValue={fmt(p.takeHome)} key={`t${i}-${p.takeHome}`}
                    onBlur={(e) => update(i, { takeHome: Math.max(0, Number(e.target.value.replace(/[^0-9.]/g, "")) || 0) })} />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs">State</Label>
                  <Select value={p.state || "none"} onValueChange={(v) => update(i, { state: v, nycResident: v === "NY" ? p.nycResident : false })}>
                    <SelectTrigger aria-label={`Period ${i + 1} state`}><SelectValue /></SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      <SelectItem value="none">No State Income Tax</SelectItem>
                      {STATES.map((s) => <SelectItem key={s} value={s}>{STATE_NAMES[s]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {p.state === "NY" && (
                    <label className="flex items-center gap-2 pt-1 text-xs text-foreground">
                      <Switch checked={!!p.nycResident} onCheckedChange={(c) => update(i, { nycResident: c })} />
                      New York City resident
                    </label>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

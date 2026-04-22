import { useCallback, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { Plus, Trash2, ChevronDown, CalendarClock } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { LifeEvent } from "@/hooks/useProjections";

type EventType = "expense" | "income";

// Top 5 most common one-time life events + Home Sale + Other.
// "Home Sale" is special: selecting it switches to the §121 home sale subtype.
type LabelPreset = {
  key: string;
  label: string;
  type: EventType;
  amount: number;
  taxable: boolean;
  isHomeSale?: boolean;
  salePrice?: number;
  costBasis?: number;
  sellingCosts?: number;
};

const LABEL_PRESETS: LabelPreset[] = [
  { key: "wedding", label: "Wedding", type: "expense", amount: 50000, taxable: false },
  { key: "mortgage_payoff", label: "Mortgage Payoff", type: "expense", amount: 200000, taxable: false },
  { key: "home_renovation", label: "Home Renovation", type: "expense", amount: 75000, taxable: false },
  { key: "inheritance", label: "Inheritance", type: "income", amount: 500000, taxable: false },
  { key: "new_vehicle", label: "New Vehicle", type: "expense", amount: 50000, taxable: false },
  {
    key: "home_sale",
    label: "Primary Home Sale (§121)",
    type: "income",
    amount: 750000,
    taxable: true,
    isHomeSale: true,
    salePrice: 750000,
    costBasis: 250000,
    sellingCosts: 45000,
  },
  { key: "other", label: "Other", type: "expense", amount: 0, taxable: false },
];

function EventAgeInput({ value, min, onChange }: { value: number; min: number; onChange: (val: number) => void }) {
  const [local, setLocal] = useState(String(value));

  useEffect(() => { setLocal(String(value)); }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 3);
    setLocal(raw);
    const num = parseInt(raw, 10);
    if (!isNaN(num) && num >= min && num <= 100) onChange(num);
  };

  const handleBlur = () => {
    const num = parseInt(local, 10);
    if (isNaN(num) || num < min) { setLocal(String(value)); }
    else if (num > 100) { setLocal('100'); onChange(100); }
    else { setLocal(String(num)); onChange(num); }
  };

  return <Input type="text" inputMode="numeric" maxLength={3} value={local} onChange={handleChange} onBlur={handleBlur} className="h-8 text-sm" />;
}

interface LifeEventsEditorProps {
  events: LifeEvent[];
  onChange: (events: LifeEvent[]) => void;
  spouse1Age: number;
  filingStatus: string;
}

function getLabelPresetKey(ev: LifeEvent): string {
  if (ev.subtype === "home_sale") return "home_sale";
  const match = LABEL_PRESETS.find(p => !p.isHomeSale && p.label.toLowerCase() === (ev.label || "").toLowerCase());
  return match ? match.key : "other";
}

export function LifeEventsEditor({ events, onChange, spouse1Age, filingStatus }: LifeEventsEditorProps) {
  const isMarried = filingStatus === "married";
  const exclusionCap = isMarried ? 500_000 : 250_000;

  const addEvent = useCallback(() => {
    const newEvent: LifeEvent = {
      id: crypto.randomUUID(),
      label: "",
      type: "expense",
      amount: 0,
      age: spouse1Age + 5,
      taxable: false,
    };
    onChange([...events, newEvent]);
  }, [events, onChange, spouse1Age]);

  const updateEvent = useCallback((id: string, updates: Partial<LifeEvent>) => {
    onChange(events.map(e => e.id === id ? { ...e, ...updates } : e));
  }, [events, onChange]);

  const changeLabelPreset = useCallback((id: string, presetKey: string) => {
    const preset = LABEL_PRESETS.find(p => p.key === presetKey);
    if (!preset) return;
    const existing = events.find(e => e.id === id);
    if (!existing) return;

    if (preset.isHomeSale) {
      // Switch to home sale subtype
      onChange(events.map(e => e.id === id ? {
        ...e,
        label: preset.label,
        type: "income",
        subtype: "home_sale",
        amount: preset.salePrice ?? preset.amount,
        taxable: true,
        salePrice: e.salePrice ?? preset.salePrice,
        costBasis: e.costBasis ?? preset.costBasis,
        sellingCosts: e.sellingCosts ?? preset.sellingCosts,
        qualifiesForSection121: e.qualifiesForSection121 ?? true,
      } : e));
      return;
    }

    if (preset.key === "other") {
      // Strip home sale fields if present, keep current type/amount, clear label for user input
      const { subtype, salePrice, costBasis, sellingCosts, qualifiesForSection121, ...rest } = existing;
      onChange(events.map(e => e.id === id ? { ...rest, label: "" } : e));
      return;
    }

    // Regular preset — strip home sale fields, apply preset values
    const { subtype, salePrice, costBasis, sellingCosts, qualifiesForSection121, ...rest } = existing;
    onChange(events.map(e => e.id === id ? {
      ...rest,
      label: preset.label,
      type: preset.type,
      amount: preset.amount,
      taxable: preset.taxable,
    } : e));
  }, [events, onChange]);

  const changeEventType = useCallback((id: string, newType: EventType) => {
    updateEvent(id, { type: newType });
  }, [updateEvent]);

  const removeEvent = useCallback((id: string) => {
    onChange(events.filter(e => e.id !== id));
  }, [events, onChange]);

  return (
    <Collapsible>
      <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium hover:text-primary transition-colors group">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4" />
          <span>One-Time Life Events</span>
          {events.length > 0 && (
            <span className="text-xs text-muted-foreground">({events.length})</span>
          )}
        </div>
        <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-4 pt-2">
        <p className="text-xs text-muted-foreground">
          Pick a common event from the Label dropdown or choose "Other" to enter a custom one. Selecting "Primary Home Sale" enables §121 exclusion handling.
        </p>

        {events.map((event) => {
          const presetKey = getLabelPresetKey(event);
          const isHomeSale = event.subtype === "home_sale";
          const isOther = presetKey === "other" && !isHomeSale;

          // Live home sale preview
          let homeSalePreview: { realizedGain: number; taxableGain: number; netProceeds: number; qualifies: boolean } | null = null;
          if (isHomeSale) {
            const salePrice = event.salePrice ?? 0;
            const basis = event.costBasis ?? 0;
            const selling = event.sellingCosts ?? 0;
            const qualifies = event.qualifiesForSection121 !== false;
            const realizedGain = Math.max(0, salePrice - basis - selling);
            const cap = qualifies ? exclusionCap : 0;
            const taxableGain = Math.max(0, realizedGain - cap);
            const netProceeds = Math.max(0, salePrice - selling);
            homeSalePreview = { realizedGain, taxableGain, netProceeds, qualifies };
          }

          return (
            <div key={event.id} className="border rounded-lg p-3 space-y-3 bg-muted/30">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Label</Label>
                  <Select
                    value={presetKey}
                    onValueChange={(v) => changeLabelPreset(event.id, v)}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LABEL_PRESETS.map(p => (
                        <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {isOther && (
                    <Input
                      value={event.label}
                      onChange={(e) => updateEvent(event.id, { label: e.target.value })}
                      placeholder="Custom label"
                      className="h-8 text-sm mt-1"
                    />
                  )}
                </div>

                {!isHomeSale && (
                  <div className="space-y-1">
                    <Label className="text-xs">Type</Label>
                    <Select
                      value={event.type}
                      onValueChange={(v) => changeEventType(event.id, v as EventType)}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="expense">Expense</SelectItem>
                        <SelectItem value="income">Income</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {isHomeSale ? (
                  <>
                    <div className="space-y-1">
                      <Label className="text-xs flex items-center gap-1">
                        Sale Price
                        <InfoTooltip text="Gross sale price of the home." />
                      </Label>
                      <Input
                        type="number"
                        value={event.salePrice ?? ""}
                        onChange={(e) => updateEvent(event.id, { salePrice: Math.max(0, parseInt(e.target.value) || 0), amount: Math.max(0, parseInt(e.target.value) || 0) })}
                        placeholder="$750,000"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs flex items-center gap-1">
                        Cost Basis
                        <InfoTooltip text="Original purchase price plus capital improvements (e.g., kitchen remodel, additions)." />
                      </Label>
                      <Input
                        type="number"
                        value={event.costBasis ?? ""}
                        onChange={(e) => updateEvent(event.id, { costBasis: Math.max(0, parseInt(e.target.value) || 0) })}
                        placeholder="$250,000"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs flex items-center gap-1">
                        Selling Costs
                        <InfoTooltip text="Agent commissions and closing costs. These reduce the realized gain." />
                      </Label>
                      <Input
                        type="number"
                        value={event.sellingCosts ?? ""}
                        onChange={(e) => updateEvent(event.id, { sellingCosts: Math.max(0, parseInt(e.target.value) || 0) })}
                        placeholder="$45,000"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Spouse 1 Age</Label>
                      <EventAgeInput
                        value={event.age}
                        min={spouse1Age}
                        onChange={(val) => updateEvent(event.id, { age: val })}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-1">
                      <Label className="text-xs">Amount</Label>
                      <Input
                        type="number"
                        value={event.amount || ""}
                        onChange={(e) => updateEvent(event.id, { amount: Math.max(0, parseInt(e.target.value) || 0) })}
                        placeholder="$50,000"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Spouse 1 Age</Label>
                      <EventAgeInput
                        value={event.age}
                        min={spouse1Age}
                        onChange={(val) => updateEvent(event.id, { age: val })}
                      />
                    </div>
                  </>
                )}
              </div>

              {isHomeSale && (
                <div className="flex items-center gap-2">
                  <Switch
                    checked={event.qualifiesForSection121 !== false}
                    onCheckedChange={(checked) => updateEvent(event.id, { qualifiesForSection121: checked })}
                    className="scale-75"
                  />
                  <span className="text-xs text-muted-foreground">
                    Primary residence — qualifies for §121 exclusion
                    <InfoTooltip text={`If on, exclude up to ${formatCurrency(exclusionCap)} of gain (${isMarried ? "MFJ" : "Single"}) from tax. Disable for vacation/rental homes — full gain becomes taxable LTCG.`} />
                  </span>
                </div>
              )}

              {isHomeSale && homeSalePreview && (
                <div className="rounded-md border border-primary/20 bg-primary/5 p-2 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Realized gain:</span>
                    <span className="font-medium">{formatCurrency(homeSalePreview.realizedGain)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      §121 exclusion ({homeSalePreview.qualifies ? (isMarried ? "MFJ" : "Single") : "none"}):
                    </span>
                    <span className="font-medium">−{formatCurrency(homeSalePreview.qualifies ? Math.min(exclusionCap, homeSalePreview.realizedGain) : 0)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-1">
                    <span className="font-semibold">Taxable LTCG:</span>
                    <span className="font-bold text-primary">{formatCurrency(homeSalePreview.taxableGain)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Net proceeds → brokerage:</span>
                    <span className="font-medium">{formatCurrency(homeSalePreview.netProceeds)}</span>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                {!isHomeSale && event.type === "income" ? (
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={event.taxable}
                      onCheckedChange={(checked) => updateEvent(event.id, { taxable: checked })}
                      className="scale-75"
                    />
                    <span className="text-xs text-muted-foreground">
                      Taxable income
                      <InfoTooltip text="Enable for taxable income. Disable for non-taxable income like Roth inheritance or life insurance." />
                    </span>
                  </div>
                ) : !isHomeSale ? (
                  <span className="text-xs text-muted-foreground">
                    {event.amount > 0 ? formatCurrency(event.amount) : "—"} at age {event.age}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">at age {event.age}</span>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => removeEvent(event.id)}
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            </div>
          );
        })}

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={addEvent} className="gap-1">
            <Plus className="h-3.5 w-3.5" />
            Add Event
          </Button>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

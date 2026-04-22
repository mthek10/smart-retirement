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

type EventType = "expense" | "income" | "home_sale";

const PRESETS: {
  label: string;
  type: EventType;
  amount: number;
  taxable: boolean;
  // Home sale specific
  salePrice?: number;
  costBasis?: number;
  sellingCosts?: number;
}[] = [
  { label: "Wedding", type: "expense", amount: 50000, taxable: false },
  { label: "Mortgage Payoff", type: "expense", amount: 200000, taxable: false },
  { label: "Home Purchase", type: "expense", amount: 100000, taxable: false },
  {
    label: "Primary Home Sale (§121)",
    type: "home_sale",
    amount: 750000,
    taxable: true,
    salePrice: 750000,
    costBasis: 250000,
    sellingCosts: 45000,
  },
  { label: "Inheritance", type: "income", amount: 500000, taxable: false },
  { label: "Home Renovation", type: "expense", amount: 75000, taxable: false },
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

function getEventType(ev: LifeEvent): EventType {
  return ev.subtype === "home_sale" ? "home_sale" : ev.type;
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

  const addPreset = useCallback((preset: typeof PRESETS[number]) => {
    const newEvent: LifeEvent = {
      id: crypto.randomUUID(),
      label: preset.label,
      type: preset.type === "home_sale" ? "income" : preset.type,
      amount: preset.amount,
      age: spouse1Age + 5,
      taxable: preset.taxable,
      ...(preset.type === "home_sale" && {
        subtype: "home_sale" as const,
        salePrice: preset.salePrice,
        costBasis: preset.costBasis,
        sellingCosts: preset.sellingCosts,
        qualifiesForSection121: true,
      }),
    };
    onChange([...events, newEvent]);
  }, [events, onChange, spouse1Age]);

  const updateEvent = useCallback((id: string, updates: Partial<LifeEvent>) => {
    onChange(events.map(e => e.id === id ? { ...e, ...updates } : e));
  }, [events, onChange]);

  const changeEventType = useCallback((id: string, newType: EventType) => {
    if (newType === "home_sale") {
      updateEvent(id, {
        type: "income",
        subtype: "home_sale",
        taxable: true,
        salePrice: 750000,
        costBasis: 250000,
        sellingCosts: 45000,
        qualifiesForSection121: true,
      });
    } else {
      // Strip home sale fields
      const cleaned = events.find(e => e.id === id);
      if (!cleaned) return;
      const { subtype, salePrice, costBasis, sellingCosts, qualifiesForSection121, ...rest } = cleaned;
      onChange(events.map(e => e.id === id ? { ...rest, type: newType } : e));
    }
  }, [events, onChange, updateEvent]);

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
          Add large one-time expenses (wedding, mortgage payoff), income events (inheritance), or a primary home sale with §121 exclusion handling.
        </p>

        {events.map((event) => {
          const eventType = getEventType(event);
          const isHomeSale = eventType === "home_sale";

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
                  <Input
                    value={event.label}
                    onChange={(e) => updateEvent(event.id, { label: e.target.value })}
                    placeholder={isHomeSale ? "Home Sale" : "e.g. Wedding"}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Type</Label>
                  <Select
                    value={eventType}
                    onValueChange={(v) => changeEventType(event.id, v as EventType)}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="expense">Expense</SelectItem>
                      <SelectItem value="income">Income</SelectItem>
                      <SelectItem value="home_sale">Home Sale (§121)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

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
                {eventType === "income" ? (
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={event.taxable}
                      onCheckedChange={(checked) => updateEvent(event.id, { taxable: checked })}
                      className="scale-75"
                    />
                    <span className="text-xs text-muted-foreground">
                      Taxable income
                      <InfoTooltip text="Enable for taxable income like home sale proceeds. Disable for non-taxable income like Roth inheritance or life insurance." />
                    </span>
                  </div>
                ) : eventType === "expense" ? (
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
          <Select onValueChange={(v) => addPreset(PRESETS[parseInt(v)])}>
            <SelectTrigger className="h-9 w-auto text-xs gap-1">
              <SelectValue placeholder="Add preset…" />
            </SelectTrigger>
            <SelectContent>
              {PRESETS.map((p, i) => (
                <SelectItem key={p.label} value={String(i)}>
                  {p.label} ({p.type === "expense" ? "−" : "+"}{formatCurrency(p.amount)})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

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

const PRESETS: { label: string; type: "expense" | "income"; amount: number; taxable: boolean }[] = [
  { label: "Wedding", type: "expense", amount: 50000, taxable: false },
  { label: "Mortgage Payoff", type: "expense", amount: 200000, taxable: false },
  { label: "Home Purchase", type: "expense", amount: 100000, taxable: false },
  { label: "Home Sale", type: "income", amount: 300000, taxable: true },
  { label: "Inheritance", type: "income", amount: 500000, taxable: false },
  { label: "Home Renovation", type: "expense", amount: 75000, taxable: false },
];

interface LifeEventsEditorProps {
  events: LifeEvent[];
  onChange: (events: LifeEvent[]) => void;
  spouse1Age: number;
}

export function LifeEventsEditor({ events, onChange, spouse1Age }: LifeEventsEditorProps) {
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
      type: preset.type,
      amount: preset.amount,
      age: spouse1Age + 5,
      taxable: preset.taxable,
    };
    onChange([...events, newEvent]);
  }, [events, onChange, spouse1Age]);

  const updateEvent = useCallback((id: string, updates: Partial<LifeEvent>) => {
    onChange(events.map(e => e.id === id ? { ...e, ...updates } : e));
  }, [events, onChange]);

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
          Add large one-time expenses (wedding, mortgage payoff) or income events (inheritance, home sale) at specific ages.
        </p>

        {events.map((event) => (
          <div key={event.id} className="border rounded-lg p-3 space-y-3 bg-muted/30">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Label</Label>
                <Input
                  value={event.label}
                  onChange={(e) => updateEvent(event.id, { label: e.target.value })}
                  placeholder="e.g. Wedding"
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Type</Label>
                <Select
                  value={event.type}
                  onValueChange={(v) => updateEvent(event.id, { type: v as "expense" | "income" })}
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
            </div>
            <div className="flex items-center justify-between">
              {event.type === "income" ? (
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
              ) : (
                <span className="text-xs text-muted-foreground">
                  {event.amount > 0 ? formatCurrency(event.amount) : "—"} at age {event.age}
                </span>
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
        ))}

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
                  {p.label} ({p.type === "expense" ? "-" : "+"}{formatCurrency(p.amount)})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

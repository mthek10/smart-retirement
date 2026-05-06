import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { 
  Save, 
  Trash2, 
  GitCompare, 
  Plus, 
  Edit2, 
  Check, 
  X,
  Layers 
} from "lucide-react";
import type { Scenario } from "@/hooks/useScenarios";
import type { Accounts, TaxSettings, SSData, StrategyMetrics } from "@/hooks/useProjections";
import { formatCurrency, formatPercent } from "@/lib/utils";

interface ScenarioManagerProps {
  scenarios: Scenario[];
  currentMetrics: StrategyMetrics;
  currentAccounts: Accounts;
  currentSSData: SSData;
  currentTaxSettings: TaxSettings;
  onAddScenario: (name: string, accounts: Accounts, ssData: SSData, taxSettings: TaxSettings, metrics: StrategyMetrics) => void;
  onRemoveScenario: (id: string) => void;
  onRenameScenario: (id: string, name: string) => void;
  onClearScenarios: () => void;
}

export function ScenarioManager({
  scenarios,
  currentMetrics,
  currentAccounts,
  currentSSData,
  currentTaxSettings,
  onAddScenario,
  onRemoveScenario,
  onRenameScenario,
  onClearScenarios,
}: ScenarioManagerProps) {
  const [newScenarioName, setNewScenarioName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleSaveScenario = () => {
    if (newScenarioName.trim()) {
      onAddScenario(newScenarioName.trim(), currentAccounts, currentSSData, currentTaxSettings, currentMetrics);
      setNewScenarioName("");
      setDialogOpen(false);
    }
  };

  const handleStartRename = (scenario: Scenario) => {
    setEditingId(scenario.id);
    setEditName(scenario.name);
  };

  const handleConfirmRename = () => {
    if (editingId && editName.trim()) {
      onRenameScenario(editingId, editName.trim());
    }
    setEditingId(null);
    setEditName("");
  };

  const handleCancelRename = () => {
    setEditingId(null);
    setEditName("");
  };

  const getStrategyLabel = (settings: TaxSettings) => {
    const strategy = settings.rothConversionStrategy;
    if (strategy === 'none') return 'No Conversions';
    if (strategy === 'fill_10') return 'Fill 10%';
    if (strategy === 'fill_12') return 'Fill 12%';
    if (strategy === 'fill_22') return 'Fill 22%';
    if (strategy === 'fill_24') return 'Fill 24%';
    if (strategy === 'survivor_smooth') return 'Survivor Smooth';
    return strategy;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Scenario Manager
            {scenarios.length > 0 && (
              <Badge variant="secondary">{scenarios.length} saved</Badge>
            )}
          </div>
          <div className="flex gap-2">
            {scenarios.length > 0 && (
              <Button variant="outline" size="sm" onClick={onClearScenarios}>
                <Trash2 className="h-4 w-4 mr-1" />
                Clear All
              </Button>
            )}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Save Current
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Save Current Scenario</DialogTitle>
                  <DialogDescription>
                    Save your current settings and metrics for comparison with other strategies.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <Input
                    placeholder="Scenario name (e.g., 'Aggressive Roth Conversions')"
                    value={newScenarioName}
                    onChange={(e) => setNewScenarioName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveScenario()}
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleSaveScenario} disabled={!newScenarioName.trim()}>
                    <Save className="h-4 w-4 mr-1" />
                    Save Scenario
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardTitle>
        <CardDescription>
          Save different configurations to compare strategies side-by-side
        </CardDescription>
      </CardHeader>
      <CardContent>
        {scenarios.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <GitCompare className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No saved scenarios yet</p>
            <p className="text-sm">Click "Save Current" to capture your current configuration</p>
          </div>
        ) : (
          <div className="space-y-3">
            {scenarios.map((scenario) => (
              <div
                key={scenario.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  {editingId === scenario.id ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="h-8"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleConfirmRename();
                          if (e.key === 'Escape') handleCancelRename();
                        }}
                      />
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleConfirmRename}>
                        <Check className="h-4 w-4 text-success" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleCancelRename}>
                        <X className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{scenario.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {getStrategyLabel(scenario.taxSettings)}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 flex gap-3">
                        <span>Tax: {formatCurrency(scenario.metrics.lifetimeTotalTax)}</span>
                        <span>
                          Depletion: {scenario.metrics.allFundsDepletionAge 
                            ? `Age ${scenario.metrics.allFundsDepletionAge}` 
                            : 'Never'}
                        </span>
                        <span>Final: {formatCurrency(scenario.metrics.finalTotalBalance)}</span>
                      </div>
                    </>
                  )}
                </div>
                {editingId !== scenario.id && (
                  <div className="flex gap-1 ml-3">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => handleStartRename(scenario)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => onRemoveScenario(scenario.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

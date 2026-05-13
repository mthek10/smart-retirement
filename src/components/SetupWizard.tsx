import { useState, useRef } from "react";
import { AccountInputs } from "@/components/AccountInputs";
import { SocialSecurityPlanner } from "@/components/SocialSecurityPlanner";
import { TaxSettings } from "@/components/TaxSettings";
import { ACASettings } from "@/components/ACASettings";
import { EmploymentInputs } from "@/components/EmploymentInputs";
import { HouseholdInputs } from "@/components/HouseholdInputs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight, Calculator, Loader2, Download, Upload, CheckCircle2, HardDrive, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { exportSetupToCSV, parseSetupCSV, readFileAsText } from "@/lib/exportUtils";
import { useToast } from "@/hooks/use-toast";

const STEPS = [
  { id: "household", label: "Household", description: "Tell us about your household so we can determine your filing status and model your timeline." },
  { id: "accounts", label: "Accounts", description: "Enter your current retirement account balances. These are the starting point for all projections." },
  { id: "employment", label: "Employment", description: "If either spouse is still working, enter current income and 401(k) contributions here." },
  { id: "social-security", label: "Social Security", description: "Set your expected Social Security benefits and claiming ages. This significantly impacts your tax picture." },
  { id: "tax", label: "Tax Settings", description: "Set your desired take-home income and Roth conversion strategy. This drives the entire withdrawal plan." },
  { id: "aca", label: "Healthcare", description: "Configure ACA marketplace settings for pre-Medicare years. Income levels affect subsidy eligibility." },
] as const;

export const SETUP_STEP_COUNT = STEPS.length;
export type SetupSaveStatus = "idle" | "saving" | "saved";

interface SetupWizardProps {
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
  onAccountsChange: (accounts: SetupWizardProps["accounts"]) => void;
  ssData: {
    spouse1: { estimatedBenefit: number; claimAge: number; lifeExpectancy: number };
    spouse2: { estimatedBenefit: number; claimAge: number; lifeExpectancy: number };
  };
  onSSDataChange: (ssData: SetupWizardProps["ssData"]) => void;
  taxSettings: any;
  onTaxSettingsChange: (settings: any) => void;
  onCalculate: () => void;
  currentStep: number;
  onCurrentStepChange: (step: number) => void;
  saveStatus: SetupSaveStatus;
  hasSavedDraft: boolean;
  onClearSavedDraft: () => void;
  projections?: import("@/hooks/useProjections").ProjectionRow[];
  monteCarloResults?: import("@/hooks/useMonteCarloSimulation").MonteCarloResult;
  monteCarloSettings?: import("@/hooks/useMonteCarloSimulation").MonteCarloSettings;
  onMonteCarloSettingsChange?: (settings: import("@/hooks/useMonteCarloSimulation").MonteCarloSettings) => void;
}

export function SetupWizard({
  accounts,
  onAccountsChange,
  ssData,
  onSSDataChange,
  taxSettings,
  onTaxSettingsChange,
  onCalculate,
  currentStep,
  onCurrentStepChange,
  saveStatus,
  hasSavedDraft,
  onClearSavedDraft,
  projections,
  monteCarloResults,
  monteCarloSettings,
  onMonteCarloSettingsChange,
}: SetupWizardProps) {
  const [isCalculating, setIsCalculating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleExportSetup = () => {
    exportSetupToCSV(accounts, ssData, taxSettings);
    toast({
      title: "Backup Downloaded",
      description: "Your setup was downloaded as a CSV backup file.",
    });
  };

  const handleImportSetup = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const content = await readFileAsText(file);
      const { accounts: importedAccounts, ssData: importedSSData, taxSettings: importedTaxSettings } = parseSetupCSV(content);
      
      onAccountsChange(importedAccounts);
      onSSDataChange(importedSSData);
      onTaxSettingsChange(importedTaxSettings);
      
      toast({
        title: "Setup Imported",
        description: "Your setup has been loaded from the CSV file.",
      });
    } catch (error) {
      toast({
        title: "Import Failed",
        description: "Could not parse the CSV file. Please check the format.",
        variant: "destructive",
      });
    }
    
    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const progressPercent = ((currentStep + 1) / STEPS.length) * 100;

  const goNext = () => {
    if (currentStep < STEPS.length - 1) {
      onCurrentStepChange(currentStep + 1);
      setTimeout(() => window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior }), 0);
    }
  };

  const goBack = () => {
    if (currentStep > 0) {
      onCurrentStepChange(currentStep - 1);
    }
  };

  const goToStep = (index: number) => {
    onCurrentStepChange(index);
  };

  const saveStatusConfig = {
    idle: {
      icon: HardDrive,
      label: "Not saved yet",
      detail: "Start entering your setup and we'll save it automatically in this browser.",
      badgeClassName: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
      iconClassName: "text-amber-600 dark:text-amber-300",
    },
    saving: {
      icon: Loader2,
      label: "Saving changes",
      detail: "Updating your browser save now so you can safely come back later.",
      badgeClassName: "border-primary/30 bg-primary/10 text-primary",
      iconClassName: "text-primary animate-spin",
    },
    saved: {
      icon: CheckCircle2,
      label: "Saved in this browser",
      detail: "Your progress is being remembered automatically on this device.",
      badgeClassName: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
      iconClassName: "text-emerald-600 dark:text-emerald-300",
    },
  } as const;

  const statusConfig = saveStatusConfig[saveStatus];
  const StatusIcon = statusConfig.icon;

  const renderStepContent = () => {
    switch (STEPS[currentStep].id) {
      case "household":
        return <HouseholdInputs taxSettings={taxSettings} onChange={onTaxSettingsChange} />;
      case "accounts":
        return <AccountInputs accounts={accounts} onChange={onAccountsChange} filingStatus={taxSettings.filingStatus} />;
      case "employment":
        return <EmploymentInputs taxSettings={taxSettings} onChange={onTaxSettingsChange} spouse1Age={taxSettings.spouse1Age} spouse2Age={taxSettings.spouse2Age} />;
      case "social-security":
        return (
          <SocialSecurityPlanner
            ssData={ssData}
            onChange={onSSDataChange}
            filingStatus={taxSettings.filingStatus}
            spouse1Age={taxSettings.spouse1Age}
            spouse2Age={taxSettings.spouse2Age}
          />
        );
      case "tax": {
        const isMarried = taxSettings.filingStatus === 'married';
        const totalPortfolio = accounts.spouse1Traditional + (isMarried ? accounts.spouse2Traditional : 0) + accounts.roth + accounts.taxable;
        return <TaxSettings taxSettings={taxSettings} onChange={onTaxSettingsChange} totalPortfolio={totalPortfolio} projections={projections} accounts={accounts} monteCarloResults={monteCarloResults} monteCarloSettings={monteCarloSettings} onMonteCarloSettingsChange={onMonteCarloSettingsChange} />;
      }
      case "aca":
        return (
          <ACASettings
            acaSettings={taxSettings.acaSettings}
            onChange={(newAcaSettings) => onTaxSettingsChange({ ...taxSettings, acaSettings: newAcaSettings })}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 mt-6">
      {/* Progress section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Step {currentStep + 1} of {STEPS.length}
          </span>
          <span>{Math.round(progressPercent)}% complete</span>
        </div>
        <Progress value={progressPercent} className="h-2 progress-gradient" />

        {/* Step indicator pills */}
        <div className="flex flex-wrap gap-2 pt-1">
          {STEPS.map((step, index) => (
            <button
              key={step.id}
              onClick={() => goToStep(index)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer",
                index === currentStep
                  ? "bg-primary text-primary-foreground"
                  : index < currentStep
                  ? "bg-primary/20 text-primary hover:bg-primary/30"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {step.label}
            </button>
          ))}
        </div>
      </div>

      {/* Step description */}
      <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg px-4 py-3">
        {STEPS[currentStep].description}
      </p>

      <div className="rounded-xl border bg-card/80 px-4 py-3 shadow-sm animate-in fade-in-0 slide-in-from-top-1 duration-300">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-full bg-background p-2 shadow-sm">
              <StatusIcon className={cn("h-4 w-4", statusConfig.iconClassName)} />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold">{statusConfig.label}</p>
                <Badge variant="outline" className={statusConfig.badgeClassName}>
                  Auto-save
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{statusConfig.detail}</p>
            </div>
          </div>
          {hasSavedDraft && (
            <Button type="button" variant="ghost" size="sm" onClick={onClearSavedDraft} className="gap-1 self-start sm:self-auto">
              <RotateCcw className="h-4 w-4" />
              Forget browser save
            </Button>
          )}
        </div>
      </div>

      {/* Step content */}
      <div className="min-h-[300px]">{renderStepContent()}</div>

      {/* Hidden file input for import */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".csv"
        onChange={handleImportSetup}
        className="hidden"
      />

      {/* Navigation buttons */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-2">
          {currentStep === 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="gap-1"
              >
                <Upload className="h-4 w-4" />
                Import Setup
              </Button>
              {hasSavedDraft && (
                <p className="text-xs text-muted-foreground">
                  Browser save found. You can keep editing here or replace it by importing a file.
                </p>
              )}
            </div>
          ) : (
            <Button
              variant="outline"
              onClick={goBack}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>
          )}
        </div>

        {currentStep < STEPS.length - 1 ? (
          <Button onClick={goNext} className="gap-1">
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleExportSetup}
              className="gap-1"
            >
              <Download className="h-4 w-4" />
              Download Backup
            </Button>
            <Button 
              onClick={() => {
                setIsCalculating(true);
                setTimeout(() => onCalculate(), 50);
              }}
              disabled={isCalculating}
              className="gap-1 px-8 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-md"
            >
              {isCalculating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Calculating…
                </>
              ) : (
                <>
                  <Calculator className="h-4 w-4" />
                  Calculate & Go to Dashboard
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}


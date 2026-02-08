import { useState } from "react";
import { AccountInputs } from "@/components/AccountInputs";
import { SocialSecurityPlanner } from "@/components/SocialSecurityPlanner";
import { TaxSettings } from "@/components/TaxSettings";
import { ACASettings } from "@/components/ACASettings";
import { EmploymentInputs } from "@/components/EmploymentInputs";
import { HouseholdInputs } from "@/components/HouseholdInputs";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight, Calculator } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: "household", label: "Household" },
  { id: "accounts", label: "Accounts" },
  { id: "employment", label: "Employment" },
  { id: "social-security", label: "Social Security" },
  { id: "tax", label: "Tax Settings" },
  { id: "aca", label: "Healthcare" },
] as const;

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
}

export function SetupWizard({
  accounts,
  onAccountsChange,
  ssData,
  onSSDataChange,
  taxSettings,
  onTaxSettingsChange,
  onCalculate,
}: SetupWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const progressPercent = ((currentStep + 1) / STEPS.length) * 100;

  const goNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const goBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const goToStep = (index: number) => {
    setCurrentStep(index);
  };

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
      case "tax":
        return <TaxSettings taxSettings={taxSettings} onChange={onTaxSettingsChange} />;
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
        <Progress value={progressPercent} className="h-2" />

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

      {/* Step content */}
      <div className="min-h-[300px]">{renderStepContent()}</div>

      {/* Navigation buttons */}
      <div className="flex items-center justify-between pt-2">
        <Button
          variant="outline"
          onClick={goBack}
          disabled={currentStep === 0}
          className="gap-1"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </Button>

        {currentStep < STEPS.length - 1 ? (
          <Button onClick={goNext} className="gap-1">
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={onCalculate} className="gap-1 px-8">
            <Calculator className="h-4 w-4" />
            Calculate & Go to Dashboard
          </Button>
        )}
      </div>
    </div>
  );
}


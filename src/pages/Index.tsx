import { useState, useMemo, useCallback, useRef } from "react";
import { SetupWizard } from "@/components/SetupWizard";
import { ProjectionTable } from "@/components/ProjectionTable";

import { ProjectionSummary } from "@/components/ProjectionSummary";
import { TaxChart } from "@/components/TaxChart";
import { BracketChart } from "@/components/BracketChart";
import { BalanceByAgeChart } from "@/components/BalanceByAgeChart";
import { BracketAnalysisCard } from "@/components/BracketAnalysis";
import { SummaryCards } from "@/components/SummaryCards";
import { StrategyComparison } from "@/components/StrategyComparison";
import { MonteCarloResults } from "@/components/MonteCarloResults";
import { IncomeAlertsBanner } from "@/components/IncomeAlertsBanner";
import { BracketFillGauge } from "@/components/BracketFillGauge";
import { ActionItems } from "@/components/ActionItems";
import { ScenarioManager } from "@/components/ScenarioManager";
import { ScenarioComparison } from "@/components/ScenarioComparison";
import { RMDPlanner } from "@/components/RMDPlanner";
import { useTwoPassProjections, findDepletionAges } from "@/hooks/useProjections";
import { useMonteCarloSimulation, type MonteCarloSettings } from "@/hooks/useMonteCarloSimulation";
import { useScenarios } from "@/hooks/useScenarios";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { calculateBracketConsistency } from "@/lib/taxCalculations";
import { getCurrentYearAlerts } from "@/lib/incomeAlerts";

const Index = () => {
  const [activeTab, setActiveTab] = useState("setup");
  const wizardStepRef = useRef<(step: number) => void>();

  const navigateToSetupStep = useCallback((stepIndex: number) => {
    setActiveTab("setup");
    // Use a timeout so the tab switches first, then the wizard navigates
    setTimeout(() => {
      wizardStepRef.current?.(stepIndex);
    }, 50);
  }, []);
  const [accounts, setAccounts] = useState({
    spouse1Traditional: 2500000,
    spouse2Traditional: 2500000,
    roth: 0,
    taxable: 3000000,
    traditionalReturn: 3,
    rothReturn: 3,
    taxableReturn: 3,
    taxableCostBasisPercent: 33,
  });

  const [ssData, setSsData] = useState({
    spouse1: {
      estimatedBenefit: 4000,
      claimAge: 67,
      lifeExpectancy: 90,
    },
    spouse2: {
      estimatedBenefit: 4000,
      claimAge: 67,
      lifeExpectancy: 90,
    },
  });

  const [taxSettings, setTaxSettings] = useState({
    filingStatus: 'married',
    state: 'other',
    stateRate: 5,
    spouse1Age: 60,
    spouse2Age: 58,
    targetTakeHome: 200000,
    inflationRate: 2.5,
    rothConversionStrategy: 'none',
    rothConversionCustom: 94300,
    acaSettings: {
      enabled: true,
      householdSize: 2,
      customBenchmarkPremium: 0,
    },
    spouse1Employment: {
      currentIncome: 0,
      retirementAge: 65,
      contributes401k: false,
      contribution401kAmount: 0,
      employerMatchAmount: 0,
    },
    spouse2Employment: {
      currentIncome: 0,
      retirementAge: 65,
      contributes401k: false,
      contribution401kAmount: 0,
      employerMatchAmount: 0,
    },
    survivorSettings: {
      enabled: false,
      spouse1DeathAge: null as number | null,
      spouse2DeathAge: null as number | null,
      survivorSpendingPercent: 75,
    },
    optimizationGoal: 'minimize-taxes',
    stateRelocation: {
      enabled: false,
      targetState: 'FL',
      relocationAge: 65,
    },
  });

  // Committed state: projections only recalculate when the user explicitly
  // clicks "Go to Dashboard" or switches to a non-Setup tab.
  const [committedAccounts, setCommittedAccounts] = useState(accounts);
  const [committedSSData, setCommittedSSData] = useState(ssData);
  const [committedTaxSettings, setCommittedTaxSettings] = useState(taxSettings);

  const commitInputs = useCallback(() => {
    setCommittedAccounts(accounts);
    setCommittedSSData(ssData);
    setCommittedTaxSettings(taxSettings);
  }, [accounts, ssData, taxSettings]);

  // Use projections from the two-pass hook (reads committed snapshots only)
  const twoPassResults = useTwoPassProjections(committedAccounts, committedSSData, committedTaxSettings);
  const projections = twoPassResults.currentProjections;

  // Monte Carlo simulation settings - returnMean syncs with Roth IRA return
  const [monteCarloSettings, setMonteCarloSettings] = useState<MonteCarloSettings>({
    numSimulations: 1000,
    returnMean: accounts.rothReturn / 100,
    returnStdDev: 0.15,
  });

  // Sync Monte Carlo expected return with Roth IRA return when it changes
  const handleAccountsChange = useCallback((newAccounts: typeof accounts) => {
    setAccounts(newAccounts);
    if (newAccounts.rothReturn !== accounts.rothReturn) {
      setMonteCarloSettings(prev => ({
        ...prev,
        returnMean: newAccounts.rothReturn / 100,
      }));
    }
  }, [accounts.rothReturn]);


  // Monte Carlo simulation results (reads committed snapshots only)
  const monteCarloResults = useMonteCarloSimulation(committedAccounts, committedSSData, committedTaxSettings, monteCarloSettings);

  // Scenario management for comparing strategies
  const { scenarios, addScenario, removeScenario, renameScenario, clearScenarios } = useScenarios();

  // Get current strategy name for display
  const currentStrategyName = useMemo(() => {
    const strategy = taxSettings.rothConversionStrategy;
    if (strategy === 'none') return 'No Conversions';
    if (strategy === 'fill_10') return 'Fill to 10%';
    if (strategy === 'fill_12') return 'Fill to 12%';
    if (strategy === 'fill_22') return 'Fill to 22%';
    if (strategy === 'fill_24') return 'Fill to 24%';
    if (strategy === 'survivor_smooth') return 'Survivor Smoothing';
    if (strategy === 'optimize_consistency') return 'Optimize Consistency';
    if (strategy === 'custom') return 'Custom Amount';
    return 'Current';
  }, [taxSettings.rothConversionStrategy]);

  const chartData = useMemo(() => {
    return projections.map(p => ({
      year: p.year,
      Traditional: p.traditionalBalance,
      Roth: p.rothBalance,
      Taxable: p.taxableBalance,
      "Social Security": p.ssIncome,
    }));
  }, [projections]);

  const taxChartData = useMemo(() => {
    const allTaxData = projections.map(p => ({
      year: p.year,
      "Federal Tax": p.federalTax,
      "State Tax": p.stateTax,
      "Federal CG Tax": p.federalCapitalGainsTax,
      "State CG Tax": p.stateCapitalGainsTax,
      "IRMAA": p.irmaa,
      "NIIT": p.niit,
      "AMT": p.amt,
      "Payroll Tax": p.payrollTax,
    }));

    // Find the last year where any tax/IRMAA/NIIT/AMT is greater than zero
    let lastNonZeroIndex = -1;
    for (let i = allTaxData.length - 1; i >= 0; i--) {
      const data = allTaxData[i];
      if (data["Federal Tax"] > 0 || data["State Tax"] > 0 || 
          data["Federal CG Tax"] > 0 || data["State CG Tax"] > 0 || 
          data["IRMAA"] > 0 || data["NIIT"] > 0 || data["AMT"] > 0) {
        lastNonZeroIndex = i;
        break;
      }
    }

    // Return data up to 2 years after the last non-zero year
    if (lastNonZeroIndex === -1) return allTaxData;
    return allTaxData.slice(0, Math.min(lastNonZeroIndex + 3, allTaxData.length));
  }, [projections]);

  const summary = useMemo(() => {
    if (projections.length === 0) {
      return {
        totalPortfolio: 0,
        lifetimeTotalTaxes: 0,
        totalFederalTax: 0,
        totalFederalCGTax: 0,
        totalStateTax: 0,
        totalStateCGTax: 0,
        totalMedicareCosts: 0,
        totalACASubsidy: 0,
        totalACAPremium: 0,
        totalNIIT: 0,
        totalAMT: 0,
        totalPayrollTax: 0,
        totalEmploymentIncome: 0,
        total401kContributions: 0,
        avgWithdrawal: 0,
        finalTraditionalBalance: 0,
        finalRothBalance: 0,
        finalTaxableBalance: 0,
        finalAge: 100,
        tradDepletionAge: null as number | null,
        taxableDepletionAge: null as number | null,
        rothUsageAge: null as number | null,
        rothDepletionAge: null as number | null,
        bracketConsistency: null as ReturnType<typeof calculateBracketConsistency> | null,
        avgBracket: 0,
        yearsInTarget: 0,
      };
    }

    // Single-pass accumulation over projections (replaces 14 separate .reduce() calls)
    let totalFederalTax = 0, totalFederalCGTax = 0, totalStateTax = 0, totalStateCGTax = 0;
    let totalIRMAA = 0, totalMedicarePremiums = 0, totalNIIT = 0, totalAMT = 0;
    let totalPayrollTax = 0, totalACASubsidy = 0, totalACAPremium = 0;
    let totalEmploymentIncome = 0, total401kContributions = 0, totalWithdrawals = 0;

    for (let i = 0; i < projections.length; i++) {
      const p = projections[i];
      totalFederalTax += p.federalTax;
      totalFederalCGTax += p.federalCapitalGainsTax;
      totalStateTax += p.stateTax;
      totalStateCGTax += p.stateCapitalGainsTax;
      totalIRMAA += p.irmaa;
      totalMedicarePremiums += (p.medicarePremiums || 0);
      totalNIIT += p.niit;
      totalAMT += p.amt;
      totalPayrollTax += (p.payrollTax || 0);
      totalACASubsidy += (p.acaSubsidy || 0);
      totalACAPremium += (p.acaPremium || 0);
      totalEmploymentIncome += (p.employmentIncome || 0);
      total401kContributions += (p.contributions401k || 0);
      totalWithdrawals += p.withdrawals;
    }

    // Depletion ages via shared utility
    const { tradDepletionAge, taxableDepletionAge, rothDepletionAge } = findDepletionAges(projections);

    const totalMedicareCosts = totalIRMAA + totalMedicarePremiums;
    const lifetimeTotalTaxes = totalFederalTax + totalFederalCGTax + totalStateTax + totalStateCGTax + totalMedicareCosts + totalNIIT + totalAMT + totalPayrollTax;
    const avgWithdrawal = totalWithdrawals / projections.length;

    const isMarried = taxSettings.filingStatus === 'married';
    const totalPortfolio = accounts.spouse1Traditional + (isMarried ? accounts.spouse2Traditional : 0) + accounts.roth + accounts.taxable;

    // Roth usage age (when balance first decreases meaningfully)
    const rothUsageProjection = projections.find(p => p.rothBalance < accounts.roth - 1000);

    // Bracket consistency analysis
    const bracketConsistency = calculateBracketConsistency(projections, taxSettings.filingStatus, taxSettings.inflationRate / 100);

    const finalProjection = projections[projections.length - 1];

    return {
      totalPortfolio,
      lifetimeTotalTaxes,
      totalFederalTax,
      totalFederalCGTax,
      totalStateTax,
      totalStateCGTax,
      totalMedicareCosts,
      totalACASubsidy,
      totalACAPremium,
      totalNIIT,
      totalAMT,
      totalPayrollTax,
      totalEmploymentIncome,
      total401kContributions,
      avgWithdrawal,
      finalTraditionalBalance: finalProjection?.traditionalBalance ?? 0,
      finalRothBalance: finalProjection?.rothBalance ?? 0,
      finalTaxableBalance: finalProjection?.taxableBalance ?? 0,
      finalAge: finalProjection?.age ?? 100,
      tradDepletionAge,
      taxableDepletionAge,
      rothUsageAge: rothUsageProjection ? rothUsageProjection.age : null,
      rothDepletionAge,
      bracketConsistency,
      avgBracket: bracketConsistency.avgBracket,
      yearsInTarget: bracketConsistency.yearsInTarget,
    };
  }, [projections, accounts, taxSettings.filingStatus, taxSettings.inflationRate]);

  // Generate income alerts for current year
  const incomeAlerts = useMemo(() => {
    return getCurrentYearAlerts(
      projections,
      taxSettings.acaSettings.householdSize,
      taxSettings.inflationRate,
      taxSettings.filingStatus
    );
  }, [projections, taxSettings.acaSettings.householdSize, taxSettings.inflationRate, taxSettings.filingStatus]);

  // Get current year gross ordinary income for bracket gauge
  // This is the totalOrdinaryIncome from projections (includes taxable SS, traditional withdrawals, 
  // Roth conversions, and taxable wages) - used to determine the tax bracket
  const currentYearGrossIncome = projections.length > 0 ? projections[0].ordinaryIncome : 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="relative overflow-hidden bg-gradient-to-br from-primary via-primary/95 to-primary/80 shadow-xl">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_hsl(210_90%_70%_/_0.15),_transparent_60%)]" />
        <div className="container mx-auto px-4 py-7 relative z-10 text-left">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-primary-foreground tracking-tight mb-1">
            Retirement Drawdown Planner
          </h1>
          <p className="text-primary-foreground/75 mt-1.5 text-sm sm:text-base pl-4">
            Model tax-efficient retirement withdrawal strategies with Social Security optimization
          </p>
          <p className="text-primary-foreground/50 mt-2 text-xs pl-4 italic">
            This is not an official financial planning tool — intended for estimation purposes only. Consult a qualified advisor before making financial decisions.
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="flex w-full rounded-xl bg-card shadow-md border p-1.5 overflow-x-auto">
            <TabsTrigger value="setup" className="flex-1 min-w-0 rounded-lg transition-all duration-200 data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:font-semibold data-[state=active]:shadow-sm font-medium text-xs sm:text-sm">Setup</TabsTrigger>
            <TabsTrigger value="dashboard" onClick={commitInputs} className="flex-1 min-w-0 rounded-lg transition-all duration-200 data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:font-semibold data-[state=active]:shadow-sm font-medium text-xs sm:text-sm">Dashboard</TabsTrigger>
            <TabsTrigger value="projections" onClick={commitInputs} className="flex-1 min-w-0 rounded-lg transition-all duration-200 data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:font-semibold data-[state=active]:shadow-sm font-medium text-xs sm:text-sm">Projections</TabsTrigger>
            <TabsTrigger value="analysis" onClick={commitInputs} className="flex-1 min-w-0 rounded-lg transition-all duration-200 data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:font-semibold data-[state=active]:shadow-sm font-medium text-xs sm:text-sm">Analysis</TabsTrigger>
            <TabsTrigger value="charts" onClick={commitInputs} className="flex-1 min-w-0 rounded-lg transition-all duration-200 data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:font-semibold data-[state=active]:shadow-sm font-medium text-xs sm:text-sm">Charts</TabsTrigger>
          </TabsList>

          <TabsContent value="setup">
            <SetupWizard
              accounts={accounts}
              onAccountsChange={handleAccountsChange}
              ssData={ssData}
              onSSDataChange={setSsData}
              taxSettings={taxSettings}
              onTaxSettingsChange={setTaxSettings}
              onCalculate={() => { commitInputs(); setActiveTab("dashboard"); window.scrollTo({ top: 0 }); }}
              onStepNavigate={(fn) => { wizardStepRef.current = fn; }}
            />
          </TabsContent>

          <TabsContent value="dashboard" className="space-y-6 mt-6">
            {/* Income Alerts Banner */}
            {incomeAlerts.length > 0 && (
              <IncomeAlertsBanner alerts={incomeAlerts} />
            )}

            <SummaryCards {...summary} onNavigateToSetup={navigateToSetupStep}>
              {/* Action Items */}
              <ActionItems
                projections={projections}
                filingStatus={taxSettings.filingStatus}
                inflationRate={taxSettings.inflationRate}
                rothConversionStrategy={taxSettings.rothConversionStrategy}
                spouse1Age={taxSettings.spouse1Age}
                spouse2Age={taxSettings.spouse2Age}
                spouse1SSClaimAge={ssData.spouse1.claimAge}
                spouse2SSClaimAge={ssData.spouse2.claimAge}
                acaEnabled={taxSettings.acaSettings.enabled}
                taxableUnrealizedGains={accounts.taxable * ((100 - accounts.taxableCostBasisPercent) / 100)}
                taxableCostBasisPercent={accounts.taxableCostBasisPercent}
                stateCode={taxSettings.state}
                stateRelocation={taxSettings.stateRelocation}
                onNavigateToSetup={navigateToSetupStep}
              />

              {/* Key Takeaways */}
              <ProjectionSummary
                projections={projections}
                tradDepletionAge={summary.tradDepletionAge}
                taxableDepletionAge={summary.taxableDepletionAge}
                rothDepletionAge={summary.rothDepletionAge}
                lifetimeTotalTaxes={summary.lifetimeTotalTaxes}
                finalAge={summary.finalAge}
                finalTraditionalBalance={summary.finalTraditionalBalance}
                finalRothBalance={summary.finalRothBalance}
                finalTaxableBalance={summary.finalTaxableBalance}
                spouse1Age={taxSettings.spouse1Age}
              />

              {/* Bracket Gauge */}
              <BracketFillGauge
                grossIncome={currentYearGrossIncome}
                filingStatus={taxSettings.filingStatus}
                yearIndex={0}
                inflationRate={taxSettings.inflationRate}
              />
            </SummaryCards>

            <div className="flex justify-end pt-2">
              <Button onClick={() => setActiveTab("projections")} className="px-8">
                View Projections →
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="projections" className="mt-6 space-y-6">
            <ProjectionTable projections={projections} />

            <div className="flex justify-end pt-2">
              <Button onClick={() => setActiveTab("analysis")} className="px-8">
                View Analysis →
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="analysis" className="mt-6 space-y-6">
            {/* Scenario Comparison */}
            <div className="grid gap-6 lg:grid-cols-1">
              <ScenarioComparison
                scenarios={scenarios}
                currentMetrics={twoPassResults.currentMetrics}
                currentStrategyName={currentStrategyName}
              />
            </div>

            <StrategyComparison
              baselineMetrics={twoPassResults.baselineMetrics}
              optimizedMetrics={twoPassResults.optimizedMetrics}
              currentMetrics={twoPassResults.currentMetrics}
              survivorSmoothedMetrics={twoPassResults.survivorSmoothedMetrics}
              currentStrategyName={currentStrategyName}
              showOptimization={taxSettings.rothConversionStrategy !== 'fill_22' && taxSettings.rothConversionStrategy !== 'optimize_consistency'}
              optimizationGoal={taxSettings.optimizationGoal}
              survivorEnabled={taxSettings.survivorSettings?.enabled && taxSettings.filingStatus === 'married'}
            />
            <MonteCarloResults
              results={monteCarloResults}
              settings={monteCarloSettings}
              onSettingsChange={setMonteCarloSettings}
            />
            {/* RMD Year-by-Year & Tax Strategies */}
            <RMDPlanner
              spouse1TradBalance={committedAccounts.spouse1Traditional}
              spouse2TradBalance={committedAccounts.spouse2Traditional}
              rothBalance={committedAccounts.roth}
              spouse1Age={committedTaxSettings.spouse1Age}
              spouse2Age={committedTaxSettings.spouse2Age}
              filingStatus={committedTaxSettings.filingStatus}
              rothConversionStrategy={committedTaxSettings.rothConversionStrategy}
              growthRate={committedAccounts.traditionalReturn}
              inflationRate={committedTaxSettings.inflationRate}
              otherIncome={committedSSData.spouse1.estimatedBenefit * 12 + (committedTaxSettings.filingStatus === 'married' ? committedSSData.spouse2.estimatedBenefit * 12 : 0)}
              visibleTabs={['strategies']}
            />

            <div className="flex justify-end pt-2">
              <Button onClick={() => { setActiveTab("charts"); window.scrollTo({ top: 0 }); }} className="px-8">
                View Charts →
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="charts" className="mt-6 space-y-6">
            <BalanceByAgeChart projections={projections} />
            <BracketChart data={projections} />
            <TaxChart data={taxChartData} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;

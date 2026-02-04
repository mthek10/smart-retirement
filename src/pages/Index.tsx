import { useState, useMemo } from "react";
import { AccountInputs } from "@/components/AccountInputs";
import { SocialSecurityPlanner } from "@/components/SocialSecurityPlanner";
import { TaxSettings } from "@/components/TaxSettings";
import { ACASettings } from "@/components/ACASettings";
import { EmploymentInputs } from "@/components/EmploymentInputs";
import { HouseholdInputs } from "@/components/HouseholdInputs";
import { ProjectionTable } from "@/components/ProjectionTable";
import { ProjectionChart } from "@/components/ProjectionChart";
import { TaxChart } from "@/components/TaxChart";
import { BracketChart } from "@/components/BracketChart";
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
import { useTwoPassProjections } from "@/hooks/useProjections";
import { useMonteCarloSimulation, type MonteCarloSettings } from "@/hooks/useMonteCarloSimulation";
import { useScenarios } from "@/hooks/useScenarios";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { calculateBracketConsistency } from "@/lib/taxCalculations";
import { getCurrentYearAlerts } from "@/lib/incomeAlerts";

const Index = () => {
  const [accounts, setAccounts] = useState({
    spouse1Traditional: 2500000,
    spouse2Traditional: 2500000,
    roth: 0,
    taxable: 3000000,
    traditionalReturn: 3,
    rothReturn: 3,
    taxableReturn: 3,
    taxableCostBasisPercent: 50,
  });

  const [ssData, setSsData] = useState({
    spouse1: {
      estimatedBenefit: 3000,
      claimAge: 67,
      lifeExpectancy: 90,
    },
    spouse2: {
      estimatedBenefit: 3000,
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
    inflationRate: 3,
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
  });

  // Use projections from the two-pass hook to avoid duplicate calculations
  const twoPassResults = useTwoPassProjections(accounts, ssData, taxSettings);
  const projections = twoPassResults.currentProjections;

  // Monte Carlo simulation settings
  const [monteCarloSettings, setMonteCarloSettings] = useState<MonteCarloSettings>({
    numSimulations: 100,
    returnMean: 0.07,
    returnStdDev: 0.15,
  });

  // Monte Carlo simulation results
  const monteCarloResults = useMonteCarloSimulation(accounts, ssData, taxSettings, monteCarloSettings);

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

  const detailedMetrics = useMemo(() => {
    if (projections.length === 0) {
      return {
        tradDepletionAge: null,
        taxableDepletionAge: null,
        rothUsageAge: null,
        rothDepletionAge: null,
        bracketConsistency: null,
        avgBracket: 0,
        yearsInTarget: 0,
      };
    }

    // Find when each account first depletes (balance drops below threshold) using transition logic
    const tradDepletionIndex = projections.findIndex((p, index) =>
      p.traditionalBalance < 1000 && index > 0 && projections[index - 1].traditionalBalance >= 1000
    );
    const taxableDepletionIndex = projections.findIndex((p, index) =>
      p.taxableBalance < 1000 && index > 0 && projections[index - 1].taxableBalance >= 1000
    );
    const rothDepletionIndex = projections.findIndex((p, index) =>
      p.rothBalance < 1000 && index > 0 && projections[index - 1].rothBalance >= 1000
    );

    const finalTradDepletionAge = tradDepletionIndex >= 0 ? projections[tradDepletionIndex].age : null;
    const finalTaxableDepletionAge = taxableDepletionIndex >= 0 ? projections[taxableDepletionIndex].age : null;
    const finalRothDepletionAge = rothDepletionIndex >= 0 ? projections[rothDepletionIndex].age : null;

    // Find when Roth starts being used (balance decreases)
    const initialRothBalance = accounts.roth;
    const rothUsageProjection = projections.find(p => p.rothBalance < initialRothBalance - 1000);
    
    // Calculate bracket consistency with filing status and inflation rate
    const consistency = calculateBracketConsistency(projections, taxSettings.filingStatus, taxSettings.inflationRate / 100);
    
    return {
      tradDepletionAge: finalTradDepletionAge,
      taxableDepletionAge: finalTaxableDepletionAge,
      rothUsageAge: rothUsageProjection ? rothUsageProjection.age : null,
      rothDepletionAge: finalRothDepletionAge,
      bracketConsistency: consistency,
      avgBracket: consistency.avgBracket,
      yearsInTarget: consistency.yearsInTarget,
    };
  }, [projections, taxSettings.spouse1Age, accounts.roth]);

  const summary = useMemo(() => {
    const totalFederalTax = projections.reduce((sum, p) => sum + p.federalTax, 0);
    const totalFederalCGTax = projections.reduce((sum, p) => sum + p.federalCapitalGainsTax, 0);
    const totalStateTax = projections.reduce((sum, p) => sum + p.stateTax, 0);
    const totalStateCGTax = projections.reduce((sum, p) => sum + p.stateCapitalGainsTax, 0);
    const totalIRMAA = projections.reduce((sum, p) => sum + p.irmaa, 0);
    const totalMedicarePremiums = projections.reduce((sum, p) => sum + (p.medicarePremiums || 0), 0);
    const totalMedicareCosts = totalIRMAA + totalMedicarePremiums;
    const totalNIIT = projections.reduce((sum, p) => sum + p.niit, 0);
    const totalAMT = projections.reduce((sum, p) => sum + p.amt, 0);
    const totalPayrollTax = projections.reduce((sum, p) => sum + (p.payrollTax || 0), 0);
    const totalACASubsidy = projections.reduce((sum, p) => sum + (p.acaSubsidy || 0), 0);
    const totalACAPremium = projections.reduce((sum, p) => sum + (p.acaPremium || 0), 0);
    const lifetimeTotalTaxes = totalFederalTax + totalFederalCGTax + totalStateTax + totalStateCGTax + totalMedicareCosts + totalNIIT + totalAMT + totalPayrollTax;
    const totalEmploymentIncome = projections.reduce((sum, p) => sum + (p.employmentIncome || 0), 0);
    const total401kContributions = projections.reduce((sum, p) => sum + (p.contributions401k || 0), 0);
    const avgWithdrawal = projections.length > 0 
      ? projections.reduce((sum, p) => sum + p.withdrawals, 0) / projections.length 
      : 0;
    const totalPortfolio = accounts.spouse1Traditional + accounts.spouse2Traditional + accounts.roth + accounts.taxable;

    // Get final year balances for "not depleted" display
    const finalProjection = projections.length > 0 ? projections[projections.length - 1] : null;

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
      ...detailedMetrics
    };
  }, [projections, accounts, detailedMetrics]);

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
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-foreground">Retirement Drawdown Planner</h1>
          <p className="text-muted-foreground mt-2">
            Model tax-efficient retirement withdrawal strategies with Social Security optimization
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="setup" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="setup">Setup</TabsTrigger>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="projections">Projections</TabsTrigger>
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
          </TabsList>

          <TabsContent value="setup" className="space-y-6 mt-6">
            <HouseholdInputs taxSettings={taxSettings} onChange={setTaxSettings} />
            
            <div className="grid gap-6 lg:grid-cols-2">
              <AccountInputs accounts={accounts} onChange={setAccounts} filingStatus={taxSettings.filingStatus} />
              <EmploymentInputs taxSettings={taxSettings} onChange={setTaxSettings} spouse1Age={taxSettings.spouse1Age} spouse2Age={taxSettings.spouse2Age} />
            </div>
            
            <div className="grid gap-6 lg:grid-cols-2">
              <SocialSecurityPlanner 
                ssData={ssData} 
                onChange={setSsData} 
                filingStatus={taxSettings.filingStatus} 
                spouse1Age={taxSettings.spouse1Age}
                spouse2Age={taxSettings.spouse2Age}
              />
              <TaxSettings taxSettings={taxSettings} onChange={setTaxSettings} />
            </div>
            
            <div className="grid gap-6 lg:grid-cols-1">
              <ACASettings 
                acaSettings={taxSettings.acaSettings} 
                onChange={(newAcaSettings) => setTaxSettings({...taxSettings, acaSettings: newAcaSettings})} 
              />
            </div>
          </TabsContent>

          <TabsContent value="dashboard" className="space-y-6 mt-6">
            {/* Income Alerts Banner */}
            {incomeAlerts.length > 0 && (
              <IncomeAlertsBanner alerts={incomeAlerts} />
            )}

            <SummaryCards {...summary} />

            {/* Action Items and Bracket Gauge */}
            <div className="grid gap-6 lg:grid-cols-2">
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
              />
              <BracketFillGauge
                grossIncome={currentYearGrossIncome}
                filingStatus={taxSettings.filingStatus}
                yearIndex={0}
                inflationRate={taxSettings.inflationRate}
              />
            </div>
          </TabsContent>

          <TabsContent value="projections" className="mt-6">
            <ProjectionTable projections={projections} />
          </TabsContent>

          <TabsContent value="analysis" className="mt-6 space-y-6">
            {/* Scenario Manager and Comparison */}
            <div className="grid gap-6 lg:grid-cols-1">
              <ScenarioManager
                scenarios={scenarios}
                currentMetrics={twoPassResults.currentMetrics}
                currentAccounts={accounts}
                currentSSData={ssData}
                currentTaxSettings={taxSettings}
                onAddScenario={addScenario}
                onRemoveScenario={removeScenario}
                onRenameScenario={renameScenario}
                onClearScenarios={clearScenarios}
              />
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
            
            {/* RMD Planning Center */}
            <RMDPlanner
              spouse1TradBalance={accounts.spouse1Traditional}
              spouse2TradBalance={accounts.spouse2Traditional}
              rothBalance={accounts.roth}
              spouse1Age={taxSettings.spouse1Age}
              spouse2Age={taxSettings.spouse2Age}
              filingStatus={taxSettings.filingStatus}
              rothConversionStrategy={taxSettings.rothConversionStrategy}
              growthRate={accounts.traditionalReturn}
              inflationRate={taxSettings.inflationRate}
              otherIncome={ssData.spouse1.estimatedBenefit * 12 + (taxSettings.filingStatus === 'married' ? ssData.spouse2.estimatedBenefit * 12 : 0)}
            />
            
            <div className="grid gap-6 lg:grid-cols-2">
              <BracketAnalysisCard analysis={detailedMetrics.bracketConsistency} projections={projections} />
              <BracketChart data={projections} />
            </div>
            <ProjectionChart data={chartData} />
            <TaxChart data={taxChartData} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;

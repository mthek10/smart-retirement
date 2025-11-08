import { useState, useMemo } from "react";
import { AccountInputs } from "@/components/AccountInputs";
import { SocialSecurityPlanner } from "@/components/SocialSecurityPlanner";
import { TaxSettings } from "@/components/TaxSettings";
import { ProjectionTable } from "@/components/ProjectionTable";
import { ProjectionChart } from "@/components/ProjectionChart";
import { SummaryCards } from "@/components/SummaryCards";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  calculateFederalTax, 
  calculateIRMAA, 
  calculateSocialSecurityBenefit,
  calculateTaxableSocialSecurity,
  calculateRMD,
  calculateCapitalGainsTax,
  getMarginalTaxBracket
} from "@/lib/taxCalculations";

const Index = () => {
  const [accounts, setAccounts] = useState({
    traditional: 5000000,
    roth: 0,
    taxable: 3000000,
    traditionalReturn: 4,
    rothReturn: 4,
    taxableReturn: 4,
  });

  const [ssData, setSsData] = useState({
    spouse1: {
      estimatedBenefit: 3000,
      claimAge: 67,
      fullRetirementAge: 67,
    },
    spouse2: {
      estimatedBenefit: 2500,
      claimAge: 67,
      fullRetirementAge: 67,
    },
  });

  const [taxSettings, setTaxSettings] = useState({
    filingStatus: 'married',
    stateRate: 5,
    spouse1Age: 65,
    spouse2Age: 65,
    annualExpenses: 60000,
    inflationRate: 2.5,
    optimizeRothConversions: false,
    rothConversionTarget: 94300,
  });

  const projections = useMemo(() => {
    const results = [];
    let tradBalance = accounts.traditional;
    let rothBalance = accounts.roth;
    let taxableBalance = accounts.taxable;

    const annualWithdrawal = taxSettings.annualExpenses;
    const maxYears = Math.max(100 - taxSettings.spouse1Age, 100 - taxSettings.spouse2Age);

    // First pass: Calculate future RMD years to determine target bracket
    let futureRMDIncome = 0;
    let rmdYearCount = 0;
    if (taxSettings.optimizeRothConversions) {
      let futureBalance = accounts.traditional;
      for (let i = 0; i <= maxYears; i++) {
        const futureAge = taxSettings.spouse1Age + i;
        if (futureAge >= 73 && futureAge <= 85) {
          const futureRMD = calculateRMD(futureBalance, futureAge);
          const inflationMultiplier = Math.pow(1 + taxSettings.inflationRate / 100, i);
          const futureSS = (ssData.spouse1.claimAge <= futureAge ? ssData.spouse1.estimatedBenefit * 12 : 0) +
                          (ssData.spouse2.claimAge <= futureAge ? ssData.spouse2.estimatedBenefit * 12 : 0);
          futureRMDIncome += futureRMD * inflationMultiplier + futureSS * inflationMultiplier;
          rmdYearCount++;
          futureBalance = futureBalance * (1 + accounts.traditionalReturn / 100) - futureRMD;
        }
      }
    }
    const targetConversionIncome = rmdYearCount > 0 ? futureRMDIncome / rmdYearCount * 0.85 : taxSettings.rothConversionTarget;

    for (let i = 0; i <= maxYears; i++) {
      const year = new Date().getFullYear() + i;
      const spouse1CurrentAge = taxSettings.spouse1Age + i;
      const spouse2CurrentAge = taxSettings.spouse2Age + i;
      const age = Math.max(spouse1CurrentAge, spouse2CurrentAge); // Use older spouse's age for display

      // Calculate Social Security for both spouses (only if they're alive) with inflation adjustment
      const inflationMultiplier = Math.pow(1 + taxSettings.inflationRate / 100, i);
      
      const ss1Annual = spouse1CurrentAge >= ssData.spouse1.claimAge && spouse1CurrentAge <= 100
        ? calculateSocialSecurityBenefit(ssData.spouse1.estimatedBenefit, ssData.spouse1.claimAge, ssData.spouse1.fullRetirementAge) * 12 * inflationMultiplier
        : 0;
      
      const ss2Annual = spouse2CurrentAge >= ssData.spouse2.claimAge && spouse2CurrentAge <= 100
        ? calculateSocialSecurityBenefit(ssData.spouse2.estimatedBenefit, ssData.spouse2.claimAge, ssData.spouse2.fullRetirementAge) * 12 * inflationMultiplier
        : 0;
      
      const ssAnnual = ss1Annual + ss2Annual;

      // Calculate RMD if applicable (based on account owner's age - use spouse1)
      const rmd = calculateRMD(tradBalance, spouse1CurrentAge);
      
      // Apply inflation to annual expenses
      const adjustedAnnualExpenses = annualWithdrawal * inflationMultiplier;
      const requiredWithdrawal = Math.max(adjustedAnnualExpenses, rmd);

      // Withdrawal sequencing: Taxable first, then Traditional, then Roth
      let withdrawalAmount = requiredWithdrawal;
      let taxableWithdrawal = 0;
      let traditionalWithdrawal = 0;
      let rothWithdrawal = 0;

      if (taxableBalance > 0) {
        taxableWithdrawal = Math.min(withdrawalAmount, taxableBalance);
        withdrawalAmount -= taxableWithdrawal;
        taxableBalance -= taxableWithdrawal;
      }

      if (withdrawalAmount > 0 && tradBalance > 0) {
        traditionalWithdrawal = Math.min(withdrawalAmount, tradBalance);
        withdrawalAmount -= traditionalWithdrawal;
        tradBalance -= traditionalWithdrawal;
      }

      if (withdrawalAmount > 0 && rothBalance > 0) {
        rothWithdrawal = Math.min(withdrawalAmount, rothBalance);
        rothBalance -= rothWithdrawal;
      }

      // Roth conversion optimization (before RMDs and in low-income years)
      let rothConversion = 0;
      if (taxSettings.optimizeRothConversions && spouse1CurrentAge < 73 && tradBalance > 0) {
        // Calculate current income before conversion
        const capitalGainsPreConversion = taxableWithdrawal * 0.5;
        const ordinaryIncomePreConversion = traditionalWithdrawal;
        const taxableSSIncomePreConversion = calculateTaxableSocialSecurity(
          ssAnnual,
          ordinaryIncomePreConversion + capitalGainsPreConversion,
          taxSettings.filingStatus
        );
        const totalIncomePreConversion = ordinaryIncomePreConversion + taxableSSIncomePreConversion + capitalGainsPreConversion;
        
        // Calculate room to convert up to target income (based on future RMD years)
        const conversionRoom = Math.max(0, targetConversionIncome - totalIncomePreConversion);
        
        // Convert up to the room available, but not more than Traditional balance
        rothConversion = Math.min(conversionRoom, tradBalance);
        
        if (rothConversion > 0) {
          tradBalance -= rothConversion;
          rothBalance += rothConversion;
        }
      }

      // Calculate taxable income (ordinary income only for federal tax)
      // Assume 50% of taxable withdrawal is cost basis, 50% is capital gains
      const capitalGains = taxableWithdrawal * 0.5;
      const ordinaryIncome = traditionalWithdrawal + rothConversion;
      
      const taxableSSIncome = calculateTaxableSocialSecurity(
        ssAnnual, 
        ordinaryIncome + capitalGains,
        taxSettings.filingStatus
      );
      
      const totalOrdinaryIncome = ordinaryIncome + taxableSSIncome;

      // Calculate taxes - capital gains are taxed separately (apply inflation to standard deduction)
      const federalTaxOrdinary = calculateFederalTax(totalOrdinaryIncome, taxSettings.filingStatus, i, taxSettings.inflationRate);
      const federalTaxCapitalGains = calculateCapitalGainsTax(capitalGains, totalOrdinaryIncome, taxSettings.filingStatus);
      const federalTax = federalTaxOrdinary + federalTaxCapitalGains;
      
      // Calculate marginal tax bracket
      const marginalBracket = getMarginalTaxBracket(totalOrdinaryIncome, taxSettings.filingStatus, i, taxSettings.inflationRate);
      
      // State tax applies to all income
      const stateTax = (totalOrdinaryIncome + capitalGains) * (taxSettings.stateRate / 100);

      // Calculate IRMAA (only applies at age 65+ when on Medicare) - calculate for both spouses
      const magi = totalOrdinaryIncome + capitalGains;
      let irmaa = 0;
      if (spouse1CurrentAge >= 65 && spouse1CurrentAge <= 100) {
        irmaa += calculateIRMAA(magi);
      }
      if (spouse2CurrentAge >= 65 && spouse2CurrentAge <= 100) {
        irmaa += calculateIRMAA(magi);
      }

      // Apply growth to remaining balances
      tradBalance *= (1 + accounts.traditionalReturn / 100);
      rothBalance *= (1 + accounts.rothReturn / 100);
      taxableBalance *= (1 + accounts.taxableReturn / 100);

      results.push({
        year,
        age,
        traditionalBalance: tradBalance,
        rothBalance,
        taxableBalance,
        ssIncome: ssAnnual,
        withdrawals: taxableWithdrawal + traditionalWithdrawal + rothWithdrawal,
        federalTax,
        stateTax,
        irmaa,
        rmd,
        totalIncome: ssAnnual + taxableWithdrawal + traditionalWithdrawal + rothWithdrawal,
        rothConversion,
        marginalBracket,
      });
    }

    return results;
  }, [accounts, ssData, taxSettings]);

  const chartData = useMemo(() => {
    return projections.map(p => ({
      year: p.year,
      Traditional: p.traditionalBalance,
      Roth: p.rothBalance,
      Taxable: p.taxableBalance,
      "Social Security": p.ssIncome,
    }));
  }, [projections]);

  const summary = useMemo(() => {
    const totalTaxes = projections.reduce((sum, p) => sum + p.federalTax + p.stateTax, 0);
    const totalIRMAA = projections.reduce((sum, p) => sum + p.irmaa, 0);
    const avgWithdrawal = projections.length > 0 
      ? projections.reduce((sum, p) => sum + p.withdrawals, 0) / projections.length 
      : 0;
    const totalPortfolio = accounts.traditional + accounts.roth + accounts.taxable;

    return { totalPortfolio, totalTaxes, totalIRMAA, avgWithdrawal };
  }, [projections, accounts]);

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
        <div className="space-y-8">
          <SummaryCards {...summary} />

          <Tabs defaultValue="inputs" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="inputs">Inputs</TabsTrigger>
              <TabsTrigger value="projections">Projections</TabsTrigger>
              <TabsTrigger value="charts">Charts</TabsTrigger>
            </TabsList>

            <TabsContent value="inputs" className="space-y-6 mt-6">
              <div className="grid gap-6 lg:grid-cols-2">
                <AccountInputs accounts={accounts} onChange={setAccounts} />
                <div className="space-y-6">
                  <SocialSecurityPlanner ssData={ssData} onChange={setSsData} />
                  <TaxSettings taxSettings={taxSettings} onChange={setTaxSettings} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="projections" className="mt-6">
              <ProjectionTable projections={projections} />
            </TabsContent>

            <TabsContent value="charts" className="mt-6">
              <ProjectionChart data={chartData} />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default Index;

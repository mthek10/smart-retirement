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
  calculateCapitalGainsTax 
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
    currentAge: 65,
    annualExpenses: 60000,
  });

  const projections = useMemo(() => {
    const results = [];
    let tradBalance = accounts.traditional;
    let rothBalance = accounts.roth;
    let taxableBalance = accounts.taxable;

    const annualWithdrawal = taxSettings.annualExpenses;

    for (let i = 0; i < 20; i++) {
      const year = new Date().getFullYear() + i;
      const age = taxSettings.currentAge + i;

      // Calculate Social Security for both spouses
      const ss1Annual = age >= ssData.spouse1.claimAge 
        ? calculateSocialSecurityBenefit(ssData.spouse1.estimatedBenefit, ssData.spouse1.claimAge, ssData.spouse1.fullRetirementAge) * 12
        : 0;
      
      const ss2Annual = age >= ssData.spouse2.claimAge 
        ? calculateSocialSecurityBenefit(ssData.spouse2.estimatedBenefit, ssData.spouse2.claimAge, ssData.spouse2.fullRetirementAge) * 12
        : 0;
      
      const ssAnnual = ss1Annual + ss2Annual;

      // Calculate RMD if applicable
      const rmd = calculateRMD(tradBalance, age);
      const requiredWithdrawal = Math.max(annualWithdrawal, rmd);

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

      // Calculate taxable income (ordinary income only for federal tax)
      // Assume 50% of taxable withdrawal is cost basis, 50% is capital gains
      const capitalGains = taxableWithdrawal * 0.5;
      const ordinaryIncome = traditionalWithdrawal;
      
      const taxableSSIncome = calculateTaxableSocialSecurity(
        ssAnnual, 
        ordinaryIncome + capitalGains,
        taxSettings.filingStatus
      );
      
      const totalOrdinaryIncome = ordinaryIncome + taxableSSIncome;

      // Calculate taxes - capital gains are taxed separately
      const federalTaxOrdinary = calculateFederalTax(totalOrdinaryIncome, taxSettings.filingStatus);
      const federalTaxCapitalGains = calculateCapitalGainsTax(capitalGains, totalOrdinaryIncome, taxSettings.filingStatus);
      const federalTax = federalTaxOrdinary + federalTaxCapitalGains;
      
      // State tax applies to all income
      const stateTax = (totalOrdinaryIncome + capitalGains) * (taxSettings.stateRate / 100);

      // Calculate IRMAA (only applies at age 65+ when on Medicare)
      const magi = totalOrdinaryIncome + capitalGains;
      const irmaa = age >= 65 ? calculateIRMAA(magi) : 0;

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
    const totalTaxes = projections.slice(0, 10).reduce((sum, p) => sum + p.federalTax + p.stateTax, 0);
    const totalIRMAA = projections.slice(0, 10).reduce((sum, p) => sum + p.irmaa, 0);
    const avgWithdrawal = projections.slice(0, 10).reduce((sum, p) => sum + p.withdrawals, 0) / 10;
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

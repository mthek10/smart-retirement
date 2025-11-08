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
  calculateRMD 
} from "@/lib/taxCalculations";

const Index = () => {
  const [accounts, setAccounts] = useState({
    traditional: 500000,
    roth: 200000,
    taxable: 100000,
    traditionalReturn: 7,
    rothReturn: 7,
    taxableReturn: 6,
  });

  const [ssData, setSsData] = useState({
    estimatedBenefit: 3000,
    claimAge: 67,
    fullRetirementAge: 67,
  });

  const [taxSettings, setTaxSettings] = useState({
    filingStatus: 'married',
    stateRate: 5,
    currentAge: 65,
  });

  const projections = useMemo(() => {
    const results = [];
    let tradBalance = accounts.traditional;
    let rothBalance = accounts.roth;
    let taxableBalance = accounts.taxable;

    const annualWithdrawal = 60000;

    for (let i = 0; i < 20; i++) {
      const year = new Date().getFullYear() + i;
      const age = taxSettings.currentAge + i;

      // Calculate Social Security
      const ssAnnual = age >= ssData.claimAge 
        ? calculateSocialSecurityBenefit(ssData.estimatedBenefit, ssData.claimAge, ssData.fullRetirementAge) * 12
        : 0;

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

      // Calculate taxable income
      const taxableSSIncome = calculateTaxableSocialSecurity(
        ssAnnual, 
        traditionalWithdrawal + (taxableWithdrawal * 0.5), // Assume 50% of taxable is long-term gains
        taxSettings.filingStatus
      );
      
      const taxableIncome = traditionalWithdrawal + taxableSSIncome + (taxableWithdrawal * 0.5);

      // Calculate taxes
      const federalTax = calculateFederalTax(taxableIncome, taxSettings.filingStatus);
      const stateTax = taxableIncome * (taxSettings.stateRate / 100);

      // Calculate IRMAA
      const magi = traditionalWithdrawal + taxableSSIncome + (taxableWithdrawal * 0.5);
      const irmaa = calculateIRMAA(magi);

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

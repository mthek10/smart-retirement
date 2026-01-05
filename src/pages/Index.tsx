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
import { useTwoPassProjections } from "@/hooks/useProjections";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  calculateFederalTax, 
  calculateIRMAA, 
  calculateMedicarePremiums,
  calculateSocialSecurityBenefit,
  calculateTaxableSocialSecurity,
  calculateRMD,
  calculateCombinedRMD,
  calculateCapitalGainsTax,
  getMarginalTaxBracket,
  calculateBracketConsistency,
  calculateStateSocialSecurityTax,
  calculateStateIncomeTax,
  calculateStateCapitalGainsTax,
  calculateFullRetirementAge,
  calculateNIIT,
  calculateAMT,
  calculateFICATax,
  calculateMedicareTax,
  calculate401kContribution,
  calculate401kEmployerMatch,
  getRothConversionLimit,
  calculateACASubsidy,
  calculateSurvivorSSBenefit
} from "@/lib/taxCalculations";

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
    },
    spouse2: {
      estimatedBenefit: 3000,
      claimAge: 67,
    },
  });

  const [taxSettings, setTaxSettings] = useState({
    filingStatus: 'married',
    state: 'none',
    stateRate: 5,
    spouse1Age: 60,
    spouse2Age: 58,
    targetTakeHome: 80000,
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
  });

  const projections = useMemo(() => {
    const results = [];
    let spouse1TradBalance = accounts.spouse1Traditional;
    let spouse2TradBalance = accounts.spouse2Traditional;
    let rothBalance = accounts.roth;
    let taxableBalance = accounts.taxable;

    const maxYears = Math.max(100 - taxSettings.spouse1Age, 100 - taxSettings.spouse2Age);

    // Iterative solver to find withdrawal amount that achieves target take home
    const calculateRequiredWithdrawal = (
      targetTakeHome: number,
      ssAnnual: number,
      currentBalances: { tradBalance: number; rothBalance: number; taxableBalance: number },
      currentRMD: number,
      yearIndex: number,
      spouse1Age: number,
      spouse2Age: number,
      taxableWages: number
    ): number => {
      // Binary search to find required withdrawal
      let low = Math.max(0, currentRMD); // Can't go below RMD
      let high = Math.max(
        targetTakeHome * 3, // Upper bound estimate
        currentBalances.tradBalance + currentBalances.rothBalance + currentBalances.taxableBalance
      );
      
      const tolerance = 100; // Within $100 of target
      const maxIterations = 30;
      
      for (let iter = 0; iter < maxIterations; iter++) {
        const testWithdrawal = (low + high) / 2;
        
        // Simulate withdrawals with this amount
        let testTaxable = currentBalances.taxableBalance;
        let testTrad = currentBalances.tradBalance;
        let testRoth = currentBalances.rothBalance;
        
        let remaining = testWithdrawal;
        let capitalGainsRealized = 0;
        let traditionalWithdrawn = 0;
        let rothWithdrawn = 0;
        
        // Withdrawal sequencing: RMD from Traditional first -> Taxable -> Additional Traditional -> Roth
        // First, take RMD from traditional (mandatory)
        if (currentRMD > 0 && testTrad > 0) {
          const rmdWithdrawal = Math.min(currentRMD, testTrad, remaining);
          traditionalWithdrawn = rmdWithdrawal;
          testTrad -= rmdWithdrawal;
          remaining -= rmdWithdrawal;
        }
        
        // Then draw from taxable
        if (remaining > 0 && testTaxable > 0) {
          const fromTaxable = Math.min(remaining, testTaxable);
          capitalGainsRealized = fromTaxable * ((100 - accounts.taxableCostBasisPercent) / 100);
          testTaxable -= fromTaxable;
          remaining -= fromTaxable;
        }
        
        // Additional from traditional if needed
        if (remaining > 0 && testTrad > 0) {
          const fromTrad = Math.min(remaining, testTrad);
          traditionalWithdrawn += fromTrad;
          testTrad -= fromTrad;
          remaining -= fromTrad;
        }
        
        // Finally from Roth
        if (remaining > 0 && testRoth > 0) {
          const fromRoth = Math.min(remaining, testRoth);
          rothWithdrawn = fromRoth;
          testRoth -= fromRoth;
          remaining -= fromRoth;
        }
        
        // Roth conversion optimization - works at any age
        let rothConversion = 0;
        const targetIncomeLimit = getRothConversionLimit(
          taxSettings.rothConversionStrategy,
          taxSettings.filingStatus,
          yearIndex,
          taxSettings.inflationRate / 100,
          taxSettings.rothConversionCustom
        );
        if (targetIncomeLimit > 0 && testTrad > 0) {
          // Calculate current income (before conversions)
          const currentIncome = ssAnnual + traditionalWithdrawn;
          
          // Room available up to target limit
          const conversionRoom = Math.max(0, targetIncomeLimit - currentIncome);
          
          // Convert as much as possible without exceeding target or available balance
          rothConversion = Math.min(conversionRoom, testTrad);
        }
        
        // Calculate taxes (including Roth conversion in ordinary income and taxable wages)
        const ordinaryIncome = traditionalWithdrawn + rothConversion + taxableWages;
        const taxableSS = calculateTaxableSocialSecurity(ssAnnual, ordinaryIncome + capitalGainsRealized, taxSettings.filingStatus);
        const totalOrdinaryIncome = ordinaryIncome + taxableSS;
        
        const federalTax = calculateFederalTax(totalOrdinaryIncome, taxSettings.filingStatus, yearIndex, taxSettings.inflationRate / 100);
        const federalCapitalGainsTax = calculateCapitalGainsTax(capitalGainsRealized, totalOrdinaryIncome, taxSettings.filingStatus, yearIndex, taxSettings.inflationRate / 100);
        
        // State tax calculation - must match main projection logic
        let stateTax = 0;
        let stateCapitalGainsTax = 0;
        
        if (taxSettings.state === 'other') {
          // Use custom state rate
          stateTax = totalOrdinaryIncome * (taxSettings.stateRate / 100);
          stateCapitalGainsTax = capitalGainsRealized * (taxSettings.stateRate / 100);
        } else if (taxSettings.state && taxSettings.state !== 'none') {
          // Calculate state-specific social security tax
          const agi = totalOrdinaryIncome + capitalGainsRealized;
          const stateSSTax = calculateStateSocialSecurityTax(
            ssAnnual,
            agi,
            taxSettings.filingStatus,
            taxSettings.state,
            spouse1Age
          );
          
          // Calculate state income tax on non-SS ordinary income
          const nonSSIncome = ordinaryIncome;
          const stateIncomeTax = calculateStateIncomeTax(nonSSIncome, taxSettings.state, taxSettings.filingStatus);
          
          // Calculate state capital gains tax
          stateCapitalGainsTax = calculateStateCapitalGainsTax(capitalGainsRealized, nonSSIncome, taxSettings.state, taxSettings.filingStatus);
          
          stateTax = stateSSTax + stateIncomeTax;
        }
        
        // Calculate IRMAA
        const magi = totalOrdinaryIncome + capitalGainsRealized;
        let irmaa = 0;
        if (spouse1Age >= 65 && spouse1Age <= 100) {
          irmaa += calculateIRMAA(magi, yearIndex, taxSettings.inflationRate / 100);
        }
        if (spouse2Age >= 65 && spouse2Age <= 100) {
          irmaa += calculateIRMAA(magi, yearIndex, taxSettings.inflationRate / 100);
        }
        
        // Calculate Medicare Part B and D premiums
        let medicarePremiums = 0;
        if (spouse1Age >= 65 && spouse1Age <= 100) {
          medicarePremiums += calculateMedicarePremiums(yearIndex, taxSettings.inflationRate / 100);
        }
        if (spouse2Age >= 65 && spouse2Age <= 100) {
          medicarePremiums += calculateMedicarePremiums(yearIndex, taxSettings.inflationRate / 100);
        }
        
        // Calculate NIIT (Net Investment Income Tax)
        const niit = calculateNIIT(capitalGainsRealized, magi, taxSettings.filingStatus, yearIndex, taxSettings.inflationRate / 100);
        
        // Calculate AMT (Alternative Minimum Tax)
        const amt = calculateAMT(totalOrdinaryIncome, capitalGainsRealized, taxSettings.filingStatus, yearIndex, taxSettings.inflationRate / 100);
        
        // Calculate actual take home
        const calculatedTakeHome = testWithdrawal + ssAnnual - federalTax - federalCapitalGainsTax - stateTax - stateCapitalGainsTax - irmaa - medicarePremiums - niit - amt;
        
        // Check if we're within tolerance
        if (Math.abs(calculatedTakeHome - targetTakeHome) < tolerance) {
          return testWithdrawal;
        }
        
        // Adjust search range
        if (calculatedTakeHome < targetTakeHome) {
          low = testWithdrawal;
        } else {
          high = testWithdrawal;
        }
        
        // Safety check: if we can't achieve target even with max withdrawal
        if (iter === maxIterations - 1) {
          return testWithdrawal;
        }
      }
      
      return (low + high) / 2;
    };

    
    // Reset balances for actual projection
    spouse1TradBalance = accounts.spouse1Traditional;
    spouse2TradBalance = accounts.spouse2Traditional;
    rothBalance = accounts.roth;
    taxableBalance = accounts.taxable;

    // Track Social Security benefits at time of death for survivor calculations
    let spouse1SSAtDeath = 0;
    let spouse2SSAtDeath = 0;
    let spouse1DeathYearIndex: number | null = null;
    let spouse2DeathYearIndex: number | null = null;

    for (let i = 0; i <= maxYears; i++) {
      const year = new Date().getFullYear() + i;
      const spouse1CurrentAge = taxSettings.spouse1Age + i;
      const spouse2CurrentAge = taxSettings.spouse2Age + i;
      
      // Determine if spouses are alive (survivor scenario)
      const survivorEnabled = taxSettings.survivorSettings?.enabled && taxSettings.filingStatus === 'married';
      const spouse1DeathAge = taxSettings.survivorSettings?.spouse1DeathAge;
      const spouse2DeathAge = taxSettings.survivorSettings?.spouse2DeathAge;
      
      const spouse1Alive = !survivorEnabled || 
        spouse1DeathAge === null || 
        spouse1CurrentAge < spouse1DeathAge;
      const spouse2Alive = !survivorEnabled || 
        spouse2DeathAge === null || 
        spouse2CurrentAge < spouse2DeathAge;
      
      // Track death year indices
      if (!spouse1Alive && spouse1DeathYearIndex === null) {
        spouse1DeathYearIndex = i;
      }
      if (!spouse2Alive && spouse2DeathYearIndex === null) {
        spouse2DeathYearIndex = i;
      }
      
      // If both spouses have passed, stop projections
      if (!spouse1Alive && !spouse2Alive) {
        break;
      }
      
      // Dynamic filing status (changes to Single after spouse death)
      const effectiveFilingStatus = (spouse1Alive && spouse2Alive) 
        ? taxSettings.filingStatus 
        : 'single';
      
      // Use older living spouse's age for display
      const age = spouse1Alive && spouse2Alive 
        ? Math.max(spouse1CurrentAge, spouse2CurrentAge)
        : (spouse1Alive ? spouse1CurrentAge : spouse2CurrentAge);

      // Calculate Social Security for both spouses with COLA adjustments
      const inflationMultiplier = Math.pow(1 + taxSettings.inflationRate / 100, i);
      
      // Calculate years since claiming for COLA adjustment
      const spouse1YearsSinceClaiming = spouse1CurrentAge >= ssData.spouse1.claimAge 
        ? spouse1CurrentAge - ssData.spouse1.claimAge 
        : 0;
      const spouse2YearsSinceClaiming = spouse2CurrentAge >= ssData.spouse2.claimAge 
        ? spouse2CurrentAge - ssData.spouse2.claimAge 
        : 0;
      
      // COLA multiplier
      const spouse1ColaMultiplier = spouse1YearsSinceClaiming > 0 
        ? Math.pow(1 + taxSettings.inflationRate / 100, spouse1YearsSinceClaiming) 
        : 1;
      const spouse2ColaMultiplier = spouse2YearsSinceClaiming > 0 
        ? Math.pow(1 + taxSettings.inflationRate / 100, spouse2YearsSinceClaiming) 
        : 1;
      
      // Calculate individual SS benefits
      const spouse1FRA = calculateFullRetirementAge(taxSettings.spouse1Age);
      const spouse2FRA = calculateFullRetirementAge(taxSettings.spouse2Age);
      
      const ss1Base = spouse1Alive && spouse1CurrentAge >= ssData.spouse1.claimAge && spouse1CurrentAge <= 100
        ? calculateSocialSecurityBenefit(
            ssData.spouse1.estimatedBenefit, 
            ssData.spouse1.claimAge, 
            spouse1FRA
          ) * 12 * spouse1ColaMultiplier
        : 0;
      
      const ss2Base = taxSettings.filingStatus === 'married' 
        && spouse2Alive
        && spouse2CurrentAge >= ssData.spouse2.claimAge 
        && spouse2CurrentAge <= 100
        ? calculateSocialSecurityBenefit(
            ssData.spouse2.estimatedBenefit, 
            ssData.spouse2.claimAge, 
            spouse2FRA
          ) * 12 * spouse2ColaMultiplier
        : 0;
      
      // Track SS at death for survivor benefit calculation
      if (spouse1Alive && ss1Base > 0) spouse1SSAtDeath = ss1Base;
      if (spouse2Alive && ss2Base > 0) spouse2SSAtDeath = ss2Base;
      
      // Calculate Social Security with survivor benefits
      let ssAnnual = 0;
      let ss1Annual = ss1Base;
      let ss2Annual = ss2Base;
      
      if (spouse1Alive && spouse2Alive) {
        // Both alive - normal calculation
        ssAnnual = ss1Annual + ss2Annual;
      } else if (spouse1Alive && !spouse2Alive) {
        // Spouse 2 deceased - Spouse 1 gets survivor benefit
        ssAnnual = calculateSurvivorSSBenefit(
          spouse2SSAtDeath, 
          ss1Annual,
          spouse1CurrentAge,
          spouse1FRA
        );
        ss1Annual = ssAnnual;
        ss2Annual = 0;
      } else if (!spouse1Alive && spouse2Alive) {
        // Spouse 1 deceased - Spouse 2 gets survivor benefit
        ssAnnual = calculateSurvivorSSBenefit(
          spouse1SSAtDeath,
          ss2Annual,
          spouse2CurrentAge,
          spouse2FRA
        );
        ss2Annual = ssAnnual;
        ss1Annual = 0;
      }

      // Calculate employment income if spouses are still working AND alive
      const spouse1Working = spouse1Alive && spouse1CurrentAge < taxSettings.spouse1Employment.retirementAge;
      const spouse2Working = spouse2Alive && taxSettings.filingStatus === 'married' 
        && spouse2CurrentAge < taxSettings.spouse2Employment.retirementAge;
      
      const spouse1Wages = spouse1Working 
        ? taxSettings.spouse1Employment.currentIncome * inflationMultiplier 
        : 0;
      const spouse2Wages = spouse2Working
        ? taxSettings.spouse2Employment.currentIncome * inflationMultiplier
        : 0;
      
      const totalWages = spouse1Wages + spouse2Wages;
      
      // Calculate 401(k) contributions (inflated with wages)
      const spouse1_401k = spouse1Working && taxSettings.spouse1Employment.contributes401k
        ? calculate401kContribution(
            taxSettings.spouse1Employment.contribution401kAmount,
            spouse1CurrentAge,
            i,
            taxSettings.inflationRate / 100
          )
        : 0;
      
      const spouse2_401k = spouse2Working && taxSettings.spouse2Employment.contributes401k
        ? calculate401kContribution(
            taxSettings.spouse2Employment.contribution401kAmount,
            spouse2CurrentAge,
            i,
            taxSettings.inflationRate / 100
          )
        : 0;
      
      const total401kContributions = spouse1_401k + spouse2_401k;
      
      // Calculate employer match
      const spouse1Match = spouse1Working && taxSettings.spouse1Employment.contributes401k
        ? calculate401kEmployerMatch(
            taxSettings.spouse1Employment.employerMatchAmount,
            i,
            taxSettings.inflationRate / 100
          )
        : 0;
      
      const spouse2Match = spouse2Working && taxSettings.spouse2Employment.contributes401k
        ? calculate401kEmployerMatch(
            taxSettings.spouse2Employment.employerMatchAmount,
            i,
            taxSettings.inflationRate / 100
          )
        : 0;
      
      const totalEmployerMatch = spouse1Match + spouse2Match;
      
      // Calculate payroll taxes
      const ficaTax = calculateFICATax(totalWages, i, taxSettings.inflationRate / 100);
      const medicareTax = calculateMedicareTax(totalWages, effectiveFilingStatus, i, taxSettings.inflationRate / 100);
      const totalPayrollTax = ficaTax + medicareTax;
      
      // Net wages after payroll taxes and 401k contributions
      const netWages = totalWages - totalPayrollTax - total401kContributions;
      
      // Consolidate traditional balances when spouse dies (survivor inherits)
      if (spouse1DeathYearIndex !== null && i === spouse1DeathYearIndex) {
        spouse2TradBalance += spouse1TradBalance;
        spouse1TradBalance = 0;
      }
      if (spouse2DeathYearIndex !== null && i === spouse2DeathYearIndex) {
        spouse1TradBalance += spouse2TradBalance;
        spouse2TradBalance = 0;
      }
      
      // Add 401k contributions and employer match to each spouse's traditional balance (only if alive)
      if (spouse1Alive) {
        spouse1TradBalance += spouse1_401k + spouse1Match;
      }
      if (spouse2Alive) {
        spouse2TradBalance += spouse2_401k + spouse2Match;
      }
      
      // Combined traditional balance for withdrawal calculations
      const tradBalance = spouse1TradBalance + spouse2TradBalance;

      // Calculate RMD for each living spouse based on their actual individual balance
      const spouse1RMD = spouse1Alive ? calculateRMD(spouse1TradBalance, spouse1CurrentAge) : 0;
      const spouse2RMD = spouse2Alive && taxSettings.filingStatus === 'married'
        ? calculateRMD(spouse2TradBalance, spouse2CurrentAge)
        : 0;
      const rmd = spouse1RMD + spouse2RMD;
      
      // Calculate taxable wages (wages minus pre-tax 401k contributions)
      const taxableWages = totalWages - total401kContributions;
      
      // Calculate target take-home with survivor spending adjustment
      const survivorSpendingPercent = taxSettings.survivorSettings?.survivorSpendingPercent || 75;
      const baseTargetTakeHome = taxSettings.targetTakeHome * inflationMultiplier;
      const effectiveTargetTakeHome = (spouse1Alive && spouse2Alive) 
        ? baseTargetTakeHome 
        : baseTargetTakeHome * (survivorSpendingPercent / 100);
      
      // Use iterative solver to find withdrawal that achieves target take home
      // Adjust target by subtracting net wages (employment income already covers part of living expenses)
      const adjustedTargetTakeHome = effectiveTargetTakeHome - netWages;
      
      // Track excess income when wages exceed target take-home (surplus to be invested)
      const excessIncome = adjustedTargetTakeHome < 0 ? Math.abs(adjustedTargetTakeHome) : 0;
      
      console.log(`Year ${i}: Target Take Home = $${adjustedTargetTakeHome.toFixed(2)}, Net Wages = $${netWages.toFixed(2)}, Excess Income = $${excessIncome.toFixed(2)}`);
      let requiredWithdrawal = adjustedTargetTakeHome > 0 ? calculateRequiredWithdrawal(
        adjustedTargetTakeHome,
        ssAnnual,
        { tradBalance, rothBalance, taxableBalance },
        rmd,
        i,
        spouse1CurrentAge,
        spouse2CurrentAge,
        taxableWages
      ) : 0;
      
      // Ensure RMD is met even if no withdrawal is needed for spending
      // RMD must be taken regardless of spending needs
      if (rmd > 0 && requiredWithdrawal < rmd) {
        requiredWithdrawal = rmd;
      }
      
      console.log(`Year ${i}: Required Withdrawal = $${requiredWithdrawal.toFixed(2)}, RMD = $${rmd.toFixed(2)}, SS = $${ssAnnual.toFixed(2)}`);
      let adjustedAnnualExpenses = adjustedTargetTakeHome; // For display purposes

      // WITHDRAWAL SEQUENCING: Taxable → Traditional (with RMD priority) → Roth
      let withdrawalAmount = requiredWithdrawal;
      let taxableWithdrawal = 0;
      let traditionalWithdrawal = 0;
      let rothWithdrawal = 0;
      
      // Track how much is withdrawn from each spouse's traditional account
      let spouse1TradWithdrawal = 0;
      let spouse2TradWithdrawal = 0;

      // If RMD applies, prioritize traditional withdrawal to meet RMD first
      // Withdraw proportionally from each spouse based on their RMD
      if (rmd > 0 && tradBalance > 0) {
        const rmdWithdrawal = Math.min(rmd, tradBalance);
        // Withdraw from each spouse proportionally to their RMD
        if (spouse1RMD > 0) {
          const s1Portion = Math.min(spouse1RMD, spouse1TradBalance, rmdWithdrawal * (spouse1RMD / rmd));
          spouse1TradWithdrawal = s1Portion;
          spouse1TradBalance -= s1Portion;
        }
        if (spouse2RMD > 0) {
          const s2Portion = Math.min(spouse2RMD, spouse2TradBalance, rmdWithdrawal * (spouse2RMD / rmd));
          spouse2TradWithdrawal = s2Portion;
          spouse2TradBalance -= s2Portion;
        }
        traditionalWithdrawal = spouse1TradWithdrawal + spouse2TradWithdrawal;
        withdrawalAmount -= traditionalWithdrawal;
      }

      // Then draw from taxable account
      if (withdrawalAmount > 0 && taxableBalance > 0) {
        taxableWithdrawal = Math.min(withdrawalAmount, taxableBalance);
        withdrawalAmount -= taxableWithdrawal;
        taxableBalance -= taxableWithdrawal;
      }

      // Additional from traditional if needed (beyond RMD)
      // Draw proportionally from both spouses based on remaining balance
      const remainingTradBalance = spouse1TradBalance + spouse2TradBalance;
      if (withdrawalAmount > 0 && remainingTradBalance > 0) {
        const additionalTrad = Math.min(withdrawalAmount, remainingTradBalance);
        const s1Ratio = spouse1TradBalance / remainingTradBalance;
        const s1Additional = additionalTrad * s1Ratio;
        const s2Additional = additionalTrad * (1 - s1Ratio);
        spouse1TradBalance -= s1Additional;
        spouse2TradBalance -= s2Additional;
        spouse1TradWithdrawal += s1Additional;
        spouse2TradWithdrawal += s2Additional;
        traditionalWithdrawal += additionalTrad;
        withdrawalAmount -= additionalTrad;
      }

      // Finally from Roth
      if (withdrawalAmount > 0 && rothBalance > 0) {
        rothWithdrawal = Math.min(withdrawalAmount, rothBalance);
        rothBalance -= rothWithdrawal;
      }

      // ROTH CONVERSION OPTIMIZATION (IRMAA-AWARE) - Works at any age
      let rothConversion = 0;
      
      // For "optimize_consistency" strategy, use a dynamic target that fills to 22% bracket
      // This ensures consistent bracket usage across all years
      const isOptimizeConsistency = taxSettings.rothConversionStrategy === 'optimize_consistency';
      const effectiveStrategy = isOptimizeConsistency ? 'fill_22' : taxSettings.rothConversionStrategy;
      
      const targetIncomeLimit = getRothConversionLimit(
        effectiveStrategy,
        effectiveFilingStatus,
        i,
        taxSettings.inflationRate / 100,
        taxSettings.rothConversionCustom
      );
      
      // Use remaining combined traditional balance for Roth conversion decisions
      const remainingTradForConversion = spouse1TradBalance + spouse2TradBalance;
      
      if (targetIncomeLimit > 0 && remainingTradForConversion > 0) {
        // Calculate current income before conversion
        const capitalGains = taxableWithdrawal * ((100 - accounts.taxableCostBasisPercent) / 100);
        const ordinaryIncomePreConversion = traditionalWithdrawal + taxableWages;
        const taxableSSIncomePreConversion = calculateTaxableSocialSecurity(
          ssAnnual,
          ordinaryIncomePreConversion + capitalGains,
          effectiveFilingStatus
        );
        const totalOrdinaryIncomePreConversion = ordinaryIncomePreConversion + taxableSSIncomePreConversion;
        
        // Calculate room to convert up to target bracket
        const conversionRoom = Math.max(0, targetIncomeLimit - totalOrdinaryIncomePreConversion);
        
        // Propose initial conversion amount
        let proposedConversion = Math.min(conversionRoom, remainingTradForConversion);
        
        // IRMAA-aware optimization: Check if conversion triggers excessive IRMAA (only for living spouses 65+)
        const isIRMAAAge = (spouse1Alive && spouse1CurrentAge >= 65 && spouse1CurrentAge <= 100) || 
                           (spouse2Alive && spouse2CurrentAge >= 65 && spouse2CurrentAge <= 100);
        
        if (proposedConversion > 0 && isIRMAAAge) {
          // Calculate IRMAA without conversion
          const magiWithoutConversion = totalOrdinaryIncomePreConversion + capitalGains;
          let irmaaWithoutConversion = 0;
          if (spouse1Alive && spouse1CurrentAge >= 65 && spouse1CurrentAge <= 100) {
            irmaaWithoutConversion += calculateIRMAA(magiWithoutConversion, i, taxSettings.inflationRate / 100);
          }
          if (spouse2Alive && spouse2CurrentAge >= 65 && spouse2CurrentAge <= 100) {
            irmaaWithoutConversion += calculateIRMAA(magiWithoutConversion, i, taxSettings.inflationRate / 100);
          }
          
          // Calculate IRMAA with full conversion
          const magiWithConversion = totalOrdinaryIncomePreConversion + proposedConversion + capitalGains;
          let irmaaWithConversion = 0;
          if (spouse1Alive && spouse1CurrentAge >= 65 && spouse1CurrentAge <= 100) {
            irmaaWithConversion += calculateIRMAA(magiWithConversion, i, taxSettings.inflationRate / 100);
          }
          if (spouse2Alive && spouse2CurrentAge >= 65 && spouse2CurrentAge <= 100) {
            irmaaWithConversion += calculateIRMAA(magiWithConversion, i, taxSettings.inflationRate / 100);
          }
          
          const irmaaIncrease = irmaaWithConversion - irmaaWithoutConversion;
          
          // Calculate tax cost of conversion
          const marginalRate = getMarginalTaxBracket(totalOrdinaryIncomePreConversion + proposedConversion, effectiveFilingStatus, i, taxSettings.inflationRate / 100);
          const conversionTaxCost = proposedConversion * marginalRate;
          
          // If IRMAA increase is significant relative to conversion tax cost, it's not worth it
          // Rule: If IRMAA increase > 50% of conversion tax, reduce or skip conversion
          if (irmaaIncrease > conversionTaxCost * 0.5) {
            // Try to find optimal conversion amount that doesn't cross IRMAA threshold
            // Binary search for the conversion amount that maximizes efficiency
            let optimalConversion = 0;
            let step = proposedConversion / 10;
            
            for (let testConversion = step; testConversion <= proposedConversion; testConversion += step) {
              const testMagi = totalOrdinaryIncomePreConversion + testConversion + capitalGains;
              let testIrmaa = 0;
              if (spouse1Alive && spouse1CurrentAge >= 65 && spouse1CurrentAge <= 100) {
                testIrmaa += calculateIRMAA(testMagi, i, taxSettings.inflationRate / 100);
              }
              if (spouse2Alive && spouse2CurrentAge >= 65 && spouse2CurrentAge <= 100) {
                testIrmaa += calculateIRMAA(testMagi, i, taxSettings.inflationRate / 100);
              }
              
              const testIrmaaIncrease = testIrmaa - irmaaWithoutConversion;
              const testTaxCost = testConversion * getMarginalTaxBracket(totalOrdinaryIncomePreConversion + testConversion, effectiveFilingStatus, i, taxSettings.inflationRate / 100);
              
              // Keep conversion if IRMAA increase is reasonable
              if (testIrmaaIncrease <= testTaxCost * 0.5) {
                optimalConversion = testConversion;
              } else {
                break; // Stop if we hit IRMAA threshold
              }
            }
            
            proposedConversion = optimalConversion;
          }
        }
        
        rothConversion = proposedConversion;
        
        if (rothConversion > 0) {
          // Withdraw proportionally from both spouses for Roth conversion
          const conversionTradBalance = spouse1TradBalance + spouse2TradBalance;
          if (conversionTradBalance > 0) {
            const s1Ratio = spouse1TradBalance / conversionTradBalance;
            spouse1TradBalance -= rothConversion * s1Ratio;
            spouse2TradBalance -= rothConversion * (1 - s1Ratio);
          }
          rothBalance += rothConversion;
        }
      }

      // Calculate taxable income (ordinary income only for federal tax)
      // Cost basis vs capital gains ratio based on user input
      const capitalGains = taxableWithdrawal * ((100 - accounts.taxableCostBasisPercent) / 100);
      const ordinaryIncome = traditionalWithdrawal + rothConversion + taxableWages;
      
      const taxableSSIncome = calculateTaxableSocialSecurity(
        ssAnnual, 
        ordinaryIncome + capitalGains,
        effectiveFilingStatus
      );
      
      const totalOrdinaryIncome = ordinaryIncome + taxableSSIncome;

      // Calculate taxes - capital gains are taxed separately (apply inflation to standard deduction)
      const federalTaxOrdinary = calculateFederalTax(totalOrdinaryIncome, effectiveFilingStatus, i, taxSettings.inflationRate);
      const federalTaxCapitalGains = calculateCapitalGainsTax(capitalGains, totalOrdinaryIncome, effectiveFilingStatus, i, taxSettings.inflationRate);
      const federalTax = federalTaxOrdinary + federalTaxCapitalGains;
      
      // Calculate marginal tax bracket
      const marginalBracket = getMarginalTaxBracket(totalOrdinaryIncome, effectiveFilingStatus, i, taxSettings.inflationRate);
      
      // Calculate AGI for state tax purposes
      const agi = totalOrdinaryIncome + capitalGains;
      
      // State tax calculation with state-specific social security taxation
      let stateTax = 0;
      let stateCapitalGainsTax = 0;
      
      if (taxSettings.state === 'other') {
        // Use custom state rate
        stateTax = totalOrdinaryIncome * (taxSettings.stateRate / 100);
        stateCapitalGainsTax = capitalGains * (taxSettings.stateRate / 100);
      } else if (taxSettings.state && taxSettings.state !== 'none') {
        // Calculate state-specific social security tax
        const olderLivingSpouseAge = spouse1Alive && spouse2Alive 
          ? Math.max(spouse1CurrentAge, spouse2CurrentAge)
          : (spouse1Alive ? spouse1CurrentAge : spouse2CurrentAge);
        const stateSSTax = calculateStateSocialSecurityTax(
          ssAnnual,
          agi,
          effectiveFilingStatus,
          taxSettings.state,
          olderLivingSpouseAge
        );
        
        // Calculate state income tax on non-SS ordinary income
        const nonSSIncome = ordinaryIncome;
        const stateIncomeTax = calculateStateIncomeTax(nonSSIncome, taxSettings.state, effectiveFilingStatus);
        
        // Calculate state capital gains tax
        stateCapitalGainsTax = calculateStateCapitalGainsTax(capitalGains, nonSSIncome, taxSettings.state, effectiveFilingStatus);
        
        stateTax = stateSSTax + stateIncomeTax;
      }

      // Calculate IRMAA (only applies at age 65+ when on Medicare) - calculate for LIVING spouses only
      const magi = totalOrdinaryIncome + capitalGains;
      let irmaa = 0;
      if (spouse1Alive && spouse1CurrentAge >= 65 && spouse1CurrentAge <= 100) {
        irmaa += calculateIRMAA(magi, i, taxSettings.inflationRate / 100);
      }
      if (spouse2Alive && spouse2CurrentAge >= 65 && spouse2CurrentAge <= 100) {
        irmaa += calculateIRMAA(magi, i, taxSettings.inflationRate / 100);
      }

      // Calculate Medicare Part B and D base premiums (per LIVING person age 65+)
      let medicarePremiums = 0;
      if (spouse1Alive && spouse1CurrentAge >= 65 && spouse1CurrentAge <= 100) {
        medicarePremiums += calculateMedicarePremiums(i, taxSettings.inflationRate / 100);
      }
      if (spouse2Alive && spouse2CurrentAge >= 65 && spouse2CurrentAge <= 100) {
        medicarePremiums += calculateMedicarePremiums(i, taxSettings.inflationRate / 100);
      }

      // Calculate ACA subsidies (only applies to LIVING persons under 65)
      let acaPremium = 0;
      let acaSubsidy = 0;
      let netAcaCost = 0;
      
      if (taxSettings.acaSettings.enabled) {
        const enrolleeAges: number[] = [];
        if (spouse1Alive && spouse1CurrentAge < 65) enrolleeAges.push(spouse1CurrentAge);
        if (spouse2Alive && spouse2CurrentAge < 65 && effectiveFilingStatus === 'married') enrolleeAges.push(spouse2CurrentAge);
        
        // Adjust household size for survivor scenario
        const effectiveHouseholdSize = (spouse1Alive && spouse2Alive) 
          ? taxSettings.acaSettings.householdSize 
          : Math.max(1, taxSettings.acaSettings.householdSize - 1);
        
        if (enrolleeAges.length > 0) {
          const acaResult = calculateACASubsidy(
            magi,
            effectiveHouseholdSize,
            enrolleeAges,
            i,
            taxSettings.inflationRate / 100
          );
          
          acaPremium = taxSettings.acaSettings.customBenchmarkPremium > 0
            ? taxSettings.acaSettings.customBenchmarkPremium * 12 * Math.pow(1 + taxSettings.inflationRate / 100, i) * enrolleeAges.length
            : acaResult.premium;
          acaSubsidy = acaResult.subsidy;
          netAcaCost = acaPremium - acaSubsidy;
        }
      }

      // Total healthcare cost (ACA for under 65, Medicare for 65+)
      const totalHealthcareCost = netAcaCost + medicarePremiums + irmaa;

      // Calculate NIIT (Net Investment Income Tax - 3.8% on investment income when MAGI exceeds thresholds)
      const niit = calculateNIIT(capitalGains, magi, effectiveFilingStatus, i, taxSettings.inflationRate / 100);

      // Calculate AMT (Alternative Minimum Tax)
      const amt = calculateAMT(totalOrdinaryIncome, capitalGains, effectiveFilingStatus, i, taxSettings.inflationRate / 100);

      // Add excess income to taxable brokerage account (when wages exceed spending needs)
      if (excessIncome > 0) {
        taxableBalance += excessIncome;
      }

      // Apply growth to remaining balances (per-spouse traditional)
      spouse1TradBalance *= (1 + accounts.traditionalReturn / 100);
      spouse2TradBalance *= (1 + accounts.traditionalReturn / 100);
      rothBalance *= (1 + accounts.rothReturn / 100);
      taxableBalance *= (1 + accounts.taxableReturn / 100);
      
      // Combined traditional balance for display
      const endingTradBalance = spouse1TradBalance + spouse2TradBalance;

      const totalWithdrawals = taxableWithdrawal + traditionalWithdrawal + rothWithdrawal;
      const calculatedTakeHome = totalWithdrawals + ssAnnual + netWages - federalTax - stateTax - stateCapitalGainsTax - irmaa - medicarePremiums - niit - amt - netAcaCost;
      
      // When there's excess income, display the target take-home (what's being spent) not the full calculated amount
      const takeHome = excessIncome > 0 ? (taxSettings.targetTakeHome * inflationMultiplier) : calculatedTakeHome;
      
      if (i === 0) {
        console.log(`Year ${i} Final Calculation:`);
        console.log(`  Employment Income (Gross): $${totalWages.toFixed(2)}`);
        console.log(`  Taxable Wages (after 401k): $${taxableWages.toFixed(2)}`);
        console.log(`  Employment Income (Net): $${netWages.toFixed(2)}`);
        console.log(`  Total Withdrawals: $${totalWithdrawals.toFixed(2)}`);
        console.log(`  SS Income: $${ssAnnual.toFixed(2)}`);
        console.log(`  Ordinary Income for Fed Tax: $${totalOrdinaryIncome.toFixed(2)}`);
        console.log(`  Marginal Tax Bracket: ${(marginalBracket * 100).toFixed(1)}%`);
        console.log(`  Federal Tax: $${federalTax.toFixed(2)} (Ordinary: $${federalTaxOrdinary.toFixed(2)}, CG: $${federalTaxCapitalGains.toFixed(2)})`);
        console.log(`  State Tax: $${stateTax.toFixed(2)}`);
        console.log(`  State CG Tax: $${stateCapitalGainsTax.toFixed(2)}`);
        console.log(`  IRMAA: $${irmaa.toFixed(2)}`);
        console.log(`  Medicare Premiums: $${medicarePremiums.toFixed(2)}`);
        console.log(`  NIIT: $${niit.toFixed(2)}`);
        console.log(`  AMT: $${amt.toFixed(2)}`);
        console.log(`  Payroll Tax: $${totalPayrollTax.toFixed(2)}`);
        console.log(`  Calculated Take Home: $${calculatedTakeHome.toFixed(2)}`);
        console.log(`  Displayed Take Home: $${takeHome.toFixed(2)}`);
        console.log(`  Target Take Home: $${(taxSettings.targetTakeHome * inflationMultiplier).toFixed(2)}`);
      }
      
      const totalTaxes = federalTax + federalTaxCapitalGains + stateTax + stateCapitalGainsTax + irmaa + medicarePremiums + niit + amt;
      
      results.push({
        year,
        age,
        traditionalBalance: endingTradBalance,
        rothBalance,
        taxableBalance,
        ssIncome: ssAnnual,
        employmentIncome: totalWages,
        netWages,
        excessSavings: excessIncome,
        payrollTax: totalPayrollTax,
        contributions401k: total401kContributions,
        employerMatch: totalEmployerMatch,
        withdrawals: totalWithdrawals,
        federalTax,
        federalCapitalGainsTax: federalTaxCapitalGains,
        stateTax,
        stateCapitalGainsTax,
        irmaa,
        medicarePremiums,
        acaPremium,
        acaSubsidy,
        healthcareCost: totalHealthcareCost,
        niit,
        amt,
        totalTaxes,
        takeHome,
        rmd,
        totalIncome: ssAnnual + totalWithdrawals + netWages,
        rothConversion,
        marginalBracket,
      });
    }

    return results;
  }, [accounts, ssData, taxSettings]);

  // Two-pass projections for strategy comparison
  const twoPassResults = useTwoPassProjections(accounts, ssData, taxSettings);

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
      ...detailedMetrics
    };
  }, [projections, accounts, detailedMetrics]);

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
              <HouseholdInputs taxSettings={taxSettings} onChange={setTaxSettings} />
              
              <div className="grid gap-6 lg:grid-cols-2">
                <AccountInputs accounts={accounts} onChange={setAccounts} filingStatus={taxSettings.filingStatus} />
                <EmploymentInputs taxSettings={taxSettings} onChange={setTaxSettings} />
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

            <TabsContent value="projections" className="mt-6">
              <ProjectionTable projections={projections} />
            </TabsContent>

            <TabsContent value="charts" className="mt-6 space-y-6">
              <StrategyComparison
                baselineMetrics={twoPassResults.baselineMetrics}
                optimizedMetrics={twoPassResults.optimizedMetrics}
                currentMetrics={twoPassResults.currentMetrics}
                currentStrategyName={
                  taxSettings.rothConversionStrategy === 'none' ? 'No Conversions' :
                  taxSettings.rothConversionStrategy === 'fill_10' ? 'Fill to 10%' :
                  taxSettings.rothConversionStrategy === 'fill_12' ? 'Fill to 12%' :
                  taxSettings.rothConversionStrategy === 'fill_22' ? 'Fill to 22%' :
                  taxSettings.rothConversionStrategy === 'fill_24' ? 'Fill to 24%' :
                  taxSettings.rothConversionStrategy === 'optimize_consistency' ? 'Optimize Consistency' :
                  taxSettings.rothConversionStrategy === 'custom' ? 'Custom Amount' : 'Current'
                }
                showOptimization={taxSettings.rothConversionStrategy !== 'fill_22' && taxSettings.rothConversionStrategy !== 'optimize_consistency'}
              />
              <div className="grid gap-6 lg:grid-cols-2">
                <BracketAnalysisCard analysis={detailedMetrics.bracketConsistency} projections={projections} />
                <BracketChart data={projections} />
              </div>
              <ProjectionChart data={chartData} />
              <TaxChart data={taxChartData} />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default Index;

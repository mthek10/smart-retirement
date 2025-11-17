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
  getMarginalTaxBracket,
  getBracketLimit,
  calculateBracketConsistency,
  calculateStateSocialSecurityTax,
  calculateStateIncomeTax,
  calculateStateCapitalGainsTax
} from "@/lib/taxCalculations";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from "lucide-react";

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
    state: 'none',
    stateRate: 5,
    spouse1Age: 65,
    spouse2Age: 65,
    targetTakeHome: 80000,
    inflationRate: 2.5,
    optimizeRothConversions: false,
    rothConversionTarget: 94300,
    optimizeBracketConsistency: false,
    targetBracketStrategy: 'auto',
    customBracketLimit: 150000,
  });

  const projections = useMemo(() => {
    const results = [];
    let tradBalance = accounts.traditional;
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
      spouse2Age: number
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
        
        // Withdrawal sequencing: Taxable -> Traditional -> Roth
        if (remaining > 0 && testTaxable > 0) {
          const fromTaxable = Math.min(remaining, testTaxable);
          capitalGainsRealized = fromTaxable * 0.5; // 50% gains (match main projection)
          testTaxable -= fromTaxable;
          remaining -= fromTaxable;
        }
        
        if (remaining > 0 && testTrad > 0) {
          const fromTrad = Math.min(remaining, testTrad);
          traditionalWithdrawn = fromTrad;
          testTrad -= fromTrad;
          remaining -= fromTrad;
        }
        
        if (remaining > 0 && testRoth > 0) {
          const fromRoth = Math.min(remaining, testRoth);
          rothWithdrawn = fromRoth;
          testRoth -= fromRoth;
          remaining -= fromRoth;
        }
        
        // Calculate taxes
        const ordinaryIncome = traditionalWithdrawn;
        const taxableSS = calculateTaxableSocialSecurity(ssAnnual, ordinaryIncome + capitalGainsRealized, taxSettings.filingStatus);
        const totalOrdinaryIncome = ordinaryIncome + taxableSS;
        
        const federalTax = calculateFederalTax(totalOrdinaryIncome, taxSettings.filingStatus, yearIndex, taxSettings.inflationRate / 100);
        const federalCapitalGainsTax = calculateCapitalGainsTax(capitalGainsRealized, totalOrdinaryIncome, taxSettings.filingStatus, yearIndex, taxSettings.inflationRate / 100);
        
        const stateTax = taxSettings.state !== 'none' 
          ? calculateStateIncomeTax(totalOrdinaryIncome, taxSettings.state, taxSettings.filingStatus)
          : 0;
        const stateCapitalGainsTax = taxSettings.state !== 'none'
          ? calculateStateCapitalGainsTax(capitalGainsRealized, totalOrdinaryIncome, taxSettings.state, taxSettings.filingStatus)
          : 0;
        
        // Calculate IRMAA
        const magi = totalOrdinaryIncome + capitalGainsRealized;
        let irmaa = 0;
        if (spouse1Age >= 65 && spouse1Age <= 100) {
          irmaa += calculateIRMAA(magi, yearIndex, taxSettings.inflationRate / 100);
        }
        if (spouse2Age >= 65 && spouse2Age <= 100) {
          irmaa += calculateIRMAA(magi, yearIndex, taxSettings.inflationRate / 100);
        }
        
        // Calculate actual take home
        const calculatedTakeHome = testWithdrawal + ssAnnual - federalTax - federalCapitalGainsTax - stateTax - stateCapitalGainsTax - irmaa;
        
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

    // PASS 1: Calculate optimal target bracket if using auto strategy
    let autoTargetBracket = 0.22; // Default to 22% bracket
    
    if (taxSettings.optimizeBracketConsistency && taxSettings.targetBracketStrategy === 'auto') {
      // Simulate to find optimal consistent bracket
      let simTradBalance = accounts.traditional;
      let simTaxableBalance = accounts.taxable;
      const simResults = [];
      
      for (let i = 0; i <= maxYears && (simTradBalance > 1000 || simTaxableBalance > 1000); i++) {
        const spouse1Age = taxSettings.spouse1Age + i;
        const inflationMultiplier = Math.pow(1 + taxSettings.inflationRate / 100, i);
        
        const ss1 = spouse1Age >= ssData.spouse1.claimAge ? ssData.spouse1.estimatedBenefit * 12 * inflationMultiplier : 0;
        const ss2 = spouse1Age >= ssData.spouse2.claimAge ? ssData.spouse2.estimatedBenefit * 12 * inflationMultiplier : 0;
        const ssAnnual = ss1 + ss2;
        
        const rmd = calculateRMD(simTradBalance, spouse1Age);
        const adjustedExpenses = taxSettings.targetTakeHome * inflationMultiplier;
        const required = Math.max(adjustedExpenses, rmd);
        
        let taxableW = Math.min(required, simTaxableBalance);
        simTaxableBalance -= taxableW;
        let tradW = Math.min(required - taxableW, simTradBalance);
        simTradBalance -= tradW;
        
        const cg = taxableW * 0.5;
        const ordinaryIncome = tradW;
        const taxableSSIncome = calculateTaxableSocialSecurity(ssAnnual, ordinaryIncome + cg, taxSettings.filingStatus);
        const totalOrdinaryIncome = ordinaryIncome + taxableSSIncome;
        const totalIncome = totalOrdinaryIncome + cg + ssAnnual;
        
        simResults.push({ totalOrdinaryIncome, totalIncome });
        
        simTradBalance *= (1 + accounts.traditionalReturn / 100);
        simTaxableBalance *= (1 + accounts.taxableReturn / 100);
      }
      
      // Calculate weighted average income
      const totalIncome = simResults.reduce((sum, r) => sum + r.totalIncome, 0);
      const avgOrdinaryIncome = simResults.reduce((sum, r) => {
        const weight = r.totalIncome / totalIncome;
        return sum + (r.totalOrdinaryIncome * weight);
      }, 0);
      
      // Find bracket that fits this income level
      if (avgOrdinaryIncome < 50000) autoTargetBracket = 0.12;
      else if (avgOrdinaryIncome < 120000) autoTargetBracket = 0.22;
      else if (avgOrdinaryIncome < 250000) autoTargetBracket = 0.24;
      else autoTargetBracket = 0.32;
    }
    
    // Determine target conversion income for the year
    const getTargetIncomeLimit = (yearIndex: number): number => {
      if (taxSettings.optimizeBracketConsistency) {
        const strategy = taxSettings.targetBracketStrategy;
        if (strategy === 'custom') {
          const inflationMultiplier = Math.pow(1 + taxSettings.inflationRate / 100, yearIndex);
          return taxSettings.customBracketLimit * inflationMultiplier;
        } else if (strategy === 'auto') {
          return getBracketLimit(
            autoTargetBracket === 0.12 ? '12%' : autoTargetBracket === 0.22 ? '22%' : autoTargetBracket === 0.24 ? '24%' : '32%',
            taxSettings.filingStatus,
            yearIndex,
            taxSettings.inflationRate
          );
        } else {
          return getBracketLimit(strategy, taxSettings.filingStatus, yearIndex, taxSettings.inflationRate);
        }
      } else if (taxSettings.optimizeRothConversions) {
        // Legacy logic for simple Roth conversion
        const inflationMultiplier = Math.pow(1 + taxSettings.inflationRate / 100, yearIndex);
        return taxSettings.rothConversionTarget * inflationMultiplier;
      }
      return 0;
    };
    
    // Reset balances for actual projection
    tradBalance = accounts.traditional;
    rothBalance = accounts.roth;
    taxableBalance = accounts.taxable;

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
      
      // Use iterative solver to find withdrawal that achieves target take home
      const adjustedTargetTakeHome = taxSettings.targetTakeHome * inflationMultiplier;
      console.log(`Year ${i}: Target Take Home = $${adjustedTargetTakeHome.toFixed(2)}`);
      let requiredWithdrawal = calculateRequiredWithdrawal(
        adjustedTargetTakeHome,
        ssAnnual,
        { tradBalance, rothBalance, taxableBalance },
        rmd,
        i,
        spouse1CurrentAge,
        spouse2CurrentAge
      );
      console.log(`Year ${i}: Required Withdrawal = $${requiredWithdrawal.toFixed(2)}, SS = $${ssAnnual.toFixed(2)}`);
      let adjustedAnnualExpenses = adjustedTargetTakeHome; // For display purposes

      // BRACKET-AWARE WITHDRAWAL SEQUENCING
      let withdrawalAmount = requiredWithdrawal;
      let taxableWithdrawal = 0;
      let traditionalWithdrawal = 0;
      let rothWithdrawal = 0;

      if (taxSettings.optimizeBracketConsistency) {
        // Smart withdrawal: Fill to target bracket, deplete Traditional and Taxable first
        
        // Start with Taxable (generates capital gains, not ordinary income)
        if (taxableBalance > 0) {
          taxableWithdrawal = Math.min(withdrawalAmount, taxableBalance);
          withdrawalAmount -= taxableWithdrawal;
          taxableBalance -= taxableWithdrawal;
        }

        // Calculate current ordinary income from mandatory sources
        const capitalGains = taxableWithdrawal * 0.5;
        let ordinaryIncome = rmd; // RMDs are mandatory
        const taxableSSIncome = calculateTaxableSocialSecurity(ssAnnual, ordinaryIncome + capitalGains, taxSettings.filingStatus);
        ordinaryIncome += taxableSSIncome;

        // Check if we have room to target bracket
        const targetLimit = getTargetIncomeLimit(i);
        const roomInBracket = Math.max(0, targetLimit - ordinaryIncome);

        // Fill bracket with additional Traditional withdrawals (reduces future RMDs)
        if (roomInBracket > 0 && tradBalance > 0 && spouse1CurrentAge < 73) {
          const additionalTrad = Math.min(roomInBracket, tradBalance);
          traditionalWithdrawal += additionalTrad;
          tradBalance -= additionalTrad;
        } else if (withdrawalAmount > 0 && tradBalance > 0) {
          // Need more for expenses
          traditionalWithdrawal = Math.min(withdrawalAmount, tradBalance);
          withdrawalAmount -= traditionalWithdrawal;
          tradBalance -= traditionalWithdrawal;
        }

        // Use Roth only if both Traditional and Taxable are depleted
        if (withdrawalAmount > 0 && rothBalance > 0) {
          rothWithdrawal = Math.min(withdrawalAmount, rothBalance);
          rothBalance -= rothWithdrawal;
        }
      } else {
        // Original sequencing: Taxable → Traditional → Roth
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
      }

      // ROTH CONVERSION OPTIMIZATION (IRMAA-AWARE)
      let rothConversion = 0;
      const shouldOptimize = taxSettings.optimizeBracketConsistency || taxSettings.optimizeRothConversions;
      
      if (shouldOptimize && spouse1CurrentAge < 73 && tradBalance > 0) {
        // Calculate current income before conversion
        const capitalGains = taxableWithdrawal * 0.5;
        const ordinaryIncomePreConversion = traditionalWithdrawal;
        const taxableSSIncomePreConversion = calculateTaxableSocialSecurity(
          ssAnnual,
          ordinaryIncomePreConversion + capitalGains,
          taxSettings.filingStatus
        );
        const totalOrdinaryIncomePreConversion = ordinaryIncomePreConversion + taxableSSIncomePreConversion;
        
        // Calculate room to convert up to target bracket
        const targetLimit = getTargetIncomeLimit(i);
        const conversionRoom = Math.max(0, targetLimit - totalOrdinaryIncomePreConversion);
        
        // Propose initial conversion amount
        let proposedConversion = Math.min(conversionRoom, tradBalance);
        
        // IRMAA-aware optimization: Check if conversion triggers excessive IRMAA
        const isIRMAAAge = (spouse1CurrentAge >= 65 && spouse1CurrentAge <= 100) || 
                           (spouse2CurrentAge >= 65 && spouse2CurrentAge <= 100);
        
        if (proposedConversion > 0 && isIRMAAAge) {
          // Calculate IRMAA without conversion
          const magiWithoutConversion = totalOrdinaryIncomePreConversion + capitalGains;
          let irmaaWithoutConversion = 0;
          if (spouse1CurrentAge >= 65 && spouse1CurrentAge <= 100) {
            irmaaWithoutConversion += calculateIRMAA(magiWithoutConversion, i, taxSettings.inflationRate);
          }
          if (spouse2CurrentAge >= 65 && spouse2CurrentAge <= 100) {
            irmaaWithoutConversion += calculateIRMAA(magiWithoutConversion, i, taxSettings.inflationRate);
          }
          
          // Calculate IRMAA with full conversion
          const magiWithConversion = totalOrdinaryIncomePreConversion + proposedConversion + capitalGains;
          let irmaaWithConversion = 0;
          if (spouse1CurrentAge >= 65 && spouse1CurrentAge <= 100) {
            irmaaWithConversion += calculateIRMAA(magiWithConversion, i, taxSettings.inflationRate);
          }
          if (spouse2CurrentAge >= 65 && spouse2CurrentAge <= 100) {
            irmaaWithConversion += calculateIRMAA(magiWithConversion, i, taxSettings.inflationRate);
          }
          
          const irmaaIncrease = irmaaWithConversion - irmaaWithoutConversion;
          
          // Calculate tax cost of conversion
          const marginalRate = getMarginalTaxBracket(totalOrdinaryIncomePreConversion + proposedConversion, taxSettings.filingStatus, i, taxSettings.inflationRate);
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
              if (spouse1CurrentAge >= 65 && spouse1CurrentAge <= 100) {
                testIrmaa += calculateIRMAA(testMagi, i, taxSettings.inflationRate);
              }
              if (spouse2CurrentAge >= 65 && spouse2CurrentAge <= 100) {
                testIrmaa += calculateIRMAA(testMagi, i, taxSettings.inflationRate);
              }
              
              const testIrmaaIncrease = testIrmaa - irmaaWithoutConversion;
              const testTaxCost = testConversion * getMarginalTaxBracket(totalOrdinaryIncomePreConversion + testConversion, taxSettings.filingStatus, i, taxSettings.inflationRate);
              
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
      const federalTaxCapitalGains = calculateCapitalGainsTax(capitalGains, totalOrdinaryIncome, taxSettings.filingStatus, i, taxSettings.inflationRate);
      const federalTax = federalTaxOrdinary + federalTaxCapitalGains;
      
      // Calculate marginal tax bracket
      const marginalBracket = getMarginalTaxBracket(totalOrdinaryIncome, taxSettings.filingStatus, i, taxSettings.inflationRate);
      
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
        const olderSpouseAge = Math.max(spouse1CurrentAge, spouse2CurrentAge);
        const stateSSTax = calculateStateSocialSecurityTax(
          ssAnnual,
          agi,
          taxSettings.filingStatus,
          taxSettings.state,
          olderSpouseAge
        );
        
        // Calculate state income tax on non-SS ordinary income
        const nonSSIncome = ordinaryIncome;
        const stateIncomeTax = calculateStateIncomeTax(nonSSIncome, taxSettings.state, taxSettings.filingStatus);
        
        // Calculate state capital gains tax
        stateCapitalGainsTax = calculateStateCapitalGainsTax(capitalGains, nonSSIncome, taxSettings.state, taxSettings.filingStatus);
        
        stateTax = stateSSTax + stateIncomeTax;
      }

      // Calculate IRMAA (only applies at age 65+ when on Medicare) - calculate for both spouses
      const magi = totalOrdinaryIncome + capitalGains;
      let irmaa = 0;
      if (spouse1CurrentAge >= 65 && spouse1CurrentAge <= 100) {
        irmaa += calculateIRMAA(magi, i, taxSettings.inflationRate);
      }
      if (spouse2CurrentAge >= 65 && spouse2CurrentAge <= 100) {
        irmaa += calculateIRMAA(magi, i, taxSettings.inflationRate);
      }

      // Apply growth to remaining balances
      tradBalance *= (1 + accounts.traditionalReturn / 100);
      rothBalance *= (1 + accounts.rothReturn / 100);
      taxableBalance *= (1 + accounts.taxableReturn / 100);

      const totalWithdrawals = taxableWithdrawal + traditionalWithdrawal + rothWithdrawal;
      const takeHome = totalWithdrawals + ssAnnual - federalTax - stateTax - stateCapitalGainsTax - irmaa;
      
      if (i === 0) {
        console.log(`Year ${i} Final Calculation:`);
        console.log(`  Total Withdrawals: $${totalWithdrawals.toFixed(2)}`);
        console.log(`  SS Income: $${ssAnnual.toFixed(2)}`);
        console.log(`  Federal Tax: $${federalTax.toFixed(2)} (Ordinary: $${federalTaxOrdinary.toFixed(2)}, CG: $${federalTaxCapitalGains.toFixed(2)})`);
        console.log(`  State Tax: $${stateTax.toFixed(2)}`);
        console.log(`  State CG Tax: $${stateCapitalGainsTax.toFixed(2)}`);
        console.log(`  IRMAA: $${irmaa.toFixed(2)}`);
        console.log(`  Actual Take Home: $${takeHome.toFixed(2)}`);
        console.log(`  Target Take Home: $${taxSettings.targetTakeHome.toFixed(2)}`);
      }
      
      results.push({
        year,
        age,
        traditionalBalance: tradBalance,
        rothBalance,
        taxableBalance,
        ssIncome: ssAnnual,
        withdrawals: totalWithdrawals,
        federalTax,
        federalCapitalGainsTax: federalTaxCapitalGains,
        stateTax,
        stateCapitalGainsTax,
        irmaa,
        takeHome,
        rmd,
        totalIncome: ssAnnual + totalWithdrawals,
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

    // Find when each account depletes
    const tradDepletionYear = projections.find(p => p.traditionalBalance < 1000)?.year;
    const taxableDepletionYear = projections.find(p => p.taxableBalance < 1000)?.year;
    const rothDepletionYear = projections.find(p => p.rothBalance < 1000)?.year;
    
    // Find when Roth starts being used (balance decreases)
    const initialRothBalance = accounts.roth;
    const rothUsageYear = projections.find(p => p.rothBalance < initialRothBalance - 1000)?.year;
    
    // Calculate bracket consistency
    const consistency = calculateBracketConsistency(projections);
    
    return {
      tradDepletionAge: tradDepletionYear ? (tradDepletionYear - new Date().getFullYear() + taxSettings.spouse1Age) : null,
      taxableDepletionAge: taxableDepletionYear ? (taxableDepletionYear - new Date().getFullYear() + taxSettings.spouse1Age) : null,
      rothUsageAge: rothUsageYear ? (rothUsageYear - new Date().getFullYear() + taxSettings.spouse1Age) : null,
      rothDepletionAge: rothDepletionYear ? (rothDepletionYear - new Date().getFullYear() + taxSettings.spouse1Age) : null,
      bracketConsistency: consistency,
      avgBracket: consistency.avgBracket,
      yearsInTarget: consistency.yearsInTarget,
    };
  }, [projections, taxSettings.spouse1Age, accounts.roth]);

  const summary = useMemo(() => {
    const totalTaxes = projections.reduce((sum, p) => sum + p.federalTax + p.stateTax + p.stateCapitalGainsTax, 0);
    const totalIRMAA = projections.reduce((sum, p) => sum + p.irmaa, 0);
    const avgWithdrawal = projections.length > 0 
      ? projections.reduce((sum, p) => sum + p.withdrawals, 0) / projections.length 
      : 0;
    const totalPortfolio = accounts.traditional + accounts.roth + accounts.taxable;

    return { 
      totalPortfolio, 
      totalTaxes, 
      totalIRMAA, 
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

          {taxSettings.optimizeBracketConsistency && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Bracket Optimization Active</AlertTitle>
              <AlertDescription>
                Withdrawals and conversions are optimized to maintain consistent tax brackets. 
                Traditional and Taxable accounts will be strategically depleted first, preserving Roth for maximum tax-free growth.
                {taxSettings.targetBracketStrategy === 'auto' && detailedMetrics.bracketConsistency && (
                  <span className="block mt-1 font-medium">
                    Target: {(detailedMetrics.avgBracket * 100).toFixed(0)}% bracket
                  </span>
                )}
              </AlertDescription>
            </Alert>
          )}

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

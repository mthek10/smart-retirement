import { useMemo } from "react";
import { 
  calculateFederalTax, 
  calculateIRMAA, 
  calculateMedicarePremiums,
  calculateSocialSecurityBenefit,
  calculateTaxableSocialSecurity,
  calculateRMD,
  calculateCapitalGainsTax,
  getMarginalTaxBracket,
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

export interface Accounts {
  spouse1Traditional: number;
  spouse2Traditional: number;
  roth: number;
  taxable: number;
  traditionalReturn: number;
  rothReturn: number;
  taxableReturn: number;
  taxableCostBasisPercent: number;
}

export interface SSData {
  spouse1: {
    estimatedBenefit: number;
    claimAge: number;
  };
  spouse2: {
    estimatedBenefit: number;
    claimAge: number;
  };
}

export interface EmploymentSettings {
  currentIncome: number;
  retirementAge: number;
  contributes401k: boolean;
  contribution401kAmount: number;
  employerMatchAmount: number;
}

export interface SurvivorSettings {
  enabled: boolean;
  spouse1DeathAge: number | null;
  spouse2DeathAge: number | null;
  survivorSpendingPercent: number;
}

export interface ACASettings {
  enabled: boolean;
  householdSize: number;
  customBenchmarkPremium: number;
}

export interface TaxSettings {
  filingStatus: string;
  state: string;
  stateRate: number;
  spouse1Age: number;
  spouse2Age: number;
  targetTakeHome: number;
  inflationRate: number;
  rothConversionStrategy: string;
  rothConversionCustom: number;
  acaSettings: ACASettings;
  spouse1Employment: EmploymentSettings;
  spouse2Employment: EmploymentSettings;
  survivorSettings: SurvivorSettings;
}

export interface ProjectionRow {
  year: number;
  age: number;
  traditionalBalance: number;
  rothBalance: number;
  taxableBalance: number;
  ssIncome: number;
  employmentIncome: number;
  netWages: number;
  excessSavings: number;
  payrollTax: number;
  contributions401k: number;
  employerMatch: number;
  withdrawals: number;
  federalTax: number;
  federalCapitalGainsTax: number;
  stateTax: number;
  stateCapitalGainsTax: number;
  irmaa: number;
  medicarePremiums: number;
  acaPremium: number;
  acaSubsidy: number;
  healthcareCost: number;
  niit: number;
  amt: number;
  totalTaxes: number;
  takeHome: number;
  rmd: number;
  totalIncome: number;
  rothConversion: number;
  marginalBracket: number;
}

/**
 * Core projection calculation function - can be called with different strategies
 */
export function calculateProjections(
  accounts: Accounts,
  ssData: SSData,
  taxSettings: TaxSettings,
  strategyOverride?: string // Override the Roth conversion strategy
): ProjectionRow[] {
  const results: ProjectionRow[] = [];
  let spouse1TradBalance = accounts.spouse1Traditional;
  let spouse2TradBalance = accounts.spouse2Traditional;
  let rothBalance = accounts.roth;
  let taxableBalance = accounts.taxable;

  const maxYears = Math.max(100 - taxSettings.spouse1Age, 100 - taxSettings.spouse2Age);
  
  // Use override strategy if provided, otherwise use settings
  const effectiveConversionStrategy = strategyOverride ?? taxSettings.rothConversionStrategy;

  // Iterative solver to find withdrawal amount that achieves target take home
  const calculateRequiredWithdrawal = (
    targetTakeHome: number,
    ssAnnual: number,
    currentBalances: { tradBalance: number; rothBalance: number; taxableBalance: number },
    currentRMD: number,
    yearIndex: number,
    spouse1Age: number,
    spouse2Age: number,
    taxableWages: number,
    effectiveFilingStatus: string
  ): number => {
    let low = Math.max(0, currentRMD);
    let high = Math.max(
      targetTakeHome * 3,
      currentBalances.tradBalance + currentBalances.rothBalance + currentBalances.taxableBalance
    );
    
    const tolerance = 100;
    const maxIterations = 30;
    
    for (let iter = 0; iter < maxIterations; iter++) {
      const testWithdrawal = (low + high) / 2;
      
      let testTaxable = currentBalances.taxableBalance;
      let testTrad = currentBalances.tradBalance;
      let testRoth = currentBalances.rothBalance;
      
      let remaining = testWithdrawal;
      let capitalGainsRealized = 0;
      let traditionalWithdrawn = 0;
      let rothWithdrawn = 0;
      
      if (currentRMD > 0 && testTrad > 0) {
        const rmdWithdrawal = Math.min(currentRMD, testTrad, remaining);
        traditionalWithdrawn = rmdWithdrawal;
        testTrad -= rmdWithdrawal;
        remaining -= rmdWithdrawal;
      }
      
      if (remaining > 0 && testTaxable > 0) {
        const fromTaxable = Math.min(remaining, testTaxable);
        capitalGainsRealized = fromTaxable * ((100 - accounts.taxableCostBasisPercent) / 100);
        testTaxable -= fromTaxable;
        remaining -= fromTaxable;
      }
      
      if (remaining > 0 && testTrad > 0) {
        const fromTrad = Math.min(remaining, testTrad);
        traditionalWithdrawn += fromTrad;
        testTrad -= fromTrad;
        remaining -= fromTrad;
      }
      
      if (remaining > 0 && testRoth > 0) {
        const fromRoth = Math.min(remaining, testRoth);
        rothWithdrawn = fromRoth;
        testRoth -= fromRoth;
        remaining -= fromRoth;
      }
      
      let rothConversion = 0;
      const targetIncomeLimit = getRothConversionLimit(
        effectiveConversionStrategy,
        effectiveFilingStatus,
        yearIndex,
        taxSettings.inflationRate / 100,
        taxSettings.rothConversionCustom
      );
      if (targetIncomeLimit > 0 && testTrad > 0) {
        const currentIncome = ssAnnual + traditionalWithdrawn;
        const conversionRoom = Math.max(0, targetIncomeLimit - currentIncome);
        rothConversion = Math.min(conversionRoom, testTrad);
      }
      
      const ordinaryIncome = traditionalWithdrawn + rothConversion + taxableWages;
      const taxableSS = calculateTaxableSocialSecurity(ssAnnual, ordinaryIncome + capitalGainsRealized, effectiveFilingStatus);
      const totalOrdinaryIncome = ordinaryIncome + taxableSS;
      
      const federalTax = calculateFederalTax(totalOrdinaryIncome, effectiveFilingStatus, yearIndex, taxSettings.inflationRate / 100);
      const federalCapitalGainsTax = calculateCapitalGainsTax(capitalGainsRealized, totalOrdinaryIncome, effectiveFilingStatus, yearIndex, taxSettings.inflationRate / 100);
      
      let stateTax = 0;
      let stateCapitalGainsTax = 0;
      
      if (taxSettings.state === 'other') {
        stateTax = totalOrdinaryIncome * (taxSettings.stateRate / 100);
        stateCapitalGainsTax = capitalGainsRealized * (taxSettings.stateRate / 100);
      } else if (taxSettings.state && taxSettings.state !== 'none') {
        const agi = totalOrdinaryIncome + capitalGainsRealized;
        const stateSSTax = calculateStateSocialSecurityTax(
          ssAnnual,
          agi,
          effectiveFilingStatus,
          taxSettings.state,
          spouse1Age
        );
        
        const nonSSIncome = ordinaryIncome;
        const stateIncomeTax = calculateStateIncomeTax(nonSSIncome, taxSettings.state, effectiveFilingStatus);
        stateCapitalGainsTax = calculateStateCapitalGainsTax(capitalGainsRealized, nonSSIncome, taxSettings.state, effectiveFilingStatus);
        stateTax = stateSSTax + stateIncomeTax;
      }
      
      const magi = totalOrdinaryIncome + capitalGainsRealized;
      let irmaa = 0;
      if (spouse1Age >= 65 && spouse1Age <= 100) {
        irmaa += calculateIRMAA(magi, yearIndex, taxSettings.inflationRate / 100);
      }
      if (spouse2Age >= 65 && spouse2Age <= 100) {
        irmaa += calculateIRMAA(magi, yearIndex, taxSettings.inflationRate / 100);
      }
      
      let medicarePremiums = 0;
      if (spouse1Age >= 65 && spouse1Age <= 100) {
        medicarePremiums += calculateMedicarePremiums(yearIndex, taxSettings.inflationRate / 100);
      }
      if (spouse2Age >= 65 && spouse2Age <= 100) {
        medicarePremiums += calculateMedicarePremiums(yearIndex, taxSettings.inflationRate / 100);
      }
      
      const niit = calculateNIIT(capitalGainsRealized, magi, effectiveFilingStatus, yearIndex, taxSettings.inflationRate / 100);
      const amt = calculateAMT(totalOrdinaryIncome, capitalGainsRealized, effectiveFilingStatus, yearIndex, taxSettings.inflationRate / 100);
      
      const calculatedTakeHome = testWithdrawal + ssAnnual - federalTax - federalCapitalGainsTax - stateTax - stateCapitalGainsTax - irmaa - medicarePremiums - niit - amt;
      
      if (Math.abs(calculatedTakeHome - targetTakeHome) < tolerance) {
        return testWithdrawal;
      }
      
      if (calculatedTakeHome < targetTakeHome) {
        low = testWithdrawal;
      } else {
        high = testWithdrawal;
      }
      
      if (iter === maxIterations - 1) {
        return testWithdrawal;
      }
    }
    
    return (low + high) / 2;
  };

  let spouse1SSAtDeath = 0;
  let spouse2SSAtDeath = 0;
  let spouse1DeathYearIndex: number | null = null;
  let spouse2DeathYearIndex: number | null = null;

  for (let i = 0; i <= maxYears; i++) {
    const year = new Date().getFullYear() + i;
    const spouse1CurrentAge = taxSettings.spouse1Age + i;
    const spouse2CurrentAge = taxSettings.spouse2Age + i;
    
    const survivorEnabled = taxSettings.survivorSettings?.enabled && taxSettings.filingStatus === 'married';
    const spouse1DeathAge = taxSettings.survivorSettings?.spouse1DeathAge;
    const spouse2DeathAge = taxSettings.survivorSettings?.spouse2DeathAge;
    
    const spouse1Alive = !survivorEnabled || 
      spouse1DeathAge === null || 
      spouse1CurrentAge < spouse1DeathAge;
    const spouse2Alive = !survivorEnabled || 
      spouse2DeathAge === null || 
      spouse2CurrentAge < spouse2DeathAge;
    
    if (!spouse1Alive && spouse1DeathYearIndex === null) {
      spouse1DeathYearIndex = i;
    }
    if (!spouse2Alive && spouse2DeathYearIndex === null) {
      spouse2DeathYearIndex = i;
    }
    
    if (!spouse1Alive && !spouse2Alive) {
      break;
    }
    
    const effectiveFilingStatus = (spouse1Alive && spouse2Alive) 
      ? taxSettings.filingStatus 
      : 'single';
    
    const age = spouse1Alive && spouse2Alive 
      ? Math.max(spouse1CurrentAge, spouse2CurrentAge)
      : (spouse1Alive ? spouse1CurrentAge : spouse2CurrentAge);

    const inflationMultiplier = Math.pow(1 + taxSettings.inflationRate / 100, i);
    
    const spouse1YearsSinceClaiming = spouse1CurrentAge >= ssData.spouse1.claimAge 
      ? spouse1CurrentAge - ssData.spouse1.claimAge 
      : 0;
    const spouse2YearsSinceClaiming = spouse2CurrentAge >= ssData.spouse2.claimAge 
      ? spouse2CurrentAge - ssData.spouse2.claimAge 
      : 0;
    
    const spouse1ColaMultiplier = spouse1YearsSinceClaiming > 0 
      ? Math.pow(1 + taxSettings.inflationRate / 100, spouse1YearsSinceClaiming) 
      : 1;
    const spouse2ColaMultiplier = spouse2YearsSinceClaiming > 0 
      ? Math.pow(1 + taxSettings.inflationRate / 100, spouse2YearsSinceClaiming) 
      : 1;
    
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
    
    if (spouse1Alive && ss1Base > 0) spouse1SSAtDeath = ss1Base;
    if (spouse2Alive && ss2Base > 0) spouse2SSAtDeath = ss2Base;
    
    let ssAnnual = 0;
    let ss1Annual = ss1Base;
    let ss2Annual = ss2Base;
    
    if (spouse1Alive && spouse2Alive) {
      ssAnnual = ss1Annual + ss2Annual;
    } else if (spouse1Alive && !spouse2Alive) {
      ssAnnual = calculateSurvivorSSBenefit(
        spouse2SSAtDeath, 
        ss1Annual,
        spouse1CurrentAge,
        spouse1FRA
      );
      ss1Annual = ssAnnual;
      ss2Annual = 0;
    } else if (!spouse1Alive && spouse2Alive) {
      ssAnnual = calculateSurvivorSSBenefit(
        spouse1SSAtDeath,
        ss2Annual,
        spouse2CurrentAge,
        spouse2FRA
      );
      ss2Annual = ssAnnual;
      ss1Annual = 0;
    }

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
    
    const ficaTax = calculateFICATax(totalWages, i, taxSettings.inflationRate / 100);
    const medicareTax = calculateMedicareTax(totalWages, effectiveFilingStatus, i, taxSettings.inflationRate / 100);
    const totalPayrollTax = ficaTax + medicareTax;
    
    const netWages = totalWages - totalPayrollTax - total401kContributions;
    
    if (spouse1DeathYearIndex !== null && i === spouse1DeathYearIndex) {
      spouse2TradBalance += spouse1TradBalance;
      spouse1TradBalance = 0;
    }
    if (spouse2DeathYearIndex !== null && i === spouse2DeathYearIndex) {
      spouse1TradBalance += spouse2TradBalance;
      spouse2TradBalance = 0;
    }
    
    if (spouse1Alive) {
      spouse1TradBalance += spouse1_401k + spouse1Match;
    }
    if (spouse2Alive) {
      spouse2TradBalance += spouse2_401k + spouse2Match;
    }
    
    const tradBalance = spouse1TradBalance + spouse2TradBalance;

    const spouse1RMD = spouse1Alive ? calculateRMD(spouse1TradBalance, spouse1CurrentAge) : 0;
    const spouse2RMD = spouse2Alive && taxSettings.filingStatus === 'married'
      ? calculateRMD(spouse2TradBalance, spouse2CurrentAge)
      : 0;
    const rmd = spouse1RMD + spouse2RMD;
    
    const taxableWages = totalWages - total401kContributions;
    
    const survivorSpendingPercent = taxSettings.survivorSettings?.survivorSpendingPercent || 75;
    const baseTargetTakeHome = taxSettings.targetTakeHome * inflationMultiplier;
    const effectiveTargetTakeHome = (spouse1Alive && spouse2Alive) 
      ? baseTargetTakeHome 
      : baseTargetTakeHome * (survivorSpendingPercent / 100);
    
    const adjustedTargetTakeHome = effectiveTargetTakeHome - netWages;
    const excessIncome = adjustedTargetTakeHome < 0 ? Math.abs(adjustedTargetTakeHome) : 0;
    
    let requiredWithdrawal = adjustedTargetTakeHome > 0 ? calculateRequiredWithdrawal(
      adjustedTargetTakeHome,
      ssAnnual,
      { tradBalance, rothBalance, taxableBalance },
      rmd,
      i,
      spouse1CurrentAge,
      spouse2CurrentAge,
      taxableWages,
      effectiveFilingStatus
    ) : 0;
    
    if (rmd > 0 && requiredWithdrawal < rmd) {
      requiredWithdrawal = rmd;
    }
    
    let adjustedAnnualExpenses = adjustedTargetTakeHome;

    let withdrawalAmount = requiredWithdrawal;
    let taxableWithdrawal = 0;
    let traditionalWithdrawal = 0;
    let rothWithdrawal = 0;
    
    let spouse1TradWithdrawal = 0;
    let spouse2TradWithdrawal = 0;

    if (rmd > 0 && tradBalance > 0) {
      const rmdWithdrawal = Math.min(rmd, tradBalance);
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

    if (withdrawalAmount > 0 && taxableBalance > 0) {
      taxableWithdrawal = Math.min(withdrawalAmount, taxableBalance);
      withdrawalAmount -= taxableWithdrawal;
      taxableBalance -= taxableWithdrawal;
    }

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

    if (withdrawalAmount > 0 && rothBalance > 0) {
      rothWithdrawal = Math.min(withdrawalAmount, rothBalance);
      rothBalance -= rothWithdrawal;
    }

    // ROTH CONVERSION OPTIMIZATION
    let rothConversion = 0;
    
    const targetIncomeLimit = getRothConversionLimit(
      effectiveConversionStrategy,
      effectiveFilingStatus,
      i,
      taxSettings.inflationRate / 100,
      taxSettings.rothConversionCustom
    );
    
    const remainingTradForConversion = spouse1TradBalance + spouse2TradBalance;
    
    if (targetIncomeLimit > 0 && remainingTradForConversion > 0) {
      const capitalGains = taxableWithdrawal * ((100 - accounts.taxableCostBasisPercent) / 100);
      const ordinaryIncomePreConversion = traditionalWithdrawal + taxableWages;
      const taxableSSIncomePreConversion = calculateTaxableSocialSecurity(
        ssAnnual,
        ordinaryIncomePreConversion + capitalGains,
        effectiveFilingStatus
      );
      const totalOrdinaryIncomePreConversion = ordinaryIncomePreConversion + taxableSSIncomePreConversion;
      
      const conversionRoom = Math.max(0, targetIncomeLimit - totalOrdinaryIncomePreConversion);
      let proposedConversion = Math.min(conversionRoom, remainingTradForConversion);
      
      // IRMAA-aware optimization
      const isIRMAAAge = (spouse1Alive && spouse1CurrentAge >= 65 && spouse1CurrentAge <= 100) || 
                         (spouse2Alive && spouse2CurrentAge >= 65 && spouse2CurrentAge <= 100);
      
      if (proposedConversion > 0 && isIRMAAAge) {
        const magiWithoutConversion = totalOrdinaryIncomePreConversion + capitalGains;
        let irmaaWithoutConversion = 0;
        if (spouse1Alive && spouse1CurrentAge >= 65 && spouse1CurrentAge <= 100) {
          irmaaWithoutConversion += calculateIRMAA(magiWithoutConversion, i, taxSettings.inflationRate / 100);
        }
        if (spouse2Alive && spouse2CurrentAge >= 65 && spouse2CurrentAge <= 100) {
          irmaaWithoutConversion += calculateIRMAA(magiWithoutConversion, i, taxSettings.inflationRate / 100);
        }
        
        const magiWithConversion = totalOrdinaryIncomePreConversion + proposedConversion + capitalGains;
        let irmaaWithConversion = 0;
        if (spouse1Alive && spouse1CurrentAge >= 65 && spouse1CurrentAge <= 100) {
          irmaaWithConversion += calculateIRMAA(magiWithConversion, i, taxSettings.inflationRate / 100);
        }
        if (spouse2Alive && spouse2CurrentAge >= 65 && spouse2CurrentAge <= 100) {
          irmaaWithConversion += calculateIRMAA(magiWithConversion, i, taxSettings.inflationRate / 100);
        }
        
        const irmaaIncrease = irmaaWithConversion - irmaaWithoutConversion;
        const marginalRate = getMarginalTaxBracket(totalOrdinaryIncomePreConversion + proposedConversion, effectiveFilingStatus, i, taxSettings.inflationRate / 100);
        const conversionTaxCost = proposedConversion * marginalRate;
        
        if (irmaaIncrease > conversionTaxCost * 0.5) {
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
            
            if (testIrmaaIncrease <= testTaxCost * 0.5) {
              optimalConversion = testConversion;
            } else {
              break;
            }
          }
          
          proposedConversion = optimalConversion;
        }
      }
      
      rothConversion = proposedConversion;
      
      if (rothConversion > 0) {
        const conversionTradBalance = spouse1TradBalance + spouse2TradBalance;
        if (conversionTradBalance > 0) {
          const s1Ratio = spouse1TradBalance / conversionTradBalance;
          spouse1TradBalance -= rothConversion * s1Ratio;
          spouse2TradBalance -= rothConversion * (1 - s1Ratio);
        }
        rothBalance += rothConversion;
      }
    }

    const capitalGains = taxableWithdrawal * ((100 - accounts.taxableCostBasisPercent) / 100);
    const ordinaryIncome = traditionalWithdrawal + rothConversion + taxableWages;
    
    const taxableSSIncome = calculateTaxableSocialSecurity(
      ssAnnual, 
      ordinaryIncome + capitalGains,
      effectiveFilingStatus
    );
    
    const totalOrdinaryIncome = ordinaryIncome + taxableSSIncome;

    const federalTaxOrdinary = calculateFederalTax(totalOrdinaryIncome, effectiveFilingStatus, i, taxSettings.inflationRate);
    const federalTaxCapitalGains = calculateCapitalGainsTax(capitalGains, totalOrdinaryIncome, effectiveFilingStatus, i, taxSettings.inflationRate);
    const federalTax = federalTaxOrdinary + federalTaxCapitalGains;
    
    const marginalBracket = getMarginalTaxBracket(totalOrdinaryIncome, effectiveFilingStatus, i, taxSettings.inflationRate);
    
    const agi = totalOrdinaryIncome + capitalGains;
    
    let stateTax = 0;
    let stateCapitalGainsTax = 0;
    
    if (taxSettings.state === 'other') {
      stateTax = totalOrdinaryIncome * (taxSettings.stateRate / 100);
      stateCapitalGainsTax = capitalGains * (taxSettings.stateRate / 100);
    } else if (taxSettings.state && taxSettings.state !== 'none') {
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
      
      const nonSSIncome = ordinaryIncome;
      const stateIncomeTax = calculateStateIncomeTax(nonSSIncome, taxSettings.state, effectiveFilingStatus);
      stateCapitalGainsTax = calculateStateCapitalGainsTax(capitalGains, nonSSIncome, taxSettings.state, effectiveFilingStatus);
      stateTax = stateSSTax + stateIncomeTax;
    }

    const magi = totalOrdinaryIncome + capitalGains;
    let irmaa = 0;
    if (spouse1Alive && spouse1CurrentAge >= 65 && spouse1CurrentAge <= 100) {
      irmaa += calculateIRMAA(magi, i, taxSettings.inflationRate / 100);
    }
    if (spouse2Alive && spouse2CurrentAge >= 65 && spouse2CurrentAge <= 100) {
      irmaa += calculateIRMAA(magi, i, taxSettings.inflationRate / 100);
    }

    let medicarePremiums = 0;
    if (spouse1Alive && spouse1CurrentAge >= 65 && spouse1CurrentAge <= 100) {
      medicarePremiums += calculateMedicarePremiums(i, taxSettings.inflationRate / 100);
    }
    if (spouse2Alive && spouse2CurrentAge >= 65 && spouse2CurrentAge <= 100) {
      medicarePremiums += calculateMedicarePremiums(i, taxSettings.inflationRate / 100);
    }

    let acaPremium = 0;
    let acaSubsidy = 0;
    let netAcaCost = 0;
    
    if (taxSettings.acaSettings.enabled) {
      const enrolleeAges: number[] = [];
      if (spouse1Alive && spouse1CurrentAge < 65) enrolleeAges.push(spouse1CurrentAge);
      if (spouse2Alive && spouse2CurrentAge < 65 && effectiveFilingStatus === 'married') enrolleeAges.push(spouse2CurrentAge);
      
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

    const totalHealthcareCost = netAcaCost + medicarePremiums + irmaa;

    const niit = calculateNIIT(capitalGains, magi, effectiveFilingStatus, i, taxSettings.inflationRate / 100);
    const amt = calculateAMT(totalOrdinaryIncome, capitalGains, effectiveFilingStatus, i, taxSettings.inflationRate / 100);

    if (excessIncome > 0) {
      taxableBalance += excessIncome;
    }

    spouse1TradBalance *= (1 + accounts.traditionalReturn / 100);
    spouse2TradBalance *= (1 + accounts.traditionalReturn / 100);
    rothBalance *= (1 + accounts.rothReturn / 100);
    taxableBalance *= (1 + accounts.taxableReturn / 100);
    
    const endingTradBalance = spouse1TradBalance + spouse2TradBalance;

    const totalWithdrawals = taxableWithdrawal + traditionalWithdrawal + rothWithdrawal;
    const calculatedTakeHome = totalWithdrawals + ssAnnual + netWages - federalTax - stateTax - stateCapitalGainsTax - irmaa - medicarePremiums - niit - amt - netAcaCost;
    
    const takeHome = excessIncome > 0 ? (taxSettings.targetTakeHome * inflationMultiplier) : calculatedTakeHome;
    
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
}

export interface TwoPassResult {
  currentProjections: ProjectionRow[];
  baselineProjections: ProjectionRow[];
  optimizedProjections: ProjectionRow[];
  currentMetrics: StrategyMetrics;
  baselineMetrics: StrategyMetrics;
  optimizedMetrics: StrategyMetrics;
  taxSavings: number;
}

export interface StrategyMetrics {
  lifetimeFederalTax: number;
  lifetimeTotalTax: number;
  bracketScore: number;
  avgBracket: number;
  yearsInLowBracket: number;
  // Depletion tracking
  tradDepletionAge: number | null;
  taxableDepletionAge: number | null;
  rothDepletionAge: number | null;
  allFundsDepletionAge: number | null;
  finalTotalBalance: number;
}

function calculateMetrics(projections: ProjectionRow[]): StrategyMetrics {
  const lifetimeFederalTax = projections.reduce((sum, p) => sum + p.federalTax, 0);
  const lifetimeTotalTax = projections.reduce((sum, p) => sum + p.totalTaxes, 0);
  
  // Calculate bracket consistency
  const brackets = projections.map(p => p.marginalBracket);
  const avgBracket = brackets.length > 0 
    ? brackets.reduce((s, b) => s + b, 0) / brackets.length 
    : 0;
  
  const variance = brackets.reduce((sum, b) => sum + Math.pow(b - avgBracket, 2), 0) / Math.max(1, brackets.length);
  const stdDev = Math.sqrt(variance);
  const bracketScore = Math.min(10, stdDev * 100);
  
  const yearsInLowBracket = projections.filter(p => p.marginalBracket <= 0.12).length;
  
  // Calculate depletion ages (first year balance drops below $1,000 after being above)
  const DEPLETION_THRESHOLD = 1000;
  
  let tradDepletionAge: number | null = null;
  let taxableDepletionAge: number | null = null;
  let rothDepletionAge: number | null = null;
  
  for (let i = 1; i < projections.length; i++) {
    const prev = projections[i - 1];
    const curr = projections[i];
    
    if (tradDepletionAge === null && prev.traditionalBalance >= DEPLETION_THRESHOLD && curr.traditionalBalance < DEPLETION_THRESHOLD) {
      tradDepletionAge = curr.age;
    }
    if (taxableDepletionAge === null && prev.taxableBalance >= DEPLETION_THRESHOLD && curr.taxableBalance < DEPLETION_THRESHOLD) {
      taxableDepletionAge = curr.age;
    }
    if (rothDepletionAge === null && prev.rothBalance >= DEPLETION_THRESHOLD && curr.rothBalance < DEPLETION_THRESHOLD) {
      rothDepletionAge = curr.age;
    }
  }
  
  // All funds depletion: when ALL accounts are below threshold
  let allFundsDepletionAge: number | null = null;
  for (let i = 1; i < projections.length; i++) {
    const prev = projections[i - 1];
    const curr = projections[i];
    const prevTotal = prev.traditionalBalance + prev.rothBalance + prev.taxableBalance;
    const currTotal = curr.traditionalBalance + curr.rothBalance + curr.taxableBalance;
    
    if (prevTotal >= DEPLETION_THRESHOLD && currTotal < DEPLETION_THRESHOLD) {
      allFundsDepletionAge = curr.age;
      break;
    }
  }
  
  // Final balance at end of projection
  const lastRow = projections[projections.length - 1];
  const finalTotalBalance = lastRow 
    ? lastRow.traditionalBalance + lastRow.rothBalance + lastRow.taxableBalance 
    : 0;
  
  return {
    lifetimeFederalTax,
    lifetimeTotalTax,
    bracketScore,
    avgBracket,
    yearsInLowBracket,
    tradDepletionAge,
    taxableDepletionAge,
    rothDepletionAge,
    allFundsDepletionAge,
    finalTotalBalance,
  };
}

/**
 * Hook that runs two-pass projections for optimization comparison
 */
export function useTwoPassProjections(
  accounts: Accounts,
  ssData: SSData,
  taxSettings: TaxSettings
): TwoPassResult {
  return useMemo(() => {
    // Current projections with user's selected strategy
    const currentProjections = calculateProjections(accounts, ssData, taxSettings);
    
    // Baseline projections with NO Roth conversions (to see the "before" state)
    const baselineProjections = calculateProjections(accounts, ssData, taxSettings, 'none');
    
    // Optimized projections filling to 22% bracket
    const optimizedProjections = calculateProjections(accounts, ssData, taxSettings, 'fill_22');
    
    const currentMetrics = calculateMetrics(currentProjections);
    const baselineMetrics = calculateMetrics(baselineProjections);
    const optimizedMetrics = calculateMetrics(optimizedProjections);
    
    // Tax savings = baseline taxes - optimized taxes
    const taxSavings = baselineMetrics.lifetimeTotalTax - optimizedMetrics.lifetimeTotalTax;
    
    return {
      currentProjections,
      baselineProjections,
      optimizedProjections,
      currentMetrics,
      baselineMetrics,
      optimizedMetrics,
      taxSavings,
    };
  }, [accounts, ssData, taxSettings]);
}

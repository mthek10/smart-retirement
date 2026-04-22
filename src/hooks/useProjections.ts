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
  get401kLimit,
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
  /** Price appreciation portion of brokerage return (% per year). Unrealized until sale. */
  taxableReturn: number;
  taxableCostBasisPercent: number;
  /** Annual qualified dividend yield (%). Taxed at LTCG rates; reinvested into brokerage. */
  qualifiedDividendYield?: number;
  /** Annual ordinary (non-qualified) dividend yield (%). Taxed as ordinary income; reinvested into brokerage. */
  ordinaryDividendYield?: number;
}

export interface SSData {
  spouse1: {
    estimatedBenefit: number;
    claimAge: number;
    lifeExpectancy: number;
  };
  spouse2: {
    estimatedBenefit: number;
    claimAge: number;
    lifeExpectancy: number;
  };
}

export interface PensionSettings {
  monthlyAmount: number;
  startAge: number;
  cola: number; // annual COLA percentage
}

export interface EmploymentSettings {
  currentIncome: number;
  retirementAge: number;
  contributes401k: boolean;
  contribution401kAmount: number;
  roth401kAmount: number;
  employerMatchAmount: number;
  pension?: PensionSettings;
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
  annualHealthInsuranceCost: number;
}

export interface StateRelocationSettings {
  enabled: boolean;
  targetState: string;
  relocationAge: number;
}

export interface LifeEvent {
  id: string;
  label: string;
  type: "expense" | "income";
  amount: number;
  age: number; // spouse1's age when it occurs
  taxable: boolean; // for income: is it taxable? for expense: ignored
  /** Optional subtype for specialized tax handling. Currently supports "home_sale" (IRS §121 exclusion). */
  subtype?: "home_sale";
  /** Home sale: gross sale price */
  salePrice?: number;
  /** Home sale: original purchase price + capital improvements */
  costBasis?: number;
  /** Home sale: agent commissions, closing costs that reduce realized gain */
  sellingCosts?: number;
  /** Home sale: whether the sale qualifies for the §121 primary residence exclusion */
  qualifiesForSection121?: boolean;
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
  rothConversionTaxSource?: "brokerage" | "conversion";
  preSurvivorStrategy?: string;
  acaSettings: ACASettings;
  spouse1Employment: EmploymentSettings;
  spouse2Employment: EmploymentSettings;
  survivorSettings: SurvivorSettings;
  stateRelocation?: StateRelocationSettings;
  lifeEvents?: LifeEvent[];
}

export interface ProjectionRow {
  year: number;
  age: number;
  traditionalBalance: number;
  rothBalance: number;
  taxableBalance: number;
  ssIncome: number;
  employmentIncome: number;
  pensionIncome: number;
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
  ordinaryIncome: number; // Gross ordinary income for tax bracket calculations (includes taxable SS)
  nonSocialSecurityOrdinaryIncome: number;
  capitalGainsIncome: number;
  rothConversion: number;
  marginalBracket: number;
  conversionExcessReinvested: number;
  isSurvivorYear: boolean;
  lifeEventExpense: number;
  lifeEventIncome: number;
  qualifiedDividends: number;
  ordinaryDividends: number;
  /** Taxable LTCG portion from §121-qualified home sales this year (sale price - basis - selling costs - exclusion). */
  homeSaleTaxableGain: number;
  /** Net cash proceeds from home sales reinvested into brokerage this year. */
  homeSaleNetProceeds: number;
}

/**
 * Shared utility: find depletion ages for each account type.
 * Used by both Index.tsx summary and calculateMetrics.
 */
export function findDepletionAges(projections: ProjectionRow[]): {
  tradDepletionAge: number | null;
  taxableDepletionAge: number | null;
  rothDepletionAge: number | null;
} {
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

  return { tradDepletionAge, taxableDepletionAge, rothDepletionAge };
}

function calculateManualHealthInsuranceCost(
  annualHealthInsuranceCost: number | undefined,
  yearIndex: number,
  inflationFraction: number,
  effectiveFilingStatus: string,
  coveredPeople: Array<{ age: number; isActive: boolean }>
): number {
  if (!annualHealthInsuranceCost || annualHealthInsuranceCost <= 0) {
    return 0;
  }

  const activeCoveredAges = coveredPeople
    .filter((person) => person.isActive)
    .map((person) => person.age);

  if (activeCoveredAges.length === 0) {
    return 0;
  }

  const hasPreMedicareCoverage = activeCoveredAges.some((age) => age < 65);
  if (!hasPreMedicareCoverage) {
    return 0;
  }

  // In mixed-age married years, the Medicare-eligible spouse should not also
  // carry the manual pre-Medicare premium. Model the under-65 spouse via ACA instead.
  if (effectiveFilingStatus === "married") {
    const hasMedicareCoverage = activeCoveredAges.some((age) => age >= 65 && age <= 100);
    if (hasMedicareCoverage) {
      return 0;
    }
  }

  return annualHealthInsuranceCost * Math.pow(1 + inflationFraction, yearIndex);
}

/**
 * Iterative binary search solver to find withdrawal amount achieving target take-home.
 * Extracted from calculateProjections for readability.
 */
function solveRequiredWithdrawal(
  targetTakeHome: number,
  ssAnnual: number,
  currentBalances: { tradBalance: number; rothBalance: number; taxableBalance: number },
  currentRMD: number,
  yearIndex: number,
  spouse1Age: number,
  spouse2Age: number,
  spouse1Alive: boolean,
  spouse2Alive: boolean,
  taxableWages: number,
  pensionIncome: number,
  effectiveFilingStatus: string,
  costBasisPercent: number,
  conversionStrategy: string,
  inflationRate: number,
  rothConversionCustom: number,
  state: string,
  stateRate: number,
  acaSettings?: ACASettings,
  acaEnrolleeAges?: number[],
  qualifiedDividends: number = 0,
  ordinaryDividends: number = 0,
  extraCapitalGains: number = 0,
): number {
  let low = Math.max(0, currentRMD);
  let high = Math.max(
    targetTakeHome * 3,
    currentBalances.tradBalance + currentBalances.rothBalance + currentBalances.taxableBalance
  );
  
  const tolerance = 1;
  const maxIterations = 50;
  const inflationFraction = inflationRate / 100;
  
  for (let iter = 0; iter < maxIterations; iter++) {
    const testWithdrawal = (low + high) / 2;
    
    let testTaxable = currentBalances.taxableBalance;
    let testTrad = currentBalances.tradBalance;
    let testRoth = currentBalances.rothBalance;
    
    let remaining = testWithdrawal;
    let capitalGainsRealized = 0;
    let traditionalWithdrawn = 0;
    
    if (currentRMD > 0 && testTrad > 0) {
      const rmdWithdrawal = Math.min(currentRMD, testTrad, remaining);
      traditionalWithdrawn = rmdWithdrawal;
      testTrad -= rmdWithdrawal;
      remaining -= rmdWithdrawal;
    }
    
    if (remaining > 0 && testTaxable > 0) {
      const fromTaxable = Math.min(remaining, testTaxable);
      capitalGainsRealized = fromTaxable * ((100 - costBasisPercent) / 100);
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
      testRoth -= Math.min(remaining, testRoth);
    }
    
    let rothConversion = 0;
    const targetIncomeLimit = getRothConversionLimit(
      conversionStrategy,
      effectiveFilingStatus,
      yearIndex,
      inflationFraction,
      rothConversionCustom
    );
    if (targetIncomeLimit > 0 && testTrad > 0) {
      // Match main loop's Roth conversion room calculation exactly
      const ordinaryIncomePreConversion = traditionalWithdrawn + taxableWages + pensionIncome + ordinaryDividends;
      const taxableSSPreConversion = calculateTaxableSocialSecurity(
        ssAnnual,
        ordinaryIncomePreConversion + capitalGainsRealized + qualifiedDividends + extraCapitalGains,
        effectiveFilingStatus
      );
      const totalOrdinaryPreConversion = ordinaryIncomePreConversion + taxableSSPreConversion;
      const conversionRoom = Math.max(0, targetIncomeLimit - totalOrdinaryPreConversion);
      rothConversion = Math.min(conversionRoom, testTrad);
    }
    
    const totalCapitalGains = capitalGainsRealized + qualifiedDividends + extraCapitalGains;
    const ordinaryIncome = traditionalWithdrawn + rothConversion + taxableWages + pensionIncome + ordinaryDividends;
    const taxableSS = calculateTaxableSocialSecurity(ssAnnual, ordinaryIncome + totalCapitalGains, effectiveFilingStatus);
    const totalOrdinaryIncome = ordinaryIncome + taxableSS;
    
    const federalTax = calculateFederalTax(totalOrdinaryIncome, effectiveFilingStatus, yearIndex, inflationFraction);
    const federalCapitalGainsTax = calculateCapitalGainsTax(totalCapitalGains, totalOrdinaryIncome, effectiveFilingStatus, yearIndex, inflationFraction);
    
    let stateTax = 0;
    let stateCapitalGainsTax = 0;
    
    if (state === 'other') {
      stateTax = totalOrdinaryIncome * (stateRate / 100);
      stateCapitalGainsTax = totalCapitalGains * (stateRate / 100);
    } else if (state && state !== 'none') {
      const agi = totalOrdinaryIncome + totalCapitalGains;
      const olderLivingSpouseAge = spouse1Alive && spouse2Alive
        ? Math.max(spouse1Age, spouse2Age)
        : (spouse1Alive ? spouse1Age : spouse2Age);
      const stateSSTax = calculateStateSocialSecurityTax(ssAnnual, agi, effectiveFilingStatus, state, olderLivingSpouseAge);
      const nonSSIncome = ordinaryIncome;
      const stateIncomeTax = calculateStateIncomeTax(nonSSIncome, state, effectiveFilingStatus);
      stateCapitalGainsTax = calculateStateCapitalGainsTax(totalCapitalGains, nonSSIncome, state, effectiveFilingStatus);
      stateTax = stateSSTax + stateIncomeTax;
    }
    
    const magi = totalOrdinaryIncome + totalCapitalGains;
    let irmaa = 0;
    if (spouse1Alive && spouse1Age >= 65 && spouse1Age <= 100) {
      irmaa += calculateIRMAA(magi, yearIndex, inflationFraction, effectiveFilingStatus);
    }
    if (spouse2Alive && spouse2Age >= 65 && spouse2Age <= 100) {
      irmaa += calculateIRMAA(magi, yearIndex, inflationFraction, effectiveFilingStatus);
    }
    
    let medicarePremiums = 0;
    if (spouse1Alive && spouse1Age >= 65 && spouse1Age <= 100) {
      medicarePremiums += calculateMedicarePremiums(yearIndex, inflationFraction);
    }
    if (spouse2Alive && spouse2Age >= 65 && spouse2Age <= 100) {
      medicarePremiums += calculateMedicarePremiums(yearIndex, inflationFraction);
    }
    
    const niit = calculateNIIT(totalCapitalGains, magi, effectiveFilingStatus, yearIndex, inflationFraction);
    const amt = calculateAMT(totalOrdinaryIncome, totalCapitalGains, effectiveFilingStatus, yearIndex, inflationFraction);
    
    // ACA cost calculation
    let netAcaCost = 0;
    if (acaSettings?.enabled && acaEnrolleeAges && acaEnrolleeAges.length > 0) {
      const acaResult = calculateACASubsidy(
        magi,
        acaSettings.householdSize,
        acaEnrolleeAges,
        yearIndex,
        inflationFraction
      );
      const acaPremium = acaSettings.customBenchmarkPremium > 0
        ? acaSettings.customBenchmarkPremium * 12 * Math.pow(1 + inflationFraction, yearIndex) * acaEnrolleeAges.length
        : acaResult.premium;
      netAcaCost = acaPremium - acaResult.subsidy;
    }

    // Annual health insurance cost (inflation-adjusted, pre-Medicare only)
    const healthInsuranceCost = calculateManualHealthInsuranceCost(
      acaSettings?.annualHealthInsuranceCost,
      yearIndex,
      inflationFraction,
      effectiveFilingStatus,
      [
        { age: spouse1Age, isActive: spouse1Alive },
        { age: spouse2Age, isActive: spouse2Alive },
      ]
    );

    // `targetTakeHome` has already been reduced by wages and pension before calling
    // the solver, so only portfolio withdrawals plus Social Security should be
    // matched here. Pension still stays in taxable income above.
    const calculatedTakeHome = testWithdrawal + ssAnnual - federalTax - federalCapitalGainsTax - stateTax - stateCapitalGainsTax - irmaa - medicarePremiums - niit - amt - netAcaCost - healthInsuranceCost;
    
    if (Math.abs(calculatedTakeHome - targetTakeHome) < tolerance) {
      return testWithdrawal;
    }
    
    if (calculatedTakeHome < targetTakeHome) {
      low = testWithdrawal;
    } else {
      high = testWithdrawal;
    }
  }
  
  return (low + high) / 2;
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
  const isMarried = taxSettings.filingStatus === 'married';
  let spouse1TradBalance = accounts.spouse1Traditional;
  let spouse2TradBalance = isMarried ? accounts.spouse2Traditional : 0;
  let rothBalance = accounts.roth;
  let taxableBalance = accounts.taxable;
  // Track brokerage cost basis in dollars for accurate dividend reinvestment & gain calc
  let costBasisDollars = accounts.taxable * (accounts.taxableCostBasisPercent / 100);
  const qualifiedDividendYield = accounts.qualifiedDividendYield ?? 0;
  const ordinaryDividendYield = accounts.ordinaryDividendYield ?? 0;

  const maxYears = isMarried
    ? Math.max(100 - taxSettings.spouse1Age, 100 - taxSettings.spouse2Age)
    : 100 - taxSettings.spouse1Age;
  
  // Use override strategy if provided, otherwise use settings
  const effectiveConversionStrategy = strategyOverride ?? taxSettings.rothConversionStrategy;

  let spouse1SSAtDeath = 0;
  let spouse2SSAtDeath = 0;
  let spouse1DeathYearIndex: number | null = null;
  let spouse2DeathYearIndex: number | null = null;

  for (let i = 0; i <= maxYears; i++) {
    const year = new Date().getFullYear() + i;
    const spouse1CurrentAge = taxSettings.spouse1Age + i;
    const spouse2CurrentAge = isMarried ? taxSettings.spouse2Age + i : spouse1CurrentAge;
    
    const survivorEnabled = taxSettings.survivorSettings?.enabled && isMarried;
    const spouse1DeathAge = taxSettings.survivorSettings?.spouse1DeathAge;
    const spouse2DeathAge = taxSettings.survivorSettings?.spouse2DeathAge;
    
    const spouse1Alive = !survivorEnabled || 
      spouse1DeathAge === null || 
      spouse1CurrentAge < spouse1DeathAge;
    const spouse2Alive = isMarried && (!survivorEnabled || 
      spouse2DeathAge === null || 
      spouse2CurrentAge < spouse2DeathAge);
    
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
    
    const age = isMarried && spouse1Alive && spouse2Alive 
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
    
    // Calculate pension income (taxable ordinary income)
    const spouse1Pension = taxSettings.spouse1Employment.pension;
    const spouse2Pension = taxSettings.spouse2Employment.pension;
    const spouse1PensionIncome = (spouse1Alive && spouse1Pension && spouse1Pension.monthlyAmount > 0 && spouse1CurrentAge >= spouse1Pension.startAge)
      ? spouse1Pension.monthlyAmount * 12 * Math.pow(1 + (spouse1Pension.cola || 0) / 100, spouse1CurrentAge - spouse1Pension.startAge)
      : 0;
    const spouse2PensionIncome = (spouse2Alive && isMarried && spouse2Pension && spouse2Pension.monthlyAmount > 0 && spouse2CurrentAge >= spouse2Pension.startAge)
      ? spouse2Pension.monthlyAmount * 12 * Math.pow(1 + (spouse2Pension.cola || 0) / 100, spouse2CurrentAge - spouse2Pension.startAge)
      : 0;
    const totalPensionIncome = spouse1PensionIncome + spouse2PensionIncome;

    // Calculate combined 401(k) contributions with shared limit per spouse
    const inflRate = taxSettings.inflationRate / 100;
    
    let spouse1_401k = 0;
    let spouse1_roth401k = 0;
    if (spouse1Working && taxSettings.spouse1Employment.contributes401k) {
      const inflationFactor = Math.pow(1 + inflRate, i);
      const s1Limit = get401kLimit(spouse1CurrentAge) * inflationFactor;
      const s1Trad = Math.min((taxSettings.spouse1Employment.contribution401kAmount || 0) * inflationFactor, s1Limit);
      const s1Roth = Math.min((taxSettings.spouse1Employment.roth401kAmount || 0) * inflationFactor, Math.max(0, s1Limit - s1Trad));
      spouse1_401k = s1Trad;
      spouse1_roth401k = s1Roth;
    }
    
    let spouse2_401k = 0;
    let spouse2_roth401k = 0;
    if (spouse2Working && taxSettings.spouse2Employment.contributes401k) {
      const inflationFactor = Math.pow(1 + inflRate, i);
      const s2Limit = get401kLimit(spouse2CurrentAge) * inflationFactor;
      const s2Trad = Math.min((taxSettings.spouse2Employment.contribution401kAmount || 0) * inflationFactor, s2Limit);
      const s2Roth = Math.min((taxSettings.spouse2Employment.roth401kAmount || 0) * inflationFactor, Math.max(0, s2Limit - s2Trad));
      spouse2_401k = s2Trad;
      spouse2_roth401k = s2Roth;
    }
    
    const totalTraditional401k = spouse1_401k + spouse2_401k;
    const totalRoth401k = spouse1_roth401k + spouse2_roth401k;
    const total401kContributions = totalTraditional401k + totalRoth401k;
    
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
    
    // All 401(k) contributions reduce take-home pay; only traditional reduces taxable income
    const netWages = totalWages - totalPayrollTax - total401kContributions;
    
    if (spouse1DeathYearIndex !== null && i === spouse1DeathYearIndex) {
      spouse2TradBalance += spouse1TradBalance;
      spouse1TradBalance = 0;
    }
    if (spouse2DeathYearIndex !== null && i === spouse2DeathYearIndex) {
      spouse1TradBalance += spouse2TradBalance;
      spouse2TradBalance = 0;
    }
    
    // Traditional 401(k) + employer match goes to traditional balance
    if (spouse1Alive) {
      spouse1TradBalance += spouse1_401k + spouse1Match;
    }
    if (spouse2Alive) {
      spouse2TradBalance += spouse2_401k + spouse2Match;
    }
    
    // Roth 401(k) goes to Roth balance
    rothBalance += spouse1_roth401k + spouse2_roth401k;
    
    const tradBalance = spouse1TradBalance + spouse2TradBalance;

    const spouse1RMD = spouse1Alive ? calculateRMD(spouse1TradBalance, spouse1CurrentAge) : 0;
    const spouse2RMD = spouse2Alive && taxSettings.filingStatus === 'married'
      ? calculateRMD(spouse2TradBalance, spouse2CurrentAge)
      : 0;
    const rmd = spouse1RMD + spouse2RMD;
    
    const taxableWages = totalWages - totalTraditional401k; // Only traditional 401(k) reduces taxable wages
    
    const survivorSpendingPercent = taxSettings.survivorSettings?.survivorSpendingPercent || 75;
    const baseTargetTakeHome = taxSettings.targetTakeHome * inflationMultiplier;
    // Only apply survivor spending reduction when a married couple loses a spouse
    // Single filers should always use the full target
    const isSurvivorReduction = survivorEnabled && !(spouse1Alive && spouse2Alive);
    const effectiveTargetTakeHome = isSurvivorReduction
      ? baseTargetTakeHome * (survivorSpendingPercent / 100)
      : baseTargetTakeHome;
    
    // Life events for this year (based on spouse1's age)
    const lifeEvents = taxSettings.lifeEvents || [];
    const yearEvents = lifeEvents.filter(e => e.age === spouse1CurrentAge);

    // Home sale events (§121 exclusion). Treated separately from generic income:
    //   - taxable_gain → long-term capital gain (NOT ordinary income)
    //   - net_proceeds → reinvested into brokerage with full basis
    let homeSaleTaxableGain = 0;
    let homeSaleNetProceeds = 0;
    for (const ev of yearEvents) {
      if (ev.subtype !== 'home_sale') continue;
      const salePrice = ev.salePrice ?? ev.amount ?? 0;
      const basis = ev.costBasis ?? 0;
      const sellingCosts = ev.sellingCosts ?? 0;
      const realizedGain = Math.max(0, salePrice - basis - sellingCosts);
      const qualifies = ev.qualifiesForSection121 !== false;
      // Married couple still alive → $500k; otherwise $250k. Loss not deductible.
      const exclusionCap = qualifies
        ? (effectiveFilingStatus === 'married' ? 500_000 : 250_000)
        : 0;
      const taxableGain = Math.max(0, realizedGain - exclusionCap);
      const netProceeds = Math.max(0, salePrice - sellingCosts);
      homeSaleTaxableGain += taxableGain;
      homeSaleNetProceeds += netProceeds;
    }

    const yearExpenses = yearEvents
      .filter(e => e.type === 'expense' && e.subtype !== 'home_sale')
      .reduce((sum, e) => sum + e.amount, 0);
    const yearTaxableIncome = yearEvents
      .filter(e => e.type === 'income' && e.taxable && e.subtype !== 'home_sale')
      .reduce((sum, e) => sum + e.amount, 0);
    const yearNontaxableIncome = yearEvents
      .filter(e => e.type === 'income' && !e.taxable && e.subtype !== 'home_sale')
      .reduce((sum, e) => sum + e.amount, 0);
    // Surface home sale proceeds in the "lifeEventIncome" total for display
    const totalLifeEventIncome = yearTaxableIncome + yearNontaxableIncome + homeSaleNetProceeds;

    // Remove income sources that are already available outside the withdrawal solver.
    let adjustedTargetTakeHome = Math.max(0, effectiveTargetTakeHome - netWages - totalPensionIncome);

    // Add life event expenses to the withdrawal target
    adjustedTargetTakeHome += yearExpenses;

    // Non-taxable income reduces what we need to withdraw
    adjustedTargetTakeHome = Math.max(0, adjustedTargetTakeHome - yearNontaxableIncome);
    // Deposit non-taxable income into brokerage (and treat as basis - it's after-tax)
    taxableBalance += yearNontaxableIncome;
    costBasisDollars += yearNontaxableIncome;

    // Home sale proceeds: reinvest gross net proceeds into brokerage with FULL basis
    // (the taxable_gain is taxed via the LTCG path below; future withdrawals must not double-tax).
    if (homeSaleNetProceeds > 0) {
      taxableBalance += homeSaleNetProceeds;
      costBasisDollars += homeSaleNetProceeds;
      // Home sale proceeds count as available cash → reduce required withdrawal target.
      adjustedTargetTakeHome = Math.max(0, adjustedTargetTakeHome - homeSaleNetProceeds);
    }


    // Brokerage dividends: paid annually, taxed, then reinvested (increases basis)
    const qualifiedDividends = taxableBalance * (qualifiedDividendYield / 100);
    const ordinaryDividends = taxableBalance * (ordinaryDividendYield / 100);
    const totalDividends = qualifiedDividends + ordinaryDividends;
    if (totalDividends > 0) {
      taxableBalance += totalDividends;
      costBasisDollars += totalDividends;
    }
    // Current cost basis percent (used by withdrawal/conversion gain calculations)
    const currentCostBasisPercent = taxableBalance > 0
      ? Math.min(100, Math.max(0, (costBasisDollars / taxableBalance) * 100))
      : accounts.taxableCostBasisPercent;
    
    // Compute ACA enrollee ages for the solver
    const solverEnrolleeAges: number[] = [];
    if (taxSettings.acaSettings.enabled) {
      if (spouse1Alive && spouse1CurrentAge < 65) solverEnrolleeAges.push(spouse1CurrentAge);
      if (spouse2Alive && spouse2CurrentAge < 65 && effectiveFilingStatus === 'married') solverEnrolleeAges.push(spouse2CurrentAge);
    }
    
    const effectiveHouseholdSize = (spouse1Alive && spouse2Alive) 
      ? taxSettings.acaSettings.householdSize 
      : Math.max(1, taxSettings.acaSettings.householdSize - 1);
    
    // Determine effective state BEFORE solver call (must match main loop)
    const effectiveState = taxSettings.stateRelocation?.enabled && 
      spouse1CurrentAge >= (taxSettings.stateRelocation?.relocationAge || 65)
      ? taxSettings.stateRelocation.targetState
      : taxSettings.state;

    // Determine effective conversion strategy for solver (must match main loop)
    const isSurvivorYear = (!spouse1Alive || !spouse2Alive) && survivorEnabled;
    let solverConversionStrategy = effectiveConversionStrategy;
    if (effectiveConversionStrategy === 'survivor_smooth') {
      if (isSurvivorYear) {
        solverConversionStrategy = 'fill_24';
      } else {
        solverConversionStrategy = taxSettings.preSurvivorStrategy || 'fill_22';
      }
    }

    let requiredWithdrawal = adjustedTargetTakeHome > 0 ? solveRequiredWithdrawal(
      adjustedTargetTakeHome,
      ssAnnual,
      { tradBalance, rothBalance, taxableBalance },
      rmd,
      i,
      spouse1CurrentAge,
      spouse2CurrentAge,
      spouse1Alive,
      spouse2Alive,
      taxableWages,
      totalPensionIncome,
      effectiveFilingStatus,
      currentCostBasisPercent,
      solverConversionStrategy,
      taxSettings.inflationRate,
      taxSettings.rothConversionCustom,
      effectiveState,
      taxSettings.stateRate,
      taxSettings.acaSettings,
      solverEnrolleeAges,
      qualifiedDividends,
      ordinaryDividends,
      homeSaleTaxableGain,
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
      // Reduce basis proportionally to withdrawal (FIFO/avg-cost simplification)
      const basisRatio = taxableBalance > 0 ? costBasisDollars / taxableBalance : 0;
      costBasisDollars = Math.max(0, costBasisDollars - taxableWithdrawal * basisRatio);
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

    // Reuse isSurvivorYear computed above (before solver call)
    
    // SURVIVOR-AWARE ROTH CONVERSION STRATEGY
    // When survivor_smooth is active and we're in a survivor year, 
    // aggressively convert to 24% bracket (single) to deplete traditional faster
    let effectiveSurvivorStrategy = effectiveConversionStrategy;
    if (effectiveConversionStrategy === 'survivor_smooth') {
      if (isSurvivorYear) {
        // After spouse passes: aggressive 24% bracket filling to manage widow(er) tax trap
        effectiveSurvivorStrategy = 'fill_24';
      } else {
        // Before spouse passes: use user's chosen pre-survivor strategy (no advance knowledge)
        effectiveSurvivorStrategy = taxSettings.preSurvivorStrategy || 'fill_22';
      }
    }

    // ROTH CONVERSION OPTIMIZATION
    let rothConversion = 0;
    let conversionExcessReinvested = 0;
    
    const targetIncomeLimit = getRothConversionLimit(
      effectiveSurvivorStrategy,
      effectiveFilingStatus,
      i,
      taxSettings.inflationRate / 100,
      taxSettings.rothConversionCustom
    );
    
    const remainingTradForConversion = spouse1TradBalance + spouse2TradBalance;
    
    if (targetIncomeLimit > 0 && remainingTradForConversion > 0) {
      const realizedGains = taxableWithdrawal * ((100 - currentCostBasisPercent) / 100);
      const capitalGains = realizedGains + qualifiedDividends + homeSaleTaxableGain;
      const ordinaryIncomePreConversion = traditionalWithdrawal + taxableWages + totalPensionIncome + ordinaryDividends;
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
          irmaaWithoutConversion += calculateIRMAA(magiWithoutConversion, i, taxSettings.inflationRate / 100, effectiveFilingStatus);
        }
        if (spouse2Alive && spouse2CurrentAge >= 65 && spouse2CurrentAge <= 100) {
          irmaaWithoutConversion += calculateIRMAA(magiWithoutConversion, i, taxSettings.inflationRate / 100, effectiveFilingStatus);
        }
        
        const magiWithConversion = totalOrdinaryIncomePreConversion + proposedConversion + capitalGains;
        let irmaaWithConversion = 0;
        if (spouse1Alive && spouse1CurrentAge >= 65 && spouse1CurrentAge <= 100) {
          irmaaWithConversion += calculateIRMAA(magiWithConversion, i, taxSettings.inflationRate / 100, effectiveFilingStatus);
        }
        if (spouse2Alive && spouse2CurrentAge >= 65 && spouse2CurrentAge <= 100) {
          irmaaWithConversion += calculateIRMAA(magiWithConversion, i, taxSettings.inflationRate / 100, effectiveFilingStatus);
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
              testIrmaa += calculateIRMAA(testMagi, i, taxSettings.inflationRate / 100, effectiveFilingStatus);
            }
            if (spouse2Alive && spouse2CurrentAge >= 65 && spouse2CurrentAge <= 100) {
              testIrmaa += calculateIRMAA(testMagi, i, taxSettings.inflationRate / 100, effectiveFilingStatus);
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
      
      // Calculate excess from aggressive conversion (income beyond spending needs)
      // that should be reinvested into brokerage
      if (rothConversion > 0 && isSurvivorYear && effectiveConversionStrategy === 'survivor_smooth') {
        // The conversion creates taxable income; the after-tax excess should be reinvested
        const conversionTax = rothConversion * getMarginalTaxBracket(
          totalOrdinaryIncomePreConversion + rothConversion, 
          effectiveFilingStatus, 
          i, 
          taxSettings.inflationRate / 100
        );
        // Only the portion beyond what's needed for spending gets reinvested
        // This is already handled by the brokerage reinvestment below
        conversionExcessReinvested = Math.max(0, rothConversion - conversionTax);
      }
      
      if (rothConversion > 0) {
        const conversionTradBalance = spouse1TradBalance + spouse2TradBalance;
        if (conversionTradBalance > 0) {
          const s1Ratio = spouse1TradBalance / conversionTradBalance;
          spouse1TradBalance -= rothConversion * s1Ratio;
          spouse2TradBalance -= rothConversion * (1 - s1Ratio);
        }
        
        // When paying taxes from the conversion itself, reduce the amount landing in Roth
        if (taxSettings.rothConversionTaxSource === "conversion") {
          const marginalRate = getMarginalTaxBracket(
            totalOrdinaryIncomePreConversion + rothConversion,
            effectiveFilingStatus,
            i,
            taxSettings.inflationRate / 100
          );
          const conversionTaxFromFunds = rothConversion * marginalRate;
          rothBalance += rothConversion - conversionTaxFromFunds;
        } else {
          rothBalance += rothConversion;
        }
      }
    }

    const realizedCapitalGains = taxableWithdrawal * ((100 - currentCostBasisPercent) / 100);
    const capitalGains = realizedCapitalGains + qualifiedDividends;
    const ordinaryIncome = traditionalWithdrawal + rothConversion + taxableWages + totalPensionIncome + yearTaxableIncome + ordinaryDividends;
    
    const taxableSSIncome = calculateTaxableSocialSecurity(
      ssAnnual, 
      ordinaryIncome + capitalGains,
      effectiveFilingStatus
    );
    
    const totalOrdinaryIncome = ordinaryIncome + taxableSSIncome;

    const inflationFraction = taxSettings.inflationRate / 100;
    const federalTaxOrdinary = calculateFederalTax(totalOrdinaryIncome, effectiveFilingStatus, i, inflationFraction);
    const federalTaxCapitalGains = calculateCapitalGainsTax(capitalGains, totalOrdinaryIncome, effectiveFilingStatus, i, inflationFraction);
    const federalTax = federalTaxOrdinary + federalTaxCapitalGains;
    
    const marginalBracket = getMarginalTaxBracket(totalOrdinaryIncome, effectiveFilingStatus, i, inflationFraction);
    
    const agi = totalOrdinaryIncome + capitalGains;
    
    let stateTax = 0;
    let stateCapitalGainsTax = 0;
    
    // effectiveState already computed above (before solver call)
    
    if (effectiveState === 'other') {
      stateTax = totalOrdinaryIncome * (taxSettings.stateRate / 100);
      stateCapitalGainsTax = capitalGains * (taxSettings.stateRate / 100);
    } else if (effectiveState && effectiveState !== 'none') {
      const olderLivingSpouseAge = spouse1Alive && spouse2Alive 
        ? Math.max(spouse1CurrentAge, spouse2CurrentAge)
        : (spouse1Alive ? spouse1CurrentAge : spouse2CurrentAge);
      const stateSSTax = calculateStateSocialSecurityTax(
        ssAnnual,
        agi,
        effectiveFilingStatus,
        effectiveState,
        olderLivingSpouseAge
      );
      
      const nonSSIncome = ordinaryIncome;
      const stateIncomeTax = calculateStateIncomeTax(nonSSIncome, effectiveState, effectiveFilingStatus);
      stateCapitalGainsTax = calculateStateCapitalGainsTax(capitalGains, nonSSIncome, effectiveState, effectiveFilingStatus);
      stateTax = stateSSTax + stateIncomeTax;
    }

    const magi = totalOrdinaryIncome + capitalGains;
    let irmaa = 0;
    if (spouse1Alive && spouse1CurrentAge >= 65 && spouse1CurrentAge <= 100) {
      irmaa += calculateIRMAA(magi, i, taxSettings.inflationRate / 100, effectiveFilingStatus);
    }
    if (spouse2Alive && spouse2CurrentAge >= 65 && spouse2CurrentAge <= 100) {
      irmaa += calculateIRMAA(magi, i, taxSettings.inflationRate / 100, effectiveFilingStatus);
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
      if (solverEnrolleeAges.length > 0) {
        const acaResult = calculateACASubsidy(
          magi,
          effectiveHouseholdSize,
          solverEnrolleeAges,
          i,
          taxSettings.inflationRate / 100
        );
        
        acaPremium = taxSettings.acaSettings.customBenchmarkPremium > 0
          ? taxSettings.acaSettings.customBenchmarkPremium * 12 * Math.pow(1 + taxSettings.inflationRate / 100, i) * solverEnrolleeAges.length
          : acaResult.premium;
        acaSubsidy = acaResult.subsidy;
        netAcaCost = acaPremium - acaSubsidy;
      }
    }

    // Annual health insurance cost (inflation-adjusted, pre-Medicare only)
    const healthInsuranceCost = calculateManualHealthInsuranceCost(
      taxSettings.acaSettings.annualHealthInsuranceCost,
      i,
      taxSettings.inflationRate / 100,
      effectiveFilingStatus,
      [
        { age: spouse1CurrentAge, isActive: spouse1Alive },
        { age: spouse2CurrentAge, isActive: spouse2Alive },
      ]
    );

    const totalHealthcareCost = netAcaCost + medicarePremiums + irmaa + healthInsuranceCost;

    const niit = calculateNIIT(capitalGains, magi, effectiveFilingStatus, i, taxSettings.inflationRate / 100);
    const amt = calculateAMT(totalOrdinaryIncome, capitalGains, effectiveFilingStatus, i, taxSettings.inflationRate / 100);

    const totalWithdrawals = taxableWithdrawal + traditionalWithdrawal + rothWithdrawal;
    const calculatedTakeHome = totalWithdrawals + ssAnnual + netWages + totalPensionIncome - federalTaxOrdinary - federalTaxCapitalGains - stateTax - stateCapitalGainsTax - irmaa - medicarePremiums - niit - amt - netAcaCost - healthInsuranceCost;
    
    // Compute total excess: after-tax income exceeding target gets reinvested to brokerage
    let totalExcess = 0;
    if (calculatedTakeHome > effectiveTargetTakeHome + 1) {
      totalExcess = calculatedTakeHome - effectiveTargetTakeHome;
    }
    
    if (totalExcess > 0) {
      taxableBalance += totalExcess;
      // After-tax excess reinvested → adds to cost basis (no future double-tax)
      costBasisDollars += totalExcess;
    }

    spouse1TradBalance *= (1 + accounts.traditionalReturn / 100);
    spouse2TradBalance *= (1 + accounts.traditionalReturn / 100);
    rothBalance *= (1 + accounts.rothReturn / 100);
    // Brokerage: only price appreciation here (dividends were paid+reinvested above)
    taxableBalance *= (1 + accounts.taxableReturn / 100);
    
    const endingTradBalance = spouse1TradBalance + spouse2TradBalance;
    
    const takeHome = totalExcess > 0 ? effectiveTargetTakeHome : calculatedTakeHome;
    
    const totalTaxes = federalTaxOrdinary + federalTaxCapitalGains + stateTax + stateCapitalGainsTax + totalPayrollTax + irmaa + medicarePremiums + niit + amt;
    
    results.push({
      year,
      age,
      traditionalBalance: endingTradBalance,
      rothBalance,
      taxableBalance,
      ssIncome: ssAnnual,
      employmentIncome: totalWages,
      pensionIncome: totalPensionIncome,
      netWages,
      excessSavings: totalExcess,
      payrollTax: totalPayrollTax,
      contributions401k: total401kContributions,
      employerMatch: totalEmployerMatch,
      withdrawals: totalWithdrawals,
      federalTax: federalTaxOrdinary,
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
      totalIncome: ssAnnual + totalWithdrawals + netWages + totalPensionIncome,
      ordinaryIncome: totalOrdinaryIncome, // Gross ordinary income used for tax bracket calculations
      nonSocialSecurityOrdinaryIncome: ordinaryIncome,
      capitalGainsIncome: capitalGains,
      rothConversion,
      marginalBracket,
      conversionExcessReinvested,
      isSurvivorYear,
      lifeEventExpense: yearExpenses,
      lifeEventIncome: totalLifeEventIncome,
      qualifiedDividends,
      ordinaryDividends,
    });
  }

  return results;
}

export interface TwoPassResult {
  currentProjections: ProjectionRow[];
  baselineProjections: ProjectionRow[];
  optimizedProjections: ProjectionRow[];
  survivorSmoothedProjections: ProjectionRow[] | null;
  currentMetrics: StrategyMetrics;
  baselineMetrics: StrategyMetrics;
  optimizedMetrics: StrategyMetrics;
  survivorSmoothedMetrics: StrategyMetrics | null;
  taxSavings: number;
  survivorTaxSavings: number;
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
  maxAnnualWithdrawalToZero: number;
  // Survivor-specific metrics
  peakMarginalBracket: number;
  yearsInHighBracket: number;
  survivorBracketRange: { min: number; max: number };
  survivorYearsTaxes: number;
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
  
  // Survivor-specific metrics
  const survivorYears = projections.filter(p => p.isSurvivorYear);
  const survivorBrackets = survivorYears.map(p => p.marginalBracket);
  const peakMarginalBracket = brackets.length > 0 ? Math.max(...brackets) : 0;
  const yearsInHighBracket = projections.filter(p => p.marginalBracket >= 0.32).length;
  const survivorBracketRange = survivorBrackets.length > 0 
    ? { min: Math.min(...survivorBrackets), max: Math.max(...survivorBrackets) }
    : { min: 0, max: 0 };
  const survivorYearsTaxes = survivorYears.reduce((sum, p) => sum + p.totalTaxes, 0);
  
  // Depletion ages via shared utility
  const { tradDepletionAge, taxableDepletionAge, rothDepletionAge } = findDepletionAges(projections);
  
  // All funds depletion: when ALL accounts are below threshold
  const DEPLETION_THRESHOLD = 1000;
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
  
  // maxAnnualWithdrawalToZero is computed externally via binary search
  const maxAnnualWithdrawalToZero = 0;
  
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
    maxAnnualWithdrawalToZero,
    peakMarginalBracket,
    yearsInHighBracket,
    survivorBracketRange,
    survivorYearsTaxes,
  };
}

/**
 * Binary search to find the first-year take-home that results in ~zero final balance.
 */
function solveMaxWithdrawalToZero(
  accounts: Accounts,
  ssData: SSData,
  taxSettings: TaxSettings,
  strategyOverride?: string
): number {
  const currentTakeHome = taxSettings.targetTakeHome;
  const currentProj = calculateProjections(accounts, ssData, taxSettings, strategyOverride);
  const currentFinal = getProjectionFinalBalance(currentProj);
  
  if (currentFinal <= 0) {
    // Already depleting — search downward for take-home that just barely lasts
    let low = 0;
    let high = currentTakeHome;
    for (let iter = 0; iter < 40; iter++) {
      const mid = (low + high) / 2;
      if (high - low < 50) return mid; // converged within $50
      const modified = { ...taxSettings, targetTakeHome: mid };
      const proj = calculateProjections(accounts, ssData, modified, strategyOverride);
      const finalBal = getProjectionFinalBalance(proj);
      const depleted = isProjectionDepleted(proj);
      if (!depleted && finalBal >= 0 && finalBal < 500) return mid;
      if (depleted || finalBal < 0) high = mid; else low = mid;
    }
    return (low + high) / 2;
  }
  
  // Final balance is positive — search upward for the max take-home before depletion
  let low = currentTakeHome;
  let high = currentTakeHome * 3;
  // Ensure high actually causes depletion
  for (let i = 0; i < 8; i++) {
    const modified = { ...taxSettings, targetTakeHome: high };
    const proj = calculateProjections(accounts, ssData, modified, strategyOverride);
    if (isProjectionDepleted(proj)) break;
    high *= 1.5;
  }
  
  for (let iter = 0; iter < 40; iter++) {
    const mid = (low + high) / 2;
    if (high - low < 50) return mid; // converged within $50
    const modified = { ...taxSettings, targetTakeHome: mid };
    const proj = calculateProjections(accounts, ssData, modified, strategyOverride);
    const finalBal = getProjectionFinalBalance(proj);
    const depleted = isProjectionDepleted(proj);
    if (!depleted && finalBal >= 0 && finalBal < 500) return mid;
    if (depleted || finalBal < 0) high = mid; else low = mid;
  }
  return (low + high) / 2;
}

function getProjectionFinalBalance(projections: ProjectionRow[]): number {
  const last = projections[projections.length - 1];
  return last ? last.traditionalBalance + last.rothBalance + last.taxableBalance : 0;
}

/** Check if funds deplete before the last projection year */
function isProjectionDepleted(projections: ProjectionRow[]): boolean {
  const THRESHOLD = 1000;
  for (let i = 1; i < projections.length; i++) {
    const prev = projections[i - 1];
    const curr = projections[i];
    const prevTotal = prev.traditionalBalance + prev.rothBalance + prev.taxableBalance;
    const currTotal = curr.traditionalBalance + curr.rothBalance + curr.taxableBalance;
    if (prevTotal >= THRESHOLD && currTotal < THRESHOLD) {
      // Only count as depleted if it happens before the last year
      return i < projections.length - 1;
    }
  }
  return false;
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
    
    // Survivor-smoothed projections (only if survivor scenario is enabled)
    const survivorEnabled = taxSettings.survivorSettings?.enabled && taxSettings.filingStatus === 'married';
    const survivorSmoothedProjections = survivorEnabled
      ? calculateProjections(accounts, ssData, taxSettings, 'survivor_smooth')
      : null;
    
    const currentMetrics = calculateMetrics(currentProjections);
    const baselineMetrics = calculateMetrics(baselineProjections);
    const optimizedMetrics = calculateMetrics(optimizedProjections);
    const survivorSmoothedMetrics = survivorSmoothedProjections 
      ? calculateMetrics(survivorSmoothedProjections)
      : null;
    
    // Solve max withdrawal to zero for each strategy via binary search
    currentMetrics.maxAnnualWithdrawalToZero = solveMaxWithdrawalToZero(accounts, ssData, taxSettings);
    baselineMetrics.maxAnnualWithdrawalToZero = solveMaxWithdrawalToZero(accounts, ssData, taxSettings, 'none');
    optimizedMetrics.maxAnnualWithdrawalToZero = solveMaxWithdrawalToZero(accounts, ssData, taxSettings, 'fill_22');
    
    // Tax savings = baseline taxes - optimized taxes
    const taxSavings = baselineMetrics.lifetimeTotalTax - optimizedMetrics.lifetimeTotalTax;
    
    // Survivor tax savings = baseline survivor taxes - smoothed survivor taxes
    const survivorTaxSavings = survivorSmoothedMetrics
      ? baselineMetrics.survivorYearsTaxes - survivorSmoothedMetrics.survivorYearsTaxes
      : 0;
    
    return {
      currentProjections,
      baselineProjections,
      optimizedProjections,
      survivorSmoothedProjections,
      currentMetrics,
      baselineMetrics,
      optimizedMetrics,
      survivorSmoothedMetrics,
      taxSavings,
      survivorTaxSavings,
    };
  }, [accounts, ssData, taxSettings]);
}

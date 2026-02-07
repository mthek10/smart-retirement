// Tax calculation utilities for retirement planning
import { stateTaxData } from './stateTaxData';
export type { StateTaxBracket, StateTaxData } from './stateTaxData';
// Re-export for consumers that import from taxCalculations
export { stateTaxData };

export interface TaxBracket {
  min: number;
  max: number;
  rate: number;
}

export const federalTaxBrackets2024: Record<string, TaxBracket[]> = {
  single: [
    { min: 0, max: 11600, rate: 0.10 },
    { min: 11600, max: 47150, rate: 0.12 },
    { min: 47150, max: 100525, rate: 0.22 },
    { min: 100525, max: 191950, rate: 0.24 },
    { min: 191950, max: 243725, rate: 0.32 },
    { min: 243725, max: 609350, rate: 0.35 },
    { min: 609350, max: Infinity, rate: 0.37 },
  ],
  married: [
    { min: 0, max: 23200, rate: 0.10 },
    { min: 23200, max: 94300, rate: 0.12 },
    { min: 94300, max: 201050, rate: 0.22 },
    { min: 201050, max: 383900, rate: 0.24 },
    { min: 383900, max: 487450, rate: 0.32 },
    { min: 487450, max: 731200, rate: 0.35 },
    { min: 731200, max: Infinity, rate: 0.37 },
  ],
  hoh: [
    { min: 0, max: 16550, rate: 0.10 },
    { min: 16550, max: 63100, rate: 0.12 },
    { min: 63100, max: 100500, rate: 0.22 },
    { min: 100500, max: 191950, rate: 0.24 },
    { min: 191950, max: 243700, rate: 0.32 },
    { min: 243700, max: 609350, rate: 0.35 },
    { min: 609350, max: Infinity, rate: 0.37 },
  ],
};

// Helper function to get Roth conversion target income based on strategy
export function getRothConversionLimit(
  strategy: string,
  filingStatus: string,
  yearIndex: number = 0,
  inflationRate: number = 0,
  customAmount?: number
): number {
  if (strategy === 'none') return 0;
  if (strategy === 'custom' && customAmount) return customAmount;

  const inflationMultiplier = Math.pow(1 + inflationRate / 100, yearIndex);
  const brackets = federalTaxBrackets2024[filingStatus] || federalTaxBrackets2024.single;
  const standardDeduction = standardDeductions2024[filingStatus] || standardDeductions2024.single;

  // Map strategy to bracket limit (subtract $1 to stay safely inside the bracket)
  // These are TAXABLE income thresholds
  const strategyMap: Record<string, number> = {
    'fill_10': brackets[0].max - 1, // Top of 10% bracket
    'fill_12': brackets[1].max - 1, // Top of 12% bracket
    'fill_22': brackets[2].max - 1, // Top of 22% bracket
    'fill_24': brackets[3].max - 1, // Top of 24% bracket
  };

  const taxableIncomeLimit = strategyMap[strategy] || 0;
  
  // Convert to GROSS income limit by adding standard deduction
  // This allows comparison against gross ordinary income in the projection logic
  const grossIncomeLimit = taxableIncomeLimit + standardDeduction;
  
  return grossIncomeLimit * inflationMultiplier;
}

export const standardDeductions2024: Record<string, number> = {
  single: 14600,
  married: 29200,
  hoh: 21900,
};

export const irmaaBrackets2024 = [
  { min: 0, max: 103000, premium: 0 },
  { min: 103000, max: 129000, premium: 69.90 },
  { min: 129000, max: 161000, premium: 174.70 },
  { min: 161000, max: 193000, premium: 279.50 },
  { min: 193000, max: 500000, premium: 384.30 },
  { min: 500000, max: Infinity, premium: 419.30 },
];

// Medicare Part B and D base premiums (2024)
export const medicarePartBPremium2024 = 174.70; // Monthly premium
export const medicarePartDPremium2024 = 50; // Average monthly premium

// Federal Poverty Level 2024 (48 contiguous states)
export const federalPovertyLevel2024: Record<number, number> = {
  1: 15060,
  2: 20440,
  3: 25820,
  4: 31200,
  5: 36580,
  6: 41960,
  7: 47340,
  8: 52720,
};

// Enhanced ACA contribution percentages (through 2025)
// Income as % of FPL → Expected contribution as % of income
export const acaContributionRates2024 = [
  { minFPL: 0, maxFPL: 150, rate: 0 },      // 0% of income
  { minFPL: 150, maxFPL: 200, rate: 0.02 },  // 2% of income  
  { minFPL: 200, maxFPL: 250, rate: 0.04 },  // 4% of income
  { minFPL: 250, maxFPL: 300, rate: 0.06 },  // 6% of income
  { minFPL: 300, maxFPL: 400, rate: 0.085 }, // 8.5% of income
  { minFPL: 400, maxFPL: Infinity, rate: 0.085 }, // Enhanced: 8.5% cap continues above 400%
];

// Average benchmark silver plan premiums by age (monthly, 2024 national average)
export const silverPlanPremiumsByAge2024: Record<number, number> = {
  21: 350, 25: 370, 30: 390, 35: 410, 40: 440, 45: 520, 
  50: 615, 55: 720, 60: 870, 64: 1010
};

export const capitalGainsBrackets2024: Record<string, TaxBracket[]> = {
  single: [
    { min: 0, max: 47025, rate: 0 },
    { min: 47025, max: 518900, rate: 0.15 },
    { min: 518900, max: Infinity, rate: 0.20 },
  ],
  married: [
    { min: 0, max: 94050, rate: 0 },
    { min: 94050, max: 583750, rate: 0.15 },
    { min: 583750, max: Infinity, rate: 0.20 },
  ],
  hoh: [
    { min: 0, max: 63000, rate: 0 },
    { min: 63000, max: 551350, rate: 0.15 },
    { min: 551350, max: Infinity, rate: 0.20 },
  ],
};

// Calculate capital gains harvesting opportunity (room in 0% LTCG bracket)
export function calculateCapitalGainsHarvestingRoom(
  taxableIncome: number,
  filingStatus: string,
  yearIndex: number = 0,
  inflationRate: number = 0
): { zeroRateBracketTop: number; roomInZeroBracket: number; harvestingAvailable: boolean } {
  const brackets = capitalGainsBrackets2024[filingStatus] || capitalGainsBrackets2024.single;
  const inflationMultiplier = Math.pow(1 + inflationRate, yearIndex);
  
  // The 0% LTCG bracket top (first bracket max)
  const zeroRateBracketTop = brackets[0].max * inflationMultiplier;
  
  // Room remaining in 0% bracket = bracket top - taxable income (but not less than 0)
  const roomInZeroBracket = Math.max(0, zeroRateBracketTop - taxableIncome);
  
  return {
    zeroRateBracketTop,
    roomInZeroBracket,
    harvestingAvailable: roomInZeroBracket > 1000, // Consider meaningful if > $1000
  };
}

// Net Investment Income Tax (NIIT) thresholds for 2024
export const niitThresholds2024: Record<string, number> = {
  single: 200000,
  married: 250000,
  hoh: 200000,
  separate: 125000,
};

// Alternative Minimum Tax (AMT) brackets for 2024
export const amtBrackets2024: TaxBracket[] = [
  { min: 0, max: 220700, rate: 0.26 },
  { min: 220700, max: Infinity, rate: 0.28 },
];

// AMT exemption amounts and phase-out thresholds for 2024
export const amtExemptions2024: Record<string, { exemption: number; phaseoutStart: number }> = {
  single: { exemption: 85700, phaseoutStart: 609350 },
  married: { exemption: 133300, phaseoutStart: 1218700 },
  hoh: { exemption: 85700, phaseoutStart: 609350 },
  separate: { exemption: 66650, phaseoutStart: 609350 },
};

// Social Security and Medicare tax rates
export const socialSecurityWageBase2024 = 168600;
export const socialSecurityRate = 0.062;
export const medicareRate = 0.0145;
export const additionalMedicareRate = 0.009;
export const additionalMedicareThreshold: Record<string, number> = {
  single: 200000,
  married: 250000,
  hoh: 200000,
  separate: 125000,
};

// Survivor Social Security benefit calculation
export function calculateSurvivorSSBenefit(
  deceasedBenefit: number,
  survivorOwnBenefit: number,
  survivorAge: number,
  survivorFRA: number
): number {
  // Survivor gets the HIGHER of their own benefit or deceased's benefit
  // If claiming before FRA, survivor benefits may be reduced
  
  // Full survivor benefit at FRA or later
  if (survivorAge >= survivorFRA) {
    return Math.max(survivorOwnBenefit, deceasedBenefit);
  }
  
  // Reduced survivor benefit if claiming early (60-FRA)
  // Reduction is approximately 0.396% per month before FRA (max reduction ~28.5%)
  const monthsEarly = Math.max(0, (survivorFRA - survivorAge) * 12);
  const reductionFactor = Math.max(0.715, 1 - (monthsEarly * 0.00396));
  const reducedSurvivorBenefit = deceasedBenefit * reductionFactor;
  
  return Math.max(survivorOwnBenefit, reducedSurvivorBenefit);
}

// 401(k) contribution limits
export const contribution401kLimit2024 = 23000;
export const contribution401kCatchup2024 = 7500; // Age 50+

// State tax data is imported from ./stateTaxData

// State tax data re-exported from ./stateTaxData

export function calculateFederalTax(
  income: number,
  filingStatus: string,
  yearIndex: number = 0,
  inflationRate: number = 0
): number {
  const brackets = federalTaxBrackets2024[filingStatus] || federalTaxBrackets2024.single;
  const baseDeduction = standardDeductions2024[filingStatus] || standardDeductions2024.single;
  
  // Apply inflation to standard deduction and bracket thresholds
  const inflationMultiplier = Math.pow(1 + inflationRate / 100, yearIndex);
  const standardDeduction = baseDeduction * inflationMultiplier;
  
  const taxableIncome = Math.max(0, income - standardDeduction);
  let tax = 0;

  for (const bracket of brackets) {
    const inflatedMin = bracket.min * inflationMultiplier;
    const inflatedMax = bracket.max * inflationMultiplier;
    
    if (taxableIncome > inflatedMin) {
      const taxableInBracket = Math.min(
        taxableIncome - inflatedMin,
        inflatedMax - inflatedMin
      );
      tax += taxableInBracket * bracket.rate;
    }
  }

  return tax;
}

export function calculateIRMAA(
  magi: number,
  yearIndex: number = 0,
  inflationRate: number = 0
): number {
  const inflationMultiplier = Math.pow(1 + inflationRate / 100, yearIndex);
  
  const bracket = irmaaBrackets2024.find(
    (b) => magi >= b.min * inflationMultiplier && magi < b.max * inflationMultiplier
  );
  return bracket ? bracket.premium * 12 * inflationMultiplier : 0;
}

// Calculate Medicare Part B and D base premiums (applies per person age 65+)
export function calculateMedicarePremiums(
  yearIndex: number = 0,
  inflationRate: number = 0
): number {
  const inflationMultiplier = Math.pow(1 + inflationRate, yearIndex);
  const annualPartB = medicarePartBPremium2024 * 12 * inflationMultiplier;
  const annualPartD = medicarePartDPremium2024 * 12 * inflationMultiplier;
  return annualPartB + annualPartD;
}

// Helper function to interpolate premium for ages not in the table
function interpolatePremium(age: number): number {
  const ages = Object.keys(silverPlanPremiumsByAge2024).map(Number).sort((a, b) => a - b);
  
  if (age <= ages[0]) return silverPlanPremiumsByAge2024[ages[0]];
  if (age >= ages[ages.length - 1]) return silverPlanPremiumsByAge2024[ages[ages.length - 1]];
  
  // Find surrounding ages
  let lowerAge = ages[0];
  let upperAge = ages[ages.length - 1];
  
  for (let i = 0; i < ages.length - 1; i++) {
    if (age >= ages[i] && age <= ages[i + 1]) {
      lowerAge = ages[i];
      upperAge = ages[i + 1];
      break;
    }
  }
  
  // Linear interpolation
  const lowerPremium = silverPlanPremiumsByAge2024[lowerAge];
  const upperPremium = silverPlanPremiumsByAge2024[upperAge];
  const ratio = (age - lowerAge) / (upperAge - lowerAge);
  
  return lowerPremium + (upperPremium - lowerPremium) * ratio;
}

export function calculateACASubsidy(
  magi: number,
  householdSize: number,
  enrolleeAges: number[],
  yearIndex: number = 0,
  inflationRate: number = 0
): { subsidy: number; premium: number; netPremium: number } {
  // No subsidy if no one is enrolled
  if (enrolleeAges.length === 0) {
    return { subsidy: 0, premium: 0, netPremium: 0 };
  }

  const inflationMultiplier = Math.pow(1 + inflationRate, yearIndex);
  
  // Calculate FPL threshold
  const fpl = (federalPovertyLevel2024[householdSize] || federalPovertyLevel2024[8]) * inflationMultiplier;
  const fplPercent = (magi / fpl) * 100;
  
  // Calculate benchmark premium for all enrollees
  let totalBenchmarkPremium = 0;
  for (const age of enrolleeAges) {
    if (age < 65) {
      const monthlyPremium = interpolatePremium(age) * inflationMultiplier;
      totalBenchmarkPremium += monthlyPremium * 12;
    }
  }
  
  // Find expected contribution rate
  const bracket = acaContributionRates2024.find(
    b => fplPercent >= b.minFPL && fplPercent < b.maxFPL
  );
  const contributionRate = bracket?.rate || 0.085;
  
  // Calculate expected contribution (capped at benchmark premium)
  const expectedContribution = Math.min(magi * contributionRate, totalBenchmarkPremium);
  
  // Subsidy = Benchmark Premium - Expected Contribution
  const subsidy = Math.max(0, totalBenchmarkPremium - expectedContribution);
  
  return {
    subsidy,
    premium: totalBenchmarkPremium,
    netPremium: totalBenchmarkPremium - subsidy
  };
}

// Calculate Full Retirement Age based on birth year
export function calculateFullRetirementAge(currentAge: number): number {
  const currentYear = new Date().getFullYear();
  const birthYear = currentYear - currentAge;
  
  // SSA Full Retirement Age rules
  if (birthYear <= 1954) return 66;
  if (birthYear >= 1960) return 67;
  
  // For birth years 1955-1959, FRA increases by 2 months per year
  const monthsToAdd = (birthYear - 1954) * 2;
  return 66 + monthsToAdd / 12;
}

export function calculateSocialSecurityBenefit(
  baseAmount: number,
  claimAge: number,
  fullRetirementAge: number = 67
): number {
  if (claimAge < 62 || claimAge > 70) return 0;

  let adjustment = 1;
  
  if (claimAge < fullRetirementAge) {
    // Early claiming reduction: ~6.67% per year (before FRA)
    const monthsEarly = (fullRetirementAge - claimAge) * 12;
    adjustment = 1 - (monthsEarly * 0.00556);
  } else if (claimAge > fullRetirementAge) {
    // Delayed retirement credits: 8% per year
    const yearsDelayed = claimAge - fullRetirementAge;
    adjustment = 1 + (yearsDelayed * 0.08);
  }

  return baseAmount * adjustment;
}

export function calculateTaxableSocialSecurity(
  ssIncome: number,
  otherIncome: number,
  filingStatus: string
): number {
  // Married Filing Separately: Up to 85% taxable at any income level
  if (filingStatus === 'separate') {
    return ssIncome * 0.85;
  }

  const provisionalIncome = ssIncome * 0.5 + otherIncome;
  
  // Set thresholds based on filing status
  const thresholds = filingStatus === 'married' 
    ? { first: 32000, second: 44000 }  // Married Filing Jointly
    : { first: 25000, second: 34000 };  // Single

  let taxableAmount = 0;

  if (provisionalIncome > thresholds.second) {
    // Over $34,000 (Single) or $44,000 (Married): Up to 85% taxable
    taxableAmount = Math.min(
      ssIncome * 0.85,
      0.85 * (provisionalIncome - thresholds.second) + 0.5 * (thresholds.second - thresholds.first)
    );
  } else if (provisionalIncome > thresholds.first) {
    // $25,000-$34,000 (Single) or $32,000-$44,000 (Married): Up to 50% taxable
    taxableAmount = Math.min(
      ssIncome * 0.5,
      0.5 * (provisionalIncome - thresholds.first)
    );
  }
  // Below thresholds: No tax (taxableAmount remains 0)

  return taxableAmount;
}

// Calculate state income tax on ordinary income
export function calculateStateIncomeTax(
  income: number,
  state: string,
  filingStatus: string = 'married'
): number {
  if (state === 'none' || state === 'other' || !state) return 0;
  
  const stateData = stateTaxData[state];
  if (!stateData || !stateData.hasIncomeTax) return 0;
  
  if (stateData.taxType === 'flat' && stateData.flatRate) {
    return income * stateData.flatRate;
  }
  
  if (stateData.taxType === 'progressive' && stateData.brackets) {
    let tax = 0;
    
    for (const bracket of stateData.brackets) {
      if (income > bracket.min) {
        const taxableInBracket = Math.min(income, bracket.max) - bracket.min;
        tax += taxableInBracket * bracket.rate;
      }
      if (income <= bracket.max) break;
    }
    
    return tax;
  }
  
  return 0;
}

// Calculate state capital gains tax
export function calculateStateCapitalGainsTax(
  capitalGains: number,
  ordinaryIncome: number,
  state: string,
  filingStatus: string = 'married'
): number {
  if (state === 'none' || state === 'other' || !state) return 0;
  
  const stateData = stateTaxData[state];
  if (!stateData || !stateData.hasIncomeTax) return 0;
  
  // Most states tax capital gains as ordinary income
  if (stateData.capitalGainsAsOrdinary) {
    // Calculate tax on total income, then subtract tax on ordinary income alone
    const totalIncome = ordinaryIncome + capitalGains;
    const taxOnTotal = calculateStateIncomeTax(totalIncome, state, filingStatus);
    const taxOnOrdinary = calculateStateIncomeTax(ordinaryIncome, state, filingStatus);
    return taxOnTotal - taxOnOrdinary;
  }
  
  return 0;
}

export function calculateStateSocialSecurityTax(
  ssIncome: number,
  agi: number,
  filingStatus: string,
  state: string,
  age: number = 65
): number {
  // States with no income tax don't tax Social Security
  const noIncomeTaxStates = ['AK', 'FL', 'NV', 'NH', 'SD', 'TN', 'TX', 'WA', 'WY'];
  if (state === 'none' || state === 'other' || noIncomeTaxStates.includes(state)) return 0;

  // Colorado: Full exemption for 65+, partial for 55-64
  if (state === 'CO') {
    if (age >= 65) return 0; // Full exemption
    
    const limit = filingStatus === 'married' ? 95000 : 75000;
    if (agi <= limit) return 0;
    
    // Deduct $20,000 if over threshold
    const taxableSS = Math.max(0, ssIncome - 20000);
    return taxableSS * 0.044; // 4.4% flat rate
  }

  // Connecticut: Exempt below thresholds, max 25% taxable above
  if (state === 'CT') {
    const threshold = (filingStatus === 'married' || filingStatus === 'hoh') ? 100000 : 75000;
    if (agi < threshold) return 0;
    
    const taxableSS = Math.min(ssIncome * 0.25, ssIncome);
    return taxableSS * 0.05; // Approximate 5% rate
  }

  // Minnesota: Complex subtraction method
  if (state === 'MN') {
    let threshold: number;
    if (filingStatus === 'married') threshold = 105380;
    else if (filingStatus === 'separate') threshold = 52690;
    else threshold = 82190; // Single and HOH
    
    if (agi <= threshold) return 0;
    
    // 10% reduction for each $4,000 over threshold
    const over = agi - threshold;
    const reductionSteps = filingStatus === 'separate' ? over / 2000 : over / 4000;
    const reductionPercent = Math.min(1, reductionSteps * 0.10);
    
    const taxableSS = ssIncome * reductionPercent;
    return taxableSS * 0.0585; // Approximate 5.85% rate
  }

  // Montana: $5,500 deduction for 65+
  if (state === 'MT') {
    if (age < 65) return ssIncome * 0.059;
    
    const taxableSS = Math.max(0, ssIncome - 5500);
    return taxableSS * 0.059; // 5.9% rate
  }

  // New Mexico: High exemption thresholds
  if (state === 'NM') {
    const threshold = filingStatus === 'married' ? 150000 : 100000;
    if (agi <= threshold) return 0;
    
    return ssIncome * 0.049; // 4.9% rate
  }

  // Rhode Island: High exemption thresholds at full retirement age
  if (state === 'RI') {
    const threshold = filingStatus === 'married' ? 130250 : 104200;
    if (agi < threshold) return 0;
    
    return ssIncome * 0.0475; // 4.75% rate
  }

  // Utah: Credit system (simplified)
  if (state === 'UT') {
    const tax = ssIncome * 0.045; // 4.5% flat rate
    // Simplified: $450 credit reduces the tax
    return Math.max(0, tax - 450);
  }

  // Vermont: Partial exemption based on income
  if (state === 'VT') {
    const fullThreshold = filingStatus === 'married' ? 65000 : 50000;
    const partialThreshold = filingStatus === 'married' ? 74999 : 59999;
    
    if (agi <= fullThreshold) return 0;
    if (agi <= partialThreshold) {
      // Partial exemption (simplified: 50% taxable)
      return ssIncome * 0.5 * 0.0535; // 5.35% rate
    }
    
    return ssIncome * 0.0535;
  }

  // West Virginia: 65% subtraction in 2025
  if (state === 'WV') {
    const taxableSS = ssIncome * 0.35; // 65% subtracted
    return taxableSS * 0.05; // Approximate 5% rate
  }

  return 0;
}

export function calculateCapitalGainsTax(
  capitalGains: number,
  ordinaryIncome: number,
  filingStatus: string,
  yearIndex: number = 0,
  inflationRate: number = 0
): number {
  const brackets = capitalGainsBrackets2024[filingStatus] || capitalGainsBrackets2024.single;
  const baseDeduction = standardDeductions2024[filingStatus] || standardDeductions2024.single;
  
  // Apply inflation adjustments
  const inflationMultiplier = Math.pow(1 + inflationRate / 100, yearIndex);
  const standardDeduction = baseDeduction * inflationMultiplier;
  
  // Capital gains are taxed based on total taxable income (ordinary + capital gains)
  const taxableOrdinaryIncome = Math.max(0, ordinaryIncome - standardDeduction);
  const totalIncome = taxableOrdinaryIncome + capitalGains;
  
  let tax = 0;

  for (const bracket of brackets) {
    const inflatedMin = bracket.min * inflationMultiplier;
    const inflatedMax = bracket.max * inflationMultiplier;
    
    if (totalIncome > inflatedMin) {
      // Only tax the capital gains portion that falls in this bracket
      const incomeInBracket = Math.min(totalIncome, inflatedMax) - inflatedMin;
      const ordinaryInBracket = Math.max(0, Math.min(taxableOrdinaryIncome, inflatedMax) - inflatedMin);
      const capitalGainsInBracket = Math.max(0, incomeInBracket - ordinaryInBracket);
      
      tax += capitalGainsInBracket * bracket.rate;
    }
  }

  return tax;
}

// IRS Uniform Lifetime Table (2024) - Complete table from age 72 to 120+
export const uniformLifetimeTable: Record<number, number> = {
  72: 27.4, 73: 26.5, 74: 25.5, 75: 24.6, 76: 23.7, 77: 22.9,
  78: 22.0, 79: 21.1, 80: 20.2, 81: 19.4, 82: 18.5, 83: 17.7,
  84: 16.8, 85: 16.0, 86: 15.2, 87: 14.4, 88: 13.7, 89: 12.9,
  90: 12.2, 91: 11.5, 92: 10.8, 93: 10.1, 94: 9.5, 95: 8.9,
  96: 8.4, 97: 7.8, 98: 7.3, 99: 6.8, 100: 6.4, 101: 6.0,
  102: 5.6, 103: 5.2, 104: 4.9, 105: 4.6, 106: 4.3, 107: 4.1,
  108: 3.9, 109: 3.7, 110: 3.5, 111: 3.4, 112: 3.3, 113: 3.1,
  114: 3.0, 115: 2.9, 116: 2.8, 117: 2.7, 118: 2.5, 119: 2.3,
  120: 2.0,
};

export function calculateRMD(balance: number, age: number): number {
  // RMD starts at age 73 for those born after 1950 (SECURE 2.0 Act)
  if (age < 73 || balance <= 0) return 0;
  
  // Get the distribution period from Uniform Lifetime Table
  // For ages beyond 120, use the minimum factor
  const factor = uniformLifetimeTable[age] || uniformLifetimeTable[120] || 2.0;
  
  return balance / factor;
}

// Calculate combined RMD for both spouses (each spouse's traditional accounts have separate RMDs)
export function calculateCombinedRMD(
  spouse1TradBalance: number,
  spouse2TradBalance: number,
  spouse1Age: number,
  spouse2Age: number
): { spouse1RMD: number; spouse2RMD: number; totalRMD: number } {
  const spouse1RMD = calculateRMD(spouse1TradBalance, spouse1Age);
  const spouse2RMD = calculateRMD(spouse2TradBalance, spouse2Age);
  
  return {
    spouse1RMD,
    spouse2RMD,
    totalRMD: spouse1RMD + spouse2RMD,
  };
}

export function calculateNIIT(
  netInvestmentIncome: number,
  magi: number,
  filingStatus: string,
  yearIndex: number = 0,
  inflationRate: number = 0
): number {
  // 3.8% Net Investment Income Tax (NIIT) applies to the lesser of:
  // 1. Net investment income, or
  // 2. MAGI exceeding the threshold
  
  const baseThreshold = niitThresholds2024[filingStatus] || niitThresholds2024.single;
  const inflationMultiplier = Math.pow(1 + inflationRate / 100, yearIndex);
  const threshold = baseThreshold * inflationMultiplier;
  
  if (magi <= threshold) {
    return 0;
  }
  
  const excessMAGI = magi - threshold;
  const taxableAmount = Math.min(netInvestmentIncome, excessMAGI);
  
  return taxableAmount * 0.038; // 3.8% NIIT rate
}

export function getMarginalTaxBracket(
  income: number,
  filingStatus: string,
  yearIndex: number = 0,
  inflationRate: number = 0
): number {
  const brackets = federalTaxBrackets2024[filingStatus] || federalTaxBrackets2024.single;
  const baseDeduction = standardDeductions2024[filingStatus] || standardDeductions2024.single;
  
  // Apply inflation to standard deduction and bracket thresholds
  const inflationMultiplier = Math.pow(1 + inflationRate / 100, yearIndex);
  const standardDeduction = baseDeduction * inflationMultiplier;
  
  const taxableIncome = Math.max(0, income - standardDeduction);
  
  // Find the bracket that the taxable income falls into
  for (let i = brackets.length - 1; i >= 0; i--) {
    const inflatedMin = brackets[i].min * inflationMultiplier;
    if (taxableIncome >= inflatedMin) {
      return brackets[i].rate;
    }
  }
  
  return 0;
}

export function getBracketLimit(
  bracketStrategy: string,
  filingStatus: string,
  yearIndex: number = 0,
  inflationRate: number = 0
): number {
  const brackets = federalTaxBrackets2024[filingStatus] || federalTaxBrackets2024.single;
  const inflationMultiplier = Math.pow(1 + inflationRate / 100, yearIndex);
  
  // Map strategy to bracket rate
  const bracketRateMap: Record<string, number> = {
    '10%': 0.10,
    '12%': 0.12,
    '22%': 0.22,
    '24%': 0.24,
    '32%': 0.32,
  };
  
  const targetRate = bracketRateMap[bracketStrategy];
  if (!targetRate) return 0;
  
  // Find the max value for this bracket
  const bracket = brackets.find(b => b.rate === targetRate);
  if (!bracket) return 0;
  
  // Return the top of the bracket, adjusted for inflation
  return bracket.max * inflationMultiplier;
}

export interface BracketAnalysis {
  score: number;
  avgBracket: number;
  yearsInTarget: number;
  targetBracket: number;
  bracketDistribution: Record<string, number>;
  yearlyBrackets: Array<{ year: number; age: number; bracket: number; income: number; bracketRoom: number }>;
  wastedBracketRoom: number;
  potentialSavings: number;
  recommendation: string;
}

export function calculateBracketConsistency(
  projections: any[],
  filingStatus: string = 'married',
  inflationRate: number = 0.03
): BracketAnalysis {
  if (projections.length === 0) {
    return { 
      score: 0, 
      avgBracket: 0, 
      yearsInTarget: 0, 
      targetBracket: 0,
      bracketDistribution: {},
      yearlyBrackets: [],
      wastedBracketRoom: 0,
      potentialSavings: 0,
      recommendation: '',
    };
  }
  
  // Calculate average bracket (weighted by income)
  const totalIncome = projections.reduce((sum, p) => sum + (p.totalIncome || 0), 0);
  const weightedBracket = projections.reduce((sum, p) => {
    const weight = totalIncome > 0 ? (p.totalIncome || 0) / totalIncome : 1 / projections.length;
    return sum + (p.marginalBracket * weight);
  }, 0);
  
  // Calculate standard deviation
  const variance = projections.reduce((sum, p) => {
    const diff = p.marginalBracket - weightedBracket;
    return sum + (diff * diff);
  }, 0) / projections.length;
  
  const stdDev = Math.sqrt(variance);
  
  // Calculate score (0-10 scale, lower is better)
  const score = Math.min(10, stdDev * 100);
  
  // Count years within ±2% of target
  const targetBracket = weightedBracket;
  const yearsInTarget = projections.filter(p => 
    Math.abs(p.marginalBracket - targetBracket) <= 0.02
  ).length;
  
  // Calculate bracket distribution
  const bracketDistribution: Record<string, number> = {};
  projections.forEach(p => {
    const bracketKey = `${(p.marginalBracket * 100).toFixed(0)}%`;
    bracketDistribution[bracketKey] = (bracketDistribution[bracketKey] || 0) + 1;
  });
  
  // Calculate yearly bracket data with room for optimization
  const yearlyBrackets = projections.map((p, index) => {
    // Find the next bracket up and calculate room
    const currentBracket = p.marginalBracket;
    const brackets = federalTaxBrackets2024[filingStatus] || federalTaxBrackets2024.single;
    const baseDeduction = standardDeductions2024[filingStatus] || standardDeductions2024.single;
    const inflationMultiplier = Math.pow(1 + inflationRate, index);
    const standardDeduction = baseDeduction * inflationMultiplier;
    
    // Find current bracket's upper limit
    const currentBracketData = brackets.find(b => b.rate === currentBracket);
    const bracketLimit = currentBracketData ? currentBracketData.max * inflationMultiplier + standardDeduction : 0;
    const bracketRoom = Math.max(0, bracketLimit - (p.totalIncome || 0));
    
    return {
      year: p.year,
      age: p.age,
      bracket: currentBracket,
      income: p.totalIncome || 0,
      bracketRoom,
    };
  });
  
  // Calculate wasted bracket room (years where bracket is below target)
  // Target is 22% bracket as a reasonable optimization target
  const targetOptimalBracket = 0.22;
  let wastedBracketRoom = 0;
  
  yearlyBrackets.forEach((yb, index) => {
    if (yb.bracket < targetOptimalBracket && yb.bracketRoom > 0) {
      // This year has unused lower bracket space
      const brackets = federalTaxBrackets2024[filingStatus] || federalTaxBrackets2024.single;
      const baseDeduction = standardDeductions2024[filingStatus] || standardDeductions2024.single;
      const inflationMultiplier = Math.pow(1 + inflationRate, index);
      
      // Find the 22% bracket limit
      const targetBracketData = brackets.find(b => b.rate === targetOptimalBracket);
      if (targetBracketData) {
        const targetLimit = targetBracketData.max * inflationMultiplier + baseDeduction * inflationMultiplier;
        const roomToTarget = Math.max(0, targetLimit - yb.income);
        wastedBracketRoom += roomToTarget;
      }
    }
  });
  
  // Estimate potential savings (rough calculation)
  // If you could fill lower brackets instead of paying at higher rates later
  const highBracketYears = yearlyBrackets.filter(yb => yb.bracket > targetOptimalBracket);
  const lowBracketYears = yearlyBrackets.filter(yb => yb.bracket < targetOptimalBracket);
  
  let potentialSavings = 0;
  if (highBracketYears.length > 0 && lowBracketYears.length > 0) {
    // Approximate savings: difference between high and low bracket rates * wasted room
    const avgHighRate = highBracketYears.reduce((s, y) => s + y.bracket, 0) / highBracketYears.length;
    const avgLowRate = lowBracketYears.reduce((s, y) => s + y.bracket, 0) / lowBracketYears.length;
    const rateDifference = avgHighRate - avgLowRate;
    potentialSavings = Math.min(wastedBracketRoom * rateDifference, wastedBracketRoom * 0.12); // Cap at 12% savings
  }
  
  // Generate recommendation
  let recommendation = '';
  if (score < 2) {
    recommendation = 'Excellent bracket consistency. Your tax strategy is well-optimized.';
  } else if (score < 4) {
    recommendation = 'Good consistency. Minor optimizations possible with Roth conversions.';
  } else if (score < 6) {
    recommendation = 'Moderate inconsistency. Consider filling lower brackets with Roth conversions to save on lifetime taxes.';
  } else if (score < 8) {
    recommendation = 'Significant inconsistency. You have substantial unused low-bracket years. Aggressive Roth conversions could save significant taxes.';
  } else {
    recommendation = 'High inconsistency. You are likely paying more taxes than necessary. Consider enabling bracket-filling Roth conversion strategy.';
  }
  
  return {
    score,
    avgBracket: weightedBracket,
    yearsInTarget,
    targetBracket,
    bracketDistribution,
    yearlyBrackets,
    wastedBracketRoom,
    potentialSavings,
    recommendation,
  };
}

/**
 * Calculate Alternative Minimum Taxable Income (AMTI)
 * AMTI = Regular taxable income + AMT adjustments and preferences
 */
export function calculateAMTI(
  income: number,
  capitalGains: number,
  filingStatus: string,
  yearIndex: number = 0,
  inflationRate: number = 0
): number {
  const baseDeduction = standardDeductions2024[filingStatus] || standardDeductions2024.single;
  const inflationMultiplier = Math.pow(1 + inflationRate / 100, yearIndex);
  const standardDeduction = baseDeduction * inflationMultiplier;
  
  // Start with regular taxable income
  const regularTaxableIncome = Math.max(0, income - standardDeduction);
  
  // AMT Adjustments and Preferences:
  // 1. Add back state and local taxes (not applicable in this model)
  // 2. Add back miscellaneous deductions (not applicable in this model)
  // 3. Standard deduction is added back for AMT
  // 4. Personal exemptions are added back (not applicable post-TCJA)
  
  // For retirement planning, key adjustments are:
  // - State/local tax deduction added back (we don't model itemized deductions)
  // - Standard deduction added back
  const amti = regularTaxableIncome + standardDeduction;
  
  return amti;
}

/**
 * Calculate Alternative Minimum Tax (AMT)
 * Returns the AMT liability or 0 if regular tax is higher
 */
export function calculateAMT(
  income: number,
  capitalGains: number,
  filingStatus: string,
  yearIndex: number = 0,
  inflationRate: number = 0
): number {
  const inflationMultiplier = Math.pow(1 + inflationRate / 100, yearIndex);
  
  // Calculate AMTI
  const amti = calculateAMTI(income, capitalGains, filingStatus, yearIndex, inflationRate);
  
  // Get exemption and phase-out threshold
  const exemptionData = amtExemptions2024[filingStatus] || amtExemptions2024.single;
  const exemption = exemptionData.exemption * inflationMultiplier;
  const phaseoutStart = exemptionData.phaseoutStart * inflationMultiplier;
  
  // Calculate AMT exemption with phase-out
  // Phase-out rate is 25 cents per dollar over threshold
  let applicableExemption = exemption;
  if (amti > phaseoutStart) {
    const phaseoutAmount = (amti - phaseoutStart) * 0.25;
    applicableExemption = Math.max(0, exemption - phaseoutAmount);
  }
  
  // Calculate AMT taxable income
  const amtTaxableIncome = Math.max(0, amti - applicableExemption);
  
  // Calculate tentative minimum tax using AMT brackets
  let tentativeMinimumTax = 0;
  for (const bracket of amtBrackets2024) {
    const inflatedMin = bracket.min * inflationMultiplier;
    const inflatedMax = bracket.max * inflationMultiplier;
    
    if (amtTaxableIncome > inflatedMin) {
      const taxableInBracket = Math.min(
        amtTaxableIncome - inflatedMin,
        inflatedMax - inflatedMin
      );
      tentativeMinimumTax += taxableInBracket * bracket.rate;
    }
  }
  
  // Calculate regular tax for comparison
  const regularTax = calculateFederalTax(income, filingStatus, yearIndex, inflationRate);
  
  // AMT is the excess of tentative minimum tax over regular tax
  const amtLiability = Math.max(0, tentativeMinimumTax - regularTax);
  
  return amtLiability;
}

// Calculate Social Security (FICA) tax on wages
export function calculateFICATax(
  wages: number,
  yearIndex: number = 0,
  inflationRate: number = 0.03
): number {
  const inflationFactor = Math.pow(1 + inflationRate, yearIndex);
  const wageBase = socialSecurityWageBase2024 * inflationFactor;
  
  const taxableWages = Math.min(wages, wageBase);
  return taxableWages * socialSecurityRate;
}

// Calculate Medicare tax on wages (includes Additional Medicare Tax)
export function calculateMedicareTax(
  wages: number,
  filingStatus: string,
  yearIndex: number = 0,
  inflationRate: number = 0.03
): number {
  const inflationFactor = Math.pow(1 + inflationRate, yearIndex);
  const additionalThreshold = (additionalMedicareThreshold[filingStatus] || additionalMedicareThreshold.single) * inflationFactor;
  
  // Base Medicare tax on all wages
  let medicareTax = wages * medicareRate;
  
  // Additional Medicare Tax on wages over threshold
  if (wages > additionalThreshold) {
    medicareTax += (wages - additionalThreshold) * additionalMedicareRate;
  }
  
  return medicareTax;
}

// Calculate 401(k) contribution with limits (dollar amount inflated with wages)
export function calculate401kContribution(
  contributionAmount: number,
  age: number,
  yearIndex: number = 0,
  inflationRate: number = 0.03
): number {
  if (contributionAmount <= 0) return 0;
  
  const inflationFactor = Math.pow(1 + inflationRate, yearIndex);
  const baseLimit = contribution401kLimit2024 * inflationFactor;
  const catchupLimit = age >= 50 ? contribution401kCatchup2024 * inflationFactor : 0;
  const totalLimit = baseLimit + catchupLimit;
  
  // Inflate the contribution amount with wages
  const inflatedContribution = contributionAmount * inflationFactor;
  return Math.min(inflatedContribution, totalLimit);
}

// Calculate employer 401(k) match (dollar amount inflated with wages)
export function calculate401kEmployerMatch(
  matchAmount: number,
  yearIndex: number = 0,
  inflationRate: number = 0.03
): number {
  if (matchAmount <= 0) return 0;
  
  const inflationFactor = Math.pow(1 + inflationRate, yearIndex);
  return matchAmount * inflationFactor;
}

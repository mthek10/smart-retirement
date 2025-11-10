// Tax calculation utilities for retirement planning

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

export function calculateStateSocialSecurityTax(
  ssIncome: number,
  agi: number,
  filingStatus: string,
  state: string,
  age: number = 65
): number {
  if (!state || state === 'none') return 0;

  // Colorado: Full exemption for 65+, partial for 55-64
  if (state === 'colorado') {
    if (age >= 65) return 0; // Full exemption
    
    const limit = filingStatus === 'married' ? 95000 : 75000;
    if (agi <= limit) return 0;
    
    // Deduct $20,000 if over threshold
    const taxableSS = Math.max(0, ssIncome - 20000);
    return taxableSS * 0.044; // 4.4% flat rate
  }

  // Connecticut: Exempt below thresholds, max 25% taxable above
  if (state === 'connecticut') {
    const threshold = (filingStatus === 'married' || filingStatus === 'hoh') ? 100000 : 75000;
    if (agi < threshold) return 0;
    
    const taxableSS = Math.min(ssIncome * 0.25, ssIncome);
    return taxableSS * 0.05; // Approximate 5% rate
  }

  // Minnesota: Complex subtraction method
  if (state === 'minnesota') {
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
  if (state === 'montana') {
    if (age < 65) return ssIncome * 0.059;
    
    const taxableSS = Math.max(0, ssIncome - 5500);
    return taxableSS * 0.059; // 5.9% rate
  }

  // New Mexico: High exemption thresholds
  if (state === 'newmexico') {
    const threshold = filingStatus === 'married' ? 150000 : 100000;
    if (agi <= threshold) return 0;
    
    return ssIncome * 0.049; // 4.9% rate
  }

  // Rhode Island: High exemption thresholds at full retirement age
  if (state === 'rhodeisland') {
    const threshold = filingStatus === 'married' ? 130250 : 104200;
    if (agi < threshold) return 0;
    
    return ssIncome * 0.0475; // 4.75% rate
  }

  // Utah: Credit system (simplified)
  if (state === 'utah') {
    const tax = ssIncome * 0.045; // 4.5% flat rate
    // Simplified: $450 credit reduces the tax
    return Math.max(0, tax - 450);
  }

  // Vermont: Full exemption below thresholds, partial above
  if (state === 'vermont') {
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
  if (state === 'westvirginia') {
    const taxableSS = ssIncome * 0.35; // 65% subtracted
    return taxableSS * 0.05; // Approximate 5% rate
  }

  return 0;
}

export function getStateIncomeRate(state: string): number {
  const stateRates: Record<string, number> = {
    colorado: 0.044,
    connecticut: 0.05,
    minnesota: 0.0585,
    montana: 0.059,
    newmexico: 0.049,
    rhodeisland: 0.0475,
    utah: 0.045,
    vermont: 0.0535,
    westvirginia: 0.05,
  };
  
  return stateRates[state] || 0;
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

export function calculateRMD(balance: number, age: number): number {
  // IRS Uniform Lifetime Table
  const lifetimeFactors: Record<number, number> = {
    72: 27.4, 73: 26.5, 74: 25.5, 75: 24.6, 76: 23.7, 77: 22.9,
    78: 22.0, 79: 21.1, 80: 20.2, 81: 19.4, 82: 18.5, 83: 17.7,
    84: 16.8, 85: 16.0, 86: 15.2, 87: 14.4, 88: 13.7, 89: 12.9,
    90: 12.2, 91: 11.5, 92: 10.8, 93: 10.1, 94: 9.5, 95: 8.9,
  };

  if (age < 73) return 0; // RMD starts at 73 for those born after 1950
  
  const factor = lifetimeFactors[age] || 8.9;
  return balance / factor;
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

export function calculateBracketConsistency(projections: any[]): {
  score: number;
  avgBracket: number;
  yearsInTarget: number;
  targetBracket: number;
} {
  if (projections.length === 0) {
    return { score: 0, avgBracket: 0, yearsInTarget: 0, targetBracket: 0 };
  }
  
  // Calculate average bracket (weighted by income)
  const totalIncome = projections.reduce((sum, p) => sum + (p.totalIncome || 0), 0);
  const weightedBracket = projections.reduce((sum, p) => {
    const weight = (p.totalIncome || 0) / totalIncome;
    return sum + (p.marginalBracket * weight);
  }, 0);
  
  // Calculate standard deviation
  const variance = projections.reduce((sum, p) => {
    const diff = p.marginalBracket - weightedBracket;
    return sum + (diff * diff);
  }, 0) / projections.length;
  
  const stdDev = Math.sqrt(variance);
  
  // Calculate score (0-10 scale, lower is better)
  // Standard deviation of 0.05 (5 percentage points) = score of 5
  const score = Math.min(10, stdDev * 100);
  
  // Count years within ±2% of target
  const targetBracket = weightedBracket;
  const yearsInTarget = projections.filter(p => 
    Math.abs(p.marginalBracket - targetBracket) <= 0.02
  ).length;
  
  return {
    score,
    avgBracket: weightedBracket,
    yearsInTarget,
    targetBracket,
  };
}

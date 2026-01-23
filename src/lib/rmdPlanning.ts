// RMD Planning utilities for detailed analysis and tax optimization strategies

import { calculateRMD, calculateFederalTax, standardDeductions2024, federalTaxBrackets2024 } from './taxCalculations';

export interface RMDProjection {
  year: number;
  age: number;
  spouse1Age: number;
  spouse2Age: number;
  spouse1TradBalance: number;
  spouse2TradBalance: number;
  totalTradBalance: number;
  spouse1RMD: number;
  spouse2RMD: number;
  totalRMD: number;
  rmdPercent: number;
  cumulativeRMD: number;
  projectedTax: number;
  marginalBracket: number;
  taxBracketImpact: 'low' | 'medium' | 'high';
}

export interface RMDStrategy {
  id: string;
  name: string;
  description: string;
  impact: string;
  difficulty: 'easy' | 'moderate' | 'complex';
  potentialSavings: number;
  recommendation: string;
}

export interface RMDAnalysis {
  projections: RMDProjection[];
  totalLifetimeRMD: number;
  totalLifetimeTax: number;
  peakRMDYear: RMDProjection | null;
  strategies: RMDStrategy[];
  yearsUntilRMD: number;
  rmdStartAge: number;
  preRMDWindow: number;
}

// Calculate detailed RMD projections from current age to 100
export function calculateRMDProjections(
  spouse1TradBalance: number,
  spouse2TradBalance: number,
  spouse1Age: number,
  spouse2Age: number,
  filingStatus: string,
  growthRate: number = 5,
  inflationRate: number = 2.5,
  otherIncome: number = 0
): RMDProjection[] {
  const projections: RMDProjection[] = [];
  const currentYear = new Date().getFullYear();
  const rmdStartAge = 73;
  
  let s1Balance = spouse1TradBalance;
  let s2Balance = spouse2TradBalance;
  let cumulativeRMD = 0;
  
  // Project from current age to 100
  for (let yearOffset = 0; yearOffset <= 100 - spouse1Age; yearOffset++) {
    const year = currentYear + yearOffset;
    const s1Age = spouse1Age + yearOffset;
    const s2Age = spouse2Age + yearOffset;
    
    // Calculate RMDs
    const spouse1RMD = calculateRMD(s1Balance, s1Age);
    const spouse2RMD = filingStatus === 'married' ? calculateRMD(s2Balance, s2Age) : 0;
    const totalRMD = spouse1RMD + spouse2RMD;
    
    cumulativeRMD += totalRMD;
    
    const totalBalance = s1Balance + s2Balance;
    const rmdPercent = totalBalance > 0 ? (totalRMD / totalBalance) * 100 : 0;
    
    // Calculate tax impact
    const inflationMultiplier = Math.pow(1 + inflationRate / 100, yearOffset);
    const adjustedOtherIncome = otherIncome * inflationMultiplier;
    const totalIncome = totalRMD + adjustedOtherIncome;
    
    const standardDeduction = (standardDeductions2024[filingStatus] || standardDeductions2024.single) * inflationMultiplier;
    const taxableIncome = Math.max(0, totalIncome - standardDeduction);
    
    // Get marginal bracket
    const brackets = federalTaxBrackets2024[filingStatus] || federalTaxBrackets2024.single;
    let marginalBracket = 10;
    for (const bracket of brackets) {
      const inflatedMin = bracket.min * inflationMultiplier;
      const inflatedMax = bracket.max * inflationMultiplier;
      if (taxableIncome >= inflatedMin && taxableIncome < inflatedMax) {
        marginalBracket = bracket.rate * 100;
        break;
      }
      if (taxableIncome >= bracket.max * inflationMultiplier) {
        marginalBracket = bracket.rate * 100;
      }
    }
    
    // Calculate projected federal tax on RMD
    const projectedTax = calculateFederalTax(totalIncome, filingStatus, inflationMultiplier);
    
    // Determine bracket impact severity
    let taxBracketImpact: 'low' | 'medium' | 'high' = 'low';
    if (marginalBracket >= 32) taxBracketImpact = 'high';
    else if (marginalBracket >= 24) taxBracketImpact = 'medium';
    
    projections.push({
      year,
      age: s1Age,
      spouse1Age: s1Age,
      spouse2Age: s2Age,
      spouse1TradBalance: s1Balance,
      spouse2TradBalance: s2Balance,
      totalTradBalance: totalBalance,
      spouse1RMD,
      spouse2RMD,
      totalRMD,
      rmdPercent,
      cumulativeRMD,
      projectedTax,
      marginalBracket,
      taxBracketImpact,
    });
    
    // Update balances for next year (growth minus RMD)
    const growthMultiplier = 1 + growthRate / 100;
    s1Balance = Math.max(0, (s1Balance - spouse1RMD) * growthMultiplier);
    s2Balance = Math.max(0, (s2Balance - spouse2RMD) * growthMultiplier);
  }
  
  return projections;
}

// Generate tax minimization strategies based on current situation
export function generateRMDStrategies(
  spouse1TradBalance: number,
  spouse2TradBalance: number,
  spouse1Age: number,
  rothBalance: number,
  filingStatus: string,
  currentRothStrategy: string
): RMDStrategy[] {
  const strategies: RMDStrategy[] = [];
  const totalTrad = spouse1TradBalance + spouse2TradBalance;
  const yearsToRMD = Math.max(0, 73 - spouse1Age);
  
  // Strategy 1: Roth Conversions (if before RMD age)
  if (yearsToRMD > 0 && totalTrad > 50000) {
    const annualConversion = totalTrad / yearsToRMD;
    const potentialSavings = Math.round(annualConversion * 0.1 * yearsToRMD); // Rough estimate
    
    strategies.push({
      id: 'roth-conversion',
      name: 'Accelerate Roth Conversions',
      description: `You have ${yearsToRMD} years before RMDs begin. Converting Traditional IRA funds to Roth now allows you to control when and how much tax you pay.`,
      impact: `Converting ~$${Math.round(annualConversion / 1000)}k/year could reduce future RMDs significantly`,
      difficulty: 'moderate',
      potentialSavings,
      recommendation: currentRothStrategy === 'none' 
        ? 'Consider enabling a Roth conversion strategy to fill your current tax bracket'
        : 'Your current Roth strategy is already reducing future RMDs',
    });
  }
  
  // Strategy 2: QCD - Qualified Charitable Distributions (if 70.5+)
  if (spouse1Age >= 70) {
    strategies.push({
      id: 'qcd',
      name: 'Qualified Charitable Distributions (QCD)',
      description: 'At age 70½+, donate up to $105,000/year directly from your IRA to charity. QCDs satisfy RMD requirements and are excluded from taxable income.',
      impact: 'Reduces taxable income dollar-for-dollar while satisfying charitable goals',
      difficulty: 'easy',
      potentialSavings: Math.min(105000, totalTrad * 0.04) * 0.22, // Assume 22% bracket
      recommendation: 'If you make charitable donations, consider directing them through your IRA as QCDs',
    });
  }
  
  // Strategy 3: Tax Bracket Management
  strategies.push({
    id: 'bracket-fill',
    name: 'Tax Bracket Filling Strategy',
    description: 'Take additional Traditional IRA withdrawals in years with lower income to "fill" lower tax brackets, reducing the amount subject to RMDs later.',
    impact: 'Smooths tax liability over time, avoiding bracket spikes',
    difficulty: 'moderate',
    potentialSavings: Math.round(totalTrad * 0.03),
    recommendation: 'Consider taking extra withdrawals in low-income years before Social Security starts',
  });
  
  // Strategy 4: Roth in Kind Distribution (RMD years)
  if (spouse1Age >= 73) {
    strategies.push({
      id: 'rmd-to-roth',
      name: 'RMD to Roth Conversion',
      description: 'After taking your required RMD, you can convert additional Traditional funds to Roth (beyond the RMD amount).',
      impact: 'Reduces future RMDs while paying tax at current rates',
      difficulty: 'moderate',
      potentialSavings: Math.round(totalTrad * 0.02),
      recommendation: 'If your income is lower than expected this year, consider converting extra funds to Roth',
    });
  }
  
  // Strategy 5: Life Insurance / Legacy Planning
  if (totalTrad > 500000) {
    strategies.push({
      id: 'legacy',
      name: 'Legacy & Estate Planning',
      description: 'Large Traditional IRA balances create significant tax liability for heirs. Consider strategies to minimize the inheritance tax burden.',
      impact: 'Heirs will owe income tax on inherited Traditional IRA distributions',
      difficulty: 'complex',
      potentialSavings: Math.round(totalTrad * 0.15), // Potential heir savings
      recommendation: 'Consult with an estate planning attorney about Roth conversions for legacy purposes',
    });
  }
  
  // Strategy 6: Delay Social Security
  if (spouse1Age < 70 && yearsToRMD > 0) {
    strategies.push({
      id: 'delay-ss',
      name: 'Delay Social Security',
      description: 'By delaying Social Security and living on Traditional IRA withdrawals, you can reduce the Traditional balance before RMDs begin.',
      impact: 'Uses Traditional funds strategically while increasing eventual SS benefits by 8%/year',
      difficulty: 'moderate',
      potentialSavings: Math.round(totalTrad * 0.05),
      recommendation: 'Consider delaying SS to 70 while drawing down Traditional accounts',
    });
  }
  
  return strategies;
}

// Analyze RMD situation and generate comprehensive report
export function analyzeRMD(
  spouse1TradBalance: number,
  spouse2TradBalance: number,
  spouse1Age: number,
  spouse2Age: number,
  filingStatus: string,
  rothBalance: number,
  currentRothStrategy: string,
  growthRate: number = 5,
  inflationRate: number = 2.5,
  otherIncome: number = 0
): RMDAnalysis {
  const projections = calculateRMDProjections(
    spouse1TradBalance,
    spouse2TradBalance,
    spouse1Age,
    spouse2Age,
    filingStatus,
    growthRate,
    inflationRate,
    otherIncome
  );
  
  // Filter to only RMD years (age 73+)
  const rmdYears = projections.filter(p => p.totalRMD > 0);
  
  // Calculate totals
  const totalLifetimeRMD = rmdYears.reduce((sum, p) => sum + p.totalRMD, 0);
  const totalLifetimeTax = rmdYears.reduce((sum, p) => sum + p.projectedTax, 0);
  
  // Find peak RMD year
  const peakRMDYear = rmdYears.reduce((max, p) => 
    p.totalRMD > (max?.totalRMD || 0) ? p : max, 
    null as RMDProjection | null
  );
  
  // Generate strategies
  const strategies = generateRMDStrategies(
    spouse1TradBalance,
    spouse2TradBalance,
    spouse1Age,
    rothBalance,
    filingStatus,
    currentRothStrategy
  );
  
  const yearsUntilRMD = Math.max(0, 73 - spouse1Age);
  
  return {
    projections,
    totalLifetimeRMD,
    totalLifetimeTax,
    peakRMDYear,
    strategies,
    yearsUntilRMD,
    rmdStartAge: 73,
    preRMDWindow: yearsUntilRMD,
  };
}

// Income threshold alert utilities for IRMAA and ACA cliff detection

import { 
  irmaaBracketsSingle2024,
  irmaaBracketsMarried2024,
  federalPovertyLevel2024,
  federalTaxBrackets2024,
  standardDeductions2024
} from './taxCalculations';

export interface IncomeAlert {
  type: 'irmaa' | 'aca' | 'bracket';
  severity: 'warning' | 'danger' | 'info';
  title: string;
  message: string;
  distanceToThreshold: number;
  threshold: number;
  currentValue: number;
  yearIndex: number;
  age: number;
  recommendation?: string;
}

export interface BracketRoomInfo {
  currentBracket: number;
  currentBracketTop: number;
  taxableIncome: number;
  roomInBracket: number;
  nextBracketRate: number;
  percentFilled: number;
  recommendedConversion: number;
}

/**
 * Get IRMAA proximity - how close MAGI is to the next IRMAA tier
 */
export function getIRMAAProximity(
  magi: number,
  yearIndex: number = 0,
  inflationRate: number = 0,
  filingStatus: string = 'single'
): { distanceToNextTier: number; currentTier: number; nextTier: number; nextTierThreshold: number } | null {
  // inflationRate expected as decimal (e.g., 0.03 for 3%)
  const inflationMultiplier = Math.pow(1 + inflationRate, yearIndex);
  
  // Use filing-status appropriate IRMAA brackets
  const brackets = filingStatus === 'married' 
    ? irmaaBracketsMarried2024 
    : irmaaBracketsSingle2024;
  
  // Find current bracket
  const currentBracketIndex = brackets.findIndex(
    (b) => magi >= b.min * inflationMultiplier && magi < b.max * inflationMultiplier
  );
  
  if (currentBracketIndex === -1 || currentBracketIndex >= brackets.length - 1) {
    return null;
  }
  
  const currentBracket = brackets[currentBracketIndex];
  const nextBracket = brackets[currentBracketIndex + 1];
  
  const nextThreshold = nextBracket.min * inflationMultiplier;
  const distance = nextThreshold - magi;
  
  return {
    distanceToNextTier: distance,
    currentTier: currentBracket.premium * inflationMultiplier,
    nextTier: nextBracket.premium * inflationMultiplier,
    nextTierThreshold: nextThreshold,
  };
}

/**
 * Get ACA subsidy cliff proximity
 * Enhanced subsidies apply through 2025, then 400% FPL cliff returns
 */
export function getACACliffProximity(
  magi: number,
  householdSize: number,
  yearIndex: number = 0,
  inflationRate: number = 0
): { fplPercent: number; distanceTo400Percent: number; threshold400Percent: number } | null {
  const inflationMultiplier = Math.pow(1 + inflationRate / 100, yearIndex);
  const fpl = (federalPovertyLevel2024[householdSize] || federalPovertyLevel2024[2]) * inflationMultiplier;
  const fplPercent = (magi / fpl) * 100;
  const threshold400 = fpl * 4;
  
  return {
    fplPercent,
    distanceTo400Percent: threshold400 - magi,
    threshold400Percent: threshold400,
  };
}

/**
 * Calculate room in current tax bracket and recommended Roth conversion
 */
export function getBracketRoom(
  grossIncome: number,
  filingStatus: string,
  yearIndex: number = 0,
  inflationRate: number = 0
): BracketRoomInfo {
  const inflationMultiplier = Math.pow(1 + inflationRate / 100, yearIndex);
  const brackets = federalTaxBrackets2024[filingStatus] || federalTaxBrackets2024.single;
  const standardDeduction = (standardDeductions2024[filingStatus] || standardDeductions2024.single) * inflationMultiplier;
  
  const taxableIncome = Math.max(0, grossIncome - standardDeduction);
  
  // Find current bracket
  let currentBracketIndex = 0;
  for (let i = 0; i < brackets.length; i++) {
    const inflatedMin = brackets[i].min * inflationMultiplier;
    const inflatedMax = brackets[i].max * inflationMultiplier;
    // Use <= for max to include the exact boundary in the lower bracket
    if (taxableIncome >= inflatedMin && taxableIncome <= inflatedMax) {
      currentBracketIndex = i;
      break;
    }
    if (i === brackets.length - 1) {
      currentBracketIndex = i;
    }
  }
  
  const currentBracket = brackets[currentBracketIndex];
  const nextBracket = brackets[currentBracketIndex + 1] || currentBracket;
  
  const inflatedBracketTop = currentBracket.max * inflationMultiplier;
  const roomInBracket = Math.max(0, inflatedBracketTop - taxableIncome);
  const bracketRange = (currentBracket.max - currentBracket.min) * inflationMultiplier;
  const percentFilled = bracketRange > 0 
    ? Math.min(100, ((taxableIncome - currentBracket.min * inflationMultiplier) / bracketRange) * 100)
    : 100;
  
  return {
    currentBracket: currentBracket.rate * 100,
    currentBracketTop: inflatedBracketTop,
    taxableIncome,
    roomInBracket,
    nextBracketRate: nextBracket.rate * 100,
    percentFilled: Math.max(0, percentFilled),
    recommendedConversion: roomInBracket,
  };
}

/**
 * Generate all income alerts for a given projection year
 */
export function generateIncomeAlerts(
  magi: number,
  householdSize: number,
  age: number,
  yearIndex: number,
  inflationRate: number = 0,
  filingStatus: string = 'married'
): IncomeAlert[] {
  const alerts: IncomeAlert[] = [];
  
  // IRMAA alerts (only for age 65+, but based on income 2 years prior)
  const irmaaProximity = getIRMAAProximity(magi, yearIndex, inflationRate, filingStatus);
  if (irmaaProximity && irmaaProximity.distanceToNextTier < irmaaProximity.nextTierThreshold * 0.10) {
    const monthlyIncrease = (irmaaProximity.nextTier - irmaaProximity.currentTier);
    const annualIncrease = monthlyIncrease * 12 * (filingStatus === 'married' ? 2 : 1);
    
    const severity = irmaaProximity.distanceToNextTier < 5000 ? 'danger' : 'warning';
    
    alerts.push({
      type: 'irmaa',
      severity,
      title: 'IRMAA Threshold Alert',
      message: `Your projected MAGI of $${Math.round(magi).toLocaleString()} is $${Math.round(irmaaProximity.distanceToNextTier).toLocaleString()} below the next IRMAA threshold.`,
      distanceToThreshold: irmaaProximity.distanceToNextTier,
      threshold: irmaaProximity.nextTierThreshold,
      currentValue: magi,
      yearIndex,
      age,
      recommendation: annualIncrease > 0 
        ? `Staying below $${Math.round(irmaaProximity.nextTierThreshold).toLocaleString()} would avoid $${Math.round(annualIncrease).toLocaleString()}/year in additional Medicare premiums.`
        : undefined,
    });
  }
  
  // ACA alerts (for ages under 65)
  if (age < 65) {
    const acaProximity = getACACliffProximity(magi, householdSize, yearIndex, inflationRate);
    if (acaProximity && acaProximity.fplPercent >= 350 && acaProximity.fplPercent < 400) {
      alerts.push({
        type: 'aca',
        severity: acaProximity.fplPercent >= 390 ? 'danger' : 'warning',
        title: 'ACA Subsidy Optimization',
        message: `Income at ${Math.round(acaProximity.fplPercent)}% FPL. Enhanced subsidies continue above 400%, but managing income can maximize your subsidy.`,
        distanceToThreshold: acaProximity.distanceTo400Percent,
        threshold: acaProximity.threshold400Percent,
        currentValue: magi,
        yearIndex,
        age,
        recommendation: `Keeping income at or below $${Math.round(acaProximity.threshold400Percent).toLocaleString()} (400% FPL) historically maximized subsidies.`,
      });
    }
  }
  
  return alerts;
}

/**
 * Get alerts for the first projection year (current year planning)
 */
export function getCurrentYearAlerts(
  projections: Array<{ 
    age: number; 
    totalIncome: number; 
    ssIncome: number;
    employmentIncome: number;
    withdrawals: number;
    rothConversion: number;
  }>,
  householdSize: number = 2,
  inflationRate: number = 0,
  filingStatus: string = 'married'
): IncomeAlert[] {
  if (projections.length === 0) return [];
  
  const firstYear = projections[0];
  const magi = firstYear.totalIncome;
  
  return generateIncomeAlerts(
    magi,
    householdSize,
    firstYear.age,
    0,
    inflationRate,
    filingStatus
  );
}

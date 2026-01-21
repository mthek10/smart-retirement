import { calculateSocialSecurityBenefit, calculateFullRetirementAge } from './taxCalculations';

export interface ClaimingScenario {
  claimAge: number;
  monthlyBenefit: number;
  annualBenefit: number;
  lifetimeBenefits: Record<number, number>;
}

export interface BreakevenComparison {
  earlyAge: number;
  delayedAge: number;
  breakevenAge: number;
  yearsToBreakeven: number;
}

export interface OptimalClaimingResult {
  age: number;
  totalBenefits: number;
  monthlyBenefit: number;
}

/**
 * Calculate lifetime benefits from claiming age to end age with COLA adjustments
 */
export function calculateLifetimeBenefits(
  claimAge: number,
  endAge: number,
  monthlyBenefitAtFRA: number,
  fullRetirementAge: number,
  colaRate: number = 0.025
): number {
  if (claimAge > endAge) return 0;
  
  const adjustedMonthlyBenefit = calculateSocialSecurityBenefit(
    monthlyBenefitAtFRA,
    claimAge,
    fullRetirementAge
  );
  
  let totalBenefits = 0;
  let currentAnnualBenefit = adjustedMonthlyBenefit * 12;
  
  for (let age = claimAge; age <= endAge; age++) {
    totalBenefits += currentAnnualBenefit;
    // Apply COLA for next year
    currentAnnualBenefit *= (1 + colaRate);
  }
  
  return totalBenefits;
}

/**
 * Calculate the breakeven age where delaying SS pays off vs claiming early
 */
export function calculateSSBreakeven(
  earlyAge: number,
  delayedAge: number,
  monthlyBenefitAtFRA: number,
  fullRetirementAge: number,
  colaRate: number = 0.025
): number {
  if (earlyAge >= delayedAge) return 0;
  
  const earlyMonthlyBenefit = calculateSocialSecurityBenefit(
    monthlyBenefitAtFRA,
    earlyAge,
    fullRetirementAge
  );
  
  const delayedMonthlyBenefit = calculateSocialSecurityBenefit(
    monthlyBenefitAtFRA,
    delayedAge,
    fullRetirementAge
  );
  
  // Calculate cumulative benefits year by year until delayed catches up
  let earlyCumulative = 0;
  let delayedCumulative = 0;
  let earlyAnnual = earlyMonthlyBenefit * 12;
  let delayedAnnual = delayedMonthlyBenefit * 12;
  
  // Early claimant starts receiving benefits immediately
  for (let age = earlyAge; age < delayedAge; age++) {
    earlyCumulative += earlyAnnual;
    earlyAnnual *= (1 + colaRate);
  }
  
  // Now both are receiving - find when delayed catches up
  for (let age = delayedAge; age <= 120; age++) {
    earlyCumulative += earlyAnnual;
    delayedCumulative += delayedAnnual;
    
    if (delayedCumulative >= earlyCumulative) {
      // Interpolate to find more precise breakeven
      const prevEarly = earlyCumulative - earlyAnnual;
      const prevDelayed = delayedCumulative - delayedAnnual;
      const gap = prevEarly - prevDelayed;
      const catchUpRate = delayedAnnual - earlyAnnual;
      const fractionalYear = gap / catchUpRate;
      
      return age - 1 + fractionalYear;
    }
    
    earlyAnnual *= (1 + colaRate);
    delayedAnnual *= (1 + colaRate);
  }
  
  return 120; // Never breaks even
}

/**
 * Calculate all claiming scenarios for comparison
 */
export function calculateAllClaimingScenarios(
  monthlyBenefitAtFRA: number,
  fullRetirementAge: number,
  lifeExpectancies: number[] = [80, 85, 90, 95, 100],
  colaRate: number = 0.025
): ClaimingScenario[] {
  const claimingAges = [62, 63, 64, 65, 66, 67, 68, 69, 70];
  
  return claimingAges.map(claimAge => {
    const monthlyBenefit = calculateSocialSecurityBenefit(
      monthlyBenefitAtFRA,
      claimAge,
      fullRetirementAge
    );
    
    const lifetimeBenefits: Record<number, number> = {};
    lifeExpectancies.forEach(endAge => {
      lifetimeBenefits[endAge] = calculateLifetimeBenefits(
        claimAge,
        endAge,
        monthlyBenefitAtFRA,
        fullRetirementAge,
        colaRate
      );
    });
    
    return {
      claimAge,
      monthlyBenefit,
      annualBenefit: monthlyBenefit * 12,
      lifetimeBenefits,
    };
  });
}

/**
 * Find the optimal claiming age for a given life expectancy
 */
export function findOptimalClaimingAge(
  monthlyBenefitAtFRA: number,
  fullRetirementAge: number,
  lifeExpectancy: number,
  colaRate: number = 0.025
): OptimalClaimingResult {
  const scenarios = calculateAllClaimingScenarios(
    monthlyBenefitAtFRA,
    fullRetirementAge,
    [lifeExpectancy],
    colaRate
  );
  
  let optimal = scenarios[0];
  for (const scenario of scenarios) {
    if (scenario.lifetimeBenefits[lifeExpectancy] > optimal.lifetimeBenefits[lifeExpectancy]) {
      optimal = scenario;
    }
  }
  
  return {
    age: optimal.claimAge,
    totalBenefits: optimal.lifetimeBenefits[lifeExpectancy],
    monthlyBenefit: optimal.monthlyBenefit,
  };
}

/**
 * Calculate breakeven matrix comparing all claiming age pairs
 */
export function calculateBreakevenMatrix(
  monthlyBenefitAtFRA: number,
  fullRetirementAge: number,
  colaRate: number = 0.025
): BreakevenComparison[] {
  const comparisons: BreakevenComparison[] = [];
  const ages = [62, 67, 70]; // Key comparison points
  
  for (let i = 0; i < ages.length; i++) {
    for (let j = i + 1; j < ages.length; j++) {
      const earlyAge = ages[i];
      const delayedAge = ages[j];
      const breakevenAge = calculateSSBreakeven(
        earlyAge,
        delayedAge,
        monthlyBenefitAtFRA,
        fullRetirementAge,
        colaRate
      );
      
      comparisons.push({
        earlyAge,
        delayedAge,
        breakevenAge,
        yearsToBreakeven: breakevenAge - delayedAge,
      });
    }
  }
  
  return comparisons;
}

/**
 * Generate cumulative benefit data for charting
 */
export function generateCumulativeBenefitsData(
  monthlyBenefitAtFRA: number,
  fullRetirementAge: number,
  claimingAges: number[] = [62, 67, 70],
  maxAge: number = 100,
  colaRate: number = 0.025
): { age: number; [key: string]: number }[] {
  const data: { age: number; [key: string]: number }[] = [];
  
  // Initialize cumulative trackers
  const cumulatives: Record<number, number> = {};
  const annuals: Record<number, number> = {};
  
  claimingAges.forEach(claimAge => {
    cumulatives[claimAge] = 0;
    annuals[claimAge] = calculateSocialSecurityBenefit(
      monthlyBenefitAtFRA,
      claimAge,
      fullRetirementAge
    ) * 12;
  });
  
  for (let age = 62; age <= maxAge; age++) {
    const point: { age: number; [key: string]: number } = { age };
    
    claimingAges.forEach(claimAge => {
      if (age >= claimAge) {
        cumulatives[claimAge] += annuals[claimAge];
        annuals[claimAge] *= (1 + colaRate);
      }
      point[`age${claimAge}`] = cumulatives[claimAge];
    });
    
    data.push(point);
  }
  
  return data;
}

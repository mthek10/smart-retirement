import { useMemo } from "react";
import type { Accounts, SSData, TaxSettings, ProjectionRow } from "./useProjections";
import { calculateProjections } from "./useProjections";

export interface MonteCarloSettings {
  numSimulations: number;
  returnMean: number; // Expected annual return (e.g., 0.07 for 7%)
  returnStdDev: number; // Standard deviation (e.g., 0.15 for 15%)
}

export interface SimulationOutcome {
  finalBalance: number;
  depletionAge: number | null;
  tradDepletionAge: number | null;
  rothDepletionAge: number | null;
  taxableDepletionAge: number | null;
  lifetimeTax: number;
  success: boolean; // Funds lasted until age 100
}

export interface StrategySimulationResults {
  strategyName: string;
  outcomes: SimulationOutcome[];
  successRate: number;
  medianFinalBalance: number;
  percentile10FinalBalance: number;
  percentile90FinalBalance: number;
  medianDepletionAge: number | null;
  medianTradDepletionAge: number | null;
  medianRothDepletionAge: number | null;
  medianTaxableDepletionAge: number | null;
  avgLifetimeTax: number;
}

export interface MonteCarloResult {
  baseline: StrategySimulationResults;
  current: StrategySimulationResults;
  optimized: StrategySimulationResults;
  isRunning: boolean;
}

/**
 * Generate random return using Box-Muller transform for normal distribution
 */
function randomNormal(mean: number, stdDev: number): number {
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + z * stdDev;
}

/**
 * Run a single simulation with year-by-year randomized returns.
 * This properly models sequence-of-returns risk by applying random returns each year.
 */
function runSingleSimulation(
  accounts: Accounts,
  ssData: SSData,
  taxSettings: TaxSettings,
  strategy: string,
  settings: MonteCarloSettings
): SimulationOutcome {
  const maxYears = Math.max(100 - taxSettings.spouse1Age, 100 - taxSettings.spouse2Age);
  const DEPLETION_THRESHOLD = 1000;
  
  // Initialize account balances
  let traditionalBalance = accounts.spouse1Traditional + accounts.spouse2Traditional;
  let rothBalance = accounts.roth;
  let taxableBalance = accounts.taxable;
  
  // Get baseline projection for withdrawal amounts and tax estimates
  // This gives us the planned withdrawal sequence and Roth conversion amounts
  const baselineProjections = calculateProjections(accounts, ssData, taxSettings, strategy);
  
  let depletionAge: number | null = null;
  let tradDepletionAge: number | null = null;
  let rothDepletionAge: number | null = null;
  let taxableDepletionAge: number | null = null;
  let lifetimeTax = 0;

  // Track previous balances to detect threshold crossings
  let prevTrad = traditionalBalance;
  let prevRoth = rothBalance;
  let prevTaxable = taxableBalance;

  // Simulate year by year with random returns
  for (let year = 0; year <= maxYears; year++) {
    const currentAge = taxSettings.spouse1Age + year;
    const totalBalance = traditionalBalance + rothBalance + taxableBalance;

    // Per-account depletion crossings (matches findDepletionAges in useProjections)
    if (tradDepletionAge === null && prevTrad >= DEPLETION_THRESHOLD && traditionalBalance < DEPLETION_THRESHOLD) {
      tradDepletionAge = currentAge;
    }
    if (rothDepletionAge === null && prevRoth >= DEPLETION_THRESHOLD && rothBalance < DEPLETION_THRESHOLD) {
      rothDepletionAge = currentAge;
    }
    if (taxableDepletionAge === null && prevTaxable >= DEPLETION_THRESHOLD && taxableBalance < DEPLETION_THRESHOLD) {
      taxableDepletionAge = currentAge;
    }

    // Check for combined depletion before processing this year
    if (totalBalance < DEPLETION_THRESHOLD && depletionAge === null) {
      depletionAge = currentAge;
      break;
    }
    
    // Get withdrawal and tax info from baseline projection
    const baselineRow = baselineProjections[year];
    if (!baselineRow) break;
    
    // Use baseline projection's withdrawal amount (adjusted proportionally if balances differ)
    const baselineTotal = baselineRow.traditionalBalance + baselineRow.rothBalance + baselineRow.taxableBalance;
    const balanceRatio = baselineTotal > 0 ? totalBalance / baselineTotal : 1;
    
    // Scale withdrawal if our balance is significantly different
    const targetWithdrawal = Math.min(
      baselineRow.withdrawals * Math.min(balanceRatio, 1.5),
      totalBalance * 0.5 // Safety cap: don't withdraw more than 50% in one year
    );
    
    lifetimeTax += baselineRow.totalTaxes;
    
    // Execute withdrawal from accounts (same order as main projection: traditional -> taxable -> roth)
    let remaining = targetWithdrawal;
    
    // 1. From traditional (including RMD)
    if (remaining > 0 && traditionalBalance > 0) {
      const fromTrad = Math.min(remaining, traditionalBalance);
      traditionalBalance -= fromTrad;
      remaining -= fromTrad;
    }
    
    // 2. From taxable
    if (remaining > 0 && taxableBalance > 0) {
      const fromTaxable = Math.min(remaining, taxableBalance);
      taxableBalance -= fromTaxable;
      remaining -= fromTaxable;
    }
    
    // 3. From Roth
    if (remaining > 0 && rothBalance > 0) {
      const fromRoth = Math.min(remaining, rothBalance);
      rothBalance -= fromRoth;
      remaining -= fromRoth;
    }
    
    // Handle Roth conversions (move from traditional to Roth, scaled by balance ratio)
    const rothConversion = (baselineRow.rothConversion || 0) * Math.min(balanceRatio, 1);
    if (rothConversion > 0 && traditionalBalance > 0) {
      const actualConversion = Math.min(rothConversion, traditionalBalance);
      traditionalBalance -= actualConversion;
      rothBalance += actualConversion;
    }
    
    // Apply random return for this year (key for sequence-of-returns risk)
    const yearReturn = randomNormal(settings.returnMean, settings.returnStdDev);
    
    // Apply returns to each account
    traditionalBalance *= (1 + yearReturn);
    rothBalance *= (1 + yearReturn);
    taxableBalance *= (1 + yearReturn);
    
    // Ensure balances don't go negative
    traditionalBalance = Math.max(0, traditionalBalance);
    rothBalance = Math.max(0, rothBalance);
    taxableBalance = Math.max(0, taxableBalance);

    // Update prev trackers for next iteration's crossing detection
    prevTrad = traditionalBalance;
    prevRoth = rothBalance;
    prevTaxable = taxableBalance;
  }
  
  const finalBalance = traditionalBalance + rothBalance + taxableBalance;
  
  return {
    finalBalance,
    depletionAge,
    tradDepletionAge,
    rothDepletionAge,
    taxableDepletionAge,
    lifetimeTax,
    success: depletionAge === null || depletionAge >= 100,
  };
}

/**
 * Run Monte Carlo simulation for a strategy
 */
function runStrategySimulation(
  accounts: Accounts,
  ssData: SSData,
  taxSettings: TaxSettings,
  strategy: string,
  strategyName: string,
  settings: MonteCarloSettings
): StrategySimulationResults {
  const outcomes: SimulationOutcome[] = [];
  
  for (let i = 0; i < settings.numSimulations; i++) {
    outcomes.push(runSingleSimulation(accounts, ssData, taxSettings, strategy, settings));
  }
  
  // Calculate statistics
  const successCount = outcomes.filter(o => o.success).length;
  const successRate = successCount / settings.numSimulations;
  
  // Sort final balances for percentiles
  const sortedBalances = [...outcomes.map(o => o.finalBalance)].sort((a, b) => a - b);
  const medianIndex = Math.floor(sortedBalances.length / 2);
  const p10Index = Math.floor(sortedBalances.length * 0.1);
  const p90Index = Math.floor(sortedBalances.length * 0.9);
  
  // Median helper for nullable per-account depletion ages
  const medianOf = (key: 'depletionAge' | 'tradDepletionAge' | 'rothDepletionAge' | 'taxableDepletionAge'): number | null => {
    const ages = outcomes
      .map(o => o[key])
      .filter((age): age is number => age !== null)
      .sort((a, b) => a - b);
    return ages.length > 0 ? ages[Math.floor(ages.length / 2)] : null;
  };

  const medianDepletionAge = medianOf('depletionAge');
  const medianTradDepletionAge = medianOf('tradDepletionAge');
  const medianRothDepletionAge = medianOf('rothDepletionAge');
  const medianTaxableDepletionAge = medianOf('taxableDepletionAge');

  const avgLifetimeTax = outcomes.reduce((sum, o) => sum + o.lifetimeTax, 0) / settings.numSimulations;
  
  return {
    strategyName,
    outcomes,
    successRate,
    medianFinalBalance: sortedBalances[medianIndex],
    percentile10FinalBalance: sortedBalances[p10Index],
    percentile90FinalBalance: sortedBalances[p90Index],
    medianDepletionAge,
    medianTradDepletionAge,
    medianRothDepletionAge,
    medianTaxableDepletionAge,
    avgLifetimeTax,
  };
}

/**
 * Hook to run Monte Carlo simulation across all three strategies
 */
export function useMonteCarloSimulation(
  accounts: Accounts,
  ssData: SSData,
  taxSettings: TaxSettings,
  settings: MonteCarloSettings = {
    numSimulations: 1000,
    returnMean: 0.03,
    returnStdDev: 0.15,
  }
): MonteCarloResult {
  return useMemo(() => {
    const baseline = runStrategySimulation(
      accounts, ssData, taxSettings, 
      'none', 'No Conversions', 
      settings
    );
    
    const current = runStrategySimulation(
      accounts, ssData, taxSettings,
      taxSettings.rothConversionStrategy, 
      taxSettings.rothConversionStrategy === 'none' ? 'No Conversions' :
      taxSettings.rothConversionStrategy === 'fill_10' ? 'Fill to 10%' :
      taxSettings.rothConversionStrategy === 'fill_12' ? 'Fill to 12%' :
      taxSettings.rothConversionStrategy === 'fill_22' ? 'Fill to 22%' :
      taxSettings.rothConversionStrategy === 'fill_24' ? 'Fill to 24%' :
      'Custom',
      settings
    );
    
    const optimized = runStrategySimulation(
      accounts, ssData, taxSettings,
      'fill_24', 'Fill to 24%',
      settings
    );
    
    return {
      baseline,
      current,
      optimized,
      isRunning: false,
    };
  }, [accounts, ssData, taxSettings, settings.numSimulations, settings.returnMean, settings.returnStdDev]);
}

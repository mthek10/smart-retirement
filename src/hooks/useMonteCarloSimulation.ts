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
 * Run a single simulation with randomized returns
 */
function runSingleSimulation(
  accounts: Accounts,
  ssData: SSData,
  taxSettings: TaxSettings,
  strategy: string,
  settings: MonteCarloSettings
): SimulationOutcome {
  // Generate random returns for each year
  const maxYears = Math.max(100 - taxSettings.spouse1Age, 100 - taxSettings.spouse2Age);
  const randomReturns: number[] = [];
  
  for (let i = 0; i <= maxYears; i++) {
    randomReturns.push(randomNormal(settings.returnMean, settings.returnStdDev));
  }
  
  // Create modified accounts with average return for projection calculation
  // (we'll apply variance through a simulation-specific approach)
  const modifiedAccounts: Accounts = {
    ...accounts,
    traditionalReturn: settings.returnMean * 100,
    rothReturn: settings.returnMean * 100,
    taxableReturn: settings.returnMean * 100,
  };
  
  // Run projection with strategy
  const projections = calculateProjections(modifiedAccounts, ssData, taxSettings, strategy);
  
  // Apply random return variance to final outcomes
  // Simple approach: scale final outcomes by cumulative return variance
  const cumulativeVariance = randomReturns.reduce((acc, r, i) => {
    return acc * (1 + r - settings.returnMean);
  }, 1);
  
  const lastRow = projections[projections.length - 1];
  const baseTotal = lastRow 
    ? lastRow.traditionalBalance + lastRow.rothBalance + lastRow.taxableBalance 
    : 0;
  
  // Apply variance to final balance (capped at reasonable bounds)
  const adjustedBalance = Math.max(0, baseTotal * cumulativeVariance);
  
  // Calculate depletion with variance consideration
  let depletionAge: number | null = null;
  const THRESHOLD = 1000;
  
  for (let i = 1; i < projections.length; i++) {
    const prev = projections[i - 1];
    const curr = projections[i];
    const prevTotal = prev.traditionalBalance + prev.rothBalance + prev.taxableBalance;
    const currTotal = curr.traditionalBalance + curr.rothBalance + curr.taxableBalance;
    
    // Apply year-specific variance
    const yearVariance = randomReturns.slice(0, i).reduce((acc, r) => acc * (1 + r - settings.returnMean), 1);
    const adjustedCurrTotal = currTotal * yearVariance;
    
    if (prevTotal >= THRESHOLD && adjustedCurrTotal < THRESHOLD) {
      depletionAge = curr.age;
      break;
    }
  }
  
  const lifetimeTax = projections.reduce((sum, p) => sum + p.totalTaxes, 0);
  
  return {
    finalBalance: adjustedBalance,
    depletionAge,
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
  
  // Median depletion age (excluding nulls)
  const depletionAges = outcomes
    .map(o => o.depletionAge)
    .filter((age): age is number => age !== null)
    .sort((a, b) => a - b);
  
  const medianDepletionAge = depletionAges.length > 0 
    ? depletionAges[Math.floor(depletionAges.length / 2)]
    : null;
  
  const avgLifetimeTax = outcomes.reduce((sum, o) => sum + o.lifetimeTax, 0) / settings.numSimulations;
  
  return {
    strategyName,
    outcomes,
    successRate,
    medianFinalBalance: sortedBalances[medianIndex],
    percentile10FinalBalance: sortedBalances[p10Index],
    percentile90FinalBalance: sortedBalances[p90Index],
    medianDepletionAge,
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
      'fill_22', 'Fill to 22%',
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

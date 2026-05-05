import type { Accounts, SSData, TaxSettings } from "@/hooks/useProjections";
import { calculateProjections } from "@/hooks/useProjections";
import { calculateFederalTax } from "@/lib/taxCalculations";

const ASSUMED_LTCG_RATE = 0.15;

const CANDIDATES = ["none", "fill_12", "fill_22", "fill_24", "fill_32"] as const;
export type CandidateStrategy = typeof CANDIDATES[number];

export interface StrategyScore {
  strategy: CandidateStrategy;
  lifetimeNetWealth: number;
  terminalAfterTax: number;
  lifetimeTax: number;
}

export interface OptimizerResult {
  best: CandidateStrategy;
  ranking: StrategyScore[];
}

/**
 * Score each candidate Roth conversion strategy on True Lifetime Wealth
 * (terminal after-tax minus cumulative lifetime taxes), using the same
 * terminal lump-sum bracket walk + basis-decay logic as the Monte Carlo card.
 * Deterministic — fast enough to run on every settings change.
 */
export function pickBestAfterTaxStrategy(
  accounts: Accounts,
  ssData: SSData,
  taxSettings: TaxSettings,
): OptimizerResult {
  const yearsToTerminal = taxSettings.filingStatus === "married"
    ? Math.max(100 - taxSettings.spouse1Age, 100 - taxSettings.spouse2Age)
    : 100 - taxSettings.spouse1Age;

  const startingBasisFraction =
    accounts.taxableCostBasisPercent > 0 && accounts.taxableCostBasisPercent <= 100
      ? accounts.taxableCostBasisPercent / 100
      : 0.5;
  const taxableGrowthRate = (accounts.taxableReturn || 0) / 100;
  const compoundedBasisShare =
    startingBasisFraction / Math.pow(1 + taxableGrowthRate, yearsToTerminal);
  const gainFraction = Math.max(0, Math.min(1, 1 - compoundedBasisShare));

  const ranking: StrategyScore[] = CANDIDATES.map((strategy) => {
    const proj = calculateProjections(accounts, ssData, taxSettings, strategy);
    const last = proj[proj.length - 1];
    const lifetimeTax = proj.reduce((s, r) => s + (r.totalTaxes || 0), 0);

    const terminalTrad = last?.traditionalBalance ?? 0;
    const terminalRoth = last?.rothBalance ?? 0;
    const terminalTaxable = last?.taxableBalance ?? 0;

    const lumpSumTax = calculateFederalTax(
      terminalTrad,
      taxSettings.filingStatus,
      yearsToTerminal,
      taxSettings.inflationRate / 100,
    );

    const terminalAfterTax =
      (terminalTrad - lumpSumTax) +
      terminalRoth +
      terminalTaxable * (1 - ASSUMED_LTCG_RATE * gainFraction);

    return {
      strategy,
      terminalAfterTax,
      lifetimeTax,
      lifetimeNetWealth: terminalAfterTax - lifetimeTax,
    };
  });

  ranking.sort((a, b) => b.lifetimeNetWealth - a.lifetimeNetWealth);
  return { best: ranking[0].strategy, ranking };
}

const CACHE = new WeakMap<TaxSettings, OptimizerResult>();
export function pickBestAfterTaxStrategyCached(
  accounts: Accounts,
  ssData: SSData,
  taxSettings: TaxSettings,
): OptimizerResult {
  const cached = CACHE.get(taxSettings);
  if (cached) return cached;
  const result = pickBestAfterTaxStrategy(accounts, ssData, taxSettings);
  CACHE.set(taxSettings, result);
  return result;
}

export const STRATEGY_LABELS: Record<CandidateStrategy, string> = {
  none: "No Conversions",
  fill_12: "Fill to 12%",
  fill_22: "Fill to 22%",
  fill_24: "Fill to 24%",
  fill_32: "Fill to 32%",
};

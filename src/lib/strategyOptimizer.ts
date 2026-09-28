import type { Accounts, SSData, TaxSettings } from "@/hooks/useProjections";
import { calculateProjections } from "@/hooks/useProjections";
import { calculateFederalTax } from "@/lib/taxCalculations";

const ASSUMED_LTCG_RATE = 0.15;

const CANDIDATES = ["none", "fill_12", "fill_22", "fill_24", "fill_32"] as const;
export type CandidateStrategy = typeof CANDIDATES[number];
export type ConversionPriority = 'conversions_first' | 'harvest_first';

export interface StrategyScore {
  strategy: CandidateStrategy;
  startAge: number | null;
  priority: ConversionPriority;
  label: string;
  terminalAfterTax: number;
  lifetimeTax: number;
}

export interface OptimizerResult {
  best: CandidateStrategy;
  startAge: number | null;
  priority: ConversionPriority;
  label: string;
  ranking: StrategyScore[];
}

export const STRATEGY_LABELS: Record<CandidateStrategy, string> = {
  none: "No Conversions",
  fill_12: "Fill to 12%",
  fill_22: "Fill to 22%",
  fill_24: "Fill to 24%",
  fill_32: "Fill to 32%",
};

/** Human-readable description of a strategy + sequencing choice. */
export function describeSequencing(
  strategy: string,
  startAge: number | null,
  priority: ConversionPriority,
): string {
  const base = STRATEGY_LABELS[strategy as CandidateStrategy] ?? strategy;
  if (strategy === 'none') return base;
  const parts = [base];
  if (startAge != null) parts.push(`from ${startAge}`);
  if (priority === 'harvest_first') parts.push('0% harvest first');
  return parts.join(', ');
}

/** Copy settings with the optimizer's sequencing applied (start age + priority). */
export function applySequencing(
  taxSettings: TaxSettings,
  result: Pick<OptimizerResult, 'startAge' | 'priority'>,
): TaxSettings {
  return { ...taxSettings, rothConversionStartAge: result.startAge, conversionPriority: result.priority };
}

function candidateStartAges(ssData: SSData, taxSettings: TaxSettings): (number | null)[] {
  const age = taxSettings.spouse1Age;
  const birthYear = 2026 - age;
  const rmdAge = birthYear >= 1960 ? 75 : 73;
  const ssAge = ssData.spouse1.alreadyClaiming ? age : ssData.spouse1.claimAge;
  const raw = [age + 3, age + 5, ssAge, rmdAge].filter((a) => a > age && a < 100);
  return [null, ...Array.from(new Set(raw)).sort((a, b) => a - b)];
}

/**
 * Score each candidate (conversion size x start age x harvest/conversion
 * priority) on After-Tax Equivalent: Trad − lump-sum federal tax, plus Roth,
 * plus Taxable net of LTCG. Uses the plan's actual ending taxable basis so
 * basis step-ups from harvesting are credited.
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

  const hasGains = accounts.taxable > 0 && startingBasisFraction < 1;
  const priorities: ConversionPriority[] =
    hasGains && taxSettings.autoHarvestCapitalGains !== false
      ? ['conversions_first', 'harvest_first']
      : ['conversions_first'];
  const startAges = candidateStartAges(ssData, taxSettings);

  const ranking: StrategyScore[] = [];
  for (const strategy of CANDIDATES) {
    const starts = strategy === 'none' ? [null] : startAges;
    const prios = strategy === 'none' ? (['conversions_first'] as ConversionPriority[]) : priorities;
    for (const startAge of starts) {
      for (const priority of prios) {
        const settings = applySequencing(taxSettings, { startAge, priority });
        const proj = calculateProjections(accounts, ssData, settings, strategy);
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

        const terminalGainFraction = last?.taxableCostBasis != null && terminalTaxable > 0
          ? Math.max(0, Math.min(1, 1 - last.taxableCostBasis / terminalTaxable))
          : gainFraction;
        const terminalAfterTax =
          (terminalTrad - lumpSumTax) +
          terminalRoth +
          terminalTaxable * (1 - ASSUMED_LTCG_RATE * terminalGainFraction);

        ranking.push({
          strategy,
          startAge,
          priority,
          label: describeSequencing(strategy, startAge, priority),
          terminalAfterTax,
          lifetimeTax,
        });
      }
    }
  }

  // Sort by after-tax wealth; ties (within $100) prefer the simpler plan
  // (earlier start, conversions-first) to keep results stable.
  ranking.sort((a, b) => {
    const d = b.terminalAfterTax - a.terminalAfterTax;
    if (Math.abs(d) > 100) return d;
    const sa = (a.startAge == null ? 0 : 1) + (a.priority === 'harvest_first' ? 1 : 0);
    const sb = (b.startAge == null ? 0 : 1) + (b.priority === 'harvest_first' ? 1 : 0);
    return sa - sb || d;
  });
  const top = ranking[0];
  return { best: top.strategy, startAge: top.startAge, priority: top.priority, label: top.label, ranking };
}

// Content-keyed LRU: identical inputs from Dashboard, Two-Pass, Comparison and
// Monte Carlo reuse one search, and changing accounts/SS invalidates correctly.
const CACHE = new Map<string, OptimizerResult>();
const CACHE_LIMIT = 24;
export function pickBestAfterTaxStrategyCached(
  accounts: Accounts,
  ssData: SSData,
  taxSettings: TaxSettings,
): OptimizerResult {
  const key = JSON.stringify([accounts, ssData, taxSettings]);
  const cached = CACHE.get(key);
  if (cached) {
    CACHE.delete(key);
    CACHE.set(key, cached);
    return cached;
  }
  const result = pickBestAfterTaxStrategy(accounts, ssData, taxSettings);
  CACHE.set(key, result);
  if (CACHE.size > CACHE_LIMIT) CACHE.delete(CACHE.keys().next().value as string);
  return result;
}

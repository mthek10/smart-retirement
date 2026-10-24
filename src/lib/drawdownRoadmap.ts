import type { ProjectionRow } from "@/hooks/useProjections";

export const DRAWDOWN_SOURCES = [
  { key: "traditionalWithdrawal", label: "Traditional IRA / 401(k)" },
  { key: "rothWithdrawal", label: "Roth" },
  { key: "taxableWithdrawal", label: "Brokerage" },
  { key: "netWages", label: "Net paycheck" },
  { key: "ssIncome", label: "Social Security" },
  { key: "pensionIncome", label: "Pension" },
] as const;

export type DrawdownRow = Pick<ProjectionRow,
  "year" | "age" | "traditionalWithdrawal" | "rothWithdrawal" | "taxableWithdrawal" |
  "withdrawals" | "netWages" | "ssIncome" | "pensionIncome" | "rmd" | "qcdAmount" |
  "acaIncomeCap" | "acaMagi" | "medicarePremiums" | "rothConversion" | "excessSavings" | "isSurvivorYear"
> & Partial<Pick<ProjectionRow, "totalTaxes" | "healthcareCost" | "irmaa" | "takeHome">>;

export interface TakeHomeBridge {
  cashIn: number;
  taxes: number;
  healthInsurance: number;
  reinvested: number;
  other: number;
  takeHome: number;
}

/**
 * Reconciles a year's cash in to its Take Home using the projection row's own values.
 * Taxes = the row's Total Taxes (includes Medicare B/D and IRMAA). Health insurance =
 * healthcare cost not already inside Total Taxes. "Other" absorbs remaining items
 * (cash charity, harvest tax paid from proceeds) so the bridge always equals Take Home.
 */
export function getTakeHomeBridge(row: DrawdownRow): TakeHomeBridge {
  const cashIn = row.withdrawals + row.netWages + row.ssIncome + row.pensionIncome;
  const taxes = row.totalTaxes ?? 0;
  const healthInsurance = Math.max(0, (row.healthcareCost ?? 0) - row.medicarePremiums - (row.irmaa ?? 0));
  const reinvested = row.excessSavings;
  const takeHome = row.takeHome ?? 0;
  const raw = cashIn - taxes - healthInsurance - reinvested - takeHome;
  const other = Math.abs(raw) < 1 ? 0 : raw;
  return { cashIn, taxes, healthInsurance, reinvested, other, takeHome };
}

export interface DrawdownPhase {
  first: DrawdownRow;
  last: DrawdownRow;
  years: number;
  sources: (typeof DRAWDOWN_SOURCES)[number][];
  minWithdrawal: number;
  maxWithdrawal: number;
}

/** Cash RMD portion; QCDs satisfy part of the requirement without funding spending. */
export function getCashRMD(row: Pick<DrawdownRow, "rmd" | "qcdAmount" | "traditionalWithdrawal">): number {
  return Math.min(row.traditionalWithdrawal, Math.max(0, row.rmd - row.qcdAmount));
}

/** Presentation-only grouping of consecutive years with the same funding sources and milestones. */
export function buildDrawdownRoadmap(rows: readonly DrawdownRow[]): DrawdownPhase[] {
  const phases: DrawdownPhase[] = [];
  let previousKey = "";
  for (const row of rows) {
    const sources = DRAWDOWN_SOURCES.filter(source => row[source.key] > 0);
    const key = JSON.stringify([
      sources.map(source => source.key), row.rmd > 0, row.acaIncomeCap > 0,
      row.acaIncomeCap > 0 && row.acaMagi > row.acaIncomeCap + 1,
      row.medicarePremiums > 0, row.rothConversion > 0, row.excessSavings > 0,
      row.isSurvivorYear,
    ]);
    const phase = phases[phases.length - 1];
    if (phase && key === previousKey && row.age === phase.last.age + 1) {
      phase.last = row;
      phase.years++;
      phase.minWithdrawal = Math.min(phase.minWithdrawal, row.withdrawals);
      phase.maxWithdrawal = Math.max(phase.maxWithdrawal, row.withdrawals);
    } else {
      phases.push({ first: row, last: row, years: 1, sources,
        minWithdrawal: row.withdrawals, maxWithdrawal: row.withdrawals });
    }
    previousKey = key;
  }
  return phases;
}
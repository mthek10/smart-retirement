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
>;

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
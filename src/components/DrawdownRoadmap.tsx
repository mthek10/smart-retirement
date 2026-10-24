import { memo, useMemo } from "react";
import { Compass } from "lucide-react";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { getTakeHomeBridge, type DrawdownRow } from "@/lib/drawdownRoadmap";
import { formatCurrency } from "@/lib/utils";

const money = (v: number) => (Math.abs(v) < 1 ? "—" : formatCurrency(v));

export const DrawdownRoadmap = memo(function DrawdownRoadmap({ projections }: { projections: DrawdownRow[] }) {
  const rows = useMemo(() => projections.map(r => ({ r, b: getTakeHomeBridge(r) })), [projections]);
  if (rows.length === 0) return null;
  const showOther = rows.some(({ b }) => Math.abs(b.other) >= 1);
  const show = {
    paycheck: projections.some(r => r.netWages > 0),
    ss: projections.some(r => r.ssIncome > 0),
    pension: projections.some(r => r.pensionIncome > 0),
    health: rows.some(({ b }) => b.healthInsurance >= 1),
    reinvested: rows.some(({ b }) => b.reinvested >= 1),
  };
  const th = "py-2 px-2 text-right font-medium whitespace-nowrap";
  const td = "py-1.5 px-2 text-right tabular-nums whitespace-nowrap";

  return (
    <section aria-labelledby="drawdown-roadmap-title" className="border-l-4 border-primary pl-4 sm:pl-6 text-foreground">
      <h2 id="drawdown-roadmap-title" className="flex items-center gap-2 text-xl font-semibold">
        <Compass className="h-5 w-5 shrink-0 text-primary" /> Drawdown Roadmap — Year by Year
        <InfoTooltip text="Each row shows exactly where that year's money comes from, minus taxes and costs, ending in the same Take Home as the yearly projection table. Amounts are projected dollars for that year. Roth conversions are transfers, not spending, and are not shown as draws." />
      </h2>
      <div className="mt-3 max-h-[600px] overflow-auto rounded border">
        <table className="w-full text-sm" aria-label="Year-by-year drawdown">
          <thead className="sticky top-0 bg-card">
            <tr className="border-b">
              <th className="py-2 px-2 text-left font-medium">Age</th>
              <th className="py-2 px-2 text-left font-medium">Year</th>
              <th className={th}>Traditional</th>
              <th className={th}>Roth</th>
              <th className={th}>Brokerage</th>
              {show.paycheck && <th className={th}>Net Paycheck</th>}
              {show.ss && <th className={th}>Social Security</th>}
              {show.pension && <th className={th}>Pension</th>}
              <th className={`${th} font-semibold`}>Total Cash In</th>
              <th className={th}>− Taxes</th>
              {show.health && <th className={th}>− Health Ins.</th>}
              {show.reinvested && <th className={th}>− Reinvested</th>}
              {showOther && <th className={th}>− Other</th>}
              <th className={`${th} font-semibold bg-primary/10`}>= Take Home</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ r, b }) => (
              <tr key={r.year} className="border-b">
                <td className="py-1.5 px-2 font-medium">{r.age}{r.rmd > 0 ? " · RMD" : ""}</td>
                <td className="py-1.5 px-2">{r.year}</td>
                <td className={td}>{money(r.traditionalWithdrawal)}</td>
                <td className={td}>{money(r.rothWithdrawal)}</td>
                <td className={td}>{money(r.taxableWithdrawal)}</td>
                {show.paycheck && <td className={td}>{money(r.netWages)}</td>}
                {show.ss && <td className={td}>{money(r.ssIncome)}</td>}
                {show.pension && <td className={td}>{money(r.pensionIncome)}</td>}
                <td className={`${td} font-semibold`}>{money(b.cashIn)}</td>
                <td className={td}>{money(b.taxes)}</td>
                {show.health && <td className={td}>{money(b.healthInsurance)}</td>}
                {show.reinvested && <td className={td}>{money(b.reinvested)}</td>}
                {showOther && <td className={td}>{money(b.other)}</td>}
                <td className={`${td} font-semibold bg-primary/10`}>{formatCurrency(b.takeHome)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs">Taxes include income taxes, Medicare premiums and IRMAA. "RMD" marks years with a required IRA withdrawal, included in Traditional.</p>
    </section>
  );
});

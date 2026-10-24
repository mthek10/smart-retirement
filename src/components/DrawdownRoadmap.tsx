import { memo, useMemo } from "react";
import { Compass } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { buildDrawdownRoadmap, getCashRMD, getTakeHomeBridge, type DrawdownRow, type TakeHomeBridge } from "@/lib/drawdownRoadmap";
import { formatCurrency } from "@/lib/utils";

export const DrawdownRoadmap = memo(function DrawdownRoadmap({ projections }: { projections: DrawdownRow[] }) {
  const phases = useMemo(() => buildDrawdownRoadmap(projections), [projections]);
  if (phases.length === 0) return null;

  return (
    <section aria-labelledby="drawdown-roadmap-title" className="border-l-4 border-primary pl-4 sm:pl-6 text-foreground">
      <h2 id="drawdown-roadmap-title" className="flex items-center gap-2 text-xl font-semibold">
        <Compass className="h-5 w-5 shrink-0 text-primary" /> Drawdown Roadmap
        <InfoTooltip text="Consecutive years are grouped by their actual funding sources and changes in RMDs, ACA limits, Medicare premiums, conversions, or surplus savings. Amounts are projected dollars for each year, not today's dollars." />
      </h2>
      <Accordion type="multiple" defaultValue={[String(phases[0].first.year)]} className="mt-3">
        {phases.map(phase => {
          const { first, last } = phase;
          const ageLabel = first.age === last.age ? `Age ${first.age}` : `Ages ${first.age}–${last.age}`;
          return (
            <AccordionItem key={first.year} value={String(first.year)}>
              <AccordionTrigger className="gap-3 text-left hover:no-underline">
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="font-semibold">{ageLabel} <span className="font-normal text-xs">· {first.year}{first.year !== last.year ? `–${last.year}` : ""}</span></p>
                  <p className="text-sm font-normal break-words">{phase.sources.map(source => source.label).join(" + ") || "No recurring income or account draws"}</p>
                  <p className="text-xs font-normal">Account draws: <span className="font-semibold">{formatCurrency(phase.minWithdrawal)}{phase.maxWithdrawal !== phase.minWithdrawal ? `–${formatCurrency(phase.maxWithdrawal)}` : ""}</span> / year</p>
                </div>
              </AccordionTrigger>
              <AccordionContent className="text-foreground">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" aria-label={`Funding sources ${ageLabel}`}>
                    <thead><tr className="border-b"><th className="py-2 text-left font-medium">Source</th><th className="py-2 pl-3 text-right whitespace-nowrap font-medium">Age {first.age}</th>{phase.years > 1 && <th className="py-2 pl-3 text-right whitespace-nowrap font-medium">Age {last.age}</th>}</tr></thead>
                    <tbody>
                      {phase.sources.map(source => <tr key={source.key} className="border-b"><td className="py-2">{source.label}</td><td className="py-2 pl-3 text-right tabular-nums">{formatCurrency(first[source.key])}</td>{phase.years > 1 && <td className="py-2 pl-3 text-right tabular-nums">{formatCurrency(last[source.key])}</td>}</tr>)}
                      {(() => {
                        const a = getTakeHomeBridge(first);
                        const b = getTakeHomeBridge(last);
                        const lines: [string, keyof TakeHomeBridge, boolean][] = [
                          ["Total cash in", "cashIn", true],
                          ["− Income taxes (incl. Medicare & IRMAA)", "taxes", false],
                          ["− Health insurance (after ACA credit)", "healthInsurance", false],
                          ["− Surplus reinvested in Brokerage", "reinvested", false],
                          ["− Other (cash charity, adjustments)", "other", false],
                        ];
                        return <>
                          {lines.filter(([, k, always]) => always || Math.abs(a[k]) >= 1 || Math.abs(b[k]) >= 1).map(([label, k, bold]) => (
                            <tr key={k} className={bold ? "border-b font-semibold" : "border-b"}><td className="py-2">{label}</td><td className="py-2 pl-3 text-right tabular-nums">{formatCurrency(a[k])}</td>{phase.years > 1 && <td className="py-2 pl-3 text-right tabular-nums">{formatCurrency(b[k])}</td>}</tr>
                          ))}
                          <tr className="font-semibold bg-primary/10"><td className="py-2 pl-1">= Take Home (matches yearly table)</td><td className="py-2 pl-3 text-right tabular-nums">{formatCurrency(a.takeHome)}</td>{phase.years > 1 && <td className="py-2 pl-3 pr-1 text-right tabular-nums">{formatCurrency(b.takeHome)}</td>}</tr>
                        </>;
                      })()}
                    </tbody>
                  </table>
                </div>
                <ul className="mt-3 space-y-1 text-xs leading-relaxed">
                  {first.rmd > 0 && <li>Required IRA cash draw at age {first.age}: {formatCurrency(getCashRMD(first))}, included in Traditional draws.{first.qcdAmount > 0 ? ` A separate ${formatCurrency(first.qcdAmount)} charitable IRA distribution also counts toward the RMD.` : ""}</li>}
                  {first.acaIncomeCap > 0 && <li>{first.acaMagi > first.acaIncomeCap + 1 ? "Income exceeds the selected ACA limit in this phase." : "Projected income stays within the selected ACA limit in this phase."} Brokerage draws may include both principal and taxable gains.</li>}
                  {first.rothConversion > 0 && <li>Roth conversions are account transfers, not spending money, and are excluded from account draws.</li>}
                  {first.excessSavings > 0 && <li>Income left after spending and obligations is reinvested in Brokerage.</li>}
                </ul>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </section>
  );
});
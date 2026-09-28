// Personalized tax-planning recommendations around a state relocation.
// Pure module so it can be unit-tested without the UI.
import { getNextIRMAAThreshold } from './taxCalculations';
import type { RelocationDirection } from './relocationChecklist';

export type TaxTiming = 'before' | 'after';

export interface TaxChecklistItem {
  text: string;
  detail?: string;
  timing: TaxTiming;
}

export interface TaxChecklistSection {
  title: string;
  items: TaxChecklistItem[];
}

export interface TaxChecklistRow {
  age: number;
  year: number;
  rothConversion: number;
  capitalGainsHarvested: number;
  capitalGainsHarvested15: number;
  ssIncome: number;
  pensionIncome: number;
  ordinaryIncome: number;
  capitalGainsIncome: number;
  taxableBalance: number;
  taxableCostBasis?: number;
  traditionalBalance: number;
}

export interface RelocationTaxChecklistInput {
  fromState: string;
  toState: string;
  relocationAge: number;
  currentAge: number;
  spouseAge?: number | null;
  filingStatus: string;
  direction: RelocationDirection;
  currentStateRate: number; // decimal
  targetStateRate: number; // decimal
  rows: TaxChecklistRow[];
  inflationRate: number; // decimal
  acaEnabled: boolean;
  ssClaimAge: number;
  /** Household is currently a New York City resident (adds NYC local income tax). */
  fromNycResident?: boolean;
  /** Household will be a New York City resident after the move. */
  toNycResident?: boolean;
  formatMoney?: (n: number) => string;
}

// States that tax Social Security benefits (2026, with income-based exemptions in most)
export const STATES_TAXING_SS = ['CO', 'CT', 'MN', 'MT', 'NM', 'RI', 'UT', 'VT'];
const RMD_AGE = 73;

const fmt = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;
const pct = (r: number) => `${(r * 100).toFixed(1)}%`;

export function buildRelocationTaxChecklist(input: RelocationTaxChecklistInput): TaxChecklistSection[] {
  const money = input.formatMoney ?? fmt;
  const {
    fromState, toState, relocationAge, currentAge, filingStatus, direction,
    currentStateRate, targetStateRate, rows, inflationRate, acaEnabled, ssClaimAge,
  } = input;
  const married = filingStatus.toLowerCase().includes('married') || filingStatus === 'mfj';
  const irmaaStatus = married ? 'married' : 'single';
  const from = fromState && !['other', 'none'].includes(fromState) ? fromState : 'your current state';
  const to = toState;
  const yearsUntil = Math.max(0, relocationAge - currentAge);
  const baseYear = rows[0]?.year ?? 2026;
  const moveYear = baseYear + yearsUntil;
  const spouseAgeAtMove = married && input.spouseAge != null ? input.spouseAge + yearsUntil : null;
  const agesAtMove = [relocationAge, ...(spouseAgeAtMove != null ? [spouseAgeAtMove] : [])];
  const rateDiff = targetStateRate - currentStateRate; // + means new state costs more
  const absDiff = Math.abs(rateDiff);
  const pre = rows.filter(r => r.age < relocationAge);
  const post = rows.filter(r => r.age >= relocationAge);
  const moveRow = post[0] ?? rows[rows.length - 1];
  const magi = (r: TaxChecklistRow) => (r.ordinaryIncome || 0) + (r.capitalGainsIncome || 0);
  const sections: TaxChecklistSection[] = [];

  // 1. Roth conversions
  {
    const items: TaxChecklistItem[] = [];
    const preRoth = pre.reduce((s, r) => s + (r.rothConversion || 0), 0);
    const postPreRmd = post.filter(r => r.age < RMD_AGE);
    const postRoth = postPreRmd.reduce((s, r) => s + (r.rothConversion || 0), 0);
    const tradAtMove = moveRow?.traditionalBalance || 0;
    if (direction === 'higher') {
      const perYear = pre.length > 0 ? preRoth / pre.length : 0;
      items.push({
        timing: 'before',
        text: preRoth > 0
          ? `Convert about ${money(perYear)}/year (${money(preRoth)} total) to Roth in the ${pre.length} year${pre.length === 1 ? '' : 's'} before ${moveYear}.`
          : `Pull Roth conversions forward into the years before ${moveYear}${tradAtMove > 0 ? ` (Traditional balance ~${money(tradAtMove)} at the move)` : ''}.`,
        detail: `${to}'s estimated rate is ${pct(targetStateRate)} vs ${pct(currentStateRate)} in ${from}; that saves about ${money(absDiff * Math.max(preRoth, 10000))} in state tax${preRoth > 0 ? '' : ' per $10k converted'}.`,
      });
    } else if (tradAtMove > 0 || preRoth > 0 || postRoth > 0) {
      items.push({
        timing: 'before',
        text: `Pause or shrink Roth conversions in the years right before the move${preRoth > 0 ? ` (your plan converts ${money(preRoth)} before ${moveYear})` : ''}.`,
        detail: `Each $10,000 converted after the move saves about ${money(absDiff * 10000)} in state tax (${pct(currentStateRate)} → ${pct(targetStateRate)}).`,
      });
      items.push({
        timing: 'after',
        text: `Restart conversions once you are a full-year ${to} resident (${moveYear + 1} is the first clean year).`,
        detail: 'In the move year, income received before the move date is taxed by the old state on the part-year return.',
      });
    }
    if (postPreRmd.length > 0) {
      items.push({
        timing: 'after',
        text: `You have ${postPreRmd.length} year${postPreRmd.length === 1 ? '' : 's'} after the move before RMDs begin at ${RMD_AGE}${postRoth > 0 ? `; the plan converts ${money(postRoth)} in that window` : ''}.`,
        detail: 'Use these low-income years to fill the lower federal brackets before RMDs and Social Security push income up.',
      });
    }
    if (items.length) sections.push({ title: 'Roth conversions', items });
  }

  // 2. Capital gains & harvesting
  {
    const items: TaxChecklistItem[] = [];
    const bal = moveRow?.taxableBalance || 0;
    const basis = moveRow?.taxableCostBasis ?? bal;
    const gains = Math.max(0, bal - basis);
    const preHarvest = pre.reduce((s, r) => s + (r.capitalGainsHarvested || 0) + (r.capitalGainsHarvested15 || 0), 0);
    if (gains > 1000 || bal > 0) {
      items.push({
        timing: direction === 'higher' ? 'before' : 'after',
        text: direction === 'higher'
          ? `Realize appreciated positions before the move — about ${money(gains)} of unrealized gains is projected at ${moveYear}.`
          : `Hold appreciated positions until after the move — about ${money(gains)} of unrealized gains is projected at ${moveYear}.`,
        detail: `State tax difference on those gains: about ${money(gains * absDiff)}.`,
      });
    }
    items.push({
      timing: direction === 'higher' ? 'before' : 'after',
      text: preHarvest > 0
        ? `Keep using the 0% federal bracket: your plan harvests ${money(preHarvest)} of gains before the move.`
        : 'Turn on Auto-harvest 0% LTCG (Tax Settings) to use the 0% federal bracket in low-income years around the move.',
      detail: direction === 'higher'
        ? `Federal 0% gains are still taxed by the state — harvesting while in ${from} is cheaper.`
        : `Federal 0% gains are still taxed by ${from}; harvesting after the move${direction === 'zero' ? ' is completely tax-free' : ' costs less'}.`,
    });
    items.push({
      timing: direction === 'higher' ? 'after' : 'before',
      text: `Harvest losses in the higher-tax state year (${direction === 'higher' ? `after moving to ${to}` : `while still in ${from}`}).`,
      detail: 'Losses offset gains plus up to $3,000 of ordinary income; unused losses carry forward federally, but some states don\'t honor carryforwards from a prior residency.',
    });
    if (to === 'WA') {
      items.push({ timing: 'after', text: 'Keep annual long-term gains under about $250,000 to avoid Washington\'s 7% capital gains excise tax.' });
    }
    sections.push({ title: 'Capital gains & tax-loss harvesting', items });
  }

  // 3. State income tax
  {
    const lastPre = pre[pre.length - 1];
    const firstFull = post[1] ?? post[0];
    const items: TaxChecklistItem[] = [
      {
        timing: 'before',
        text: `Estimated state rate goes from ${pct(currentStateRate)} (${from}) to ${pct(targetStateRate)} (${to}).`,
        detail: lastPre && firstFull
          ? `Year before move: ~${money(magi(lastPre) * currentStateRate)} state tax. First full year after: ~${money(magi(firstFull) * targetStateRate)}.`
          : undefined,
      },
      {
        timing: 'after',
        text: `File part-year returns for ${moveYear}: split wages, IRA withdrawals, conversions and gains by the date received.`,
      },
      {
        timing: 'after',
        text: `Federal law (4 U.S.C. §114) stops ${from} from taxing your pension and IRA distributions after you move — but ${from} can still tax rental income, business income and some deferred compensation sourced there.`,
      },
    ];
    if (direction !== 'zero') {
      items.push({ timing: 'after', text: `Claim ${to}'s retirement income exclusions (pension/IRA/age-based) on your first ${to} return.` });
    }
    if (input.fromNycResident) {
      items.push({
        timing: 'before',
        text: 'Leaving New York City also ends the NYC local income tax (3.08% – 3.88%) — but only once you change domicile, not just your mailing address.',
        detail: 'NYC tax follows domicile. Keep dated evidence of the move (lease/deed, driver\'s license, voter registration, where you spend your days). Staying 184+ days in the city with a residence there can keep you taxable as a statutory resident.',
      });
      items.push({
        timing: 'before',
        text: 'Do large Roth conversions and gain realizations after you leave NYC, not before — each $100,000 converted while a city resident costs about $3,900 in NYC tax alone.',
      });
    }
    if (input.toNycResident) {
      items.push({
        timing: 'before',
        text: 'Moving into New York City adds a local income tax of 3.08% – 3.88% on top of New York State tax — realize gains and complete Roth conversions before the move.',
        detail: 'NYC tax applies to IRA/401(k) withdrawals, pensions, Roth conversions and capital gains. Social Security is exempt.',
      });
    }
    sections.push({ title: 'State income tax', items });
  }

  // 4. Social Security
  {
    const items: TaxChecklistItem[] = [];
    const toTaxes = STATES_TAXING_SS.includes(to);
    const fromTaxes = STATES_TAXING_SS.includes(fromState);
    items.push({
      timing: 'after',
      text: toTaxes
        ? `${to} taxes Social Security (with income-based exemptions) — check whether your benefit qualifies for its exemption.`
        : `${to} does not tax Social Security benefits${fromTaxes ? ` (${from} does, so this is a saving)` : ''}.`,
    });
    items.push({
      timing: ssClaimAge < relocationAge ? 'before' : 'after',
      text: ssClaimAge < relocationAge
        ? `You claim at ${ssClaimAge}, before the move at ${relocationAge}: move-year gains or conversions raise provisional income and can make up to 85% of benefits federally taxable.`
        : `You claim at ${ssClaimAge}, after the move at ${relocationAge}: do big conversions and gain realizations before claiming to avoid the Social Security "tax torpedo".`,
    });
    sections.push({ title: 'Social Security', items });
  }

  // 5. IRMAA — only if anyone is 63+ within two years of the move
  {
    const window = rows.filter(r => r.age >= relocationAge - 2 && r.age <= relocationAge + 2 && r.age >= 63);
    const anyone63 = agesAtMove.some(a => a + 2 >= 63);
    if (window.length > 0 && anyone63) {
      const items: TaxChecklistItem[] = [];
      for (const r of window) {
        const idx = r.year - baseYear;
        const th = getNextIRMAAThreshold(magi(r), idx, inflationRate, irmaaStatus);
        items.push({
          timing: r.age < relocationAge ? 'before' : 'after',
          text: `Age ${r.age} (${r.year}): projected MAGI ${money(magi(r))}${th ? `, next IRMAA threshold ${money(th)} (room ${money(Math.max(0, th - magi(r)))})` : ' — already in the top IRMAA tier'}.`,
          detail: `Sets your Medicare premiums for ${r.year + 2}.`,
        });
      }
      items.push({
        timing: 'after',
        text: 'If premiums jump because of a one-time income spike after retiring, file Form SSA-44 (work stoppage) — a move alone does not qualify.',
      });
      sections.push({ title: 'IRMAA & Medicare', items });
    }
  }

  // 6. ACA — only if anyone under 65 at move
  if (acaEnabled && agesAtMove.some(a => a < 65)) {
    const moveMagi = moveRow ? magi(moveRow) : 0;
    sections.push({
      title: 'ACA health insurance',
      items: [
        {
          timing: 'before',
          text: `Keep ${moveYear} MAGI (projected ${money(moveMagi)}) below 400% of the poverty level to keep the premium credit.`,
          detail: 'The move year counts all income for the year, including gains and conversions made before the move.',
        },
        {
          timing: 'after',
          text: `Re-enroll on the ${to} marketplace within 60 days and update projected income — benchmark premiums vary a lot by area.`,
        },
      ],
    });
  }

  // 7. Follow-up
  sections.push({
    title: 'After-move follow-up',
    items: [
      { timing: 'after', text: `Update withholding and quarterly estimates for ${direction === 'zero' ? 'federal only' : `federal and ${to}`}.` },
      { timing: 'after', text: `Recheck the Roth conversion and harvesting plan at ${to}'s rate, then rerun the projections here.` },
    ],
  });

  return sections;
}

// Builds a personalized, phased to-do list for a planned state relocation.
// Pure function so it can be unit-tested independently of the UI.

export type RelocationDirection = 'higher' | 'lower' | 'zero';

export interface ChecklistItem {
  text: string;
  detail?: string;
}

export interface ChecklistPhase {
  title: string;
  items: ChecklistItem[];
}

export interface RelocationChecklistInput {
  fromState: string;
  toState: string;
  relocationAge: number;
  currentAge: number;
  spouseAge?: number | null; // current age of spouse; null/undefined for single filers
  filingStatus: string;
  direction: RelocationDirection;
  hasEmployment: boolean;
  claimingSS: boolean;
  hasPension: boolean;
  rothPlanned: number; // conversions planned before the move
  gainsPlanned: number; // gains realized before the move
  baseYear: number; // calendar year of currentAge
  formatMoney?: (n: number) => string;
}

// States known for aggressive residency / domicile audits of former residents
export const HIGH_AUDIT_STATES = ['CA', 'NY', 'NJ', 'MA', 'MN', 'OR', 'IL', 'CT', 'VA', 'WI'];
// States offering a formal Declaration of Domicile filing
export const DOMICILE_DECLARATION_STATES = ['FL'];

const fmt = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;

export function buildRelocationChecklist(input: RelocationChecklistInput): ChecklistPhase[] {
  const money = input.formatMoney ?? fmt;
  const {
    fromState, toState, relocationAge, currentAge, filingStatus, direction,
    hasEmployment, claimingSS, hasPension, rothPlanned, gainsPlanned, baseYear,
  } = input;
  const isMarried = filingStatus === 'married_filing_jointly' || filingStatus === 'mfj' || filingStatus.toLowerCase().includes('married');
  const yearsUntil = Math.max(0, relocationAge - currentAge);
  const moveYear = baseYear + yearsUntil;
  const spouseAgeAtMove = isMarried && input.spouseAge != null ? input.spouseAge + yearsUntil : null;
  const agesAtMove = [relocationAge, ...(spouseAgeAtMove != null ? [spouseAgeAtMove] : [])];
  const anyoneUnder65 = agesAtMove.some(a => a < 65);
  const anyone65Plus = agesAtMove.some(a => a >= 65);
  const from = fromState && fromState !== 'other' && fromState !== 'none' ? fromState : 'your current state';
  const to = toState;
  const newStateHasTax = direction !== 'zero';

  // ---------- Phase 1 ----------
  const p1: ChecklistItem[] = [];
  if (direction === 'higher') {
    if (rothPlanned > 0 || gainsPlanned > 0) {
      p1.push({
        text: `Complete planned moves while still a ${from} resident: ${[
          rothPlanned > 0 ? `${money(rothPlanned)} of Roth conversions` : '',
          gainsPlanned > 0 ? `${money(gainsPlanned)} of capital gains` : '',
        ].filter(Boolean).join(' and ')} before ${moveYear}.`,
        detail: `${to} taxes this income at a higher rate, so recognizing it now locks in ${from}'s lower rate.`,
      });
    } else {
      p1.push({
        text: `Accelerate Roth conversions and capital-gain sales into years before ${moveYear}.`,
        detail: `${to} has a higher tax rate than ${from}.`,
      });
    }
    p1.push({ text: 'Time one-off income (bonuses, stock options/RSUs, property sales) to land before the move date.' });
  } else {
    p1.push({
      text: `Delay large optional income until after you become a ${to} resident in ${moveYear}.`,
      detail: rothPlanned > 0 || gainsPlanned > 0
        ? `Your plan currently realizes ${[
            rothPlanned > 0 ? `${money(rothPlanned)} in Roth conversions` : '',
            gainsPlanned > 0 ? `${money(gainsPlanned)} in gains` : '',
          ].filter(Boolean).join(' and ')} before the move — consider shifting some of it to after the move to avoid ${from} tax.`
        : `Roth conversions, big capital-gain sales and stock-option exercises are taxed less (or not at all) in ${to}.`,
    });
    p1.push({ text: 'Time one-off income (bonuses, stock options/RSUs, a home sale gain above the exclusion) for after the move date.' });
  }
  p1.push({
    text: `Compare how ${from} and ${to} tax retirement income${hasPension ? ' (including your pension)' : ''}, IRA withdrawals${claimingSS ? ' and Social Security' : ''}.`,
  });
  if (HIGH_AUDIT_STATES.includes(fromState)) {
    p1.push({
      text: `Book a review with a tax professional familiar with ${fromState} residency audits.`,
      detail: `${fromState} is known for auditing former residents; plan a clean break and keep records from day one.`,
    });
  }
  if (to === 'WA') {
    p1.push({ text: 'Note Washington\'s 7% excise tax on long-term capital gains above about $250,000 per year — spread large sales across years.' });
  }

  // ---------- Phase 2 ----------
  const p2: ChecklistItem[] = [
    { text: `Choose a move date in ${moveYear} and expect part-year resident returns in both ${from} and ${to} for that year.` },
    { text: `Compare property tax, homeowner's insurance and cost of living in ${to} before buying or renting.` },
  ];
  if (anyoneUnder65) {
    p2.push({
      text: 'Line up new health coverage: a permanent move is a qualifying life event for the ACA Marketplace.',
      detail: `You have 60 days after the move to enroll in a ${to} plan; premiums and subsidies change with the new area.`,
    });
  }
  if (anyone65Plus) {
    p2.push({
      text: `Check Medicare coverage in ${to}: Medicare Advantage and Part D plans are regional and must be replaced after moving.`,
      detail: 'A move gives a Special Enrollment Period; Medigap may require underwriting in some states, so review it before you go.',
    });
  }
  p2.push({ text: `Have an attorney review your will, trust, power of attorney and healthcare directive under ${to} law.` });

  // ---------- Phase 3 ----------
  const p3: ChecklistItem[] = [
    { text: 'Keep dated proof of the move: moving contract, lease or closing papers, utility start/stop notices.' },
    { text: `Update your address with USPS, the IRS (Form 8822)${claimingSS ? ', Social Security' : ''}${hasPension ? ', your pension payer' : ''}, brokerages and IRA custodians.` },
  ];
  const withholdingSources = [
    hasEmployment ? 'your paycheck' : '',
    hasPension ? 'your pension' : '',
    'IRA distributions',
  ].filter(Boolean).join(', ');
  p3.push({
    text: newStateHasTax
      ? `Switch state tax withholding on ${withholdingSources} from ${from} to ${to}.`
      : `Stop ${from} state tax withholding on ${withholdingSources} (${to} has no income tax).`,
  });
  p3.push({ text: `Stop ${from} estimated tax payments after your final required payment.` });

  // ---------- Phase 4 ----------
  const p4: ChecklistItem[] = [
    { text: `Get a ${to} driver's license, register your vehicles and register to vote in ${to}.` },
  ];
  if (DOMICILE_DECLARATION_STATES.includes(to)) {
    p4.push({ text: `File a Declaration of Domicile with your ${to} county clerk.` });
  }
  p4.push(
    { text: `Apply for the ${to} homestead exemption if you own your new home (deadlines are often early in the year).` },
    { text: 'Move your primary doctors, bank accounts, safe-deposit box, memberships and community ties.' },
    { text: `Sell your ${from} home or convert it to a rental — keeping it available for your own use weakens the residency change.` },
    { text: 'Start a day-count log of time spent in each state.' },
  );

  // ---------- Phase 5 ----------
  const p5: ChecklistItem[] = [
    { text: `File part-year resident returns for ${moveYear} in ${from}${newStateHasTax ? ` and ${to}` : ''}, splitting income by the move date.` },
  ];
  if (newStateHasTax) {
    p5.push({ text: `Set up ${to} estimated payments if withholding won't cover your ${to} tax, and confirm its retirement income exclusions were applied.` });
  }
  p5.push({ text: 'Keep a residency file (day logs, bills, license, voter card) for at least 3–4 years after the move.' });

  return [
    { title: `12+ months before the move (by ${moveYear - 1})`, items: p1 },
    { title: '3–6 months before the move', items: p2 },
    { title: `Moving month (${moveYear})`, items: p3 },
    { title: 'First 30–90 days after the move', items: p4 },
    { title: `First tax season after the move (${moveYear + 1})`, items: p5 },
  ];
}

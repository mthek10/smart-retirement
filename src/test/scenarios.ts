import type { Accounts, SSData, TaxSettings } from "@/hooks/useProjections";

export interface Scenario { name: string; accounts: Accounts; ss: SSData; tax: TaxSettings }

const emp = (o: Partial<TaxSettings["spouse1Employment"]> = {}) => ({
  currentIncome: 0, retirementAge: 60, contributes401k: false, contribution401kAmount: 0,
  roth401kAmount: 0, employerMatchAmount: 0, pension: { monthlyAmount: 0, startAge: 65, cola: 0 }, ...o,
});

export const accounts = (o: Partial<Accounts> = {}): Accounts => ({
  spouse1Traditional: 1_000_000, spouse2Traditional: 0, roth: 200_000, taxable: 500_000,
  traditionalReturn: 5, rothReturn: 5, taxableReturn: 5, taxableCostBasisPercent: 50,
  qualifiedDividendYield: 0, ordinaryDividendYield: 0, ...o,
});

export const ss = (b1 = 3000, b2 = 0, claim = 67): SSData => ({
  spouse1: { estimatedBenefit: b1, claimAge: claim, lifeExpectancy: 95 },
  spouse2: { estimatedBenefit: b2, claimAge: claim, lifeExpectancy: 95 },
});

export const tax = (o: Partial<TaxSettings> = {}): TaxSettings => ({
  filingStatus: "single", state: "other", stateRate: 5, spouse1Age: 60, spouse2Age: 0,
  targetTakeHome: 100_000, inflationRate: 2.5, rothConversionStrategy: "none", rothConversionCustom: 0,
  preSurvivorStrategy: "fill_22",
  acaSettings: { enabled: false, householdSize: 1, customBenchmarkPremium: 0, annualHealthInsuranceCost: 6000 },
  spouse1Employment: emp(), spouse2Employment: emp({ retirementAge: 0 }),
  survivorSettings: { enabled: false, spouse1DeathAge: null, spouse2DeathAge: null, survivorSpendingPercent: 75 },
  stateRelocation: { enabled: false, targetState: "FL", relocationAge: 65 },
  ...o,
});

const mfj = { filingStatus: "married", spouse2Age: 58 } as const;

export const SCENARIOS: Scenario[] = [
  { name: "single-baseline", accounts: accounts(), ss: ss(), tax: tax() },
  { name: "single-fill22-irmaa-cap", accounts: accounts({ spouse1Traditional: 1_500_000 }), ss: ss(), tax: tax({ rothConversionStrategy: "fill_22", neverTriggerIRMAA: true }) },
  { name: "mfj-fill24-harvest15", accounts: accounts({ spouse1Traditional: 1_500_000, spouse2Traditional: 500_000 }), ss: ss(3000, 2000), tax: tax({ ...mfj, rothConversionStrategy: "fill_24", targetTakeHome: 150_000, harvestFifteenBracket: true }) },
  { name: "mfj-auto", accounts: accounts({ spouse1Traditional: 1_200_000, spouse2Traditional: 400_000 }), ss: ss(2800, 1800), tax: tax({ ...mfj, rothConversionStrategy: "maximize_after_tax", targetTakeHome: 120_000 }) },
  { name: "hoh-working-pension", accounts: accounts(), ss: ss(2500, 0, 68), tax: tax({ filingStatus: "head_of_household", spouse1Age: 55, spouse1Employment: emp({ currentIncome: 120_000, retirementAge: 62, contributes401k: true, contribution401kAmount: 20_000, employerMatchAmount: 5_000, pension: { monthlyAmount: 1500, startAge: 65, cola: 2 } }) }) },
  { name: "single-already-claiming-qcd", accounts: accounts({ spouse1Traditional: 1_500_000 }), ss: { ...ss(), spouse1: { estimatedBenefit: 2800, claimAge: 70, lifeExpectancy: 95, alreadyClaiming: true, claimedAtAge: 68 } as SSData["spouse1"] }, tax: tax({ spouse1Age: 70, targetTakeHome: 80_000, charitableGiving: { enabled: true, annualAmount: 20_000, startAge: 72, endAge: 90, fundingSource: "qcd", otherItemizedDeductions: 0 } }) },
  { name: "mfj-aca-relocation", accounts: accounts(), ss: ss(2500, 1500), tax: tax({ ...mfj, state: "CA", stateRate: 9.3, targetTakeHome: 70_000, acaSettings: { enabled: true, householdSize: 2, customBenchmarkPremium: 0, annualHealthInsuranceCost: 18_000 }, stateRelocation: { enabled: true, targetState: "FL", relocationAge: 64 } }) },
  { name: "mfj-survivor-lifeevents", accounts: accounts({ spouse2Traditional: 300_000 }), ss: ss(3000, 2000), tax: tax({ ...mfj, rothConversionStrategy: "fill_12", survivorSettings: { enabled: true, spouse1DeathAge: 80, spouse2DeathAge: null, survivorSpendingPercent: 75 }, lifeEvents: [
    { id: "car", label: "Car", type: "expense", amount: 40_000, age: 66, taxable: false },
    { id: "home", label: "Home", type: "income", amount: 700_000, age: 70, taxable: true, subtype: "home_sale", salePrice: 700_000, costBasis: 250_000, sellingCosts: 40_000, qualifiesForSection121: true },
  ] as TaxSettings["lifeEvents"] }) },
];

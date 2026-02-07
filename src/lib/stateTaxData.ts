// State tax data extracted from taxCalculations.ts for maintainability

export interface StateTaxBracket {
  min: number;
  max: number;
  rate: number;
}

export interface StateTaxData {
  hasIncomeTax: boolean;
  taxType: 'flat' | 'progressive' | 'none';
  flatRate?: number;
  brackets?: StateTaxBracket[];
  capitalGainsAsOrdinary: boolean;
}

// Comprehensive state tax data for 2025
export const stateTaxData: Record<string, StateTaxData> = {
  AL: { hasIncomeTax: true, taxType: 'progressive', brackets: [
    { min: 0, max: 500, rate: 0.02 }, { min: 500, max: 3000, rate: 0.04 }, { min: 3000, max: Infinity, rate: 0.05 }
  ], capitalGainsAsOrdinary: true },
  AK: { hasIncomeTax: false, taxType: 'none', capitalGainsAsOrdinary: false },
  AZ: { hasIncomeTax: true, taxType: 'flat', flatRate: 0.025, capitalGainsAsOrdinary: true },
  AR: { hasIncomeTax: true, taxType: 'progressive', brackets: [
    { min: 0, max: 5099, rate: 0.02 }, { min: 5099, max: 10299, rate: 0.03 }, { min: 10299, max: Infinity, rate: 0.045 }
  ], capitalGainsAsOrdinary: true },
  CA: { hasIncomeTax: true, taxType: 'progressive', brackets: [
    { min: 0, max: 10412, rate: 0.01 }, { min: 10412, max: 24684, rate: 0.02 }, { min: 24684, max: 38959, rate: 0.04 },
    { min: 38959, max: 54081, rate: 0.06 }, { min: 54081, max: 68350, rate: 0.08 }, { min: 68350, max: 349137, rate: 0.093 },
    { min: 349137, max: 418961, rate: 0.103 }, { min: 418961, max: 698271, rate: 0.113 }, { min: 698271, max: Infinity, rate: 0.123 }
  ], capitalGainsAsOrdinary: true },
  CO: { hasIncomeTax: true, taxType: 'flat', flatRate: 0.044, capitalGainsAsOrdinary: true },
  CT: { hasIncomeTax: true, taxType: 'progressive', brackets: [
    { min: 0, max: 10000, rate: 0.02 }, { min: 10000, max: 50000, rate: 0.045 }, { min: 50000, max: 100000, rate: 0.055 },
    { min: 100000, max: 200000, rate: 0.06 }, { min: 200000, max: 250000, rate: 0.065 }, { min: 250000, max: 500000, rate: 0.069 },
    { min: 500000, max: Infinity, rate: 0.0699 }
  ], capitalGainsAsOrdinary: true },
  DE: { hasIncomeTax: true, taxType: 'progressive', brackets: [
    { min: 0, max: 2000, rate: 0 }, { min: 2000, max: 5000, rate: 0.022 }, { min: 5000, max: 10000, rate: 0.039 },
    { min: 10000, max: 20000, rate: 0.048 }, { min: 20000, max: 25000, rate: 0.052 }, { min: 25000, max: 60000, rate: 0.0555 },
    { min: 60000, max: Infinity, rate: 0.066 }
  ], capitalGainsAsOrdinary: true },
  DC: { hasIncomeTax: true, taxType: 'progressive', brackets: [
    { min: 0, max: 10000, rate: 0.04 }, { min: 10000, max: 40000, rate: 0.06 }, { min: 40000, max: 60000, rate: 0.065 },
    { min: 60000, max: 250000, rate: 0.085 }, { min: 250000, max: 500000, rate: 0.0925 }, { min: 500000, max: 1000000, rate: 0.0975 },
    { min: 1000000, max: Infinity, rate: 0.1075 }
  ], capitalGainsAsOrdinary: true },
  FL: { hasIncomeTax: false, taxType: 'none', capitalGainsAsOrdinary: false },
  GA: { hasIncomeTax: true, taxType: 'flat', flatRate: 0.0549, capitalGainsAsOrdinary: true },
  HI: { hasIncomeTax: true, taxType: 'progressive', brackets: [
    { min: 0, max: 2400, rate: 0.014 }, { min: 2400, max: 4800, rate: 0.032 }, { min: 4800, max: 9600, rate: 0.055 },
    { min: 9600, max: 14400, rate: 0.064 }, { min: 14400, max: 19200, rate: 0.068 }, { min: 19200, max: 24000, rate: 0.072 },
    { min: 24000, max: 36000, rate: 0.076 }, { min: 36000, max: 48000, rate: 0.079 }, { min: 48000, max: 150000, rate: 0.0825 },
    { min: 150000, max: 175000, rate: 0.09 }, { min: 175000, max: 200000, rate: 0.10 }, { min: 200000, max: Infinity, rate: 0.11 }
  ], capitalGainsAsOrdinary: true },
  ID: { hasIncomeTax: true, taxType: 'flat', flatRate: 0.058, capitalGainsAsOrdinary: true },
  IL: { hasIncomeTax: true, taxType: 'flat', flatRate: 0.0495, capitalGainsAsOrdinary: true },
  IN: { hasIncomeTax: true, taxType: 'flat', flatRate: 0.0315, capitalGainsAsOrdinary: true },
  IA: { hasIncomeTax: true, taxType: 'flat', flatRate: 0.0385, capitalGainsAsOrdinary: true },
  KS: { hasIncomeTax: true, taxType: 'progressive', brackets: [
    { min: 0, max: 15000, rate: 0.031 }, { min: 15000, max: 30000, rate: 0.0525 }, { min: 30000, max: Infinity, rate: 0.057 }
  ], capitalGainsAsOrdinary: true },
  KY: { hasIncomeTax: true, taxType: 'flat', flatRate: 0.04, capitalGainsAsOrdinary: true },
  LA: { hasIncomeTax: true, taxType: 'flat', flatRate: 0.0425, capitalGainsAsOrdinary: true },
  ME: { hasIncomeTax: true, taxType: 'progressive', brackets: [
    { min: 0, max: 25550, rate: 0.058 }, { min: 25550, max: 60700, rate: 0.0675 }, { min: 60700, max: Infinity, rate: 0.0715 }
  ], capitalGainsAsOrdinary: true },
  MD: { hasIncomeTax: true, taxType: 'progressive', brackets: [
    { min: 0, max: 1000, rate: 0.02 }, { min: 1000, max: 2000, rate: 0.03 }, { min: 2000, max: 3000, rate: 0.04 },
    { min: 3000, max: 100000, rate: 0.0475 }, { min: 100000, max: 125000, rate: 0.05 }, { min: 125000, max: 150000, rate: 0.0525 },
    { min: 150000, max: 250000, rate: 0.055 }, { min: 250000, max: Infinity, rate: 0.0575 }
  ], capitalGainsAsOrdinary: true },
  MA: { hasIncomeTax: true, taxType: 'flat', flatRate: 0.05, capitalGainsAsOrdinary: true },
  MI: { hasIncomeTax: true, taxType: 'flat', flatRate: 0.0425, capitalGainsAsOrdinary: true },
  MN: { hasIncomeTax: true, taxType: 'progressive', brackets: [
    { min: 0, max: 31690, rate: 0.0535 }, { min: 31690, max: 103280, rate: 0.068 },
    { min: 103280, max: 191950, rate: 0.0785 }, { min: 191950, max: Infinity, rate: 0.0985 }
  ], capitalGainsAsOrdinary: true },
  MS: { hasIncomeTax: true, taxType: 'flat', flatRate: 0.0485, capitalGainsAsOrdinary: true },
  MO: { hasIncomeTax: true, taxType: 'progressive', brackets: [
    { min: 0, max: 1207, rate: 0 }, { min: 1207, max: 2414, rate: 0.02 }, { min: 2414, max: 3621, rate: 0.025 },
    { min: 3621, max: 4828, rate: 0.03 }, { min: 4828, max: 6035, rate: 0.035 }, { min: 6035, max: 7242, rate: 0.04 },
    { min: 7242, max: 8449, rate: 0.045 }, { min: 8449, max: Infinity, rate: 0.0465 }
  ], capitalGainsAsOrdinary: true },
  MT: { hasIncomeTax: true, taxType: 'flat', flatRate: 0.0565, capitalGainsAsOrdinary: true },
  NE: { hasIncomeTax: true, taxType: 'progressive', brackets: [
    { min: 0, max: 3700, rate: 0.0246 }, { min: 3700, max: 22170, rate: 0.0351 },
    { min: 22170, max: 35730, rate: 0.0501 }, { min: 35730, max: Infinity, rate: 0.0564 }
  ], capitalGainsAsOrdinary: true },
  NV: { hasIncomeTax: false, taxType: 'none', capitalGainsAsOrdinary: false },
  NH: { hasIncomeTax: false, taxType: 'none', capitalGainsAsOrdinary: false },
  NJ: { hasIncomeTax: true, taxType: 'progressive', brackets: [
    { min: 0, max: 20000, rate: 0.014 }, { min: 20000, max: 35000, rate: 0.0175 }, { min: 35000, max: 40000, rate: 0.035 },
    { min: 40000, max: 75000, rate: 0.05525 }, { min: 75000, max: 500000, rate: 0.0637 },
    { min: 500000, max: 1000000, rate: 0.0897 }, { min: 1000000, max: Infinity, rate: 0.1075 }
  ], capitalGainsAsOrdinary: true },
  NM: { hasIncomeTax: true, taxType: 'progressive', brackets: [
    { min: 0, max: 5500, rate: 0.017 }, { min: 5500, max: 11000, rate: 0.032 }, { min: 11000, max: 16000, rate: 0.047 },
    { min: 16000, max: 210000, rate: 0.049 }, { min: 210000, max: Infinity, rate: 0.059 }
  ], capitalGainsAsOrdinary: true },
  NY: { hasIncomeTax: true, taxType: 'progressive', brackets: [
    { min: 0, max: 8500, rate: 0.04 }, { min: 8500, max: 11700, rate: 0.045 }, { min: 11700, max: 13900, rate: 0.0525 },
    { min: 13900, max: 80650, rate: 0.055 }, { min: 80650, max: 215400, rate: 0.06 }, { min: 215400, max: 1077550, rate: 0.0685 },
    { min: 1077550, max: 5000000, rate: 0.0965 }, { min: 5000000, max: 25000000, rate: 0.103 },
    { min: 25000000, max: Infinity, rate: 0.109 }
  ], capitalGainsAsOrdinary: true },
  NC: { hasIncomeTax: true, taxType: 'flat', flatRate: 0.045, capitalGainsAsOrdinary: true },
  ND: { hasIncomeTax: true, taxType: 'flat', flatRate: 0.0229, capitalGainsAsOrdinary: true },
  OH: { hasIncomeTax: true, taxType: 'progressive', brackets: [
    { min: 0, max: 26050, rate: 0.0275 }, { min: 26050, max: 46100, rate: 0.03 },
    { min: 46100, max: 92150, rate: 0.035 }, { min: 92150, max: Infinity, rate: 0.0375 }
  ], capitalGainsAsOrdinary: true },
  OK: { hasIncomeTax: true, taxType: 'progressive', brackets: [
    { min: 0, max: 1000, rate: 0.0025 }, { min: 1000, max: 2500, rate: 0.0075 }, { min: 2500, max: 3750, rate: 0.0175 },
    { min: 3750, max: 4900, rate: 0.0275 }, { min: 4900, max: 7200, rate: 0.0375 }, { min: 7200, max: Infinity, rate: 0.0475 }
  ], capitalGainsAsOrdinary: true },
  OR: { hasIncomeTax: true, taxType: 'progressive', brackets: [
    { min: 0, max: 4050, rate: 0.0475 }, { min: 4050, max: 10200, rate: 0.0675 },
    { min: 10200, max: 125000, rate: 0.0875 }, { min: 125000, max: Infinity, rate: 0.099 }
  ], capitalGainsAsOrdinary: true },
  PA: { hasIncomeTax: true, taxType: 'flat', flatRate: 0.0307, capitalGainsAsOrdinary: true },
  RI: { hasIncomeTax: true, taxType: 'progressive', brackets: [
    { min: 0, max: 77450, rate: 0.0375 }, { min: 77450, max: 176050, rate: 0.0475 }, { min: 176050, max: Infinity, rate: 0.0599 }
  ], capitalGainsAsOrdinary: true },
  SC: { hasIncomeTax: true, taxType: 'flat', flatRate: 0.064, capitalGainsAsOrdinary: true },
  SD: { hasIncomeTax: false, taxType: 'none', capitalGainsAsOrdinary: false },
  TN: { hasIncomeTax: false, taxType: 'none', capitalGainsAsOrdinary: false },
  TX: { hasIncomeTax: false, taxType: 'none', capitalGainsAsOrdinary: false },
  UT: { hasIncomeTax: true, taxType: 'flat', flatRate: 0.0465, capitalGainsAsOrdinary: true },
  VT: { hasIncomeTax: true, taxType: 'progressive', brackets: [
    { min: 0, max: 45400, rate: 0.0335 }, { min: 45400, max: 110050, rate: 0.066 },
    { min: 110050, max: 229550, rate: 0.076 }, { min: 229550, max: Infinity, rate: 0.0875 }
  ], capitalGainsAsOrdinary: true },
  VA: { hasIncomeTax: true, taxType: 'progressive', brackets: [
    { min: 0, max: 3000, rate: 0.02 }, { min: 3000, max: 5000, rate: 0.03 },
    { min: 5000, max: 17000, rate: 0.05 }, { min: 17000, max: Infinity, rate: 0.0575 }
  ], capitalGainsAsOrdinary: true },
  WA: { hasIncomeTax: false, taxType: 'none', capitalGainsAsOrdinary: false },
  WV: { hasIncomeTax: true, taxType: 'flat', flatRate: 0.0465, capitalGainsAsOrdinary: true },
  WI: { hasIncomeTax: true, taxType: 'progressive', brackets: [
    { min: 0, max: 13810, rate: 0.0354 }, { min: 13810, max: 27630, rate: 0.0465 },
    { min: 27630, max: 304170, rate: 0.0627 }, { min: 304170, max: Infinity, rate: 0.0765 }
  ], capitalGainsAsOrdinary: true },
  WY: { hasIncomeTax: false, taxType: 'none', capitalGainsAsOrdinary: false }
};

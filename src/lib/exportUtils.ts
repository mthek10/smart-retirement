import type { Accounts, SSData, TaxSettings, ProjectionRow } from "@/hooks/useProjections";

interface SetupInputRow {
  field: string;
  value: string | number | boolean | null;
}

/**
 * Flattens nested setup input objects into key-value pairs using dot notation.
 * Example: { accounts: { roth: 100 } } -> [{ field: "accounts.roth", value: 100 }]
 */
export function flattenSetupInputs(
  accounts: Accounts,
  ssData: SSData,
  taxSettings: TaxSettings
): SetupInputRow[] {
  const rows: SetupInputRow[] = [];

  const flatten = (obj: Record<string, unknown>, prefix: string) => {
    for (const key in obj) {
      const value = obj[key];
      const fullKey = prefix ? `${prefix}.${key}` : key;

      if (value !== null && typeof value === "object" && !Array.isArray(value)) {
        flatten(value as Record<string, unknown>, fullKey);
      } else {
        rows.push({ field: fullKey, value: value as string | number | boolean | null });
      }
    }
  };

  flatten({ accounts } as Record<string, unknown>, "");
  flatten({ ssData } as Record<string, unknown>, "");
  flatten({ taxSettings } as Record<string, unknown>, "");

  return rows;
}

/**
 * Parses a setup CSV back into the three state objects.
 * Returns the reconstructed accounts, ssData, and taxSettings objects.
 */
export function parseSetupCSV(csvContent: string): {
  accounts: Accounts;
  ssData: SSData;
  taxSettings: TaxSettings;
} {
  const lines = csvContent.trim().split("\n");
  const dataLines = lines.slice(1); // Skip header

  const flatData: Record<string, string> = {};
  for (const line of dataLines) {
    const firstComma = line.indexOf(",");
    if (firstComma === -1) continue;
    const field = line.substring(0, firstComma).trim();
    const value = line.substring(firstComma + 1).trim();
    flatData[field] = value;
  }

  const setValue = (obj: Record<string, unknown>, path: string, value: string) => {
    const parts = path.split(".");
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!(part in current)) {
        current[part] = {};
      }
      current = current[part] as Record<string, unknown>;
    }
    const lastPart = parts[parts.length - 1];
    
    // Parse the value to appropriate type
    if (value === "true") {
      current[lastPart] = true;
    } else if (value === "false") {
      current[lastPart] = false;
    } else if (value === "null" || value === "") {
      current[lastPart] = null;
    } else if (!isNaN(Number(value)) && value !== "") {
      current[lastPart] = Number(value);
    } else {
      current[lastPart] = value;
    }
  };

  const result: Record<string, unknown> = {
    accounts: {},
    ssData: {},
    taxSettings: {},
  };

  for (const [field, value] of Object.entries(flatData)) {
    setValue(result, field, value);
  }

  return {
    accounts: result.accounts as Accounts,
    ssData: result.ssData as SSData,
    taxSettings: result.taxSettings as TaxSettings,
  };
}

/**
 * Column mappings for projection export with human-readable headers.
 */
const PROJECTION_COLUMNS: { key: keyof ProjectionRow; header: string }[] = [
  { key: "year", header: "Year" },
  { key: "age", header: "Age" },
  { key: "traditionalBalance", header: "Traditional Balance" },
  { key: "rothBalance", header: "Roth Balance" },
  { key: "taxableBalance", header: "Brokerage Balance" },
  { key: "ssIncome", header: "Social Security Income" },
  { key: "employmentIncome", header: "Employment Income" },
  { key: "withdrawals", header: "Withdrawals" },
  { key: "rmd", header: "RMD" },
  { key: "rothConversion", header: "Roth Conversion" },
  { key: "marginalBracket", header: "Marginal Tax Bracket" },
  { key: "payrollTax", header: "Payroll Tax" },
  { key: "federalTax", header: "Federal Tax" },
  { key: "federalCapitalGainsTax", header: "Federal Capital Gains Tax" },
  { key: "stateTax", header: "State Tax" },
  { key: "stateCapitalGainsTax", header: "State Capital Gains Tax" },
  { key: "niit", header: "NIIT" },
  { key: "amt", header: "AMT" },
  { key: "irmaa", header: "IRMAA" },
  { key: "medicarePremiums", header: "Medicare Premiums" },
  { key: "acaSubsidy", header: "ACA Subsidy" },
  { key: "healthcareCost", header: "Healthcare Cost" },
  { key: "totalTaxes", header: "Total Taxes" },
  { key: "takeHome", header: "Take Home" },
  { key: "excessSavings", header: "Excess Savings" },
  { key: "isSurvivorYear", header: "Survivor Year" },
];

/**
 * Formats projection rows for CSV export with human-readable headers.
 */
export function formatProjectionsForExport(projections: ProjectionRow[]): string[][] {
  const headers = PROJECTION_COLUMNS.map((col) => col.header);
  const rows = projections.map((row) =>
    PROJECTION_COLUMNS.map((col) => {
      const value = row[col.key];
      if (col.key === "marginalBracket" && typeof value === "number") {
        return `${(value * 100).toFixed(0)}%`;
      }
      if (col.key === "isSurvivorYear") {
        return value ? "Yes" : "No";
      }
      if (typeof value === "number") {
        return Math.round(value).toString();
      }
      return String(value ?? "");
    })
  );
  return [headers, ...rows];
}

/**
 * Escapes a CSV value if it contains special characters.
 */
function escapeCSVValue(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) {
    return "";
  }
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Converts a 2D array of data to CSV string format.
 */
export function arrayToCSV(data: (string | number | boolean | null)[][]): string {
  return data.map((row) => row.map(escapeCSVValue).join(",")).join("\n");
}

/**
 * Converts setup input rows to CSV string format.
 */
export function setupInputsToCSV(rows: SetupInputRow[]): string {
  const header = "field,value";
  const dataRows = rows.map((row) => `${row.field},${escapeCSVValue(row.value)}`);
  return [header, ...dataRows].join("\n");
}

/**
 * Triggers a file download in the browser.
 */
export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generates a filename with today's date.
 */
export function generateFilename(prefix: string, extension: string = "csv"): string {
  const today = new Date();
  const dateStr = today.toISOString().split("T")[0]; // YYYY-MM-DD
  return `${prefix}-${dateStr}.${extension}`;
}

/**
 * Exports setup inputs to CSV and triggers download.
 */
export function exportSetupToCSV(
  accounts: Accounts,
  ssData: SSData,
  taxSettings: TaxSettings
): void {
  const rows = flattenSetupInputs(accounts, ssData, taxSettings);
  const csvContent = setupInputsToCSV(rows);
  const filename = generateFilename("smart-retirement-setup");
  downloadCSV(csvContent, filename);
}

/**
 * Exports projections to CSV and triggers download.
 */
export function exportProjectionsToCSV(projections: ProjectionRow[]): void {
  const data = formatProjectionsForExport(projections);
  const csvContent = arrayToCSV(data);
  const filename = generateFilename("retirement-projections");
  downloadCSV(csvContent, filename);
}

/**
 * Reads a file and returns its content as text.
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = (e) => reject(e);
    reader.readAsText(file);
  });
}

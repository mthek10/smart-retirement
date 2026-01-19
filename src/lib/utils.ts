import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Currency formatting - use for all monetary values
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

// Compact currency for large values (e.g., $1.2M)
export function formatCurrencyCompact(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  return formatCurrency(value);
}

// Percentage formatting
export function formatPercent(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

// Age formatting
export function formatAge(age: number | null): string {
  if (age === null) return "Never";
  return `Age ${age}`;
}

// Score color mapping for bracket analysis
export function getScoreColor(score: number): string {
  if (score < 3) return "text-green-600";
  if (score < 6) return "text-yellow-600";
  return "text-destructive";
}

// Score label for bracket analysis
export function getScoreLabel(score: number): string {
  if (score < 2) return "Excellent";
  if (score < 4) return "Good";
  if (score < 6) return "Moderate";
  if (score < 8) return "Poor";
  return "Very Poor";
}

// Success rate color for Monte Carlo
export function getSuccessColor(rate: number): string {
  if (rate >= 0.9) return "text-green-600 dark:text-green-400";
  if (rate >= 0.75) return "text-amber-600 dark:text-amber-400";
  return "text-destructive";
}

import { useState, useEffect } from 'react';

/**
 * Hook that debounces a value by the specified delay.
 * Useful for preventing excessive re-renders when inputs change rapidly.
 */
export function useDebouncedValue<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook that provides a debounced callback for input changes.
 * Returns both the local value (for immediate UI feedback) and triggers
 * the onChange callback after the debounce delay.
 */
export function useDebouncedInput<T>(
  externalValue: T,
  onChange: (value: T) => void,
  delay: number = 300
): [T, (value: T) => void] {
  const [localValue, setLocalValue] = useState<T>(externalValue);
  const [pendingValue, setPendingValue] = useState<T | null>(null);

  // Sync local value when external value changes (from parent)
  useEffect(() => {
    if (pendingValue === null) {
      setLocalValue(externalValue);
    }
  }, [externalValue, pendingValue]);

  // Debounce the pending value to trigger onChange
  useEffect(() => {
    if (pendingValue === null) return;

    const timer = setTimeout(() => {
      onChange(pendingValue);
      setPendingValue(null);
    }, delay);

    return () => clearTimeout(timer);
  }, [pendingValue, onChange, delay]);

  const handleChange = (value: T) => {
    setLocalValue(value);
    setPendingValue(value);
  };

  return [localValue, handleChange];
}

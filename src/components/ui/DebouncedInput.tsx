import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface DebouncedInputProps extends Omit<React.ComponentProps<"input">, 'onChange'> {
  value: string | number;
  onChange: (value: string) => void;
  debounceMs?: number;
}

/**
 * Input component with built-in debouncing.
 * Shows immediate feedback while typing, but only triggers onChange after delay.
 */
export const DebouncedInput = React.forwardRef<HTMLInputElement, DebouncedInputProps>(
  ({ value: externalValue, onChange, debounceMs = 300, className, ...props }, ref) => {
    const [localValue, setLocalValue] = React.useState(String(externalValue ?? ''));
    const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);
    const isTypingRef = React.useRef(false);

    // Sync local value when external value changes (only if not currently typing)
    React.useEffect(() => {
      if (!isTypingRef.current) {
        setLocalValue(String(externalValue ?? ''));
      }
    }, [externalValue]);

    const handleChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setLocalValue(newValue);
      isTypingRef.current = true;

      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set new timeout
      timeoutRef.current = setTimeout(() => {
        onChange(newValue);
        isTypingRef.current = false;
      }, debounceMs);
    }, [onChange, debounceMs]);

    // Cleanup on unmount
    React.useEffect(() => {
      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }, []);

    // Flush on blur (commit immediately when user leaves field)
    const handleBlur = React.useCallback((e: React.FocusEvent<HTMLInputElement>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (isTypingRef.current) {
        onChange(localValue);
        isTypingRef.current = false;
      }
      props.onBlur?.(e);
    }, [localValue, onChange, props.onBlur]);

    return (
      <Input
        ref={ref}
        value={localValue}
        onChange={handleChange}
        onBlur={handleBlur}
        className={cn(className)}
        {...props}
      />
    );
  }
);

DebouncedInput.displayName = "DebouncedInput";

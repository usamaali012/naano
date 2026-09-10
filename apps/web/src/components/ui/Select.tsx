import { forwardRef } from "react";
import type { SelectHTMLAttributes } from "react";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: SelectOption[];
}

// Native select, token-styled to match Input, with a caret drawn in the muted
// colour. Same control radius as every other control.
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className = "", options, ...props },
  ref,
) {
  return (
    <div className="relative inline-block w-full">
      <select
        ref={ref}
        className={`w-full appearance-none rounded-control border border-border bg-surface py-s2 pl-s3 pr-8 text-body text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary ${className}`}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <svg
        aria-hidden="true"
        viewBox="0 0 12 12"
        className="pointer-events-none absolute right-s3 top-1/2 h-3 w-3 -translate-y-1/2 text-text-muted"
      >
        <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
});

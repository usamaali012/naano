import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Border/focus ring switch to --warn (the same token status pills use). */
  invalid?: boolean;
}

// Control radius, hairline border, focus ring in the one accent colour.
export const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input({ className = "", invalid = false, ...props }, ref) {
    return (
      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        className={`w-full rounded-control border ${invalid ? "border-warn" : "border-border"} bg-surface px-s4 py-s3 text-body text-text placeholder:text-text-muted transition-shadow focus:outline-none focus:shadow-[0_0_0_3px_var(--primary-soft)] ${invalid ? "focus:border-warn" : "focus:border-primary"} ${className}`}
        {...props}
      />
    );
  },
);

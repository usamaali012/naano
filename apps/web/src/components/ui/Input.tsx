import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";

// Control radius, hairline border, focus ring in the one accent colour.
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className = "", ...props }, ref) {
    return (
      <input
        ref={ref}
        className={`w-full rounded-control border border-border bg-surface px-s4 py-s3 text-body text-text placeholder:text-text-muted transition-shadow focus:border-primary focus:outline-none focus:shadow-[0_0_0_3px_var(--primary-soft)] ${className}`}
        {...props}
      />
    );
  },
);

import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";

// Control radius, hairline border, focus ring in the one accent colour.
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className = "", ...props }, ref) {
    return (
      <input
        ref={ref}
        className={`w-full rounded-control border border-border bg-surface px-s3 py-s2 text-body text-text placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary ${className}`}
        {...props}
      />
    );
  },
);

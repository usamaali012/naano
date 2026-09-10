import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";

// Native checkbox tinted with the accent colour. Control radius, hairline
// border. Label is optional and sits inline.
interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { className = "", label, id, ...props },
  ref,
) {
  const input = (
    <input
      ref={ref}
      id={id}
      type="checkbox"
      style={{ accentColor: "var(--primary)" }}
      className={`h-4 w-4 rounded-control border border-border focus:outline-none focus:ring-1 focus:ring-primary ${className}`}
      {...props}
    />
  );

  if (!label) return input;

  return (
    <label htmlFor={id} className="inline-flex items-center gap-s2 text-body text-text">
      {input}
      {label}
    </label>
  );
});

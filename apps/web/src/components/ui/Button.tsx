import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "md" | "sm";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

// Border does the work on secondary; hover shifts the border, never lifts or
// scales. Radius is the single control value. See docs/DESIGN.md.
const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-primary text-white hover:opacity-90",
  secondary: "bg-surface text-text border border-border hover:border-primary",
  ghost: "bg-transparent text-text-muted hover:text-text",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  md: "px-s4 py-s2 text-body",
  sm: "px-s3 py-s1 text-label",
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  type = "button",
  ...props
}: ButtonProps): JSX.Element {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-s2 rounded-control font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${SIZE_CLASSES[size]} ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    />
  );
}

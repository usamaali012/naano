import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-slate-900 text-white hover:bg-slate-700",
  secondary: "bg-white text-slate-900 border border-slate-300 hover:bg-slate-50",
};

export function Button({ variant = "primary", className = "", ...props }: ButtonProps): JSX.Element {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    />
  );
}

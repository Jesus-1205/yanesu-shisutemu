import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant =
  | "primary"
  | "accent"
  | "success"
  | "danger"
  | "outline"
  | "ghost";

type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children: ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-brand-blue text-white hover:bg-blue-800 active:bg-blue-900 shadow-xs hover:shadow-md",
  accent:
    "bg-accent-orange text-white hover:bg-orange-700 active:bg-orange-800 shadow-xs hover:shadow-md",
  success:
    "bg-success text-white hover:bg-green-700 active:bg-green-800 shadow-xs hover:shadow-md",
  danger:
    "bg-danger text-white hover:bg-red-700 active:bg-red-800 shadow-xs hover:shadow-md",
  outline:
    "border-2 border-brand-blue text-brand-blue bg-surface hover:bg-blue-50 active:bg-blue-100 hover:shadow-sm",
  ghost:
    "text-brand-blue bg-transparent hover:bg-blue-50 active:bg-blue-100",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs h-8",
  md: "px-5 py-2 text-sm h-10",
  lg: "px-7 py-3 text-base h-12",
};

const disabledStyles =
  "disabled:opacity-50 disabled:shadow-none disabled:hover:translate-y-0 disabled:cursor-not-allowed";

export default function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  children,
  className = "",
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg font-semibold transition-all duration-150 ease-out hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-1 focus-visible:outline-none active:translate-y-0 active:shadow-none ${variantStyles[variant]} ${sizeStyles[size]} ${disabledStyles} ${className}`}
      disabled={isDisabled}
      {...props}
    >
      {loading && (
        <span className="inline-block size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
  );
}

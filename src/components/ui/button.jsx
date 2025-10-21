import React from "react";

/**
 * Button UI sederhana dengan Tailwind
 * Props:
 * - variant: "default" | "outline" | "ghost" | "destructive"
 * - size: "sm" | "md" | "lg"
 * - isLoading: boolean
 * - className: string (opsional)
 */
export function Button({
  variant = "default",
  size = "md",
  isLoading = false,
  className = "",
  disabled,
  children,
  ...props
}) {
  const base =
    "inline-flex items-center justify-center rounded-2xl font-medium " +
    "transition-colors focus:outline-none focus:ring disabled:opacity-60 disabled:pointer-events-none";

  const variants = {
    default: "bg-black text-white hover:bg-black/90",
    outline: "border border-gray-300 hover:bg-gray-50",
    ghost: "hover:bg-gray-100",
    destructive: "bg-red-600 text-white hover:bg-red-600/90",
  };

  const sizes = {
    sm: "h-8 px-3 text-sm",
    md: "h-9 px-3 text-sm",
    lg: "h-10 px-4",
  };

  return (
    <button
      className={`${base} ${variants[variant] ?? variants.default} ${sizes[size] ?? sizes.md} ${className}`}
      disabled={disabled || isLoading}
      aria-busy={isLoading ? "true" : "false"}
      {...props}
    >
      {isLoading ? (
        <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
      ) : null}
      {children}
    </button>
  );
}

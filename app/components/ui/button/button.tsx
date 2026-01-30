import * as React from "react";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
};

export function Button({ variant = "primary", style, ...props }: ButtonProps) {
  const base: React.CSSProperties = {
    padding: "0.75rem 1rem",
    borderRadius: "var(--radius-2)",
    fontWeight: 600,
    border: "1px solid var(--color-neutral-6)",
    cursor: "pointer",
  };

  const variants: Record<NonNullable<ButtonProps["variant"]>, React.CSSProperties> = {
    primary: {
      background: "var(--color-accent-9)",
      color: "white",
      borderColor: "transparent",
    },
    secondary: {
      background: "var(--color-neutral-2)",
      color: "var(--color-neutral-12)",
    },
    ghost: {
      background: "transparent",
      color: "var(--color-neutral-12)",
    },
  };

  return <button {...props} style={{ ...base, ...variants[variant], ...style }} />;
}

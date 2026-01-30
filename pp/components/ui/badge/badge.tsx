import * as React from "react";

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  variant?: "default" | "secondary" | "outline";
};

export function Badge({ variant = "default", style, ...props }: BadgeProps) {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "0.25rem 0.5rem",
    borderRadius: "9999px",
    fontSize: "0.75rem",
    fontWeight: 600,
    lineHeight: 1,
    border: "1px solid var(--color-neutral-6)",
    userSelect: "none",
    whiteSpace: "nowrap",
  };

  const variants: Record<NonNullable<BadgeProps["variant"]>, React.CSSProperties> = {
    default: {
      background: "var(--color-accent-9)",
      color: "white",
      borderColor: "transparent",
    },
    secondary: {
      background: "var(--color-neutral-2)",
      color: "var(--color-neutral-12)",
    },
    outline: {
      background: "transparent",
      color: "var(--color-neutral-12)",
    },
  };

  return <span {...props} style={{ ...base, ...variants[variant], ...style }} />;
}

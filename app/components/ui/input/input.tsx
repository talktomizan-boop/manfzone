import * as React from "react";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { style, ...props },
  ref
) {
  return (
    <input
      ref={ref}
      {...props}
      style={{
        width: "100%",
        padding: "0.625rem 0.75rem",
        background: "var(--color-neutral-1)",
        color: "var(--color-neutral-12)",
        border: "1px solid var(--color-neutral-6)",
        borderRadius: "var(--radius-2)",
        outline: "none",
        font: "inherit",
        ...style,
      }}
    />
  );
});

Input.displayName = "Input";

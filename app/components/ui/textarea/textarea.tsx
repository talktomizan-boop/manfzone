import * as React from "react";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { style, ...props },
  ref
) {
  return (
    <textarea
      ref={ref}
      {...props}
      style={{
        width: "100%",
        minHeight: "110px",
        padding: "0.625rem 0.75rem",
        background: "var(--color-neutral-1)",
        color: "var(--color-neutral-12)",
        border: "1px solid var(--color-neutral-6)",
        borderRadius: "var(--radius-2)",
        outline: "none",
        font: "inherit",
        resize: "vertical",
        ...style,
      }}
    />
  );
});

Textarea.displayName = "Textarea";

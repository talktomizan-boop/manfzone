import * as React from "react";

export type LabelProps = React.LabelHTMLAttributes<HTMLLabelElement>;

export const Label = React.forwardRef<HTMLLabelElement, LabelProps>(function Label(
  { style, ...props },
  ref
) {
  return (
    <label
      ref={ref}
      {...props}
      style={{
        cursor: "pointer",
        color: "var(--color-neutral-12)",
        ...style,
      }}
    />
  );
});

Label.displayName = "Label";

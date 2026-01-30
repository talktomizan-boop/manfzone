import * as React from "react";

export type CheckboxProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "onChange"> & {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
};

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { checked, defaultChecked, onCheckedChange, style, ...props },
  ref
) {
  const isControlled = typeof checked === "boolean";
  const [internal, setInternal] = React.useState<boolean>(!!defaultChecked);
  const current = isControlled ? (checked as boolean) : internal;

  return (
    <input
      ref={ref}
      type="checkbox"
      {...props}
      checked={isControlled ? checked : current}
      onChange={(e) => {
        const next = e.target.checked;
        if (!isControlled) setInternal(next);
        onCheckedChange?.(next);
        props.onClick?.(e as any);
      }}
      style={{
        width: "1rem",
        height: "1rem",
        accentColor: "var(--color-accent-9)",
        cursor: "pointer",
        ...style,
      }}
    />
  );
});

Checkbox.displayName = "Checkbox";

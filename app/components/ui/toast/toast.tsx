import * as React from "react";

// This file exists primarily to provide the types used by app/hooks/use-toast.ts.
// We keep the implementation minimal so it won't alter your design.

export type ToastActionElement = React.ReactElement;

export interface ToastProps extends React.HTMLAttributes<HTMLDivElement> {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function Toast({ open = true, onOpenChange, children, ...props }: ToastProps) {
  if (!open) return null;
  return (
    <div {...props}>
      {children}
      {/* allow consumers to close if they want */}
      {onOpenChange && (
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          aria-label="Dismiss"
          style={{ display: "none" }}
        />
      )}
    </div>
  );
}

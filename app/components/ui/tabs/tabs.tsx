import * as React from "react";

type TabsContextValue = {
  value: string;
  setValue: (v: string) => void;
};

const TabsContext = React.createContext<TabsContextValue | null>(null);

export type TabsProps = React.HTMLAttributes<HTMLDivElement> & {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
};

export function Tabs({ defaultValue = "", value, onValueChange, children, ...props }: TabsProps) {
  const isControlled = typeof value === "string" && value.length > 0;
  const [internal, setInternal] = React.useState<string>(defaultValue);

  const current = isControlled ? (value as string) : internal;

  const setValue = React.useCallback(
    (next: string) => {
      if (!isControlled) setInternal(next);
      onValueChange?.(next);
    },
    [isControlled, onValueChange]
  );

  return (
    <TabsContext.Provider value={{ value: current, setValue }}>
      <div {...props}>{children}</div>
    </TabsContext.Provider>
  );
}

export type TabsListProps = React.HTMLAttributes<HTMLDivElement>;

export function TabsList({ style, ...props }: TabsListProps) {
  return (
    <div
      {...props}
      style={{
        display: "inline-flex",
        gap: "0.5rem",
        padding: "0.25rem",
        borderRadius: "var(--radius-2)",
        border: "1px solid var(--color-neutral-6)",
        background: "var(--color-neutral-2)",
        ...style,
      }}
    />
  );
}

export type TabsTriggerProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string };

export function TabsTrigger({ value, children, style, ...props }: TabsTriggerProps) {
  const ctx = React.useContext(TabsContext);
  if (!ctx) throw new Error("TabsTrigger must be used within Tabs");

  const active = ctx.value === value;

  return (
    <button
      type="button"
      {...props}
      onClick={(e) => {
        props.onClick?.(e);
        ctx.setValue(value);
      }}
      aria-selected={active}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.5rem",
        padding: "0.5rem 0.75rem",
        borderRadius: "var(--radius-2)",
        border: "1px solid transparent",
        background: active ? "var(--color-neutral-1)" : "transparent",
        color: "var(--color-neutral-12)",
        cursor: "pointer",
        font: "inherit",
        ...style,
      }}
    >
      {children}
    </button>
  );
}

export type TabsContentProps = React.HTMLAttributes<HTMLDivElement> & { value: string };

export function TabsContent({ value, children, ...props }: TabsContentProps) {
  const ctx = React.useContext(TabsContext);
  if (!ctx) throw new Error("TabsContent must be used within Tabs");

  if (ctx.value !== value) return null;
  return <div {...props}>{children}</div>;
}

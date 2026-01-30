import * as React from "react";

type AccordionType = "single" | "multiple";

type AccordionContextValue = {
  type: AccordionType;
  openValues: string[];
  toggle: (value: string) => void;
};

const AccordionContext = React.createContext<AccordionContextValue | null>(null);

export type AccordionProps = React.HTMLAttributes<HTMLDivElement> & {
  type?: AccordionType;
  collapsible?: boolean;
  defaultValue?: string | string[];
  value?: string | string[];
  onValueChange?: (value: string | string[]) => void;
};

export function Accordion({
  type = "single",
  collapsible = false,
  defaultValue,
  value,
  onValueChange,
  children,
  ...props
}: AccordionProps) {
  const isControlled = typeof value !== "undefined";

  const [internal, setInternal] = React.useState<string[]>(() => {
    if (typeof defaultValue === "string") return [defaultValue];
    if (Array.isArray(defaultValue)) return defaultValue;
    return [];
  });

  const openValues = React.useMemo(() => {
    if (!isControlled) return internal;
    if (typeof value === "string") return value ? [value] : [];
    return Array.isArray(value) ? value : [];
  }, [internal, isControlled, value]);

  const setOpenValues = React.useCallback(
    (next: string[]) => {
      if (!isControlled) setInternal(next);
      if (onValueChange) {
        if (type === "single") onValueChange(next[0] ?? "");
        else onValueChange(next);
      }
    },
    [isControlled, onValueChange, type]
  );

  const toggle = React.useCallback(
    (v: string) => {
      const isOpen = openValues.includes(v);

      if (type === "single") {
        if (isOpen) {
          if (collapsible) setOpenValues([]);
        } else {
          setOpenValues([v]);
        }
        return;
      }

      // multiple
      if (isOpen) {
        setOpenValues(openValues.filter((x) => x !== v));
      } else {
        setOpenValues([...openValues, v]);
      }
    },
    [openValues, type, collapsible, setOpenValues]
  );

  return (
    <AccordionContext.Provider value={{ type, openValues, toggle }}>
      <div {...props}>{children}</div>
    </AccordionContext.Provider>
  );
}

type AccordionItemContextValue = { value: string };
const AccordionItemContext = React.createContext<AccordionItemContextValue | null>(null);

export type AccordionItemProps = React.HTMLAttributes<HTMLDivElement> & {
  value: string;
};

export function AccordionItem({ value, children, style, ...props }: AccordionItemProps) {
  return (
    <AccordionItemContext.Provider value={{ value }}>
      <div
        {...props}
        style={{
          border: "1px solid var(--color-neutral-6)",
          borderRadius: "var(--radius-2)",
          overflow: "hidden",
          background: "var(--color-neutral-1)",
          ...style,
        }}
      >
        {children}
      </div>
    </AccordionItemContext.Provider>
  );
}

export type AccordionTriggerProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

export function AccordionTrigger({ children, style, ...props }: AccordionTriggerProps) {
  const accordion = React.useContext(AccordionContext);
  const item = React.useContext(AccordionItemContext);
  if (!accordion || !item) throw new Error("AccordionTrigger must be used within AccordionItem");

  const isOpen = accordion.openValues.includes(item.value);

  return (
    <button
      type="button"
      {...props}
      onClick={(e) => {
        props.onClick?.(e);
        accordion.toggle(item.value);
      }}
      aria-expanded={isOpen}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "0.75rem",
        padding: "0.875rem 1rem",
        background: "transparent",
        border: "none",
        cursor: "pointer",
        font: "inherit",
        color: "var(--color-neutral-12)",
        ...style,
      }}
    >
      <span style={{ textAlign: "left" }}>{children}</span>
      <span aria-hidden style={{ opacity: 0.7 }}>
        {isOpen ? "−" : "+"}
      </span>
    </button>
  );
}

export type AccordionContentProps = React.HTMLAttributes<HTMLDivElement>;

export function AccordionContent({ children, style, ...props }: AccordionContentProps) {
  const accordion = React.useContext(AccordionContext);
  const item = React.useContext(AccordionItemContext);
  if (!accordion || !item) throw new Error("AccordionContent must be used within AccordionItem");

  const isOpen = accordion.openValues.includes(item.value);
  if (!isOpen) return null;

  return (
    <div
      {...props}
      style={{
        padding: "0 1rem 1rem",
        color: "var(--color-neutral-11)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

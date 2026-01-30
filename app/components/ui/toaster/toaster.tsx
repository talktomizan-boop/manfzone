import * as React from "react";

type Toast = {
  id: string;
  title?: string;
  description?: string;
  duration?: number;
};

type ToastContextValue = {
  toast: (t: Omit<Toast, "id">) => void;
  dismiss: (id: string) => void;
};

const ToastContext = React.createContext<ToastContextValue | null>(null);

/**
 * Optional hook you can use anywhere in the app to trigger a toast:
 *   const { toast } = useToast();
 *   toast({ title: "Saved", description: "Changes saved successfully." });
 */
export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <Toaster />");
  return ctx;
}

export function Toaster() {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = React.useCallback(
    (t: Omit<Toast, "id">) => {
      const id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : String(Date.now()) + Math.random().toString(16).slice(2);

      const duration = t.duration ?? 4000;

      setToasts((prev) => [...prev, { ...t, id, duration }]);

      // auto-dismiss
      window.setTimeout(() => dismiss(id), duration);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      <div
        aria-live="polite"
        aria-relevant="additions removals"
        style={{
          position: "fixed",
          right: "1rem",
          bottom: "1rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
          zIndex: 9999,
        }}
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            style={{
              minWidth: "280px",
              maxWidth: "420px",
              padding: "0.875rem 1rem",
              borderRadius: "var(--radius-2)",
              background: "var(--color-neutral-2)",
              color: "var(--color-neutral-12)",
              border: "1px solid var(--color-neutral-6)",
              boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
            }}
          >
            <div style={{ display: "flex", gap: "0.75rem", alignItems: "start" }}>
              <div style={{ flex: 1 }}>
                {t.title && (
                  <div style={{ fontWeight: 700, marginBottom: t.description ? "0.25rem" : 0 }}>
                    {t.title}
                  </div>
                )}
                {t.description && (
                  <div style={{ color: "var(--color-neutral-11)" }}>{t.description}</div>
                )}
              </div>

              <button
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss"
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--color-neutral-11)",
                  cursor: "pointer",
                  fontSize: "1.25rem",
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

import { useEffect, useState } from "react";

type ColorSchemeConfig = "system" | "light" | "dark";

type ColorSchemeState = {
  config: ColorSchemeConfig;
  resolved: "light" | "dark";
};

type ColorSchemeApi = {
  currentState: ColorSchemeState;
  subscribe: (listener: (state: ColorSchemeState) => void) => () => void;
  config: ColorSchemeConfig;
  getRootCssClass?: (resolved: ColorSchemeState["resolved"]) => string;
};

const fallbackState: ColorSchemeState = {
  config: "system",
  resolved: "light",
};

function getColorSchemeApi(): ColorSchemeApi | null {
  if (typeof window === "undefined") return null;
  return (window as Window & { colorSchemeApi?: ColorSchemeApi }).colorSchemeApi ?? null;
}

export function useSafeColorScheme() {
  const [state, setState] = useState<ColorSchemeState>(() => {
    const api = getColorSchemeApi();
    return api?.currentState ?? fallbackState;
  });

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let intervalId: number | undefined;

    const attach = () => {
      const api = getColorSchemeApi();
      if (!api) return false;
      setState(api.currentState);
      unsubscribe = api.subscribe((next) => setState(next));
      return true;
    };

    if (attach()) {
      return () => {
        unsubscribe?.();
      };
    }

    intervalId = window.setInterval(() => {
      if (attach() && intervalId) {
        window.clearInterval(intervalId);
        intervalId = undefined;
      }
    }, 50);

    return () => {
      if (intervalId) window.clearInterval(intervalId);
      unsubscribe?.();
    };
  }, []);

  const api = getColorSchemeApi();

  return {
    configScheme: state.config,
    resolvedScheme: state.resolved,
    setColorScheme: (config: ColorSchemeConfig) => {
      const liveApi = getColorSchemeApi();
      if (!liveApi) return;
      liveApi.config = config;
    },
    isLight: state.resolved === "light",
    isDark: state.resolved === "dark",
    rootCssClass: api?.getRootCssClass?.(state.resolved) || "",
  };
}

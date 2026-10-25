"use client";

import * as React from "react";
import {
  DEFAULT_THEME_ID,
  THEMES,
  getTheme,
  themeToCssVars,
  type Theme,
} from "@/lib/themes";

const STORAGE_KEY = "portfolio-theme";

/** Write a theme's CSS variables onto :root and mark the mode/id. */
export function applyThemeById(id: string) {
  const theme = getTheme(id) ?? getTheme(DEFAULT_THEME_ID)!;
  const root = document.documentElement;
  const vars = themeToCssVars(theme.tokens);
  for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
  root.dataset.theme = theme.id;
  root.dataset.mode = theme.mode;
  // keep .dark in sync in case any utility keys off it
  root.classList.toggle("dark", theme.mode === "dark");
}

type ThemeCtx = {
  themeId: string;
  theme: Theme;
  setThemeId: (id: string) => void;
};

const Ctx = React.createContext<ThemeCtx | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // First render MUST match SSR (DEFAULT_THEME_ID) to avoid hydration
  // mismatches — the no-flash inline script has already applied the real theme
  // to the DOM for visuals; we sync React state to it right after mount.
  const [themeId, setThemeIdState] = React.useState<string>(DEFAULT_THEME_ID);

  React.useEffect(() => {
    let id: string | null = null;
    const fromDom = document.documentElement.dataset.theme;
    if (fromDom && getTheme(fromDom)) id = fromDom;
    if (!id) {
      try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (stored && getTheme(stored)) id = stored;
      } catch {
        /* ignore */
      }
    }
    if (id && id !== DEFAULT_THEME_ID) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setThemeIdState(id);
      applyThemeById(id);
    }
  }, []);

  const setThemeId = React.useCallback((id: string) => {
    if (!getTheme(id)) return;
    setThemeIdState(id);
    applyThemeById(id);
    try {
      window.localStorage.setItem(STORAGE_KEY, id);
    } catch {
      /* ignore storage errors (private mode, etc.) */
    }
  }, []);

  const theme = getTheme(themeId) ?? getTheme(DEFAULT_THEME_ID)!;

  const value = React.useMemo(
    () => ({ themeId, theme, setThemeId }),
    [themeId, theme, setThemeId]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme(): ThemeCtx {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error("useTheme must be used within <ThemeProvider>");
  return ctx;
}

export { THEMES, STORAGE_KEY };

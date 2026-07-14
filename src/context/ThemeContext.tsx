"use client";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  THEME_STORAGE_KEY, isThemePreference, readStoredTheme, resolveTheme,
  type ResolvedTheme, type ThemePreference,
} from "@/lib/theme";

type ThemeContextValue = {
  /** The user's preference (may be "system"). */
  theme: ThemePreference;
  /** What is actually on screen right now. */
  resolved: ResolvedTheme;
  setTheme: (t: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  theme: "light",
  resolved: "light",
  setTheme: () => {},
});

/** Flip the `dark` class; crossfade via the View Transitions API where available. */
function applyThemeClass(resolved: ResolvedTheme) {
  const root = document.documentElement;
  const isDark = root.classList.contains("dark");
  if (isDark === (resolved === "dark")) return; // no change (e.g. no-flash script already set it)
  const apply = () => root.classList.toggle("dark", resolved === "dark");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const startViewTransition = (document as any).startViewTransition?.bind(document);
  if (startViewTransition && !reduceMotion) startViewTransition(apply);
  else apply();
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemePreference>("light");
  const [systemDark, setSystemDark] = useState(false);
  const [ready, setReady] = useState(false);

  // Initial read + OS-theme tracking (client only; SSR renders with defaults and the
  // inline no-flash script in layout.tsx keeps the first paint correct).
  useEffect(() => {
    setThemeState(readStoredTheme(window.localStorage));
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setSystemDark(mq.matches);
    setReady(true);
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener("change", onChange);
    // Follow theme changes made in another tab.
    const onStorage = (e: StorageEvent) => {
      if (e.key === THEME_STORAGE_KEY && isThemePreference(e.newValue)) setThemeState(e.newValue);
    };
    window.addEventListener("storage", onStorage);
    return () => {
      mq.removeEventListener("change", onChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const resolved = resolveTheme(theme, systemDark);

  useEffect(() => {
    if (ready) applyThemeClass(resolved);
  }, [resolved, ready]);

  const value = useMemo<ThemeContextValue>(() => ({
    theme,
    resolved,
    setTheme: (t) => {
      setThemeState(t);
      try { window.localStorage.setItem(THEME_STORAGE_KEY, t); } catch { /* private mode */ }
    },
  }), [theme, resolved]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);

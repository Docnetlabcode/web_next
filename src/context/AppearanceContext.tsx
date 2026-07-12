"use client";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  APPEARANCE_CSS_KEY, APPEARANCE_STORAGE_KEY, DEFAULT_APPEARANCE,
  buildAppearanceCss, normalizeAppearance, readStoredAppearance,
  type AppearanceSettings,
} from "@/lib/appearance";

type AppearanceContextValue = {
  appearance: AppearanceSettings;
  /** Merge a partial update (normalized + persisted + applied instantly). */
  update: (patch: Partial<AppearanceSettings>) => void;
  reset: () => void;
};

const AppearanceContext = createContext<AppearanceContextValue>({
  appearance: DEFAULT_APPEARANCE,
  update: () => {},
  reset: () => {},
});

const STYLE_ID = "dl-appearance";

/** Swap the injected override stylesheet + html attributes to match settings. */
function applyAppearance(s: AppearanceSettings) {
  const css = buildAppearanceCss(s);
  let tag = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (css) {
    if (!tag) {
      tag = document.createElement("style");
      tag.id = STYLE_ID;
      document.head.appendChild(tag);
    }
    if (tag.textContent !== css) tag.textContent = css;
  } else {
    tag?.remove();
  }
  const root = document.documentElement;
  if (s.duo) root.dataset.duo = "1"; else delete root.dataset.duo;
  // font-size lives in the stylesheet; clear any inline value from the boot script
  root.style.fontSize = "";
}

export function AppearanceProvider({ children }: { children: React.ReactNode }) {
  const [appearance, setAppearance] = useState<AppearanceSettings>(DEFAULT_APPEARANCE);
  const [ready, setReady] = useState(false);

  // Initial read (client only — SSR renders defaults; the boot script in
  // layout.tsx already applied the cached CSS before first paint).
  useEffect(() => {
    setAppearance(readStoredAppearance(window.localStorage));
    setReady(true);
    // Follow changes made in another tab.
    const onStorage = (e: StorageEvent) => {
      if (e.key === APPEARANCE_STORAGE_KEY && e.newValue) {
        try { setAppearance(normalizeAppearance(JSON.parse(e.newValue))); } catch { /* ignore */ }
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (ready) applyAppearance(appearance);
  }, [appearance, ready]);

  const value = useMemo<AppearanceContextValue>(() => {
    const persist = (next: AppearanceSettings) => {
      setAppearance(next);
      try {
        window.localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(next));
        // CSS cache lets layout.tsx restore the look before first paint.
        const css = buildAppearanceCss(next);
        if (css) window.localStorage.setItem(APPEARANCE_CSS_KEY, css);
        else window.localStorage.removeItem(APPEARANCE_CSS_KEY);
      } catch { /* private mode */ }
    };
    return {
      appearance,
      update: (patch) => persist(normalizeAppearance({ ...appearance, ...patch })),
      reset: () => persist({ ...DEFAULT_APPEARANCE }),
    };
  }, [appearance]);

  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}

export const useAppearance = () => useContext(AppearanceContext);

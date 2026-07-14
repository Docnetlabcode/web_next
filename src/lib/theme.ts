// Theme preference logic — framework-free so it can be unit-tested (src/lib/__tests__).
// The DOM side (class application, matchMedia listeners) lives in ThemeContext.

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

/** localStorage key. Mirrored by the inline no-flash script in src/app/layout.tsx. */
export const THEME_STORAGE_KEY = "dl_theme";

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

/** Collapse a preference to the concrete theme, given the OS setting. */
export function resolveTheme(pref: ThemePreference, systemDark: boolean): ResolvedTheme {
  if (pref === "system") return systemDark ? "dark" : "light";
  return pref;
}

/** Stored preference, tolerating missing/garbage values and storage that throws.
    Defaults to "light" (not "system") so first-time visitors always get the light
    theme; dark/system only apply once explicitly chosen. Mirrored by the no-flash
    script in src/app/layout.tsx. */
export function readStoredTheme(storage: Pick<Storage, "getItem"> | null | undefined): ThemePreference {
  try {
    const raw = storage?.getItem(THEME_STORAGE_KEY);
    return isThemePreference(raw) ? raw : "light";
  } catch {
    return "light";
  }
}

/**
 * What the navbar sun/moon button should switch to. It always makes an explicit
 * choice (never back to "system"): flipping the current *resolved* look is what
 * the user means when they press it.
 */
export function toggledTheme(resolved: ResolvedTheme): ThemePreference {
  return resolved === "dark" ? "light" : "dark";
}

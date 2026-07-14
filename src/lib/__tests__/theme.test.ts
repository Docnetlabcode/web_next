import { describe, it, expect } from "vitest";
import {
  THEME_STORAGE_KEY,
  isThemePreference,
  resolveTheme,
  readStoredTheme,
  toggledTheme,
} from "../theme";

describe("isThemePreference", () => {
  it("accepts the three valid preferences", () => {
    expect(isThemePreference("light")).toBe(true);
    expect(isThemePreference("dark")).toBe(true);
    expect(isThemePreference("system")).toBe(true);
  });
  it("rejects everything else", () => {
    expect(isThemePreference("")).toBe(false);
    expect(isThemePreference("auto")).toBe(false);
    expect(isThemePreference(null)).toBe(false);
    expect(isThemePreference(undefined)).toBe(false);
    expect(isThemePreference(1)).toBe(false);
  });
});

describe("resolveTheme", () => {
  it("passes explicit choices through regardless of OS setting", () => {
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });
  it("follows the OS for system", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
  });
});

describe("readStoredTheme", () => {
  const storageWith = (value: string | null) => ({ getItem: () => value });

  it("returns a valid stored preference", () => {
    expect(readStoredTheme(storageWith("dark"))).toBe("dark");
    expect(readStoredTheme(storageWith("light"))).toBe("light");
  });
  it("defaults to light for missing or garbage values", () => {
    expect(readStoredTheme(storageWith(null))).toBe("light");
    expect(readStoredTheme(storageWith("purple"))).toBe("light");
    expect(readStoredTheme(null)).toBe("light");
    expect(readStoredTheme(undefined)).toBe("light");
  });
  it("defaults to light when storage throws (private mode)", () => {
    expect(readStoredTheme({ getItem: () => { throw new Error("denied"); } })).toBe("light");
  });
  it("still returns a stored system preference", () => {
    expect(readStoredTheme(storageWith("system"))).toBe("system");
  });
  it("uses the key the no-flash script reads", () => {
    expect(THEME_STORAGE_KEY).toBe("dl_theme");
  });
});

describe("toggledTheme", () => {
  it("flips the resolved look to an explicit preference", () => {
    expect(toggledTheme("dark")).toBe("light");
    expect(toggledTheme("light")).toBe("dark");
  });
});

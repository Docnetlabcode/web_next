import { describe, it, expect } from "vitest";
import {
  DEFAULT_APPEARANCE,
  accentSeed,
  accentSwatchHex,
  buildAccentRamp,
  buildAppearanceCss,
  hexToHsl,
  hslToTriplet,
  isDefaultAppearance,
  normalizeAppearance,
  readStoredAppearance,
} from "../appearance";

const triplet = /^\d{1,3} \d{1,3} \d{1,3}$/;
const lightness = (t: string) => {
  const [r, g, b] = t.split(" ").map(Number);
  return (Math.max(r, g, b) + Math.min(r, g, b)) / 2;
};

describe("color math", () => {
  it("round-trips the brand teal within rounding error", () => {
    const hsl = hexToHsl("#1e7b74")!;
    const back = hslToTriplet(hsl.h, hsl.s, hsl.l).split(" ").map(Number);
    expect(Math.abs(back[0] - 30)).toBeLessThanOrEqual(1);
    expect(Math.abs(back[1] - 123)).toBeLessThanOrEqual(1);
    expect(Math.abs(back[2] - 116)).toBeLessThanOrEqual(1);
  });
  it("rejects malformed hex", () => {
    expect(hexToHsl("teal")).toBeNull();
    expect(hexToHsl("#12345")).toBeNull();
    expect(hexToHsl("")).toBeNull();
  });
});

describe("buildAccentRamp", () => {
  const seed = { h: 175.5, s: 61 };

  it("emits valid rgb triplets for every step", () => {
    const { light, dark } = buildAccentRamp(seed, 0);
    for (const v of [...Object.values(light), ...Object.values(dark)]) expect(v).toMatch(triplet);
  });

  it("keeps the teal ramp's shape: tints lighter than solids, 50 → 900 descending", () => {
    const { light } = buildAccentRamp(seed, 0);
    expect(lightness(light["--brand-50"])).toBeGreaterThan(lightness(light["--brand-300"]));
    expect(lightness(light["--brand-300"])).toBeGreaterThan(lightness(light["--brand-600"]));
    expect(lightness(light["--brand-600"])).toBeGreaterThan(lightness(light["--brand-900"]));
  });

  it("reproduces the default teal 600 (the compiled tailwind anchor)", () => {
    const { light } = buildAccentRamp(seed, 0);
    const [r, g, b] = light["--brand-600"].split(" ").map(Number);
    expect(Math.abs(r - 30)).toBeLessThanOrEqual(3);
    expect(Math.abs(g - 123)).toBeLessThanOrEqual(3);
    expect(Math.abs(b - 116)).toBeLessThanOrEqual(3);
  });

  it("brightness shifts the solid steps and clamps extremes", () => {
    const dim = buildAccentRamp(seed, -20).light;
    const base = buildAccentRamp(seed, 0).light;
    const bright = buildAccentRamp(seed, 20).light;
    expect(lightness(dim["--brand-600"])).toBeLessThan(lightness(base["--brand-600"]));
    expect(lightness(bright["--brand-600"])).toBeGreaterThan(lightness(base["--brand-600"]));
    // out-of-range input is clamped, not exploded
    expect(buildAccentRamp(seed, 999).light["--brand-600"]).toEqual(bright["--brand-600"]);
  });

  it("dark text shades stay light enough to read on dark surfaces", () => {
    const { dark } = buildAccentRamp(seed, 0);
    expect(lightness(dark["--tx-brand-700"])).toBeGreaterThan(120);
  });
});

describe("accentSeed", () => {
  it("uses the preset hue/sat for named accents", () => {
    expect(accentSeed({ ...DEFAULT_APPEARANCE, accent: "rose" })).toEqual({ h: 340, s: 62 });
  });
  it("derives from customHex for custom, clamping saturation", () => {
    const s = accentSeed({ ...DEFAULT_APPEARANCE, accent: "custom", customHex: "#ff0000" });
    expect(Math.round(s.h)).toBe(0);
    expect(s.s).toBeLessThanOrEqual(85);
  });
  it("falls back to teal when customHex is garbage", () => {
    const s = accentSeed({ ...DEFAULT_APPEARANCE, accent: "custom", customHex: "nope" });
    expect(s).toEqual({ h: 175.5, s: 61 });
  });
});

describe("buildAppearanceCss", () => {
  it("emits nothing for the defaults (built-in stylesheet already matches)", () => {
    expect(buildAppearanceCss(DEFAULT_APPEARANCE)).toBe("");
  });
  it("emits :root and .dark blocks when the accent changes", () => {
    const css = buildAppearanceCss({ ...DEFAULT_APPEARANCE, accent: "violet" });
    expect(css).toContain(":root{");
    expect(css).toContain(".dark{");
    expect(css).toContain("--brand-600:");
    expect(css).toContain("--tx-brand-700:");
    expect(css).toContain("--grad-from:");
  });
  it("emits font, scale and bold overrides", () => {
    const css = buildAppearanceCss({ ...DEFAULT_APPEARANCE, font: "classic", textScale: 1.08, boldText: true });
    expect(css).toContain("--font-app:Georgia");
    expect(css).toContain("font-size:108%");
    expect(css).toContain("font-weight:500");
  });
  it("brightness alone still triggers a ramp", () => {
    expect(buildAppearanceCss({ ...DEFAULT_APPEARANCE, brightness: 10 })).toContain("--brand-600:");
  });
});

describe("normalizeAppearance", () => {
  it("returns defaults for garbage", () => {
    expect(normalizeAppearance(null)).toEqual(DEFAULT_APPEARANCE);
    expect(normalizeAppearance("x")).toEqual(DEFAULT_APPEARANCE);
    expect(normalizeAppearance(42)).toEqual(DEFAULT_APPEARANCE);
  });
  it("keeps valid values and fixes invalid ones field-by-field", () => {
    const s = normalizeAppearance({ accent: "rose", bubble: "hexagon", font: "mono", textScale: 9, brightness: -100, wallpaper: "dots" });
    expect(s.accent).toBe("rose");
    expect(s.bubble).toBe("rounded");
    expect(s.font).toBe("mono");
    expect(s.textScale).toBe(1.15);
    expect(s.brightness).toBe(-20);
    expect(s.wallpaper).toBe("dots");
  });
  it("rejects customHex that isn't a 6-digit hex", () => {
    expect(normalizeAppearance({ customHex: "red" }).customHex).toBe(DEFAULT_APPEARANCE.customHex);
    expect(normalizeAppearance({ customHex: "#A1B2C3" }).customHex).toBe("#a1b2c3");
  });
});

describe("readStoredAppearance", () => {
  it("parses stored JSON", () => {
    const storage = { getItem: () => JSON.stringify({ accent: "ocean", duo: true }) };
    const s = readStoredAppearance(storage);
    expect(s.accent).toBe("ocean");
    expect(s.duo).toBe(true);
    expect(s.font).toBe("modern");
  });
  it("survives malformed JSON and throwing storage", () => {
    expect(readStoredAppearance({ getItem: () => "{oops" })).toEqual(DEFAULT_APPEARANCE);
    expect(readStoredAppearance({ getItem: () => { throw new Error("denied"); } })).toEqual(DEFAULT_APPEARANCE);
    expect(readStoredAppearance(null)).toEqual(DEFAULT_APPEARANCE);
  });
});

describe("helpers", () => {
  it("accentSwatchHex returns a hex color", () => {
    expect(accentSwatchHex("teal")).toMatch(/^#[0-9a-f]{6}$/);
  });
  it("isDefaultAppearance detects the pristine state", () => {
    expect(isDefaultAppearance({ ...DEFAULT_APPEARANCE })).toBe(true);
    expect(isDefaultAppearance({ ...DEFAULT_APPEARANCE, accent: "rose" })).toBe(false);
  });
});

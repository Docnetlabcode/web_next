// Appearance customization logic — framework-free so it can be unit-tested
// (src/lib/__tests__/appearance.test.ts). The DOM side (style-tag injection,
// html attributes, persistence events) lives in AppearanceContext; a no-flash
// boot script in src/app/layout.tsx re-applies the cached CSS before first paint.
//
// The whole brand ramp in globals.css / tailwind.config.js is CSS-variable
// driven, so "theming" is just emitting new values for those variables.

export type AccentKey =
  | "teal" | "ocean" | "indigo" | "violet" | "rose" | "ember" | "forest" | "slate" | "custom";
export type BubbleStyle = "rounded" | "minimal" | "pill" | "classic";
export type ChatWallpaper = "none" | "dots" | "grid" | "lines" | "weave" | "glow";
export type FontKey = "modern" | "classic" | "mono" | "system";

export type AppearanceSettings = {
  /** Accent color theme; "custom" uses customHex. */
  accent: AccentKey;
  customHex: string;
  /** Lightness shift applied across the generated ramp, −20 … +20. */
  brightness: number;
  /** Duo mode blends the accent into a second color (gradients, own chat bubbles). */
  duo: boolean;
  accent2: Exclude<AccentKey, "custom">;
  font: FontKey;
  /** Root font-size multiplier, 0.9 … 1.15. */
  textScale: number;
  boldText: boolean;
  bubble: BubbleStyle;
  wallpaper: ChatWallpaper;
};

export const APPEARANCE_STORAGE_KEY = "dl_appearance";
/** Compiled CSS cache, injected pre-paint by the boot script in layout.tsx. */
export const APPEARANCE_CSS_KEY = "dl_appearance_css";

export const DEFAULT_APPEARANCE: AppearanceSettings = {
  accent: "teal",
  customHex: "#1e7b74",
  brightness: 0,
  duo: false,
  accent2: "ocean",
  font: "modern",
  textScale: 1,
  boldText: false,
  bubble: "rounded",
  wallpaper: "none",
};

/* ── Accent presets (hue/saturation seeds; ramps are generated) ─────────── */

export const ACCENTS: Record<Exclude<AccentKey, "custom">, { label: string; h: number; s: number }> = {
  teal:   { label: "Orovion Teal", h: 175.5, s: 61 },
  ocean:  { label: "Ocean",        h: 211,   s: 64 },
  indigo: { label: "Indigo",       h: 243,   s: 52 },
  violet: { label: "Violet",       h: 281,   s: 55 },
  rose:   { label: "Rose",         h: 340,   s: 62 },
  ember:  { label: "Ember",        h: 18,    s: 68 },
  forest: { label: "Forest",       h: 145,   s: 52 },
  slate:  { label: "Slate",        h: 192,   s: 16 },
};

export const FONTS: Record<FontKey, { label: string; stack: string; sample: string }> = {
  modern:  { label: "Modern",     stack: `"Inter", "Plus Jakarta Sans", system-ui, sans-serif`, sample: "Clean & clinical" },
  classic: { label: "Classic",    stack: `Georgia, "Times New Roman", serif`, sample: "Editorial serif" },
  mono:    { label: "Typewriter", stack: `"JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace`, sample: "Fixed width" },
  system:  { label: "System",     stack: `system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`, sample: "Your device's font" },
};

export const TEXT_SCALE_STOPS = [0.9, 0.95, 1, 1.08, 1.15] as const;

export const BUBBLES: Record<BubbleStyle, { label: string; mine: string; theirs: string }> = {
  rounded: { label: "Rounded", mine: "rounded-2xl rounded-br-md", theirs: "rounded-2xl rounded-bl-md" },
  minimal: { label: "Minimal", mine: "rounded-lg", theirs: "rounded-lg" },
  pill:    { label: "Pill",    mine: "rounded-full", theirs: "rounded-full" },
  classic: { label: "Classic", mine: "rounded-md rounded-br-none", theirs: "rounded-md rounded-bl-none" },
};

export const WALLPAPERS: Record<ChatWallpaper, { label: string; className: string }> = {
  none:  { label: "None",     className: "" },
  dots:  { label: "Dots",     className: "chatbg-dots" },
  grid:  { label: "Grid",     className: "chatbg-grid" },
  lines: { label: "Lines",    className: "chatbg-lines" },
  weave: { label: "Weave",    className: "chatbg-weave" },
  glow:  { label: "Soft glow", className: "chatbg-glow" },
};

/* ── Color math ─────────────────────────────────────────────────────────── */

export function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: l * 100 };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return { h: h * 60, s: s * 100, l: l * 100 };
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** hsl → "r g b" triplet string (the format globals.css variables use). */
export function hslToTriplet(h: number, s: number, l: number): string {
  s = clamp(s, 0, 100) / 100; l = clamp(l, 0, 100) / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0), f(8), f(4)].map((v) => Math.round(v * 255)).join(" ");
}

export function hslToHex(h: number, s: number, l: number): string {
  return "#" + hslToTriplet(h, s, l).split(" ")
    .map((v) => (+v).toString(16).padStart(2, "0")).join("");
}

/** Seed hue/sat for the active accent (custom falls back to teal on bad hex). */
export function accentSeed(s: AppearanceSettings): { h: number; s: number } {
  if (s.accent === "custom") {
    const hsl = hexToHsl(s.customHex);
    if (hsl && hsl.s > 4) return { h: hsl.h, s: clamp(hsl.s, 20, 85) };
    if (hsl) return { h: hsl.h, s: 16 }; // near-gray custom → slate-like
    return { h: ACCENTS.teal.h, s: ACCENTS.teal.s };
  }
  return { h: ACCENTS[s.accent].h, s: ACCENTS[s.accent].s };
}

/* Ramp ladders: sMul scales the seed saturation, l is lightness; the shape
   mirrors the hand-tuned teal ramp in globals.css. */
const LIGHT_TINTS = { 50: [0.40, 95], 100: [0.45, 88], 200: [0.45, 77], 300: [0.45, 63] } as const;
const SOLIDS = { 400: [0.60, 48], 500: [0.88, 36], 600: [1, 30], 700: [0.98, 23], 800: [0.97, 18], 900: [1, 13] } as const;
const DARK_TINTS = { 50: [0.70, 11], 100: [0.74, 15], 200: [0.75, 20], 300: [0.69, 29] } as const;
const DARK_TX = { 500: [0.69, 47], 600: [0.66, 51], 700: [0.72, 64], 800: [0.75, 76] } as const;

type Ramp = Record<string, string>;

/** Every CSS variable value for one accent at one brightness, both themes. */
export function buildAccentRamp(seed: { h: number; s: number }, brightness: number): { light: Ramp; dark: Ramp } {
  const b = clamp(brightness, -20, 20);
  const step = (sMul: number, l: number, shift: number) => hslToTriplet(seed.h, seed.s * sMul, clamp(l + shift, 6, 96));
  const light: Ramp = {}, dark: Ramp = {};
  for (const [k, [sm, l]] of Object.entries(LIGHT_TINTS)) light[`--brand-${k}`] = step(sm, l, b * 0.15);
  for (const [k, [sm, l]] of Object.entries(SOLIDS)) light[`--brand-${k}`] = step(sm, l, b * 0.4);
  light["--brand-950"] = light["--brand-900"];
  for (const k of [500, 600, 700, 800]) light[`--tx-brand-${k}`] = light[`--brand-${k}`];
  light["--glow"] = light["--brand-600"];
  for (const [k, [sm, l]] of Object.entries(DARK_TINTS)) dark[`--brand-${k}`] = step(sm, l, b * 0.2);
  for (const [k, [sm, l]] of Object.entries(DARK_TX)) dark[`--tx-brand-${k}`] = step(sm, l, b * 0.4);
  return { light, dark };
}

/** Swatch color for pickers (the ramp's 600 step). */
export function accentSwatchHex(key: Exclude<AccentKey, "custom">): string {
  const a = ACCENTS[key];
  return hslToHex(a.h, a.s, 30);
}

/* ── Compiled stylesheet ────────────────────────────────────────────────── */

const vars = (r: Ramp) => Object.entries(r).map(([k, v]) => `${k}:${v};`).join("");

/**
 * The full override stylesheet for a settings object. Injected as
 * `<style id="dl-appearance">`; cached in localStorage so the layout boot
 * script can apply it before first paint.
 */
export function buildAppearanceCss(s: AppearanceSettings): string {
  const out: string[] = [];

  // Accent ramp (skip when everything matches the built-in teal defaults).
  if (s.accent !== "teal" || s.brightness !== 0 || s.duo) {
    const seed = accentSeed(s);
    const { light, dark } = buildAccentRamp(seed, s.brightness);
    const gradSeed = s.duo ? { h: ACCENTS[s.accent2].h, s: ACCENTS[s.accent2].s } : seed;
    const g = (l: number, dk = false) => hslToHex(gradSeed.h, gradSeed.s * (dk ? 0.66 : 1), l);
    const from = (l: number, dk = false) => hslToHex(seed.h, seed.s * (dk ? 0.66 : 1), l);
    out.push(
      `:root{${vars(light)}--brand:${from(30)};--grad-from:${from(30)};--grad-mid:${g(s.duo ? 34 : 34)};--grad-to:${g(38)};}`,
      `.dark{${vars(dark)}--grad-from:${from(51, true)};--grad-mid:${g(s.duo ? 55 : 55, true)};--grad-to:${g(60, true)};}`,
    );
  }

  if (s.font !== "modern") out.push(`:root{--font-app:${FONTS[s.font].stack};}`);
  if (s.textScale !== 1) out.push(`html{font-size:${Math.round(s.textScale * 100)}%;}`);
  if (s.boldText) out.push(`body{font-weight:500;}`);
  return out.join("\n");
}

/* ── Persistence ────────────────────────────────────────────────────────── */

const isKey = <T extends string>(v: unknown, all: readonly T[]): v is T =>
  typeof v === "string" && (all as readonly string[]).includes(v);

/** Coerce anything (parsed JSON, garbage, old versions) into valid settings. */
export function normalizeAppearance(raw: unknown): AppearanceSettings {
  const d = DEFAULT_APPEARANCE;
  if (!raw || typeof raw !== "object") return { ...d };
  const o = raw as Record<string, unknown>;
  const accents = Object.keys(ACCENTS) as Exclude<AccentKey, "custom">[];
  return {
    accent: isKey(o.accent, [...accents, "custom"] as const) ? o.accent : d.accent,
    customHex: typeof o.customHex === "string" && /^#[0-9a-f]{6}$/i.test(o.customHex) ? o.customHex.toLowerCase() : d.customHex,
    brightness: typeof o.brightness === "number" && Number.isFinite(o.brightness) ? clamp(Math.round(o.brightness), -20, 20) : d.brightness,
    duo: o.duo === true,
    accent2: isKey(o.accent2, accents) ? o.accent2 : d.accent2,
    font: isKey(o.font, Object.keys(FONTS) as FontKey[]) ? o.font : d.font,
    textScale: typeof o.textScale === "number" && Number.isFinite(o.textScale) ? clamp(o.textScale, 0.9, 1.15) : d.textScale,
    boldText: o.boldText === true,
    bubble: isKey(o.bubble, Object.keys(BUBBLES) as BubbleStyle[]) ? o.bubble : d.bubble,
    wallpaper: isKey(o.wallpaper, Object.keys(WALLPAPERS) as ChatWallpaper[]) ? o.wallpaper : d.wallpaper,
  };
}

/** Stored settings, tolerating missing/garbage values and storage that throws. */
export function readStoredAppearance(storage: Pick<Storage, "getItem"> | null | undefined): AppearanceSettings {
  try {
    const raw = storage?.getItem(APPEARANCE_STORAGE_KEY);
    return normalizeAppearance(raw ? JSON.parse(raw) : null);
  } catch {
    return { ...DEFAULT_APPEARANCE };
  }
}

export function isDefaultAppearance(s: AppearanceSettings): boolean {
  return JSON.stringify(s) === JSON.stringify(DEFAULT_APPEARANCE);
}

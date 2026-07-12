"use client";
import { useRef } from "react";
import { Sun, Moon, Monitor, Check, SunDim, RotateCcw, Pipette, CheckCheck } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { useAppearance } from "@/context/AppearanceContext";
import {
  ACCENTS, BUBBLES, FONTS, TEXT_SCALE_STOPS, WALLPAPERS,
  accentSwatchHex, isDefaultAppearance,
  type AccentKey, type BubbleStyle, type ChatWallpaper, type FontKey,
} from "@/lib/appearance";
import { cn } from "@/lib/utils";

/**
 * Settings → Appearance: the full customization studio. Everything applies
 * instantly (CSS variables / injected stylesheet) and persists per device.
 */
export default function AppearanceStudio() {
  return (
    <>
      <ThemeCard />
      <AccentCard />
      <TypographyCard />
      <ChatStyleCard />
      <ResetCard />
    </>
  );
}

function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section className="card p-5">
      {title && <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-ink-400">{title}</h2>}
      <div className="space-y-4">{children}</div>
    </section>
  );
}

/* ───────────────────────── Theme mode ───────────────────────── */

const THEME_OPTIONS = [
  { value: "light", label: "Light", icon: Sun, desc: "Bright, clinical white" },
  { value: "dark", label: "Dark", icon: Moon, desc: "Dimmed for low light" },
  { value: "system", label: "System", icon: Monitor, desc: "Follows your device" },
] as const;

/** Miniature UI mock rendered in fixed colors — a preview must not flip with the theme. */
function ThemeSwatch({ mode }: { mode: "light" | "dark" | "system" }) {
  const Pane = ({ dark }: { dark: boolean }) => (
    <div className={cn("flex h-full flex-1 flex-col gap-1 p-2", dark ? "bg-[#101617]" : "bg-[#f4f6f6]")}>
      <div className="flex items-center gap-1">
        <span className={cn("h-2 w-2 rounded-full", dark ? "bg-[#4fb3a9]" : "bg-[#1e7b74]")} />
        <span className={cn("h-1 w-7 rounded-full", dark ? "bg-[#3c4a4d]" : "bg-[#d7dcdd]")} />
      </div>
      <div className={cn("flex-1 rounded-md border p-1.5", dark ? "border-white/[.06] bg-[#161e20]" : "border-black/[.06] bg-white")}>
        <span className={cn("block h-1 w-8 rounded-full", dark ? "bg-[#9fb0b2]" : "bg-[#8a9295]")} />
        <span className={cn("mt-1 block h-1 w-5 rounded-full", dark ? "bg-[#263033]" : "bg-[#eaedee]")} />
      </div>
    </div>
  );
  return (
    <div aria-hidden className="flex h-16 w-full overflow-hidden rounded-lg border border-ink-900/10">
      {mode !== "dark" && <Pane dark={false} />}
      {mode !== "light" && <Pane dark />}
    </div>
  );
}

function ThemeCard() {
  const { theme, setTheme } = useTheme();
  return (
    <Card title="Theme">
      <div role="radiogroup" aria-label="Theme" className="grid gap-3 sm:grid-cols-3">
        {THEME_OPTIONS.map((o) => {
          const active = theme === o.value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setTheme(o.value)}
              className={cn(
                "rounded-xl border-2 p-2 pb-2.5 text-left transition",
                active ? "border-brand-600" : "border-ink-900/10 hover:border-brand-300"
              )}
            >
              <ThemeSwatch mode={o.value} />
              <span className="mt-2 flex items-center gap-1.5 px-0.5">
                <o.icon size={14} className={active ? "text-brand-600" : "text-ink-400"} />
                <span className="flex-1 text-sm font-semibold text-ink-900">{o.label}</span>
                {active && <Check size={14} className="anim-pop text-brand-600" />}
              </span>
              <span className="block px-0.5 text-xs text-ink-500">{o.desc}</span>
            </button>
          );
        })}
      </div>
      <p className="text-xs text-ink-400">Applies instantly on this device. System follows your OS light/dark setting.</p>
    </Card>
  );
}

/* ───────────────────────── Accent color ───────────────────────── */

const ACCENT_KEYS = Object.keys(ACCENTS) as Exclude<AccentKey, "custom">[];

function SwatchRow({ value, onPick, allowCustom, customHex, onCustom }: {
  value: AccentKey;
  onPick: (k: Exclude<AccentKey, "custom">) => void;
  allowCustom?: boolean;
  customHex?: string;
  onCustom?: (hex: string) => void;
}) {
  const colorRef = useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      {ACCENT_KEYS.map((k) => {
        const active = value === k;
        return (
          <button
            key={k}
            type="button"
            title={ACCENTS[k].label}
            aria-label={`${ACCENTS[k].label} accent`}
            aria-pressed={active}
            onClick={() => onPick(k)}
            className={cn(
              "press grid h-10 w-10 place-items-center rounded-full ring-offset-2 ring-offset-surface transition",
              active ? "ring-2 ring-brand-600" : "ring-1 ring-ink-900/10 hover:ring-ink-900/30"
            )}
            style={{ background: accentSwatchHex(k) }}
          >
            {active && <Check size={16} className="text-white anim-pop" />}
          </button>
        );
      })}
      {allowCustom && (
        <button
          type="button"
          title="Custom color"
          aria-label="Custom accent color"
          aria-pressed={value === "custom"}
          onClick={() => colorRef.current?.click()}
          className={cn(
            "press relative grid h-10 w-10 place-items-center overflow-hidden rounded-full ring-offset-2 ring-offset-surface transition",
            value === "custom" ? "ring-2 ring-brand-600" : "ring-1 ring-ink-900/10 hover:ring-ink-900/30"
          )}
          style={{
            background: value === "custom" && customHex
              ? customHex
              : "conic-gradient(#e05d5d, #d8a34a, #58a35c, #4a8fd8, #8a5dd8, #e05d5d)",
          }}
        >
          {value === "custom" ? <Check size={16} className="text-white anim-pop" /> : <Pipette size={14} className="text-white drop-shadow" />}
          <input
            ref={colorRef}
            type="color"
            value={customHex || "#1e7b74"}
            onChange={(e) => onCustom?.(e.target.value)}
            className="absolute inset-0 cursor-pointer opacity-0"
            aria-label="Pick a custom accent color"
          />
        </button>
      )}
    </div>
  );
}

function AccentCard() {
  const { appearance: a, update } = useAppearance();
  const brightnessLabel = a.brightness === 0 ? "Balanced" : a.brightness > 0 ? "Brighter" : "Deeper";
  return (
    <Card title="Accent color">
      <SwatchRow
        value={a.accent}
        onPick={(k) => update({ accent: k })}
        allowCustom
        customHex={a.customHex}
        onCustom={(hex) => update({ accent: "custom", customHex: hex })}
      />

      {/* brightness */}
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-sm font-semibold text-ink-700">Color intensity</span>
          <span className="text-xs font-semibold text-brand-700">{brightnessLabel}</span>
        </div>
        <div className="flex items-center gap-3">
          <SunDim size={17} className="shrink-0 text-ink-400" />
          <input
            type="range" min={-20} max={20} step={5}
            value={a.brightness}
            onChange={(e) => update({ brightness: Number(e.target.value) })}
            className="w-full accent-brand-600"
            aria-label="Accent brightness"
          />
          <Sun size={17} className="shrink-0 text-ink-400" />
        </div>
      </div>

      {/* duo */}
      <div className="flex items-center gap-3 border-t border-ink-900/[.06] pt-4">
        <div className="flex-1">
          <p className="text-sm font-semibold text-ink-900">Duo — blend two colors</p>
          <p className="text-xs text-ink-500">Pairs your accent with a second color: gradient headlines and chat bubbles.</p>
        </div>
        <button
          onClick={() => update({ duo: !a.duo })}
          role="switch" aria-checked={a.duo} aria-label="Duo color blend"
          className={cn("relative h-6 w-11 rounded-full transition", a.duo ? "bg-brand-600" : "bg-ink-900/15")}
        >
          <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", a.duo ? "left-[1.4rem]" : "left-0.5")} />
        </button>
      </div>
      {a.duo && <SwatchRow value={a.accent2} onPick={(k) => update({ accent2: k })} />}

      {/* live sample */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl bg-ink-50 p-3.5">
        <span className={cn("btn px-4 py-2 text-sm text-white", a.duo ? "bubble-mine shadow-glow" : "bg-brand-600 shadow-glow")}>Primary action</span>
        <span className="chip bg-brand-50 text-brand-700">Specialty chip</span>
        <span className="text-gradient font-display text-lg font-extrabold">Orovion</span>
      </div>
    </Card>
  );
}

/* ───────────────────────── Typography ───────────────────────── */

const SCALE_LABELS = ["Compact", "Cozy", "Default", "Large", "Larger"];

function TypographyCard() {
  const { appearance: a, update } = useAppearance();
  const scaleIdx = TEXT_SCALE_STOPS.reduce(
    (best, s, i) => (Math.abs(s - a.textScale) < Math.abs(TEXT_SCALE_STOPS[best] - a.textScale) ? i : best), 0);
  return (
    <Card title="Typography">
      <div role="radiogroup" aria-label="App font" className="grid gap-3 sm:grid-cols-2">
        {(Object.keys(FONTS) as FontKey[]).map((k) => {
          const active = a.font === k;
          return (
            <button
              key={k}
              type="button" role="radio" aria-checked={active}
              onClick={() => update({ font: k })}
              className={cn(
                "rounded-xl border-2 p-3.5 text-left transition",
                active ? "border-brand-600" : "border-ink-900/10 hover:border-brand-300"
              )}
            >
              <span className="flex items-center gap-1.5">
                <span className="flex-1 text-sm font-semibold text-ink-900">{FONTS[k].label}</span>
                {active && <Check size={14} className="anim-pop text-brand-600" />}
              </span>
              <span className="mt-1 block truncate text-lg text-ink-600" style={{ fontFamily: FONTS[k].stack }}>
                {FONTS[k].sample}
              </span>
            </button>
          );
        })}
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-sm font-semibold text-ink-700">Text size</span>
          <span className="text-xs font-semibold text-brand-700">{SCALE_LABELS[scaleIdx]}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-ink-400">A</span>
          <input
            type="range" min={0} max={TEXT_SCALE_STOPS.length - 1} step={1}
            value={scaleIdx}
            onChange={(e) => update({ textScale: TEXT_SCALE_STOPS[Number(e.target.value)] })}
            className="w-full accent-brand-600"
            aria-label="Text size"
          />
          <span className="text-lg font-bold text-ink-400">A</span>
        </div>
      </div>

      <div className="flex items-center gap-3 border-t border-ink-900/[.06] pt-4">
        <div className="flex-1">
          <p className="text-sm font-semibold text-ink-900">Bold text</p>
          <p className="text-xs text-ink-500">Heavier body text for readability.</p>
        </div>
        <button
          onClick={() => update({ boldText: !a.boldText })}
          role="switch" aria-checked={a.boldText} aria-label="Bold text"
          className={cn("relative h-6 w-11 rounded-full transition", a.boldText ? "bg-brand-600" : "bg-ink-900/15")}
        >
          <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", a.boldText ? "left-[1.4rem]" : "left-0.5")} />
        </button>
      </div>
    </Card>
  );
}

/* ───────────────────────── Chat style ───────────────────────── */

function ChatStyleCard() {
  const { appearance: a, update } = useAppearance();
  return (
    <Card title="Chat style">
      {/* bubble shape */}
      <div>
        <p className="mb-2 text-sm font-semibold text-ink-700">Message bubbles</p>
        <div role="radiogroup" aria-label="Bubble style" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(Object.keys(BUBBLES) as BubbleStyle[]).map((k) => {
            const active = a.bubble === k;
            return (
              <button
                key={k}
                type="button" role="radio" aria-checked={active}
                onClick={() => update({ bubble: k })}
                className={cn(
                  "rounded-xl border-2 p-2.5 transition",
                  active ? "border-brand-600" : "border-ink-900/10 hover:border-brand-300"
                )}
              >
                <span aria-hidden className="flex flex-col gap-1.5 rounded-lg bg-ink-50 p-2">
                  <span className={cn("h-4 w-3/5 self-start bg-surface shadow-1", BUBBLES[k].theirs)} />
                  <span className={cn("h-4 w-3/5 self-end bubble-mine", BUBBLES[k].mine)} />
                </span>
                <span className="mt-1.5 block text-center text-xs font-semibold text-ink-700">{BUBBLES[k].label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* wallpaper */}
      <div>
        <p className="mb-2 text-sm font-semibold text-ink-700">Chat background</p>
        <div role="radiogroup" aria-label="Chat background" className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {(Object.keys(WALLPAPERS) as ChatWallpaper[]).map((k) => {
            const active = a.wallpaper === k;
            return (
              <button
                key={k}
                type="button" role="radio" aria-checked={active}
                onClick={() => update({ wallpaper: k })}
                className={cn(
                  "overflow-hidden rounded-xl border-2 transition",
                  active ? "border-brand-600" : "border-ink-900/10 hover:border-brand-300"
                )}
              >
                <span aria-hidden className={cn("block h-12 bg-ink-50", WALLPAPERS[k].className)} />
                <span className="block py-1 text-center text-[11px] font-semibold text-ink-700">{WALLPAPERS[k].label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* live preview */}
      <div className={cn("space-y-2 rounded-xl bg-ink-50 p-3.5", WALLPAPERS[a.wallpaper].className)} aria-hidden>
        <div className={cn("max-w-[70%] bg-surface px-3.5 py-2 text-sm text-ink-900 shadow-soft", BUBBLES[a.bubble].theirs)}>
          ECG looks clean — send the troponin trend?
        </div>
        <div className="flex justify-end">
          <div className={cn("max-w-[70%] px-3.5 py-2 text-sm text-white shadow-soft bubble-mine", BUBBLES[a.bubble].mine)}>
            <p>On it. Uploading now.</p>
            <p className="mt-0.5 flex items-center justify-end gap-1 text-[10px] text-white/70">now <CheckCheck size={12} /></p>
          </div>
        </div>
      </div>
      <p className="text-xs text-ink-400">Bubble shape and background apply to your chats on this device — the other person's view is unchanged.</p>
    </Card>
  );
}

/* ───────────────────────── Reset ───────────────────────── */

function ResetCard() {
  const { appearance, reset } = useAppearance();
  const pristine = isDefaultAppearance(appearance);
  return (
    <Card>
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <p className="text-sm font-semibold text-ink-900">Reset appearance</p>
          <p className="text-xs text-ink-500">Back to Orovion Teal, default font and chat style. Preferences are stored on this device only.</p>
        </div>
        <button onClick={reset} disabled={pristine} className="btn-outline px-4 py-2 text-sm disabled:opacity-40">
          <RotateCcw size={14} /> Reset
        </button>
      </div>
    </Card>
  );
}

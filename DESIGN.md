# DokLynk Design System

Captured from `tailwind.config.js`, `src/app/globals.css`, and the Figma board (`image/DokLynk.png`).

## Color

- **Brand teal ramp**: `brand-50 #eef7f6` → `brand-600 #1e7b74` (primary) → `brand-900 #0d3431`. Primary actions, active filter pills, links, verified badges.
- **Ink neutrals (warm slate)**: `ink-0 #ffffff` → `ink-50 #f4f6f6` (app bg) → `ink-500 #646b6d` (secondary text) → `ink-900 #0e1213` (body text).
- **Accents**: sage `#a9c7a4`, coral `#e8957a` (CASE STUDY tag), ochre `#d8b25a`, sky `#7aa9cf`.
- **Semantic**: success `#2e9d4a`, warning `#d68a14`, danger `#d23a3a`, info `#2e6cd2` (each with 50/500/700).
- Strategy: Restrained. White cards on `ink-50`; teal carries selection/action only. Post-type tags are the one colorful moment (coral = case study, teal = research/thesis).

## Typography

- **Inter** for UI/body, **Plus Jakarta Sans** (`font-display`) for headings/wordmark, **JetBrains Mono** for data.
- Body 15px/relaxed; secondary 13px `ink-500`; card titles `font-display font-extrabold`.

## Components

- `.card` — white, `rounded-2xl`, hairline `ink-900/[.06]` border, layered `shadow-card`.
- `.btn-primary` — teal pill with `shadow-glow`; `.btn-ghost` brand-50 tint; `.btn-outline` hairline.
- `.chip` — pill tags, 12px semibold.
- `.input` — `rounded-xl`, focus ring `ring-4 ring-brand-100`.
- Bottom sheets slide up (`anim-sheet-up`, .34s cubic-bezier(.21,.8,.3,1)); modals scale in; mobile grab-handle.
- Skeletons shimmer (`animate-shimmer`), never spinners inside content.

## Motion

- Curves: `cubic-bezier(.2,0,0,1)` standard, `cubic-bezier(.21,.8,.3,1)` sheets/pops.
- Vocabulary: `anim-pop` (state change), `anim-burst` (reaction commit), `anim-heart-fly` (double-tap), `.press` (scale .95 on tap), `.lift` (hover translate).
- 150–340ms; reduced-motion alternative required for every animation.

## Layout

- Feed column `max-w-xl` centered, right rail on `lg+`. Top bar `h-16` glass. Spacing rhythm: `space-y-5` between cards, `p-4`/`p-5` inside.

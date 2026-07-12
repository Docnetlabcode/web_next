/** @type {import('tailwindcss').Config} */

// Themed tokens live as space-separated RGB triplets in globals.css (:root = light,
// .dark = dark). `rgb(var(--x) / <alpha-value>)` keeps /50-style opacity modifiers working.
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`;

module.exports = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Orovion (ex-DokLynk) teal ramp — primary sits at 600 (#1E7B74).
        // 50–300 are tint roles (chip/ghost/hover fills) and flip with the theme;
        // 400–950 are solid anchors (identical in both themes — defined once in
        // :root). Every step is var-driven so the Appearance settings can retheme
        // the accent at runtime (src/lib/appearance.ts).
        brand: {
          50: v("brand-50"), 100: v("brand-100"), 200: v("brand-200"), 300: v("brand-300"),
          400: v("brand-400"), 500: v("brand-500"), 600: v("brand-600"), 700: v("brand-700"),
          800: v("brand-800"), 900: v("brand-900"), 950: v("brand-950"),
        },
        // Elevated content surface: white in light, raised charcoal-teal in dark.
        // Use for cards/sheets/inputs instead of bg-white.
        surface: v("surface"),
        // Warm-slate neutrals — the whole ramp flips in dark mode, so
        // "distance from the page background" keeps its meaning.
        ink: {
          0: v("ink-0"), 25: v("ink-25"), 50: v("ink-50"), 100: v("ink-100"),
          200: v("ink-200"), 300: v("ink-300"), 400: v("ink-400"), 500: v("ink-500"),
          600: v("ink-600"), 700: v("ink-700"), 800: v("ink-800"), 900: v("ink-900"),
          // Static near-black for always-dark contexts (media scrims, lightboxes,
          // reel posters): identical in both themes, unlike the flipping ramp above.
          950: "#0e1213",
        },
        accent: {
          sage: "#a9c7a4", coral: "#e8957a", ochre: "#d8b25a", sky: "#7aa9cf",
        },
        // Semantic ramps: 50 is a themed tint; 500/700 stay stable for solid fills.
        // Themed *text* shades live under textColor below.
        success: { 50: v("success-50"), 500: "#2e9d4a", 700: "#1f6f34" },
        warning: { 50: v("warning-50"), 500: "#d68a14", 700: "#94600c" },
        danger: { 50: v("danger-50"), 500: "#d23a3a", 700: "#962525" },
        info: { 50: v("info-50"), 500: "#2e6cd2", 700: "#1f4d99" },
        // Stock-palette tint steps used across screens (rose-50 chips, amber-50
        // banners, …) get dark equivalents; solid 500+ fills stay stock.
        rose: { 50: v("rose-50"), 100: v("rose-100"), 200: v("rose-200"), 300: v("rose-300") },
        amber: { 50: v("amber-50"), 200: v("amber-200") },
        emerald: { 50: v("emerald-50"), 100: v("emerald-100"), 200: v("emerald-200"), 300: v("emerald-300") },
        sky: { 50: v("sky-50"), 300: v("sky-300") },
        indigo: { 50: v("indigo-50") },
      },
      // Text-only overrides: shades that serve double duty (button bg in one place,
      // link/label text in another) brighten in dark mode as text without touching fills.
      textColor: {
        brand: { 500: v("tx-brand-500"), 600: v("tx-brand-600"), 700: v("tx-brand-700"), 800: v("tx-brand-800") },
        success: { 500: v("tx-success-500"), 700: v("tx-success-700") },
        warning: { 500: v("tx-warning-500"), 700: v("tx-warning-700") },
        danger: { 500: v("tx-danger-500"), 700: v("tx-danger-700") },
        info: { 500: v("tx-info-500"), 700: v("tx-info-700") },
        rose: { 500: v("tx-rose-500"), 600: v("tx-rose-600"), 700: v("tx-rose-700") },
        amber: { 600: v("tx-amber-600"), 700: v("tx-amber-700") },
        emerald: { 600: v("tx-emerald-600"), 700: v("tx-emerald-700") },
        sky: { 600: v("tx-sky-600"), 700: v("tx-sky-700") },
        indigo: { 600: v("tx-indigo-600") },
      },
      fontFamily: {
        // Body font is var-driven so Appearance settings can swap the family
        // (--font-app defaults to the Inter stack in globals.css). Headings keep
        // Plus Jakarta as the brand voice regardless of the body choice.
        sans: ["var(--font-app)"],
        display: ['"Plus Jakarta Sans"', '"Inter"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "SF Mono", "Menlo", "monospace"],
      },
      // Shadow color + strength are themed (--shadow, --sh-*): near-invisible ink
      // shadows in light, deeper black shadows in dark where borders carry elevation.
      boxShadow: {
        1: "0 1px 2px rgb(var(--shadow) / var(--sh-1)), 0 1px 1px rgb(var(--shadow) / var(--sh-0))",
        2: "0 2px 6px rgb(var(--shadow) / var(--sh-2)), 0 1px 2px rgb(var(--shadow) / var(--sh-1))",
        3: "0 6px 18px rgb(var(--shadow) / var(--sh-3)), 0 2px 6px rgb(var(--shadow) / var(--sh-1))",
        4: "0 14px 32px rgb(var(--shadow) / var(--sh-4)), 0 4px 10px rgb(var(--shadow) / var(--sh-2))",
        soft: "0 2px 6px rgb(var(--shadow) / var(--sh-2)), 0 1px 2px rgb(var(--shadow) / var(--sh-1))",
        card: "0 6px 18px rgb(var(--shadow) / var(--sh-3)), 0 2px 6px rgb(var(--shadow) / var(--sh-1))",
        glow: "0 8px 24px rgb(var(--glow) / .22)",
      },
      borderRadius: {
        DEFAULT: "12px", xl: "16px", "2xl": "16px", xl2: "20px", "3xl": "24px", pill: "999px",
      },
      transitionTimingFunction: {
        standard: "cubic-bezier(.2,0,0,1)", emphasized: "cubic-bezier(.2,0,0,1)", out: "cubic-bezier(0,0,.2,1)",
      },
      keyframes: {
        "fade-up": { "0%": { opacity: "0", transform: "translateY(16px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        "fade-in": { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        float: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-10px)" } },
        shimmer: { "100%": { transform: "translateX(100%)" } },
        "scale-in": { "0%": { opacity: "0", transform: "scale(.96)" }, "100%": { opacity: "1", transform: "scale(1)" } },
        "pulse-ring": { "0%": { transform: "scale(.8)", opacity: "0.6" }, "100%": { transform: "scale(2.2)", opacity: "0" } },
        marquee: { "0%": { transform: "translateX(0)" }, "100%": { transform: "translateX(-50%)" } },
      },
      animation: {
        "fade-up": "fade-up .6s cubic-bezier(.2,0,0,1) both",
        "fade-in": "fade-in .6s ease both",
        float: "float 6s ease-in-out infinite",
        shimmer: "shimmer 1.6s infinite",
        "scale-in": "scale-in .32s cubic-bezier(.2,0,0,1) both",
        "pulse-ring": "pulse-ring 2.4s cubic-bezier(.2,.6,.3,1) infinite",
        marquee: "marquee 30s linear infinite",
      },
    },
  },
  plugins: [],
};

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Orovion (ex-DokLynk) teal ramp — primary sits at 600 (#1E7B74)
        brand: {
          50: "#eef7f6", 100: "#d6ece9", 200: "#aed8d3", 300: "#7fc1ba",
          400: "#4ea69e", 500: "#2b8e85", 600: "#1e7b74", 700: "#185f5a",
          800: "#134945", 900: "#0d3431", 950: "#0d3431",
        },
        // Warm-slate neutrals
        ink: {
          0: "#ffffff", 25: "#fafbfb", 50: "#f4f6f6", 100: "#eaedee",
          200: "#d7dcdd", 300: "#b6bdbf", 400: "#8a9295", 500: "#646b6d",
          600: "#474d4f", 700: "#2f3537", 800: "#1c2123", 900: "#0e1213",
        },
        accent: {
          sage: "#a9c7a4", coral: "#e8957a", ochre: "#d8b25a", sky: "#7aa9cf",
        },
        success: { 50: "#ecf7ee", 500: "#2e9d4a", 700: "#1f6f34" },
        warning: { 50: "#fff5e0", 500: "#d68a14", 700: "#94600c" },
        danger: { 50: "#fdecec", 500: "#d23a3a", 700: "#962525" },
        info: { 50: "#e8f1fb", 500: "#2e6cd2", 700: "#1f4d99" },
      },
      fontFamily: {
        sans: ['"Inter"', '"Plus Jakarta Sans"', "system-ui", "sans-serif"],
        display: ['"Plus Jakarta Sans"', '"Inter"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "SF Mono", "Menlo", "monospace"],
      },
      boxShadow: {
        1: "0 1px 2px rgba(14,18,19,.04), 0 1px 1px rgba(14,18,19,.03)",
        2: "0 2px 6px rgba(14,18,19,.05), 0 1px 2px rgba(14,18,19,.04)",
        3: "0 6px 18px rgba(14,18,19,.07), 0 2px 6px rgba(14,18,19,.04)",
        4: "0 14px 32px rgba(14,18,19,.10), 0 4px 10px rgba(14,18,19,.05)",
        soft: "0 2px 6px rgba(14,18,19,.05), 0 1px 2px rgba(14,18,19,.04)",
        card: "0 6px 18px rgba(14,18,19,.07), 0 2px 6px rgba(14,18,19,.04)",
        glow: "0 8px 24px rgba(30,123,116,.22)",
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

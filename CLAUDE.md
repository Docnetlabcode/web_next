# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Orovion — Next.js 14 **App Router** web client for a healthcare social platform, ported from a Vite SPA (which still lives in `../Orovion Frontend`). TypeScript, Tailwind, Firebase auth, socket.io. Unit tests run on **Vitest** (`npm test`); they cover pure logic only (`src/lib/__tests__/`) — there are no component/DOM or E2E tests yet. Keep testable logic framework-free (e.g. `src/lib/relationships.ts`, `src/lib/notify.ts`) so it can be unit-tested without the React tree.

## Commands

```bash
npm run dev      # dev server on http://localhost:5173 (not 3000)
npm run build    # production build
npm run start    # serve the build
npm run lint     # next lint
npm test         # vitest run (unit tests in src/lib/__tests__/)
npm run test:watch
```

Setup: `cp .env.example .env.local` and set the backend URL + Firebase keys. If no API base is set, `next.config.mjs` rewrites proxy `/api` and `/socket.io` to `BACKEND_PROXY_TARGET` (default `http://localhost:5000`); when set, calls go direct to the backend.

**Dual backend deployment (AWS + Render):** the backend runs in two places. When the `NEXT_PUBLIC_API_BASE_AWS` / `NEXT_PUBLIC_API_BASE_RENDER` pairs are set (see `.env.example`), `src/lib/backend.ts` probes each api-service `GET /health` on load (AWS preferred, Render only when AWS is down), locks onto the first live deployment, and fails over mid-session — `api.ts` retries once against the other deployment on a network error **or a 502/503/504**, and the socket singletons re-point via `onBackendChange`. A base set to the literal `proxy` means **same-origin**: the browser calls this app's origin and the always-on rewrites in `next.config.mjs` forward `/api` + `/health` to `BACKEND_PROXY_TARGET` and `/socket.io` to `CHAT_PROXY_TARGET`. That's mandatory for the AWS box (plain http on a bare IP — an https page can't call it and its `Secure` refresh cookie can't be stored; proxied, the cookie lands first-party); https Render is called directly. The legacy single `NEXT_PUBLIC_API_BASE` / `NEXT_PUBLIC_SOCKET_URL` vars still work unchanged when the pairs are unset. Caveat: the refresh cookie belongs to the active backend's domain, so login state does not survive a cross-deployment failover.

`next.config.mjs` currently sets `typescript.ignoreBuildErrors` and `eslint.ignoreDuringBuilds` (and `tsconfig.json` has `strict: false`) to keep the JS→TS port building — so a passing build does NOT mean the types are right. The goal is to remove these eventually; don't add new code that depends on them.

## Architecture

**Route files are thin; screens are the real pages.** Each `src/app/**/page.tsx` just renders a component from `src/screens/*` (e.g. `src/app/app/cases/page.tsx` → `src/screens/Cases.tsx`). Screen logic lives in `src/screens/`, NOT in the route files — and not in a `pages/` dir, which Next would treat as the legacy Pages Router.

**Router shim instead of next/navigation.** Screens were ported from react-router-dom unchanged: they import `useNavigate`, `Link`, `NavLink`, `useParams`, `useSearchParams`, `useLocation`, `Navigate` from `@/lib/router`, a thin shim over `next/navigation`. Keep using the shim in screens/components for consistency; note `Link` takes `to=`, not `href=`.

**Route groups and rendering modes:**
- `/`, `/login`, `/onboarding` render statically.
- Everything under `/app/*` is auth-gated and `force-dynamic` (set once in `src/app/app/layout.tsx`, which wraps children in `AppLayout`).
- All interactive code is `"use client"`. `src/app/providers.tsx` mounts `AuthProvider` for the whole tree.

**Auth flow (`src/context/AuthContext.tsx` + `src/lib/api.ts`):**
- Web token transport: access token in memory only; refresh token in an httpOnly cookie; CSRF token in localStorage (`dl_csrf`), echoed as `X-CSRF-Token` on refresh/logout calls.
- On load, `AuthProvider` silently calls `/auth/refresh-token` to re-mint the access token, then loads `/profile/me`.
- An axios response interceptor auto-refreshes once on 401; on hard failure it clears tokens and dispatches a `dl:auth-expired` window event, which `AuthProvider` listens for to log out locally.
- Route guards live in `src/components/layout/AppLayout.tsx` (no user → `/login`; incomplete profile → `/onboarding`), not in middleware.

**API layer (`src/lib/api.ts`):** all backend calls go through the `dok` object — a flat endpoint map (`dok.posts.like(id)`, `dok.network.accept(id)`, …). Responses arrive in a `{ statusCode, success, message, data }` envelope that `unwrap` strips, so callers receive `data` directly. Add new endpoints here rather than calling axios from screens. Admin endpoints attach an `x-admin-key` header from localStorage (`setAdminKey`).

**No mock/demo data:** the app is fully backed by the live API — there is no `src/data/mock.ts`, no demo mode, and no offline tour. Screens fetch from `dok` and render loading skeletons then empty states when there's nothing (never fake content). `useAuth()` still exposes a `demo` flag that is permanently `false` (legacy guards are harmless no-ops); don't reintroduce mock fallbacks.

**Theming (light/dark).** `darkMode: "class"`; themed tokens are CSS variables in `src/app/globals.css` (`:root` = light, `.dark` = dark) consumed by `tailwind.config.js`. Rules when writing UI:
- Cards/sheets/inputs/dropdowns use `bg-surface`, **never `bg-white`** (literal white is only for content sitting on media or solid brand color).
- The `ink` ramp *flips* in dark mode (`ink-50` page bg ↔ near-black, `ink-900` text ↔ near-white) — alpha fills like `bg-ink-900/[.06]` theme automatically. For always-dark contexts (lightboxes, reel posters, image scrims, modal backdrops) use the static `ink-950`.
- `text-brand-600`, `text-danger-700`, `text-rose-600` etc. are *text-only* overrides that brighten in dark mode; the same shades as `bg-*` stay fixed (buttons keep white text). Tint steps (`*-50`, `rose-100/200/300`, …) flip to deep tints.
- Preference lives in localStorage `dl_theme` (`light|dark|system`): pure logic in `src/lib/theme.ts` (unit-tested), DOM side in `src/context/ThemeContext.tsx` (`useTheme()`), pre-paint no-flash script inline in `src/app/layout.tsx`. UI: `ThemeToggle` in the landing navbar, radio picker in Settings → Appearance. `Logo` swaps to `/brand/wordmark-dark.svg` via `dark:` classes.
- **User appearance customization** (Settings → Appearance, `AppearanceStudio`): accent color themes (preset/custom + brightness + duo-gradient), body font, text size, bold text, chat bubble shape and chat wallpaper. Pure logic in `src/lib/appearance.ts` (unit-tested — generates the whole brand CSS-var ramp for both themes), DOM side in `src/context/AppearanceContext.tsx` (`useAppearance()`), persisted in localStorage `dl_appearance` (+ compiled CSS cache `dl_appearance_css` applied pre-paint by the layout boot script). Because of this, **every brand shade (including 400–950 solids) must stay CSS-var-driven** — never reintroduce hardcoded teal hex in tailwind.config.js or component styles.

**Env vars:** all client-side config is `NEXT_PUBLIC_*` (the Vite `import.meta.env.VITE_*` equivalents).

## Backend reference

API contracts are documented in `docs/API.md`, `docs/feed.md`, and `docs/profile.md` — check these before adding or changing endpoint calls.

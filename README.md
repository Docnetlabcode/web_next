# Orovion — Web (Next.js)

Next.js 14 **App Router** port of the Orovion web client (migrated from the Vite SPA, which still lives in `../DokLynk Frontend`). Same UI, API layer, Firebase auth, and socket.io — re-homed onto Next file-based routing in **TypeScript**.

## Quick start

```bash
npm install
cp .env.example .env.local     # set backend URL + Firebase keys
npm run dev                    # http://localhost:5173
```

`npm run build` → production build · `npm run start` → serve the build.

## How the migration maps

| Vite / React Router | Next.js |
|---|---|
| `src/main.jsx`, `index.html` | `src/app/layout.tsx` (fonts, metadata, `<Providers>`) |
| `src/App.jsx` routes | `src/app/**/page.tsx` (file-based) |
| `src/pages/*` screens | `src/screens/*` (imported by the route files; **not** `pages/`, which Next treats as the old Pages Router) |
| `<Protected>` / `<RequireProfile>` | guards inside `src/components/layout/AppLayout.tsx` |
| `react-router-dom` | `@/lib/router.tsx` — a thin shim over `next/navigation` (`useNavigate`, `Link`, `NavLink`, `useParams`, `useSearchParams`, `useLocation`, `Navigate`) so screens import it unchanged |
| `import.meta.env.VITE_*` | `process.env.NEXT_PUBLIC_*` |
| Vite dev proxy | `next.config.mjs` rewrites (only when `NEXT_PUBLIC_API_BASE` is blank) |

- `/` , `/login`, `/onboarding` render statically; everything under `/app/*` is `force-dynamic` (auth-gated, client-driven).
- All interactive code is marked `"use client"`.

## Admin console (secret path)

A standalone operator console (`src/screens/Admin.tsx`) is completely separate from the
product app — no link points to it, and it's `robots: noindex`. To keep it from being
guessed, it is **not** served at `/admin`:

- `src/middleware.ts` serves the console only at **`/<ADMIN_PANEL_SLUG>`** (a server-only env
  var — set it to a long random value per deployment; the real path never ships to the
  client). The literal `/admin` path is made to **404**.
- Local example: `http://localhost:5173/<your-slug>`. The default fallback slug is only for
  local dev — **override `ADMIN_PANEL_SLUG` in production.**

It has its own identity, **not** a Orovion user account:

- **Login** with the backend's `ADMIN_USERNAME` / `ADMIN_PASSWORD` (env). The backend returns
  an admin JWT pair that the client holds in `sessionStorage` via `ADMIN_TOKENS` (in
  `src/lib/api.ts`) — separate from the product user session, attached as `Authorization:
  Bearer` on `/admin/*` calls only, and auto-refreshed on 401.
- **Sections:** Overview (dashboard metrics + live online count), Users (search, block
  temporary/permanent, deactivate, permanent delete), Content (super-delete any
  post/reel/thesis/case), Verifications (doctor + student KYC), Reports, Feedback, Deletions,
  and the Audit log.
- All calls go through `dok.admin.*` in `src/lib/api.ts`. The previous `x-admin-key` shared
  secret has been removed.

## Notes / TODO to tighten later

- `next.config.mjs` currently sets `typescript.ignoreBuildErrors` and `eslint.ignoreDuringBuilds`, and `tsconfig.json` is lenient — this kept the large JS→TS port building. Remove these and add real types incrementally.
- Backend CORS already allows any `localhost` port in dev, so the direct `NEXT_PUBLIC_API_BASE=http://localhost:5000` works. For deploys, set it to the public backend URL and add the web origin to the backend `FRONTEND_URL` + Firebase Authorized domains.

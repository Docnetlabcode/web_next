# Design Spec — Home Feed: web ↔ app parity (build #1)

**Date:** 2026-06-16
**Service:** DokLynk Web (Next.js client)
**Status:** Approved for implementation
**Author:** Claude + user

---

## 1. Goal

Reshape the web Home feed to match the existing **mobile app** design, as the first
screen in a screen-by-screen effort to bring the web client to feature parity with the
app (single shared backend). See project memory `web-mirrors-mobile-app`.

The app's Home differs **by role**: a health professional (`doctor`) sees a stats strip
(Unread / Priority / Paid Priority) at the top of the feed; students and general users
do not. The app Home also surfaces "People you may know" inline within the feed.

## 2. Scope

Changes are confined to `src/screens/Feed.tsx` (plus small reuse of existing
`UserCard`, `Avatar`, and the `dok` API map). **No backend changes.**

- **Desktop is untouched.** The existing sidebar + right-rail layout stays. New blocks
  are mobile-only (`lg:hidden`), matching the app on phones while preserving desktop.
- **Existing controls keep their current functions** (composer, create-type row, filter
  chips, post cards, infinite scroll, right rail). This build only *adds* mobile blocks.

Out of scope (later builds): bottom nav redesign (Home·Pulse·Network·Messages·Calls),
floating "+" FAB, doctor-only Calls tab — these are app-shell-wide and handled separately.

## 3. Doctor stats strip

- Renders only when `user.role === "doctor"`, and only at mobile widths (`lg:hidden`),
  at the top of the feed column.
- Three cards:
  - **Unread** — live count from `dok.notifications.unread()` (`{ count }` or number).
    Tapping navigates to `/app/notifications`.
  - **Priority** — no backend endpoint exists. Renders `—` with a small "soon" hint;
    tapping shows a lightweight "coming soon" affordance (no fake number).
  - **Paid Priority** — same placeholder treatment, rose-tinted to match the app.
- Students / general users never render the strip (the role difference).

## 4. Inline "People you may know"

- Mobile-only (`lg:hidden`) card inserted into the feed after the 2nd post.
- Data: `dok.follows.suggestions()` (already used by `RightRail`); render up to ~6 as a
  horizontal scroll of compact cards (avatar, name, headline) with a Connect/Follow
  action reusing the existing follow handler. "See all" → `/app/network`.
- If there are no suggestions, the block does not render (no empty filler).
- On desktop the same suggestions remain in the right rail; this only adds the mobile
  surface, so there is no duplication on large screens.

## 5. Data / envelope notes

- `dok.notifications.unread()` → tolerate `{ count }` or a bare number.
- `dok.follows.suggestions()` → `{ suggestions: [...] }`.
- All fetches fail soft (catch → hide block / show `—`); the feed itself is unaffected.

## 6. Testing

Presentational React; the project unit-tests pure logic only (no component/DOM tests),
so verification is `npm run build` + `npm run lint` passing and manual check at a phone
viewport (doctor vs student/general). No new pure-logic module is introduced.

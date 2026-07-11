# Orovion API — Module Docs

One file per module. Each file lists its endpoints, the request/response **JSON**,
and a short **frontend** snippet. Read this index first — it covers the setup every
module call depends on (base URL, auth, the response envelope, pagination, errors).

## Modules

| Module | File | What it covers |
|---|---|---|
| Auth | [auth.md](auth.md) | OTP / Google login, refresh, sessions |
| Users | [users.md](users.md) | Onboarding, public profile, user search |
| Profile | [profile.md](profile.md) | Edit profile, lists, **username**, verification, photos |
| Posts | [posts.md](posts.md) | Create/edit, like, comment, save, report, share |
| Likes | [likes.md](likes.md) | Universal like engine (posts / comments / reels / reel-comments) |
| Feed | [feed.md](feed.md) | Home / explore / saved, specialty filter, not-interested, mute |
| Recommendation | [recommendation.md](recommendation.md) | Home-feed & reel ranking: sessions, seen/watch de-dup, exhaustion |
| Follows | [follows.md](follows.md) | Follow state machine + private follow requests |
| Network | [network.md](network.md) | Connections (accept/reject), discover |
| Notifications | [notifications.md](notifications.md) | Activity feed, unread count, preferences |
| Search | [search.md](search.md) | **Discovery engine**: fuzzy profiles + unified content, typeahead, trending, hashtag workspace |
| Reels | [reels.md](reels.md) | Reel feed, upload (HLS), like/comment/analytics |
| Cases | [cases.md](cases.md) | Case-study CRUD, helpful, follow |
| Consultations | [consultations.md](consultations.md) | Booking, pay, approve/decline, refund |
| Account | [account.md](account.md) | Settings, privacy, deactivate/delete/restore |
| Email | [email.md](email.md) | Per-category email opt-ins |
| Admin | [admin.md](admin.md) | Verification queue, **reports moderation** |
| App | [app.md](app.md) | Version check + APK distribution |
| Chat | [chat.md](chat.md) | Conversations + messages (proxied to chat-service) |

> Deep-dive guides with extra worked examples: [../profile.md](../profile.md),
> [../feed.md](../feed.md). Full single-page table: [../API.md](../API.md).
>
> Want the **code** structure (what every file/folder does), not the wire format?
> See the codebase guide: [../codebase/README.md](../codebase/README.md).

---

## 1. Base URL

| Environment | URL |
|---|---|
| Local dev | `http://localhost:5000` |
| Production | `https://api.doklynk.app` |

All routes are under `/api/*`. Health check: `GET /health`.

## 2. Response envelope (every endpoint)

```json
{ "statusCode": 200, "success": true, "data": { }, "message": "Human-readable" }
```
`success` is `true` for 2xx, `false` otherwise. On success the payload is in `data`;
the module docs below show the `data` shape. On error, read `message`.

## 3. Authentication

Send the short-lived access token on every 🔒 request:

```
Authorization: Bearer <accessToken>
```
Payload: `{ id, role, fullName }`. Roles: `doctor | student | general_user`.

The refresh token delivery depends on client type (`X-Client-Type` header):

| | Web (`X-Client-Type: web`) | Mobile (default) |
|---|---|---|
| Access token | `Authorization: Bearer` | `Authorization: Bearer` |
| Refresh token | `httpOnly` cookie | JSON field in body |
| CSRF | `csrfToken` cookie + `X-CSRF-Token` header | not needed |

## 4. Pagination

Cursor-based everywhere (never offset). Pass the previous response's `nextCursor`:

```
GET /api/<...>?cursor=<lastId>&limit=20   →   data: { items[], hasMore, nextCursor }
```
Stop when `hasMore` is `false`.

## 5. Error codes

| Code | Meaning |
|---|---|
| 400 | Validation error |
| 401 | Missing/expired token |
| 403 | Forbidden (role / CSRF / locked field) |
| 404 | Not found (also used to hide others' resources) |
| 409 | Conflict (duplicate username/email) |
| 429 | Rate limited |
| 500 | Server error |

## 6. Frontend client (drop-in)

A framework-agnostic client with auto token-refresh used by every snippet in the
module docs (`api.get/post/put/del/upload`):

```js
// api.js
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
let accessToken = null;
export const setAccessToken = (t) => { accessToken = t; };
const cookie = (n) => document.cookie.split("; ").find(r => r.startsWith(n + "="))?.split("=")[1];

async function request(path, { method = "GET", body, isForm = false, _retry = false } = {}) {
  const headers = { "X-Client-Type": "web" };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  if (!isForm) headers["Content-Type"] = "application/json";
  if (method !== "GET") { const c = cookie("csrfToken"); if (c) headers["X-CSRF-Token"] = decodeURIComponent(c); }

  const res = await fetch(`${BASE_URL}/api${path}`, {
    method, headers, credentials: "include",
    body: isForm ? body : body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (res.status === 401 && !_retry && accessToken) {
    if (await refresh()) return request(path, { method, body, isForm, _retry: true });
  }
  if (!json.success) throw Object.assign(new Error(json.message || "Request failed"), { status: res.status, body: json });
  return json.data;
}
async function refresh() {
  const res = await fetch(`${BASE_URL}/api/auth/refresh-token`, {
    method: "POST",
    headers: { "X-Client-Type": "web", "X-CSRF-Token": decodeURIComponent(cookie("csrfToken") || "") },
    credentials: "include",
  });
  const json = await res.json().catch(() => ({}));
  if (json.success && json.data?.accessToken) { setAccessToken(json.data.accessToken); return true; }
  setAccessToken(null); return false;
}
export const api = {
  get: (p) => request(p),
  post: (p, b) => request(p, { method: "POST", body: b }),
  put: (p, b) => request(p, { method: "PUT", body: b }),
  del: (p) => request(p, { method: "DELETE" }),
  upload: (p, fd) => request(p, { method: "POST", body: fd, isForm: true }),
  refresh,
};
```

> **Mobile (React Native):** drop `X-Client-Type`, store both tokens in secure
> storage, and send `{ refreshToken }` in the body of `/auth/refresh-token`. See
> [auth.md](auth.md).

> **File uploads:** build a `FormData`, call `api.upload(path, fd)`, and **don't**
> set `Content-Type` manually — the boundary is set for you.

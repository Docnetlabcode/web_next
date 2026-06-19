# DokLynk — API Service 

The main REST gateway for **DokLynk**, a professional network for doctors, medical students, and general users. It owns authentication, user/profile management, content (posts, reels, cases), the social graph (follows, network, feed), notifications, consultations, and proxies chat to the chat-service.

- **Runtime:** Node.js + Express
- **Port:** `5000`
- **Data:** PostgreSQL (raw `pg`, ), Redis (cache), RabbitMQ (events)
- **Media:** Cloudinary (images/video) + Backblaze B2 (APK distribution)
- **Auth:** JWT access/refresh tokens, Firebase phone OTP, Google OAuth

> For deep architecture/internal conventions, see [CLAUDE.md](CLAUDE.md).
> For the complete endpoint-by-endpoint reference, see [docs/API.md](docs/API.md).

---

## Table of contents

1. [Tech stack](#tech-stack)
2. [Getting started](#getting-started)
3. [Environment variables](#environment-variables)
4. [Running the service](#running-the-service)
5. [Project structure](#project-structure)
6. [API conventions](#api-conventions)
7. [Authentication model](#authentication-model)
8. [Connecting a frontend](#connecting-a-frontend)
   - [Web (browser) integration](#web-browser-integration)
   - [Mobile / React Native integration](#mobile--react-native-integration)
   - [File uploads](#file-uploads)
9. [Request payloads (what to send)](#request-payloads-what-to-send)
10. [Endpoint reference](#endpoint-reference)
11. [Events (RabbitMQ)](#events-rabbitmq)
12. [Troubleshooting](#troubleshooting)

---

## Tech stack

| Concern | Choice |
|---|---|
| HTTP framework | Express 4 |
| Database | PostgreSQL via `pg` (raw parameterized SQL, IDs are CUID2) |
| Cache / rate-limit / OTP state | Redis |
| Async messaging | RabbitMQ (`amqplib`, topic exchange `doklynk.topic`) |
| File storage | Cloudinary (posts/reels/profile/cases), Backblaze B2 (APK) |
| Auth | `jsonwebtoken`, `firebase-admin`, Google OAuth |
| Validation | Joi |
| Security | `helmet`, `cors`, `hpp`, `express-mongo-sanitize`, `express-rate-limit` |
| File parsing | `multer` (in-memory) |

---

## Getting started

### Prerequisites

- **Node.js** 18+ and npm
- **PostgreSQL** 14+ (reachable via `DATABASE_URL`)
- **Redis** 6+
- **RabbitMQ** 3.8+
- A **Cloudinary** account
- A **Firebase** project with a service-account key (for phone OTP / FCM push)

> The server boots in **degraded mode** if Redis / RabbitMQ / Cloudinary / Firebase are unavailable — it still listens on port 5000 and retries failed connections in the background. Only PostgreSQL is effectively required for most endpoints to work.

### Install

```bash
git clone <repo-url>
cd "Api Service"
npm install
```

Create a `.env` file in the project root (see [Environment variables](#environment-variables)), then start the dev server:

```bash
npm run dev
```

You should see a status panel and `http://localhost:5000`. Verify it's up:

```bash
curl http://localhost:5000/health
# { "statusCode": 200, "success": true, "data": { "status": "ok", ... } }
```

---

## Environment variables

Create `.env` in the project root.

### Required

```bash
DATABASE_URL=postgresql://user:password@localhost:5432/doklynk
REDIS_URL=redis://localhost:6379
RABBITMQ_URL=amqp://localhost:5672
JWT_ACCESS_SECRET=your-access-secret
JWT_REFRESH_SECRET=your-refresh-secret
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
FIREBASE_SERVICE_ACCOUNT_KEY=./firebase-key.json   # path or JSON string
```

### Optional (with defaults)

```bash
PORT=5000
NODE_ENV=development
JWT_ACCESS_EXPIRE=15m
JWT_REFRESH_EXPIRE=30d
APP_SCHEME=doklynk
APP_DOMAIN=https://doklynk.app
FRONTEND_URL=http://localhost:3000     # added to the CORS allow-list
COOKIE_DOMAIN=                         # e.g. .doklynk.app in production
SUGGESTION_REFRESH_HOURS=12            # network suggestion worker cadence (default 12h)
```

### Feature-specific — only for the `app` module's APK distribution

```bash
B2_APP_KEY_ID=...
B2_APP_KEY=...
B2_BUCKET_ID=...
B2_BUCKET_NAME=...
```

> **Never commit `.env` or `firebase-key.json`.** Both are sensitive.

---

## Running the service

```bash
npm run dev      # nodemon, auto-reload (development)
npm start        # production
npm run migrate  # apply pending DB migrations (idempotent — safe to re-run)
npm test         # Jest test suite

# Quick syntax sanity check (no services needed)
node -e "require('./src/app'); console.log('ok')"
```

### Database migrations

Schema changes live as versioned SQL in [`migrations/`](migrations) and are applied
by a small idempotent runner:

```bash
npm run migrate
```

Each `NNN_*.sql` file runs once (tracked in a `_migrations` ledger), inside a
transaction, in filename order. Files use `IF NOT EXISTS`, so re-running is a no-op.
Run this after pulling changes that add tables/columns — currently:
`001_profile_editing.sql` (profile lists), `002_doctor_verifications.sql`
(verification), `003_unique_username.sql` (unique username), `004_post_reports.sql`
(post reporting), `005_follow_requests.sql` (private-account follow requests),
`006_reel_watch_history.sql` (reel 48h watch lockout for the discovery engine),
`007_profile_hub.sql` (notification master switch, doctor patient-volume + licensure date),
`008_network_hub.sql` (connection-request note + ignored suggestions).

### Docker

A `Dockerfile` is included:

```bash
docker build -t doklynk-api .
docker run -p 5000:5000 --env-file .env doklynk-api
```

---

## Project structure

```
src/
├── app.js                      # Express app: middleware chain + route mounting
├── constants/                  # Medical specializations, courses
├── modules/                    # One folder per feature (controller + routes [+ helpers])
│   ├── auth/      users/    profile/   posts/    reels/
│   ├── feed/      follows/  network/   cases/    search/
│   ├── notifications/  chat-proxy/  account/  admin/
│   ├── consultation/   app/
├── providers/                  # External integrations
│   ├── database/postgres.client.js   # `db` helper (raw SQL)
│   ├── cache/redis.client.js
│   ├── messaging/rabbitmq.client.js + event.consumers.js
│   ├── firebase/   storage/   (cloudinary + b2)
└── shared/                     # Cross-cutting code
    ├── middlewares/  (auth, optionalAuth, role, rate-limit, upload, firebase-auth)
    ├── services/     utils/    validators/  (Joi schemas)
migrations/                     # Versioned SQL + idempotent runner (npm run migrate)
│   ├── _runner.js
│   └── 001_profile_editing.sql
server.js                       # Entry point: connects services, starts HTTP server
```

There is **no model/ORM layer** — SQL lives inline in controllers via the `db` helper
(`db.query`, `db.any`, `db.one`, `db.generateId`).

---

## API conventions

### Base URLs

| Environment | URL |
|---|---|
| Local dev | `http://localhost:5000` |
| Production | `https://api.doklynk.app` |

All routes are mounted under `/api/*` (e.g. `/api/auth`, `/api/posts`). Health check is at `/health`.

### Response envelope

**Every** response uses the same shape:

```json
{
  "statusCode": 200,
  "success": true,
  "data": { },
  "message": "Human-readable message"
}
```

- `success` is `true` for 2xx, `false` otherwise.
- On success, payload is in `data`. On error, `message` (and sometimes `errors[]`) explain why.

### Pagination

List endpoints are **cursor-based** — never offset/`skip`:

```
GET /api/posts/user/:userId?cursor=<lastId>&limit=20
```

The response data always includes:

```json
{ "items": [ ], "hasMore": true, "nextCursor": "clxyz..." }
```

Pass the returned `nextCursor` as the next request's `cursor`. Stop when `hasMore` is `false`.

### Editable data, lock flags & last-write-wins

Profile data is editable any time via the `/api/profile` endpoints. Two patterns
apply across role-based editing:

- **Lock flags.** Auth-identifier fields are returned with a `locks` object
  (`personalPhoneLocked`, `personalEmailLocked`) so the client renders them
  read-only. The personal **phone** is never editable; the personal **email** is
  locked for Google-auth accounts. The server enforces this regardless of what the
  client sends.
- **Last-write-wins (LWW).** Every write stamps `updatedAt = NOW()`, and reads
  expose `updatedAt`. Clients (web/iOS/Android) cache profile data on-device for
  offline use and resolve conflicts by latest timestamp. `GET /api/profile/me/full`
  returns the whole role-specific payload in one call to hydrate that cache.

### Error codes

| Code | Meaning |
|---|---|
| 400 | Bad request / validation error |
| 401 | Missing or invalid/expired token |
| 403 | Forbidden (wrong role, blocked, or CORS) |
| 404 | Not found |
| 409 | Conflict (duplicate) |
| 429 | Rate limit exceeded |
| 500 | Internal server error |

### Rate limits

| Scope | Limit |
|---|---|
| All `/api/*` | 120 requests / minute (keyed by user id, else IP) |
| Auth endpoints | 20 / 15 minutes |
| OTP send (per IP) | 10 / hour |
| OTP send (per phone) | 5 / hour, 60s resend cooldown |

429 responses include `RateLimit-*` standard headers.

### CORS

In development, `localhost`/`127.0.0.1` on any port is allowed, plus `FRONTEND_URL`.
In production, **only** `FRONTEND_URL` is allowed. Credentials (cookies) are enabled, so the
frontend origin must be explicit — wildcards won't work with cookies.

---

## Authentication model

Access is via short-lived **JWT access tokens** (default 15m) sent as:

```
Authorization: Bearer <accessToken>
```

The access-token payload is `{ id, role, fullName }`. There are three roles:
`doctor`, `student`, `general_user`.

> **Role casing:** the JWT (what your frontend reads in `user.role`) carries **lowercase**
> roles. The database stores them uppercase (`DOCTOR`/`STUDENT`/`GENERAL_USER`), which is why
> `docs/API.md` shows uppercase. When sending a role during onboarding, either case works —
> the server normalizes it. For client-side comparisons, use lowercase.

A long-lived **refresh token** (default 30d) rotates the access token. **How the refresh
token is delivered depends on the client type**, selected by the `X-Client-Type` header:

| | Web (`X-Client-Type: web`) | Mobile (default) |
|---|---|---|
| Access token | `Authorization: Bearer` header | `Authorization: Bearer` header |
| Refresh token | `httpOnly` cookie (`refreshToken`) | JSON field in request/response body |
| CSRF protection | double-submit: `csrfToken` cookie + `X-CSRF-Token` header | not needed |

### Login flows

1. **Phone OTP** (Firebase): `POST /api/auth/send-otp` → `POST /api/auth/verify-otp`
2. **Google OAuth**: `POST /api/auth/google`

Both return `{ accessToken, refreshToken, user, isNewUser }`. New users then complete
onboarding (`POST /api/users/onboard`).

### Token refresh

```
POST /api/auth/refresh-token
```

- **Web:** the `refreshToken` cookie is sent automatically; include the `X-CSRF-Token` header.
- **Mobile:** send `{ "refreshToken": "..." }` in the body.

Returns a fresh `accessToken` (and rotated `refreshToken`).

### Account state

Login auto-restores `deactivated` / `pending_deletion` accounts to `active`.
`suspended` accounts are always rejected.

---

## Connecting a frontend

### Web (browser) integration

Use `X-Client-Type: web` and `credentials: 'include'` so the browser stores and sends the
`httpOnly` refresh cookie. Read the readable `csrfToken` cookie and echo it back as
`X-CSRF-Token` on state-changing requests.

Here is a complete, framework-agnostic API client with automatic token refresh:

```js
// api.js
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

let accessToken = null; // keep in memory (not localStorage) to reduce XSS exposure
export const setAccessToken = (t) => { accessToken = t; };

function getCookie(name) {
  return document.cookie
    .split("; ")
    .find((row) => row.startsWith(name + "="))
    ?.split("=")[1];
}

async function request(path, { method = "GET", body, isForm = false, _retry = false } = {}) {
  const headers = { "X-Client-Type": "web" };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  if (!isForm) headers["Content-Type"] = "application/json";

  // CSRF double-submit for mutations
  if (method !== "GET") {
    const csrf = getCookie("csrfToken");
    if (csrf) headers["X-CSRF-Token"] = decodeURIComponent(csrf);
  }

  const res = await fetch(`${BASE_URL}/api${path}`, {
    method,
    headers,
    credentials: "include",                       // send/receive httpOnly cookies
    body: isForm ? body : body ? JSON.stringify(body) : undefined,
  });

  const json = await res.json().catch(() => ({}));

  // Access token expired → refresh once, then retry the original request
  if (res.status === 401 && !_retry && accessToken) {
    const refreshed = await refresh();
    if (refreshed) return request(path, { method, body, isForm, _retry: true });
  }

  if (!json.success) throw Object.assign(new Error(json.message || "Request failed"), { status: res.status, body: json });
  return json.data;
}

async function refresh() {
  const csrf = getCookie("csrfToken");
  const res = await fetch(`${BASE_URL}/api/auth/refresh-token`, {
    method: "POST",
    headers: { "X-Client-Type": "web", "X-CSRF-Token": decodeURIComponent(csrf || "") },
    credentials: "include",
  });
  const json = await res.json().catch(() => ({}));
  if (json.success && json.data?.accessToken) {
    setAccessToken(json.data.accessToken);
    return true;
  }
  setAccessToken(null);
  return false;
}

export const api = {
  get:  (p)        => request(p),
  post: (p, body)  => request(p, { method: "POST", body }),
  put:  (p, body)  => request(p, { method: "PUT", body }),
  del:  (p)        => request(p, { method: "DELETE" }),
  upload: (p, formData) => request(p, { method: "POST", body: formData, isForm: true }),
  refresh,
};
```

**Login example (phone OTP):**

> **Important:** The actual SMS is sent by **Firebase Phone Auth on the client**, not by this
> API. The server's `/auth/send-otp` only registers intent (role + cooldown). After the user
> types the code, the Firebase SDK gives you an **ID token**, which you exchange at
> `/auth/verify-otp`. So the frontend needs the Firebase Web SDK configured.

```js
import { api, setAccessToken } from "./api";
import { getAuth, signInWithPhoneNumber, RecaptchaVerifier } from "firebase/auth";

// Step 1: tell the API a login is starting (sets role for new accounts + 60s cooldown)
await api.post("/auth/send-otp", {
  phoneNumber: "9876543210",
  countryCode: "+91",
  role: "doctor",          // only used if this becomes a new account
});

// Step 2: send the real SMS via Firebase (client-side)
const auth = getAuth();
const verifier = new RecaptchaVerifier(auth, "recaptcha-container", { size: "invisible" });
const confirmation = await signInWithPhoneNumber(auth, "+919876543210", verifier);

// Step 3: user enters the 6-digit code → Firebase confirms and returns a user
const cred = await confirmation.confirm("123456");
const firebaseIdToken = await cred.user.getIdToken();

// Step 4: exchange the Firebase token for DokLynk tokens
const { accessToken, user, isNewUser } = await api.post("/auth/verify-otp", { firebaseIdToken });
setAccessToken(accessToken); // refresh token arrives as an httpOnly cookie (web)

// Step 5 (new users only): complete onboarding
if (isNewUser) {
  await api.post("/users/onboard", { fullName: "Dr. Anya Sharma", role: "doctor" });
}

// Authenticated calls
const me = await api.get("/profile/me");
const feed = await api.get("/feed/home?limit=20");
```

**Restoring the session on page reload:** the access token lives only in memory, so on app
boot call `api.refresh()` — if the refresh cookie is still valid you get a new access token
without re-logging-in.

```js
// app bootstrap
await api.refresh(); // sets accessToken if the user still has a valid session
```

### Mobile / React Native integration

Don't set `X-Client-Type` (defaults to mobile). Store both tokens in secure storage and send
the refresh token in the request body.

```js
// api.native.js
import AsyncStorage from "@react-native-async-storage/async-storage"; // or expo-secure-store

const BASE_URL = "https://api.doklynk.app";
let accessToken = null;

export async function loadTokens() {
  accessToken = await AsyncStorage.getItem("accessToken");
}

async function request(path, { method = "GET", body, isForm = false, _retry = false } = {}) {
  const headers = {};
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  if (!isForm) headers["Content-Type"] = "application/json";

  const res = await fetch(`${BASE_URL}/api${path}`, {
    method,
    headers,
    body: isForm ? body : body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));

  if (res.status === 401 && !_retry) {
    if (await refresh()) return request(path, { method, body, isForm, _retry: true });
  }
  if (!json.success) throw Object.assign(new Error(json.message), { status: res.status });
  return json.data;
}

async function refresh() {
  const refreshToken = await AsyncStorage.getItem("refreshToken");
  if (!refreshToken) return false;
  const res = await fetch(`${BASE_URL}/api/auth/refresh-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
  const json = await res.json().catch(() => ({}));
  if (json.success) {
    accessToken = json.data.accessToken;
    await AsyncStorage.multiSet([
      ["accessToken", json.data.accessToken],
      ["refreshToken", json.data.refreshToken],
    ]);
    return true;
  }
  return false;
}

export const api = {
  get:  (p)       => request(p),
  post: (p, b)    => request(p, { method: "POST", body: b }),
  put:  (p, b)    => request(p, { method: "PUT", body: b }),
  del:  (p)       => request(p, { method: "DELETE" }),
};
```

After `verify-otp` / `google`, persist both tokens:

```js
const data = await api.post("/auth/verify-otp", { phone, code });
await AsyncStorage.multiSet([
  ["accessToken", data.accessToken],
  ["refreshToken", data.refreshToken],
]);
```

### File uploads

Uploads use `multipart/form-data`. Build a `FormData` and **do not** set `Content-Type`
manually — the browser/RN sets the multipart boundary for you. Each endpoint expects a
specific field name (see [docs/API.md](docs/API.md)).

```js
// Create a post with up to 10 media files (field name: "media")
const fd = new FormData();
fd.append("content", "New findings on SCAD...");
fd.append("postType", "research");
fd.append("specialties", "Cardiology");
fileInput.files && [...fileInput.files].forEach((f) => fd.append("media", f));

const post = await api.upload("/posts", fd);
```

| Endpoint | Field name | Notes |
|---|---|---|
| `POST /api/posts` | `media` | up to 10 files |
| `POST /api/reels` | `video` | async HLS transcoding; poll `processingStatus` |
| `POST /api/profile/me/photo` | `photo` | avatar (`DELETE` same path to remove) |
| `POST /api/profile/me/cover` | `cover` | cover image (`DELETE` same path to remove) |
| `POST·PATCH /api/profile/me/doctor/certificates` | `file` | optional per-certificate image/pdf |
| `POST /api/profile/me/doctor/verification` | `licenseDoc` · `aadhaarDoc` · `panDoc` · `workIdCard` · `livenessMedia` | dual-path verification (named fields) |
| `POST /api/cases` | `attachments` | up to 10 image/pdf |
| `POST /api/chat/:conversationId/upload` | `file` | chat media |

**Reels are processed asynchronously.** After upload, the reel starts `PENDING` →
`PROCESSING` → `COMPLETED`/`FAILED`. Poll `GET /api/reels/:id` and use `hlsUrl`
(an `.m3u8` playlist) for playback once `processingStatus === "COMPLETED"`.

---

## Request payloads (what to send)

Concrete request bodies with **dummy data** for the most-used endpoints. Unless noted, send
`Content-Type: application/json` and include `Authorization: Bearer <accessToken>` for 🔒 routes.
Fields marked _optional_ can be omitted. Multipart endpoints send `FormData` (no JSON).

> These shapes are taken from the controllers/validators in `src/`. Where `docs/API.md` differs
> (notably the auth endpoints), **this section reflects the actual server behavior.**

### Auth — `/api/auth`

```jsonc
// POST /auth/send-otp   (no auth) — registers the login attempt; Firebase sends the SMS client-side
{
  "phoneNumber": "9876543210",   // digits only, no country code
  "countryCode": "+91",          // optional, defaults to +91
  "role": "doctor"               // optional: doctor | student | general_user (used only for new accounts)
}
// → { "cooldownSeconds": 60 }

// POST /auth/verify-otp   (no auth) — exchange the Firebase ID token for app tokens
{
  "firebaseIdToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6..."   // from firebase user.getIdToken()
}
// → { accessToken, refreshToken|csrfToken, user, isNewUser }

// POST /auth/google   (no auth)
{
  "firebaseIdToken": "eyJhbGciOiJSUzI1NiIs...",          // Google sign-in token via Firebase
  "role": "general_user"                                 // optional, for new accounts
}

// POST /auth/refresh-token   (mobile sends body; web uses cookies + X-CSRF-Token header)
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."              // mobile only
}

// POST /auth/logout, /auth/logout-all   (🔒) — no body needed
```

### Users / onboarding — `/api/users`

```jsonc
// POST /users/onboard   (🔒) — complete basic profile after first login.
// The post-OTP quick-setup page sends the role-specific identity field:
//   doctor → specialization · student → degree · general_user → age
{
  "fullName": "Dr. Anya Sharma",
  "role": "doctor",                          // optional: doctor | student | general_user
  "gender": "female",                        // optional: male | female | other | prefer_not_to_say
  "dateOfBirth": "1990-04-12",               // optional, ISO date, not in the future
  "specialization": "Cardiology",            // doctor
  "degree": "MBBS",                          // student
  "age": 22,                                 // general_user, integer 1–150
  "bio": "Interventional cardiologist.",     // optional, max 500 chars
  "location": "Mumbai, India"                // optional
}

// PUT /users/onboard/professional   (🔒 DOCTOR)
{
  "registrationNumber": "MH-2014-55821",
  "registrationCouncil": "Maharashtra Medical Council",
  "councilYear": 2014,
  "specializations": ["Cardiology", "Interventional Cardiology"]
}

// PUT /users/onboard/student   (🔒 STUDENT)
{
  "collegeName": "AIIMS Delhi",
  "collegeId": "MBBS-2021-0345",
  "course": "MBBS",
  "yearOfStudy": 3
}
```

### Profile — `/api/profile`

> **Full role-based profile-editing reference** (multi-entry list CRUD, unique
> username, lock flags, hydrate payload, dual-path verification, validation rules)
> — plus a copy-paste **"How to use — worked examples"** section with curl + sample
> responses — is in **[docs/profile.md](docs/profile.md)**.
> Run `npm run migrate` before using the new endpoints.

```jsonc
// PUT /profile/me/basic   (🔒) — validated; send only fields you want to change.
// Returns { user, locks }. Personal phone is never editable; personal email is
// locked (403) for Google accounts and must be unique (409) otherwise.
{
  "fullName": "Dr. Anya Sharma",
  "professionalHeadline": "Interventional Cardiologist | Researcher",   // headline
  "bio": "Passionate about preventive cardiology.",                      // about
  "dateOfBirth": "1990-04-12",
  "gender": "female",
  "specialization": "Cardiology",            // doctor
  "degree": "MBBS",                          // student
  "age": 34,                                 // general_user (1–150)
  "city": "Mumbai",
  "languages": ["English", "Hindi", "Marathi"],   // ≤20
  "workEmail": "anya@hospital.org",
  "workPhone": "+91 22 5555 1234",           // doctor
  "fcmToken": "fcm-device-token-here"        // register device for push notifications
}

// Multi-entry lists (add/edit/delete each row). Same CRUD shape per list:
//   GET    /profile/me/doctor/education
//   POST   /profile/me/doctor/education            { organizationName, departmentName?, startDate?, endDate? }
//   PATCH  /profile/me/doctor/education/:entryId   (partial)
//   DELETE /profile/me/doctor/education/:entryId
// Doctor:  education · workplace · certificates (multipart "file" optional)
// Student: academics · experiences (experiences.interests[] ≤20)
// General: general/interests   POST { "topic": "Diabetes" }

// PUT /profile/me/doctor/specialties   (🔒 DOCTOR)
{ "specialties": ["Cardiology", "Interventional Cardiology"] }   // ≤20, de-duped

// Unique username (Instagram-style, globally unique public handle):
//   GET /profile/username/check?username=dranya   (🔒) → { available, reason }
//   PUT /profile/me/username   (🔒)  { "username": "dranya" }   → 409 if taken
//   GET /profile/u/:username   (🔓)  public profile by @username
// Rules: 3–30 chars, lowercase a–z 0–9 . _, start/end alphanumeric, not reserved.
// Auto-assigned at onboarding; searchable via /search/users.

// GET /profile/me/full        (🔒) — consolidated hydrate payload for offline cache
// GET /profile/me/completion  (🔒) — role-aware section completion + verification status

// Doctor verification — dual-path, multipart, queued for admin review (see docs/profile.md §8):
//   GET  /profile/me/doctor/verification   → { status, rejectionReason, submission }
//   POST /profile/me/doctor/verification   (multipart)
//     Path A: pathType=credential + countryOfPractice/stateRegion/professionType/
//             registrationNumber/highestQualification (+ optional file "licenseDoc")
//     Path B: pathType=document + workplaceContactNumber/workplaceLocation/contactNumber
//             + files aadhaarDoc, panDoc, workIdCard, livenessMedia (3-sec face scan)
//   Admin approve/reject → user gets a verification_approved/rejected notification;
//   approval sets the verified badge; a rejected user can edit and resubmit.

// POST /profile/block/:userId, POST /profile/mute/:userId   (🔒) — no body
// PUT  /profile/me/photo, /profile/me/cover                 (🔒) — multipart, see uploads
// DELETE /profile/me/photo, /profile/me/cover               (🔒) — remove media

// Third-party profile view (🔓 optionalAuth) — see docs/profile.md §9
//   GET /profile/:userId · /profile/public/:slug · /profile/u/:username
//   → { user, doctorProfile|studentProfile (public-whitelisted, NO kyc/doc URLs),
//       roleDetails { education/workplace/certificates | academics/experiences | interests },
//       isFollowing, isFollowedBy, isRequested, connectionStatus }
//   Private target the viewer doesn't follow → stripped card { isPrivate: true }.
//   connectionStatus ∈ none|pending_outgoing|pending_incoming|connected drives the
//   Follow/Requested → Connect/Connecting/Accept/Message button matrix.
```

### Posts — `/api/posts`

```jsonc
// POST /posts   (🔒) — JSON fields go alongside multipart "media" files (or JSON-only)
{
  "content": "New findings on SCAD in young women. #SCAD #Cardiology",
  "postType": "research",                    // post | research | thesis | case_study (default: post)
  "visibility": "public",                    // public | followers | only_me (default: public)
  "specialties": ["Cardiology"],             // optional, max 10
  "mentions": ["clxuser123"]                 // optional user ids, max 20
}

// POST /posts/:id/comments   (🔒)
{
  "content": "Great insight — did you control for hormonal factors?",
  "parentId": "clxcomment456"                // optional: present = reply, absent = top-level comment
}

// POST /posts/:id/like, /posts/:id/save   (🔒) — no body (toggles)

// POST /posts/:id/share/inapp   (🔒) — share into DMs
{ "recipientIds": ["clxuser1", "clxuser2"] }
```

### Reels — `/api/reels`

```jsonc
// POST /reels   (🔒) — multipart "video" file + these JSON fields
{
  "caption": "Quick demo of a radial access technique.",
  "visibility": "public",
  "specialties": ["Interventional Cardiology"],
  "mentions": []
}

// POST /reels/:id/analytics   (no auth) — batch playback metrics
{
  "watchDuration": 12.4,                     // seconds watched
  "watchPercent": 78,                        // 0-100
  "didReplay": false,
  "didMute": true
}

// POST /reels/:id/comments   (🔒) → { "content": "🔥", "parentId": null }
```

### Cases — `/api/cases`

```jsonc
// POST /cases   (🔒) — multipart "attachments" (≤10 image/pdf) + these JSON fields
{
  "title": "55M with atypical chest pain and normal ECG",
  "description": "Patient presented with...",  // max 5000 chars
  "specialty": "Cardiology",
  "hipaaCompliant": true,                       // default false
  "visibility": "public",                       // public | followers | only_me
  "tags": ["chestpain", "ecg", "diagnosis"]     // max 10
}

// POST /cases/:id/comments   (🔒) → { "content": "Consider a stress echo." }
// POST /cases/:id/helpful, /cases/:id/save, /cases/:id/follow   (🔒) — no body
```

### Network — `/api/network`

```jsonc
// POST /network/request/:targetUserId        (🔒) — no body
// POST /network/request/:requestId/accept    (🔒) — no body
// POST /network/request/:requestId/reject    (🔒) — no body
```

### Consultations — `/api/consultations`

```jsonc
// POST /consultations   (🔒) — book a slot with a doctor
{
  "doctorId": "clxdoctor789",
  "sessionLength": 15,                       // minutes (default 15)
  "fee": 500,                                // amount
  "reason": "Follow-up on recent angiography results",
  "scheduledAt": "2026-06-15T10:30:00.000Z"  // ISO datetime
}

// POST /consultations/:id/pay   (🔒)
{ "status": "success", "gateway": "UPI", "transactionId": "TXN1234567890" }

// POST /consultations/:id/decline   (🔒 DOCTOR) → { "declineReason": "Unavailable that day" }
// POST /consultations/:id/refund    (🔒)        → { "reason": "Doctor declined" }
```

### Notifications — `/api/notifications`

```jsonc
// PUT /notifications/preferences   (🔒) — per-category toggles
{
  "connections":     { "push": true,  "inApp": true },
  "messages":        { "push": true,  "inApp": true },
  "securityAlerts":  { "push": true,  "inApp": true },
  "productUpdates":  { "push": false, "inApp": true },
  "contentActivity": { "push": true,  "inApp": false }
}

// PUT /notifications/:id/read, /notifications/read-all   (🔒) — no body
```

### Account — `/api/account`

```jsonc
// PUT /account/privacy   (🔒)
{ "profileVisibility": "private" }            // public | private

// POST /account/feedback   (🔒) — JSON + optional multipart "images" (≤5)
{ "category": "bug", "message": "Reels feed stutters on scroll." }

// POST /account/support   (🔒)
{ "subject": "Cannot upload license", "description": "Upload fails at 80%.", "category": "verification" }

// PUT /account/call-settings   (🔒 DOCTOR)
{
  "inboundWhitelist": ["connections"],
  "availabilityWindows": [{ "day": "Mon", "start": "18:00", "end": "20:00" }],
  "requirePreCallNote": true,
  "silentDuringForeground": false
}

// POST /account/deactivate, /account/delete, /account/restore   (🔒) — no body
```

### Email preferences — `/api/email`

```jsonc
// PUT /email/preferences   (🔒) — partial; send only the booleans you change.
// Same data as PUT /account/email-preferences.
{ "productUpdates": false, "consultationUpdates": true }
// keys: accountSecurity | messagesConnections | consultationUpdates | productUpdates
// → data: { preferences: { accountSecurity, messagesConnections, consultationUpdates, productUpdates } }
```

### Likes — `/api/likes`

```jsonc
// Universal like engine. targetType (case-insensitive): POST | COMMENT | REEL | REEL_COMMENT
// POST   /likes/:targetType/:targetId         (🔒) — no body; toggles
//        → data: { liked, isLiked, likeCount, likesCount }
// GET    /likes/:targetType/:targetId/count   (—)  → data: { likeCount, likesCount }
// GET    /likes/:targetType/:targetId/status  (🔓) → data: { liked, isLiked }
// GET    /likes/:targetType/:targetId/likers?cursor=&limit=20  (🔓)
//        → data: { users[], hasMore, nextCursor }
```

### Chat (proxied to chat-service) — `/api/chat`

```jsonc
// POST /chat/start   (🔒)
{ "recipientId": "clxuser456" }

// POST /chat/:conversationId/messages   (🔒)
{ "content": "Hi Dr. Sharma, thanks for connecting!", "messageType": "text" }
```

---

## Endpoint reference

**Per-module docs** (one file per module — endpoints + request/response JSON + a
frontend snippet) are in **[docs/modules/](docs/modules/index.md)** — the best
starting point for frontend integration. The single-page reference of every route is
**[docs/API.md](docs/API.md)**. Extra deep-dive guides:
**[docs/profile.md](docs/profile.md)** (profile editing, username, verification) and
**[docs/feed.md](docs/feed.md)** (home feed, likes, comments/@mentions, follow state
machine, report, save, share). Modules at a glance:

| Module | Mount path | What it does |
|---|---|---|
| Auth | `/api/auth` | OTP, Google, refresh, logout, sessions |
| Users | `/api/users` | Onboarding, public profiles, user search |
| Profile | `/api/profile` | Edit profile, **unique username**, multi-entry lists, photos, **dual-path verification**, hydrate, block/mute |
| Posts | `/api/posts` | CRUD, likes + like-list, comments (@mentions), save, **report**, share, hashtags |
| Likes | `/api/likes` | **Universal like engine** (`POST/COMMENT/REEL/REEL_COMMENT`): toggle, count, status, likers |
| Reels | `/api/reels` | CRUD + **edit (24h)**, HLS playback, likes + **like-list**, comments (@mentions), save, analytics; **discovery feed** (true-random, 48h watch lockout, exhaustion loop) |
| Feed | `/api/feed` | Home (**session-based weighted-random recommendation**: specialty filter, seen de-dup, exhaustion fallback), explore, guest, saved, not-interested, mute; cards carry `isFollowing` + `connectionStatus` |
| Follows | `/api/follows` | Follow state machine: **public instant / private request→confirm**, withdraw, check status |
| Network | `/api/network` | Connection requests (drive feed-card **Connect→Message**), accept/reject, discover, chats |
| Cases | `/api/cases` | Case-study CRUD, comments, helpful, follow |
| Search | `/api/search` | Cross-entity / user (by **username**) / post / hashtag search |
| Notifications | `/api/notifications` | Activity feed, unread count, preferences |
| Chat | `/api/chat` | Proxied to chat-service (conversations, messages) |
| Account | `/api/account` | Settings, privacy, **email opt-ins**, deactivate/delete/restore |
| Email | `/api/email` | Per-category email opt-ins (alias of `/api/account/email-preferences`) |
| Admin | `/api/admin` | Verification queue, **reported-content moderation**, feedback (internal) |
| Consultations | `/api/consultations` | Booking, payment, approve/decline, refund |
| App | `/api/app` | App version + APK distribution |
| Pulse | `/api/v1/pulse` | Transparent proxy to media-service (contract owned there) |

A machine-readable graph of every route/event/dependency is also available:

```bash
node graphify.js              # human-readable summary
node graphify.js --json       # JSON
node graphify.js --module auth
```

---

## Events (RabbitMQ)

The service uses the topic exchange **`doklynk.topic`**.

**Publishes:**

| Routing key | Trigger | Consumer |
|---|---|---|
| `reel.created` | `POST /api/reels` | media-service (transcoding) |
| `user.updated` | profile edit | chat-service (display-name cache) |

**Consumes:**

| Routing key | Action |
|---|---|
| `media.processing.completed` | Set `Reel.hlsUrl`, `processingStatus = COMPLETED` |
| `media.processing.failed` | Set `Reel.processingStatus = FAILED` |
| `message.sent` | Send FCM push to recipient |

> The frontend does **not** talk to RabbitMQ. Real-time delivery to clients is via **FCM push
> notifications**. There is no WebSocket/Socket.IO server in this service; live chat sockets,
> if any, are served by the chat-service.

---

## Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| `CORS: origin ... not allowed` | Add your frontend origin to `FRONTEND_URL`; in prod only that exact origin is allowed. |
| 401 on every request | Missing/expired access token. Call `refresh-token`; ensure `Authorization: Bearer` is set. |
| Web refresh fails with 403 | Missing `X-CSRF-Token` header, or `csrfToken` cookie not readable (check `COOKIE_DOMAIN` / `sameSite`). |
| Cookies not sent from browser | Use `credentials: "include"` and an explicit (non-wildcard) `FRONTEND_URL`; in prod cookies require HTTPS (`secure`, `sameSite=none`). |
| Reel `hlsUrl` is null | Still transcoding — poll until `processingStatus === "COMPLETED"`. |
| Server starts but features fail | A dependency (Redis/RabbitMQ/Cloudinary) is offline; the server runs degraded and retries. Check the startup status panel. |
| 429 responses | Rate limit hit — back off using the `RateLimit-Reset` header. |

---

## License

Proprietary — © DokLynk. Internal use only.

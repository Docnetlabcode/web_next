# API Service — REST API Reference

**Base URL (dev):** `http://localhost:5000`  
**Base URL (prod):** `https://api.doklynk.app`  
**All responses:** `{ statusCode, success, data, message }`

> 📦 **Per-module docs** (endpoints + request/response JSON + frontend wiring, one
> file per module) live in **[modules/](modules/index.md)** — start there for
> frontend integration. This file is the single-page quick reference of every route.

---

## Authentication

All protected endpoints require an `Authorization: Bearer <accessToken>` header.  
Web clients also send a CSRF token in `X-CSRF-Token` and receive a `httpOnly` refresh-token cookie.

**Roles:** `doctor` · `student` · `general_user`

> The JWT token (and `user.role` in every response) carries **lowercase** roles — use these for client-side checks. The database stores them uppercase internally. When *sending* a role (e.g. onboarding), either case is accepted; the server normalizes it.

---

## Auth — `/api/auth`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/meta/specializations` | — | List medical specializations |
| GET | `/meta/courses` | — | List medical courses |
| POST | `/send-otp` | — | Register login attempt (Firebase sends the SMS client-side) · Rate-limited |
| POST | `/verify-otp` | — | Exchange Firebase ID token → `{ accessToken, refreshToken, user }` |
| POST | `/google` | — | Google OAuth (via Firebase) → `{ accessToken, refreshToken, user }` |
| POST | `/refresh-token` | — | Rotate tokens (cookie or body refresh token) |
| POST | `/logout` | 🔒 | Revoke current session |
| POST | `/logout-all` | 🔒 | Revoke all sessions |
| GET | `/sessions` | 🔒 | List active sessions |
| DELETE | `/sessions/:sessionId` | 🔒 | Revoke one session |

> **Phone auth is Firebase-driven.** The actual SMS OTP is sent by the **Firebase Phone Auth SDK on the client**, not by this API. The flow is:
> 1. `POST /send-otp` — registers intent (sets `role` for new accounts, applies a 60s resend cooldown). Does **not** send an SMS.
> 2. Client calls Firebase `signInWithPhoneNumber(...)` → user enters the code → Firebase returns an ID token via `user.getIdToken()`.
> 3. `POST /verify-otp` with that `firebaseIdToken` — the server verifies it and issues DokLynk tokens.

### POST `/send-otp`
```json
{
  "phoneNumber": "9876543210",
  "countryCode": "+91",
  "role": "doctor"
}
```
`phoneNumber` digits only (no country code). `countryCode` optional (default `+91`). `role` optional (`doctor` | `student` | `general_user`), used only when this becomes a new account.
Returns: `{ "cooldownSeconds": 60 }`

### POST `/verify-otp`
```json
{ "firebaseIdToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6..." }
```
`firebaseIdToken` comes from the Firebase SDK after the user confirms the SMS code.
Returns: `{ accessToken, refreshToken, user: UserObject, isNewUser: bool }` (web clients receive the refresh token as an `httpOnly` cookie + a `csrfToken` instead of `refreshToken` in the body).

### POST `/google`
```json
{
  "firebaseIdToken": "eyJhbGciOiJSUzI1NiIs...",
  "role": "general_user"
}
```
`firebaseIdToken` is the Google sign-in token obtained via Firebase. `role` optional (new accounts only).
Returns: `{ accessToken, refreshToken, user: UserObject, isNewUser: bool }`

### POST `/refresh-token`
- **Mobile:** send `{ "refreshToken": "..." }` in the body.
- **Web:** the `refreshToken` cookie is sent automatically; include the `X-CSRF-Token` header.

Returns a fresh `accessToken` (and rotated refresh token).

---

## Users — `/api/users`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/onboard` | 🔒 | Complete mobile onboarding |
| POST | `/onboard/firebase` | 🔥 Firebase | Firebase onboarding |
| GET | `/session/firebase` | 🔥 Firebase | Check Firebase profile completeness |
| PUT | `/onboard/professional` | 🔒 DOCTOR | Doctor professional details |
| PUT | `/onboard/verification` | 🔒 DOCTOR | Submit for doctor verification |
| PUT | `/onboard/student` | 🔒 STUDENT | Student academic details |
| GET | `/profile/me` | 🔒 | Own user object |
| PUT | `/profile/me` | 🔒 | Update own profile |
| GET | `/profile/:slug` | 🔓 | Public profile by URL slug |
| GET | `/search` | — | Full-text user search |

### POST `/onboard`
```json
{
  "fullName": "Dr. Anya Sharma",
  "role": "doctor",
  "gender": "female",
  "specialization": "Cardiology"
}
```

---

## Profile — `/api/profile`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/me` | 🔒 | Own full profile |
| GET | `/me/full` | 🔒 | **Consolidated hydrate payload** (offline cache): user + locks + role sections + completion + verification |
| GET | `/me/counts` | 🔒 | Follower / post / connection counts |
| GET | `/me/completion` | 🔒 | Role-aware section completion + verification status |
| GET | `/me/archive` | 🔒 | Archived content |
| GET | `/me/share/link` | 🔒 | Shareable deep-link |
| POST | `/me/share/inapp` | 🔒 | Share profile to DM |
| POST | `/me/verify-email` | 🔒 | Trigger email verification |
| PUT | `/me/basic` | 🔒 | Update basic contact (validated; returns `locks`). Personal phone is never editable; personal email is locked for Google accounts |
| GET | `/username/check` | 🔒 | Check unique-username availability `?username=` → `{ available, reason }` |
| PUT | `/me/username` | 🔒 | Set/change the unique username (409 if taken) |
| GET | `/u/:username` | 🔓 | Public profile by unique username (accepts `@username`) |
| POST | `/me/photo` | 🔒 | Upload profile photo `multipart: photo` |
| DELETE | `/me/photo` | 🔒 | Remove profile photo (clears Cloudinary asset) |
| POST | `/me/cover` | 🔒 | Upload cover photo `multipart: cover` |
| DELETE | `/me/cover` | 🔒 | Remove cover photo (clears Cloudinary asset) |
| PUT | `/me/doctor/contact` | 🔒 DOCTOR | Contact info (legacy) |
| PUT | `/me/doctor/professional` | 🔒 DOCTOR | Professional details (legacy JSON) |
| PUT | `/me/doctor/specialties` | 🔒 DOCTOR | Set specialties array `{ specialties: [...] }` (≤20, de-duped) |
| GET·POST·PATCH·DELETE | `/me/doctor/education[/:entryId]` | 🔒 DOCTOR | **Multi-entry** education CRUD (per-entry) |
| GET·POST·PATCH·DELETE | `/me/doctor/workplace[/:entryId]` | 🔒 DOCTOR | **Multi-entry** workplace CRUD |
| GET·POST·PATCH·DELETE | `/me/doctor/certificates[/:entryId]` | 🔒 DOCTOR | **Multi-entry** certificates CRUD `multipart: file` (optional) |
| POST | `/me/doctor/document` | 🔒 DOCTOR | Medical license `multipart: document` |
| GET | `/me/doctor/verification` | 🔒 DOCTOR | Own verification status + submission |
| POST | `/me/doctor/verification` | 🔒 DOCTOR | **Dual-path** verification submit `multipart` (`pathType` + files); queued for admin |
| POST | `/me/doctor/submit-verification` | 🔒 DOCTOR | Legacy submit flag |
| GET·POST·PATCH·DELETE | `/me/student/academics[/:entryId]` | 🔒 STUDENT | **Multi-entry** academics CRUD |
| GET·POST·PATCH·DELETE | `/me/student/experiences[/:entryId]` | 🔒 STUDENT | **Multi-entry** experiences + interests CRUD |
| PUT | `/me/student/academic` | 🔒 STUDENT | Academic details (legacy JSON) |
| POST | `/me/student/submit-verification` | 🔒 STUDENT | Verification document `multipart: document` |
| GET·POST·PATCH·DELETE | `/me/general/interests[/:entryId]` | 🔒 GENERAL | **Multi-entry** health interests CRUD |
| POST | `/block/:userId` | 🔒 | Block user |
| DELETE | `/block/:userId` | 🔒 | Unblock user |
| GET | `/block/list` | 🔒 | Blocked users |
| POST | `/mute/:userId` | 🔒 | Mute user notifications |
| DELETE | `/mute/:userId` | 🔒 | Unmute user |
| GET | `/mute/list` | 🔒 | Muted users |
| GET | `/public/:slug` | 🔓 | Public profile by slug |
| GET | `/:userId` | 🔓 | Public profile by UUID |

**Private profile response** (when `profileVisibility = private` and requester doesn't follow):
```json
{ "isPrivate": true, "userId": "...", "fullName": "...", "role": "..." }
```

> **Role-based profile editing (Phase 1):** the multi-entry list endpoints, request/response
> shapes, lock flags, and the `/me/full` hydrate payload are documented in detail in
> **[profile.md](profile.md)**. Run `npm run migrate` before using them (creates the child tables).

---

## Posts — `/api/posts`

`postType` values: `post` · `research` · `thesis` · `case_study` · `question` · `article`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/saved` | 🔒 | Saved posts |
| GET | `/trending/hashtags` | — | Top hashtags (Redis cached) |
| GET | `/hashtags/suggest?q=` | — | Hashtag autocomplete |
| GET | `/hashtag/:tag` | 🔓 | Posts by hashtag |
| GET | `/user/:userId` | 🔓 | User's posts |
| POST | `/` | 🔒 | Create post `multipart: media (×10)` |
| GET | `/:id` | 🔓 | Post detail |
| PUT | `/:id` | 🔒 | Edit post (blocked after 24 h) |
| DELETE | `/:id` | 🔒 | Delete post |
| POST | `/:id/like` | 🔒 | Toggle like |
| GET | `/:id/likes` | 🔓 | Likers list (rows carry `isFollowing` for the inline follow toggle) |
| POST | `/:id/comments` | 🔒 | Add comment / reply (parses `@username` → mention notifications) |
| GET | `/:id/comments` | — | Paginated comments |
| GET | `/:id/comments/:commentId/replies` | — | Paginated replies |
| DELETE | `/:id/comments/:commentId` | 🔒 | Delete own comment **or any comment on your post** |
| POST | `/:id/comments/:commentId/like` | 🔒 | Toggle comment like |
| POST | `/:id/save` | 🔒 | Toggle save |
| POST | `/:id/report` | 🔒 | Report post `{ category, reason? }` → admin queue |
| POST | `/:id/share/inapp` | 🔒 | Share to DM |
| GET | `/:id/share/link` | — | Shareable link |

Report categories: `spam · harassment · misinformation · hate_speech · nudity · violence · self_harm · intellectual_property · impersonation · other`.

### POST `/` — Create Post
```json
{
  "content": "New findings on RCA dissection in young women...",
  "postType": "research",
  "specialties": ["Cardiology", "Interventional Cardiology"],
  "hashtags": ["SCAD", "CardiacImaging"],
  "mentions": ["@drbob", "clxUserId"]
}
```
`hashtags` and `mentions` are **dedicated metadata fields** (not parsed from the
caption). `mentions` accepts `@uniqueusername` (case-insensitive) and/or user ids —
resolved server-side and notified. Media via `multipart: media` (≤500MB/file).
Editing (`PUT /:id`) is allowed for 24h on caption/specialties/hashtags/mentions
(media locked); after 24h → `403 { code: "MODIFICATION_LEASE_EXPIRED" }`. Same
rules apply to reels (`POST /api/reels`, video ≤500MB).
Upload `media` (up to 10 files) as `multipart/form-data`.

---

## Reels — `/api/reels`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/feed` | 🔓 | Infinite-scroll reel feed |
| GET | `/saved` | 🔒 | Saved reels |
| GET | `/user/:userId` | 🔓 | User reels |
| POST | `/` | 🔒 | Create reel `multipart: video` → HLS transcoding async |
| GET | `/:id` | 🔓 | Reel detail (author carries `isFollowing`) |
| PUT | `/:id` | 🔒 | Edit caption/tags/visibility (blocked after 24 h) |
| DELETE | `/:id` | 🔒 | Delete reel |
| POST | `/:id/view` | 🔓 | Increment view (debounced) |
| POST | `/:id/watched` | 🔒 | Mark watched (>50% / >10s) → 48h discovery lockout |
| POST | `/:id/analytics` | 🔓 | Batch analytics |
| POST | `/:id/like` | 🔒 | Toggle like |
| GET | `/:id/likes` | 🔓 | Likers list (rows carry `isFollowing`/`isSelf`) |
| POST | `/:id/save` | 🔒 | Toggle save |
| POST | `/:id/not-interested` | 🔒 | Suppress from feed |
| POST | `/:id/comments` | 🔒 | Add comment / reply (`@username` → mention notify) |
| GET | `/:id/comments` · `/:id/comments/:commentId/replies` | — | Comments / replies |
| DELETE | `/:id/comments/:commentId` | 🔒 | Delete own comment **or any on your reel** |
| POST | `/:id/comments/:commentId/like` | 🔒 | Toggle comment like |
| PUT | `/:id/cover` | 🔒 | Replace thumbnail `multipart: cover` |

**Reel `processingStatus`:** `PENDING` → `PROCESSING` → `COMPLETED` | `FAILED`  
Use `hlsUrl` (master.m3u8) for playback once status is `COMPLETED`.

> **`GET /feed` is a discovery engine** (`?sessionId=&specialty=&limit=`): true-random
> global selection, 48h watched suppression (`POST /:id/watched`), session de-dup, and
> an exhaustion loop that recycles watched reels. Returns `{ sessionId, reels, hasMore,
> exhausted }`. Full model: [modules/recommendation.md](modules/recommendation.md).

---

## Feed — `/api/feed`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/guest` | — | Public guest feed |
| GET | `/home` | 🔒 | Session-based weighted-random home feed (`?sessionId=&specialty=&type=&page=`) |
| POST | `/seen` | 🔒 | Log viewed post ids (>1.5s) `{ sessionId, postIds[] }` |
| GET | `/explore` | 🔓 | Explore feed (trending) |
| GET | `/saved` | 🔒 | Saved content feed |
| GET | `/mute` | 🔒 | Muted users list |
| POST | `/not-interested/:postId` | 🔒 | Suppress post |
| POST | `/mute/:userId` | 🔒 | Mute user from feed |
| DELETE | `/mute/:userId` | 🔒 | Unmute |

> **`GET /home` is session/page-based** (not cursor): omit `sessionId` to start a
> session (returned in the response), pass it back with `page=N`. It returns a
> weighted pseudo-random, seen-de-duplicated feed with a `caughtUp`/`exhausted`
> fallback. Explore/saved remain cursor-paginated. Full model:
> [modules/recommendation.md](modules/recommendation.md).

`GET /home` filters by creator specialty (`?specialty=Cardiology&type=research`).
Each card's `author` block carries **`isFollowing`** + **`connectionStatus`** so the
header renders the right button (State A/B): own post → owner menu · `!isFollowing` →
**Follow** · following + `connectionStatus` `none`→**Connect**, `connected`→**Message**,
`pending_outgoing`→Connecting, `pending_incoming`→Accept. The like-lists
(`GET /api/posts/:id/likes`, `/api/reels/:id/likes`) carry the same fields + `isSelf`.

---

## Follows — `/api/follows`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/suggestions` | 🔒 | Suggested users to follow |
| GET | `/check/:userId` | 🔒 | Follow relationship → `{ status: following\|requested\|not_following, isFollowedBy }` |
| GET | `/requests` | 🔒 | Incoming follow requests (private account) |
| POST | `/requests/:requesterId/accept` | 🔒 | Confirm a follow request |
| POST | `/requests/:requesterId/reject` | 🔒 | Ignore a follow request (silent) |
| DELETE | `/requests/:targetId` | 🔒 | Withdraw your pending request (silent) |
| DELETE | `/followers/:userId` | 🔒 | Remove a follower |
| POST | `/:userId` | 🔒 | Follow — **public** = instant `{status:following}`; **private** = `{status:requested}` |
| DELETE | `/:userId` | 🔒 | Unfollow user |
| GET | `/:userId/followers` | 🔓 | Follower list |
| GET | `/:userId/following` | 🔓 | Following list |

**Follow state machine.** Public targets are followed instantly (+counts, "started
following you" notification). Private targets get a pending request → the target
sees it in `GET /requests` and **Confirms** (follow established + counts, requester
notified) or **Ignores** (silent). The requester can **withdraw** while pending.
`GET /check/:userId` drives the button label: `not_following`→Follow, `requested`→
Requested, `following`→Following; `isFollowedBy` → show "Follow Back". **State B:**
when `following`, surfaces (feed card + like-list) show a **Message** button
(`POST /api/chat/start`) instead of Follow. Unfollow = `DELETE /:userId` (counts −1,
mapping removed).

---

## Network — `/api/network`

Row cards carry `mutualConnectionsCount` + `uniqueUsername`/`professionalHeadline`.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/suggestions` (alias `/discover`) | 🔒 | Ranked by mutual connections; specialty random fallback |
| POST | `/suggestions/:userId/ignore` | 🔒 | Dismiss a suggestion permanently |
| GET | `/connections` | 🔒 | Accepted connections |
| GET | `/requests` | 🔒 | Pending incoming requests (each with `note`) |
| GET | `/mutual/:userId` | 🔒 | Mutual-connections list (the dropdown) |
| GET | `/chats` | 🔒 | Conversations with connections |
| POST | `/request/:targetUserId` | 🔒 | Send request `{ note? }` → "wants to connect with you" |
| POST/PUT | `/request/:requestId/accept` | 🔒 | Accept → connection **+ mutual follow**; "is connected with you now" |
| POST/PUT | `/request/:requestId/reject` | 🔒 | Reject (silent) |

---

## Cases — `/api/cases`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/feed` | 🔓 | Cases feed |
| POST | `/` | 🔒 | Create case `multipart: attachments (×10, image/pdf)` |
| GET | `/:id` | 🔓 | Case detail |
| PUT | `/:id` | 🔒 | Update case |
| DELETE | `/:id` | 🔒 | Delete case |
| POST | `/:id/comments` | 🔒 | Comment on case |
| POST | `/:id/helpful` | 🔒 | Mark helpful |
| POST | `/:id/save` | 🔒 | Save/unsave |
| POST | `/:id/follow` | 🔒 | Follow for updates |
| POST | `/:id/attachment` | 🔒 | Add attachment |

---

## Search — `/api/search`

| Method | Path | Auth | Query params | Description |
|--------|------|------|-------------|-------------|
| GET | `/` | 🔓 | `q`, `limit`, `cursor` | Cross-type search |
| GET | `/users` | 🔓 | `q`, `role`, `specialty` | User search |
| GET | `/posts` | 🔓 | `q`, `type` | Post search |
| GET | `/hashtags` | 🔓 | `q` | Hashtag search |

---

## Notifications — `/api/notifications`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | 🔒 | Paginated notifications |
| GET | `/unread-count` | 🔒 | Unread count |
| GET | `/preferences` | 🔒 | Per-type preferences |
| PUT | `/preferences` | 🔒 | Update preferences |
| PUT | `/read-all` | 🔒 | Mark all read |
| PUT | `/:id/read` | 🔒 | Mark one read |
| DELETE | `/:id` | 🔒 | Remove notification |

---

## Chat (Proxy) — `/api/chat`

All routes are proxied to chat-service after auth. See **chat-service docs** for full contract.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/start` | 🔒 | Start / retrieve conversation |
| GET | `/conversations` | 🔒 | Conversation list (enriched with profiles) |
| GET | `/unread-count` | 🔒 | Total unread count |
| GET | `/:conversationId/messages` | 🔒 | Paginated messages |
| POST | `/:conversationId/messages` | 🔒 | Send text message |
| POST | `/:conversationId/seen` | 🔒 | Mark as seen |
| POST | `/:conversationId/upload` | 🔒 | Upload media `multipart: file` |
| POST | `/:conversationId/pin` | 🔒 | Toggle pin |
| POST | `/:conversationId/mute` | 🔒 | Toggle mute |
| DELETE | `/messages/:messageId` | 🔒 | Soft-delete message |
| POST | `/messages/:messageId/react` | 🔒 | Emoji reaction |

---

## Account — `/api/account`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/settings-menu` | 🔒 | Settings menu items |
| GET | `/personal-details` | 🔒 | Personal details |
| GET/PUT | `/privacy` | 🔒 | Privacy settings |
| GET/PUT | `/email-preferences` | 🔒 | Email preferences |
| GET | `/legal` | 🔒 | Legal document URLs |
| POST | `/feedback` | 🔒 | Submit feedback `multipart: images (×5)` |
| POST | `/support` | 🔒 | Support ticket |
| POST | `/deactivate` | 🔒 | Deactivate account |
| POST | `/delete` | 🔒 | Schedule account deletion |
| POST | `/restore` | 🔒 | Restore account |
| GET/PUT | `/call-settings` | 🔒 DOCTOR | Call / consultation settings |

---

## Admin — `/api/admin`

All routes require admin authentication (internal use only).

| Method | Path | Description |
|--------|------|-------------|
| GET | `/verifications` | Doctor verification queue |
| GET | `/verifications/stats` | Funnel statistics |
| GET | `/verifications/:userId` | Verification detail (profile **+ structured `verification` submission**) |
| POST | `/verifications/:userId/in-review` | Mark in review |
| POST | `/verifications/:userId/approve` | Approve doctor (sets verify badge, **notifies user**) |
| POST | `/verifications/:userId/reject` | Reject `{ reason }` (**notifies user**; user may resubmit) |
| POST | `/verifications/:userId/reset` | Reset to NOT_SUBMITTED |
| GET | `/reports?status=pending` | Reported-posts queue (report + post + reporter + author) |
| POST | `/reports/:reportId/dismiss` | Dismiss a report |
| DELETE | `/posts/:postId` | **Master delete** any post network-wide; marks its reports reviewed |
| GET | `/feedback` | User feedback list |
| GET | `/deletions` | Pending deletions |
| GET | `/student-verifications` | Student verification queue |
| POST | `/student-verifications/:userId/approve` | Approve student (notifies user) |
| POST | `/student-verifications/:userId/reject` | Reject `{ reason }` (notifies user) |

> Decision notifications use types `verification_approved` / `verification_rejected`
> (category `securityAlerts`) — delivered in-app + FCM push.

---

## Consultation — `/api/consultations`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/` | 🔒 | Create consultation request |
| GET | `/` | 🔒 | List own consultations |
| GET | `/:id` | 🔒 | Consultation detail |
| POST | `/:id/pay` | 🔒 | Pay for consultation |
| POST | `/:id/approve` | 🔒 DOCTOR | Approve slot |
| POST | `/:id/decline` | 🔒 DOCTOR | Decline |
| POST | `/:id/refund` | 🔒 | Request refund |

---

## App — `/api/app`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/version` | — | App version + min required + changelog |
| GET | `/download/apk` | — | Redirect to latest APK |
| PUT | `/version` | Admin | Update version metadata |
| POST | `/upload-apk` | Admin | Upload new APK (max 200 MB) |
| POST | `/notify-update` | Admin | Send FCM push for update |

---

## Pagination

All list endpoints use cursor-based pagination:

```
GET /api/posts/user/:userId?cursor=<lastPostId>&limit=20
```

Response always includes:
```json
{ "items": [...], "hasMore": true, "nextCursor": "clxyz..." }
```

Pass `nextCursor` as `cursor` in the next request. Never use `skip`-based pagination.

---

## Error Responses

```json
{
  "statusCode": 400,
  "success": false,
  "message": "Validation failed",
  "errors": [{ "field": "phone", "message": "Invalid phone number" }]
}
```

| Code | Meaning |
|------|---------|
| 400 | Bad request / validation error |
| 401 | Missing or invalid token |
| 403 | Forbidden (wrong role or blocked) |
| 404 | Resource not found |
| 409 | Conflict (duplicate) |
| 429 | Rate limit exceeded |
| 500 | Internal server error |

---

## RabbitMQ Events Published

| Routing Key | Trigger | Consumer |
|-------------|---------|----------|
| `reel.created` | POST /api/reels/ | media-service |
| `user.updated` | PUT /api/users/profile/me | chat-service |

## RabbitMQ Events Consumed

| Routing Key | Action |
|-------------|--------|
| `media.processing.completed` | Update Reel.hlsUrl, set status COMPLETED |
| `media.processing.failed` | Set Reel.processingStatus = FAILED |
| `message.sent` | Send FCM push notification to recipient |

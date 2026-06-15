# Profile — `/api/profile`

View/edit the profile: basic contact, **unique username**, role-specific multi-entry
lists, photos, dual-path verification, hydrate, and block/mute. See [index.md](index.md)
for setup. Full worked examples (curl + responses): [../profile.md](../profile.md).

## Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/me` | 🔒 | Own profile (+ doctor/student sub-profile) |
| GET | `/me/full` | 🔒 | Consolidated hydrate payload (offline cache) |
| GET | `/me/completion` | 🔒 | Role-aware section completion + verification |
| GET | `/me/archive` | 🔒 | Own content (`?type=all\|reel\|post\|research\|thesis\|case_study`) |
| GET | `/me/practice` | 🔒 | Own research/thesis/case studies |
| GET | `/me/liked` | 🔒 | Interaction history: posts + reels you liked |
| GET | `/me/commented` | 🔒 | Interaction history: posts + reels you commented on |
| GET | `/me/counts` | 🔒 | Followers / following / connections / posts counts |
| PUT | `/me/basic` | 🔒 | Update basic contact (returns `locks`) |
| GET | `/username/check?username=` | 🔒 | Username availability |
| PUT | `/me/username` | 🔒 | Set/change unique username |
| POST·DELETE | `/me/photo` | 🔒 | Upload `multipart: photo` / remove |
| POST·DELETE | `/me/cover` | 🔒 | Upload `multipart: cover` / remove |
| PUT | `/me/doctor/specialties` | 🔒 doctor | Set specialties array |
| GET·POST·PATCH·DELETE | `/me/doctor/education[/:entryId]` | 🔒 doctor | Education list |
| GET·POST·PATCH·DELETE | `/me/doctor/workplace[/:entryId]` | 🔒 doctor | Workplace list |
| GET·POST·PATCH·DELETE | `/me/doctor/certificates[/:entryId]` | 🔒 doctor | Certificates (`multipart: file` optional) |
| GET·POST·PATCH·DELETE | `/me/student/academics[/:entryId]` | 🔒 student | Academics list |
| GET·POST·PATCH·DELETE | `/me/student/experiences[/:entryId]` | 🔒 student | Experiences list |
| GET·POST·DELETE | `/me/general/interests[/:entryId]` | 🔒 general | Health interests |
| GET·POST | `/me/doctor/verification` | 🔒 doctor | Dual-path verification status / submit |
| GET | `/u/:username` | 🔓 | Public profile by `@username` |
| GET | `/public/:slug` · `/:userId` | 🔓 | Public profile by slug / id |
| POST·DELETE | `/block/:userId`, `/mute/:userId` | 🔒 | Block / mute (+ `/list`) |

## JSON

```jsonc
// PUT /me/basic  — send only changed fields. phoneNumber ignored; email locked (403) for Google.
{ "professionalHeadline": "Interventional Cardiologist", "city": "Mumbai",
  "languages": ["English","Hindi"], "workPhone": "+912255551234", "age": 34 }
// → data: { user: {...}, locks: { personalPhoneLocked: true, personalEmailLocked: false } }

// PUT /me/username
{ "username": "DrAnya" }                  // → data: { uniqueUsername: "dranya" }
//   400 → data: { code: "INVALID_USERNAME_FORMAT" | "USERNAME_TOO_SHORT" | "USERNAME_TOO_LONG" }
//   409 → data: { code: "USERNAME_ALREADY_EXISTS" }, "This username has just been taken..."
// GET /username/check?username=DrAnya
//   → data: { available: true, username: "dranya", code: null }   (case-insensitive; @ optional)
//   unavailable → { available: false, code: "USERNAME_ALREADY_EXISTS" | "<format code>" }

// GET /me/liked / /me/commented  → data: { items: [ { type:'post'|'reel', id, content,
//   likesCount, commentsCount, interactedAt, author:{ uniqueUsername, isVerified, ... } } ], hasMore, nextCursor }

// Headline (PUT /me/basic professionalHeadline) is capped at 40 words.
// Doctor /me + /me/full expose: doctorProfile.patientVerificationCount,
//   doctorProfile.yearsOfClinicalExperience (auto-computed from licensureDate).

// POST /me/doctor/education
{ "organizationName": "AIIMS Delhi", "departmentName": "Cardiology",
  "startDate": "2015-06-01", "endDate": "2018-05-31" }
// 201 → data: { item: { id, organizationName, ..., createdAt, updatedAt } }
// GET → data: { items: [ ... ] }   PATCH (partial) → data: { item }   DELETE → "Entry deleted."

// GET /me/full → data: { user, locks, memberSince, accountAge:{label,days},
//   doctor|student|general, completion:{sections,percent}, verification:{status}, updatedAt }
```

Verification (multipart, dual-path) and the validation rules are documented in
detail in [../profile.md](../profile.md) §1b, §3, §8.

## Frontend

```js
const me = await api.get("/profile/me/full");            // hydrate the whole page/cache

// live username check while typing
const { available, reason } = await api.get(`/profile/username/check?username=${v}`);
if (available) await api.put("/profile/me/username", { username: v });

// edit basic
const { user, locks } = await api.put("/profile/me/basic", { city: "Mumbai" });

// list CRUD
const { item } = await api.post("/profile/me/doctor/education", { organizationName: "AIIMS" });
await api.put(`/profile/me/doctor/education/${item.id}`, { departmentName: "Cardiology" }); // PATCH via put()? use del/patch
await api.del(`/profile/me/doctor/education/${item.id}`);

// photo
const fd = new FormData(); fd.append("photo", file);
const { profilePhoto } = await api.upload("/profile/me/photo", fd);
```
> Note: list edits use `PATCH`. Add `patch: (p,b)=>request(p,{method:"PATCH",body:b})` to the
> client in [index.md](index.md) if your app edits list entries.

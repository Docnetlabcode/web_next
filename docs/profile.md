# Role-Based Profile Editing — API Reference (Phase 1)

All endpoints are under `/api/profile`. Every endpoint requires a Bearer access
token (🔒). Endpoints marked 👤 are additionally guarded by role middleware.

> **Setup:** run `npm run migrate` once to create the 3 new `users` columns and
> the 6 child tables this feature uses. See [migrations/](../migrations).

The new page supports three role-specific edit flows, several of them
**multi-entry lists** (add / edit / delete each row independently), plus one
consolidated **hydrate** endpoint clients use to fill their on-device cache for
offline use.

---

## Cross-cutting rules (enforced server-side on every endpoint)

| Rule | Behavior |
|---|---|
| **Validation** | Joi per endpoint: max lengths, gender enum, `startDate ≤ endDate`, array caps (languages/specialties/interests ≤ 20), `age` 1–150. Unknown keys are **stripped** (mass-assignment guard). Invalid → `400`. |
| **Ownership** | List rows are always scoped to `userId = caller`. A PATCH/DELETE on an entry you don't own → **`404`** (no existence enumeration). |
| **Personal phone** | `phoneNumber` is an auth identifier — **never** editable through profile APIs (silently ignored if sent). |
| **Personal email** | For Google-auth accounts, changing `email` → **`403`**. Otherwise it must be unique (case-insensitive) → **`409`** on conflict. |
| **Per-list cap** | Max **25** entries per user per list → `400`. |
| **Files** | Certificate uploads use image/PDF multer (≤20 MB). Replacing or deleting an entry removes the old Cloudinary asset. |
| **Cache** | Every successful write invalidates `profile:{userId}`. |
| **LWW** | Every write sets `updatedAt = NOW()`; reads expose `updatedAt` so clients resolve conflicts by latest timestamp. |

**Lock flags** returned to the client tell it which fields to render read-only:

```json
"locks": { "personalPhoneLocked": true, "personalEmailLocked": false }
```
- `personalPhoneLocked` — `true` when the account has a verified phone (OTP signup).
- `personalEmailLocked` — `true` for Google-auth accounts (email is their login).

---

## Field map by role

| Section | Health Professional (doctor) | Medical Student (student) | General User (general_user) |
|---|---|---|---|
| **Basic contact** | fullName, headline, DOB, specialization, gender, workEmail, personal email, personal phone*, workPhone, city, languages[], about | fullName, headline, gender, degree, DOB, college email (`workEmail`), personal email, personal phone*, city, languages[], about | fullName, headline, DOB, age, personal email, personal phone*, city, languages[], about |
| **Lists** | education, workplace, certificates | academics, experiences | interests |
| **Single** | specialties[] | — | — |

\* Personal phone is read-only (locked). The student "college email" maps to the
existing `workEmail` column.

Identity fields pre-filled at onboarding (`fullName`, `gender`, `specialization`
/ `degree` / `age`) remain fully editable here.

---

## 1. Basic contact — `PUT /me/basic` 🔒

Send only the fields you want to change.

```jsonc
{
  "fullName": "Dr. Anya Sharma",
  "professionalHeadline": "Interventional Cardiologist",   // headline
  "bio": "Preventive cardiology.",                          // about
  "dateOfBirth": "1990-04-12",
  "gender": "female",                                       // male|female|other|prefer_not_to_say
  "specialization": "Cardiology",                           // doctor
  "degree": "MBBS",                                         // student
  "age": 34,                                                // general (1–150)
  "city": "Mumbai",
  "languages": ["English", "Hindi"],                        // ≤20
  "email": "anya@personal.com",                             // ignored/403 for Google accounts; unique otherwise
  "workEmail": "anya@hospital.org",
  "workPhone": "+91 22 5555 1234"                           // doctor
  // phoneNumber is IGNORED — personal phone cannot be changed here
}
```

**200** → `{ "user": { …formatted… }, "locks": { … } }`
Errors: `400` validation · `403` Google email change · `409` email already in use.

---

## 1b. Unique username (`uniqueUsername`)

An Instagram-style, **globally unique** public handle — the primary identifier for
searching and linking to a user. Separate from the legacy `publicProfileSlug`.
Uniqueness is enforced at the DB level (case-insensitive unique index) **and**
re-checked before every write.

**Rules:** 3–30 chars · lowercase letters/numbers/`.`/`_` · must start and end with
a letter or number · no consecutive dots · not a reserved word.

Every user is auto-assigned a unique default handle at onboarding, then can change it.

| Method | Path | Body / Query | Result |
|---|---|---|---|
| GET | `/me` · `/me/full` · `/u/:username` · search | — | responses include `uniqueUsername` |
| GET | `/username/check?username=dranya` 🔒 | — | `{ available: true|false, username, reason }` |
| PUT | `/me/username` 🔒 | `{ "username": "dranya" }` | `{ "uniqueUsername": "dranya" }` |
| GET | `/u/:username` 🔓 | path (`@dranya` or `dranya`) | public profile (same privacy rules as `/public/:slug`) |

Errors on `PUT /me/username`: `400` invalid format (message explains the rule) ·
`409` already taken. Search (`GET /api/search/users`, `/api/users/search`) matches
`uniqueUsername` in addition to name/specialization/slug.

---

## 2. Header media

| Method | Path | Body | Result |
|---|---|---|---|
| POST | `/me/photo` | `multipart: photo` | `{ "profilePhoto": "https://…" }` |
| DELETE | `/me/photo` | — | `{ "profilePhoto": null }` |
| POST | `/me/cover` | `multipart: cover` | `{ "coverPhoto": "https://…" }` |
| DELETE | `/me/cover` | — | `{ "coverPhoto": null }` |

"Member since" / app-usage label is returned by the hydrate endpoint (§7), not a
separate call. Image cropping/editing happens client-side before upload.

---

## 3. Doctor lists (👤 doctor)

Each list shares the same CRUD shape:

```
GET    /me/doctor/<list>             → { items: [ … ] }
POST   /me/doctor/<list>             → 201 { item }
PATCH  /me/doctor/<list>/:entryId    → 200 { item }
DELETE /me/doctor/<list>/:entryId    → 200 "Entry deleted."
```

**education** — body `{ organizationName*, departmentName?, startDate?, endDate?, sortOrder? }`
**workplace** — body `{ role?, organizationName*, department?, startDate?, endDate?, sortOrder? }`
**certificates** — `multipart` with optional `file` field + `{ name*, validationDate? }`.
Uploading a `file` on POST/PATCH stores it on Cloudinary; replacing/deleting removes the old asset.

`*` = required on POST. PATCH updates only the supplied fields. Dates are ISO
(`YYYY-MM-DD`); `startDate` must be ≤ `endDate`.

Entry shape (education example):
```json
{ "id": "clx…", "organizationName": "AIIMS", "departmentName": "Cardiology",
  "startDate": "2015-06-01", "endDate": "2018-05-31", "sortOrder": 0,
  "createdAt": "…", "updatedAt": "…" }
```

### Specialties — `PUT /me/doctor/specialties` 👤 doctor

```jsonc
{ "specialties": ["Cardiology", "Interventional Cardiology"] }   // ≤20, trimmed, de-duped
```
**200** → `{ "specialties": [ … ] }`

---

## 4. Student lists (👤 student)

```
GET·POST·PATCH·DELETE  /me/student/academics[/:entryId]
GET·POST·PATCH·DELETE  /me/student/experiences[/:entryId]
```

**academics** — `{ collegeName*, program?, city?, currentYear?, expectedGraduationDate?, sortOrder? }`
**experiences** — `{ institution*, program?, city?, startDate?, endDate?, interests?[], sortOrder? }`
(`interests` is an array ≤20; covers the "experience and interest" section.)

---

## 5. General-user list (👤 general_user)

```
GET·POST·DELETE  /me/general/interests[/:entryId]
```
Body on POST: `{ "topic": "Diabetes" }`. Topics are de-duped per user
(case-insensitive) → `409` on duplicate.

---

## 6. Completion / dashboard — `GET /me/completion` 🔒

Role-aware per-section status + verification.

```json
{
  "completion": {
    "sections": { "basicContact": true, "education": true, "workplace": false,
                  "professionalDetails": true, "verification": false },
    "percent": 60
  },
  "verification": { "status": "not_submitted" }
}
```
Sections vary by role (doctor: 5, student: 3, general: 2).
`verification.status` ∈ `not_submitted | pending | verified | rejected`.

---

## 7. Consolidated hydrate — `GET /me/full` 🔒

One payload to fill the device cache. Only the section matching the caller's role
is populated; the others are `null`.

```json
{
  "user": { "id": "…", "fullName": "…", "professionalHeadline": "…",
            "workPhone": "…", "degree": null, "age": null, "languages": [ … ], "…": "…" },
  "locks": { "personalPhoneLocked": true, "personalEmailLocked": false },
  "memberSince": "2025-06-09T…",
  "accountAge": { "label": "1 year", "days": 365 },
  "doctor":  { "specialties": [ … ], "education": [ … ], "workplace": [ … ], "certificates": [ … ] },
  "student": null,
  "general": null,
  "completion": { "sections": { … }, "percent": 60 },
  "verification": { "status": "not_submitted" },
  "updatedAt": "2026-06-09T…"
}
```

---

## 8. Doctor verification — dual-path (Phase 2) 👤 doctor

Run `npm run migrate` (creates `doctor_verifications`) before using these.

The submitted evidence is stored in `doctor_verifications`; the review **status**
lives on `doctor_profiles.kycStatus` (so the admin queue and `/me/full` keep
working). On an admin decision the user is notified (`verification_approved` /
`verification_rejected`) and, on approval, gets `isVerified = true` (the verify
badge). A rejected user can edit and **resubmit** (the same POST upserts).

### `GET /me/doctor/verification` 🔒👤

```json
{ "status": "not_submitted", "submission": null }
```
After a submission: `status` ∈ `not_submitted | pending | verified | rejected`,
plus `rejectionReason` (when rejected) and the `submission` payload (document URLs,
not internal ids).

### `POST /me/doctor/verification` 🔒👤 — `multipart/form-data`

Pick a path with the `pathType` field. **All fields are required except those
marked optional.**

**Path A — `pathType=credential`** (professional credential):

| Field | Type | Required |
|---|---|---|
| countryOfPractice | text | ✔ |
| stateRegion | text | ✔ |
| professionType | text | ✔ |
| registrationNumber | text | ✔ |
| highestQualification | text | ✔ |
| `licenseDoc` | file (image/pdf) | optional |

**Path B — `pathType=document`** (document upload + liveness):

| Field | Type | Required |
|---|---|---|
| `aadhaarDoc` | file (Aadhaar / Gov-ID) | ✔ |
| `panDoc` | file (PAN card) | ✔ |
| `workIdCard` | file (work ID) | ✔ |
| workplaceName | text | optional |
| workplaceContactNumber | text | ✔ |
| workplaceLocation | text | ✔ |
| contactNumber | text | ✔ |
| `livenessMedia` | file (3-sec live face scan) | ✔ |
| livenessPassed | boolean | optional (defaults `true`) |

> **Liveness:** the client runs the mandatory 3-second face scan and uploads the
> captured media as `livenessMedia` (+ optional `livenessPassed`). The result is
> **queued for manual admin review** — the backend stores the evidence and flag;
> it does not run face-matching itself.

**200** → `{ "status": "pending", "pathType": "document" }`
Errors: `400` invalid path / failed validation / missing required upload.

### Admin side (`/api/admin`, internal)

- `GET /verifications?status=SUBMITTED` — queue.
- `GET /verifications/:userId` — profile **+ structured `verification` submission**.
- `POST /verifications/:userId/{in-review|approve|reject|reset}` — approve/reject
  **notify the user** and approve sets the verify badge. (`reject` accepts
  `{ reason }`.) Student equivalents under `/student-verifications/:userId/...`.

> **Verify badge** = `users.isVerified` (set true on approval). Status vocabulary
> is normalized from `kycStatus` to `not_submitted | pending | verified | rejected`.

---

## 9. Viewing another user's profile (third-party view)

Three read endpoints render someone else's profile. All accept `optionalAuth`
(a viewer token unlocks relationship state + private profiles the viewer follows):

| Method | Path | Lookup by |
|---|---|---|
| GET | `/api/profile/:userId` 🔓 | user id |
| GET | `/api/profile/public/:slug` 🔓 | `publicProfileSlug` |
| GET | `/api/profile/u/:username` 🔓 | `uniqueUsername` (leading `@` optional) |

**Viewable response** (`data`):

```jsonc
{
  "user": { "id", "fullName", "uniqueUsername", "profilePhoto", "coverPhoto",
            "role", "isVerified", "professionalHeadline", "bio", "city",
            "languages", "workEmail", "workPhone",
            "followersCount", "followingCount", "connectionsCount", "postsCount",
            "interests": [ … ], "createdAt" /* = "Joined" month/year */ },
  "doctorProfile":  { /* public professional fields only — see below */ } | null,
  "studentProfile": { /* public academic fields only */ } | null,
  "roleDetails": {
    // doctor:
    "specialties": [ … ], "patientVerificationCount": 0,
    "yearsOfClinicalExperience": 7,
    "education": [ … ], "workplace": [ … ], "certificates": [ … ]
    // student:  { "academics": [ … ], "experiences": [ … ] }
    // general:  { "interests": [ … ] }
  },
  "isFollowing": false,        // viewer → target
  "isFollowedBy": false,       // target → viewer
  "isRequested": false,        // viewer's follow request is pending (private target)
  "connectionStatus": "none"   // none | pending_outgoing | pending_incoming | connected
}
```

The button matrix is driven by these flags:
`isFollowing=false` → **Follow** (or **Requested** when `isRequested`); once following,
`connectionStatus` selects **Connect** (`none`) / **Connecting** (`pending_outgoing`) /
**Accept** (`pending_incoming`) / **Message** (`connected`).

**Privacy & sanitization:**
- A **private** target the viewer doesn't follow returns only a stripped card
  (`{ user: { …, isPrivate: true }, isFollowing, isFollowedBy?, isRequested?, connectionStatus: "none" }`).
- `doctorProfile` / `studentProfile` are projected through a **public whitelist** —
  KYC state (`kycStatus`, `kycRejectionReason`, …) and verification document URLs
  (`medical_licenseUrl`, `verificationDocUrl`, …) are **never** returned to a third
  party. The owner's own view (`GET /me`) still returns the full blob.
- A block (either direction) returns `404`.

`roleDetails` is cached in Redis (`profile:roledetails:{userId}`, 120 s TTL) and
invalidated whenever the underlying lists or specialties change.

---

## Onboarding fields (Phase 3 increment, already wired)

`POST /api/users/onboard` and `/onboard/firebase` now also accept the
role-specific identity fields captured on the post-OTP quick-setup page:

```jsonc
{ "fullName": "…", "gender": "female",
  "specialization": "Cardiology",   // doctor
  "degree": "MBBS",                 // student
  "age": 22 }                       // general (1–150)
```

---

## How to use — worked examples

Every 🔒 request needs `Authorization: Bearer <accessToken>` (get one from
`POST /api/auth/verify-otp` or `/api/auth/google`). JSON requests use
`Content-Type: application/json`; file requests use `multipart/form-data` (let the
client set the boundary — don't set `Content-Type` by hand). All responses follow
the envelope `{ statusCode, success, data, message }`; the `data` shapes below.

Base URL: `http://localhost:5000` (dev) / `https://api.doklynk.app` (prod).

### A. Unique username

```bash
# 1) Check availability as the user types
curl -H "Authorization: Bearer $TOKEN" \
  "$BASE/api/profile/username/check?username=DrAnya"
# data: { "available": true, "username": "dranya", "reason": null }

# 2) Save it (case-insensitive; stored lowercase)
curl -X PUT "$BASE/api/profile/me/username" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{ "username": "DrAnya" }'
# 200 data: { "uniqueUsername": "dranya" }
# 409 message: "Username is already taken."   (if another user has it)
# 400 message: "Username must start and end with a letter or number."  (bad format)

# 3) Open a profile by handle (public; @ optional)
curl "$BASE/api/profile/u/@dranya"
# data: { "user": { "id": "...", "uniqueUsername": "dranya", "fullName": "...", ... }, "isFollowing": false }
```

### B. Basic contact (returns lock flags)

```bash
curl -X PUT "$BASE/api/profile/me/basic" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{ "professionalHeadline": "Interventional Cardiologist",
        "city": "Mumbai", "languages": ["English","Hindi"], "workPhone": "+912255551234" }'
# data: { "user": { ... }, "locks": { "personalPhoneLocked": true, "personalEmailLocked": false } }
# NOTE: sending "phoneNumber" is ignored; sending "email" on a Google account → 403.
```

### C. Photos

```bash
curl -X POST "$BASE/api/profile/me/photo" \
  -H "Authorization: Bearer $TOKEN" -F "photo=@/path/avatar.jpg"
# data: { "profilePhoto": "https://res.cloudinary.com/.../avatar.jpg" }

curl -X DELETE "$BASE/api/profile/me/photo" -H "Authorization: Bearer $TOKEN"
# data: { "profilePhoto": null }
```

### D. A multi-entry list (education — same pattern for workplace/academics/experiences/interests)

```bash
# Create
curl -X POST "$BASE/api/profile/me/doctor/education" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{ "organizationName": "AIIMS Delhi", "departmentName": "Cardiology",
        "startDate": "2015-06-01", "endDate": "2018-05-31" }'
# 201 data: { "item": { "id": "clx...", "organizationName": "AIIMS Delhi", ... } }

curl -H "Authorization: Bearer $TOKEN" "$BASE/api/profile/me/doctor/education"
# data: { "items": [ { "id": "clx...", ... } ] }

# Edit just one field
curl -X PATCH "$BASE/api/profile/me/doctor/education/clx..." \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{ "departmentName": "Interventional Cardiology" }'
# data: { "item": { ... } }

curl -X DELETE "$BASE/api/profile/me/doctor/education/clx..." -H "Authorization: Bearer $TOKEN"
# 200 message: "Entry deleted."   (someone else's id → 404)

# Certificates carry an optional file:
curl -X POST "$BASE/api/profile/me/doctor/certificates" \
  -H "Authorization: Bearer $TOKEN" \
  -F "name=ACLS" -F "validationDate=2024-01-10" -F "file=@/path/cert.pdf"

# Specialties (single array, not a list):
curl -X PUT "$BASE/api/profile/me/doctor/specialties" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{ "specialties": ["Cardiology","Interventional Cardiology"] }'
```

### E. Doctor verification (dual-path, multipart)

```bash
# Path A — professional credential (license file optional)
curl -X POST "$BASE/api/profile/me/doctor/verification" \
  -H "Authorization: Bearer $TOKEN" \
  -F "pathType=credential" \
  -F "countryOfPractice=India" -F "stateRegion=Maharashtra" \
  -F "professionType=Cardiologist" -F "registrationNumber=MH-2014-55821" \
  -F "highestQualification=DM Cardiology" \
  -F "licenseDoc=@/path/license.pdf"
# data: { "status": "pending", "pathType": "credential" }

# Path B — document upload + liveness (all 4 files required)
curl -X POST "$BASE/api/profile/me/doctor/verification" \
  -H "Authorization: Bearer $TOKEN" \
  -F "pathType=document" \
  -F "workplaceContactNumber=+912255551234" \
  -F "workplaceLocation=Lilavati Hospital, Bandra" \
  -F "contactNumber=+919876543210" -F "livenessPassed=true" \
  -F "aadhaarDoc=@/path/aadhaar.jpg" -F "panDoc=@/path/pan.jpg" \
  -F "workIdCard=@/path/workid.jpg" -F "livenessMedia=@/path/liveness.jpg"
# 400 if a required upload is missing: "Missing required upload(s): panDoc."

# Check your own status (poll after submitting)
curl -H "Authorization: Bearer $TOKEN" "$BASE/api/profile/me/doctor/verification"
# data: { "status": "pending", "rejectionReason": null, "submission": { ... } }
# After admin acts → status "verified" (badge set) or "rejected" (+rejectionReason); resubmit to retry.
```

### F. Hydrate the device cache + completion

```bash
curl -H "Authorization: Bearer $TOKEN" "$BASE/api/profile/me/full"
# data: { user, locks, memberSince, accountAge, doctor|student|general, completion, verification, updatedAt }

curl -H "Authorization: Bearer $TOKEN" "$BASE/api/profile/me/completion"
# data: { completion: { sections, percent }, verification: { status } }
```

### G. Search by username / name

```bash
curl -H "Authorization: Bearer $TOKEN" "$BASE/api/search/users?q=dranya&limit=10"
# data: { users: [ { id, fullName, uniqueUsername, profilePhoto, isVerified, isFollowing }, ... ], hasMore, nextCursor }
```

> **Admin** decisions (internal): `POST /api/admin/verifications/:userId/approve`
> and `/reject` (`{ reason }`) update the status **and notify the user**
> (`verification_approved` / `verification_rejected`, in-app + push); approval sets
> the verified badge. Student equivalents under `/api/admin/student-verifications/...`.

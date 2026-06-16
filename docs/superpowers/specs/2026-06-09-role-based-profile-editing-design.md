# Design Spec — Role-Based Profile Editing (Phase 1)

**Date:** 2026-06-09
**Service:** api-service (DokLynk)
**Status:** Approved for implementation (Phase 1)
**Author:** Claude + user

---

## 1. Background & goal

The frontend "Edit Profile" page was redesigned so each of the three roles
(`doctor`, `student`, `general_user`) edits a role-specific set of sections, several
of which are **multi-entry lists** the user can add / edit / delete individually
(education, workplace, certificates, academics, experiences, interests).

Today these lists are stored as freeform JSON blobs on `doctor_profiles` /
`student_profiles`, which cannot support per-entry edit/delete cleanly. This spec
defines production-grade APIs and a normalized data model to back the new page,
plus a single consolidated endpoint the web/app clients use to hydrate their
on-device cache for offline use.

**Scope decisions (agreed):**
- **Phasing:** Phase 1 = profile editing (this spec). Phase 2 = dual-path verification
  + admin notifications. Phase 3 = onboarding field tweaks + offline polish.
- **Schema delivery:** new `migrations/` folder + `npm run migrate` runner.
- **Multi-entry data:** normalized child tables with per-entry CRUD.
- **Offline support:** last-write-wins (LWW) + one consolidated hydrate endpoint.

This spec covers **Phase 1 only**. Phases 2–3 are summarized at the end for
continuity but are not designed in detail here.

---

## 2. Confirmed product decisions

1. **General-user `age`:** stored as an `int` captured at onboarding, *and*
   `dateOfBirth` remains separately editable on the profile (spec lists both fields).
   Age is **not** auto-derived from DOB.
2. **Personal email for phone-signup users:** editable, with a case-insensitive
   uniqueness check; it is **not** treated as a login credential (only Google linking
   makes an email a login identifier).
3. **Personal phone (`phoneNumber`):** an auth identifier — never editable through
   profile APIs. If null, adding a phone is a separate verified-OTP flow (out of scope
   for Phase 1).
4. **Gender cannot be auto-filled from Google** (OAuth does not return it reliably);
   only name/photo autofill on first Google login (already implemented). The Phase-3
   onboarding form keeps asking gender. (No Phase-1 change.)

---

## 3. Data model

### 3.1 New columns on `users`

| Column | Type | Notes |
|---|---|---|
| `workPhone` | `text` null | Work phone (free-text, no uniqueness) |
| `degree` | `text` null | Student identity field, pre-filled at onboarding |
| `age` | `integer` null | General-user onboarding value (1–150) |

Field reuse (no new column needed):
- **Headline** → existing `professionalHeadline`
- **About** → existing `bio`
- **Personal email** → existing `email`
- **Personal phone** → existing `phoneNumber`
- **Work email** → existing `workEmail`
- **City / Languages / DOB / Specialization / Gender** → existing columns.

### 3.2 New child tables

All tables include: `id text PK` (CUID2), `"userId" text NOT NULL` (FK→users.id),
`"createdAt" timestamptz`, `"updatedAt" timestamptz`, and an index on `"userId"`.
Columns are `camelCase` and double-quoted (house convention).

**`doctor_education`**
| Column | Type |
|---|---|
| organizationName | text NOT NULL |
| departmentName | text null |
| startDate | date null |
| endDate | date null |
| sortOrder | int default 0 |

**`doctor_workplace`**
| Column | Type |
|---|---|
| role | text null |
| organizationName | text NOT NULL |
| department | text null |
| startDate | date null |
| endDate | date null |
| sortOrder | int default 0 |

**`doctor_certificates`**
| Column | Type |
|---|---|
| name | text NOT NULL |
| validationDate | date null |
| fileUrl | text null |
| filePublicId | text null |

**`student_academics`**
| Column | Type |
|---|---|
| collegeName | text NOT NULL |
| program | text null |
| city | text null |
| currentYear | text null |
| expectedGraduationDate | date null |
| sortOrder | int default 0 |

**`student_experiences`**
| Column | Type |
|---|---|
| institution | text NOT NULL |
| program | text null |
| city | text null |
| startDate | date null |
| endDate | date null |
| interests | text[] default '{}' |
| sortOrder | int default 0 |

**`user_health_interests`**
| Column | Type |
|---|---|
| topic | text NOT NULL |

Notes:
- `organizationName` / `collegeName` / `institution` / `name` / `topic` are the only
  **required** column per table (a list entry must have at least its anchor field);
  all other fields are optional, matching "not necessary to fill all fields."
- **Per-list cap:** max **25** entries per user per list (validation, returns 400).
- **Specialties** (doctor professional details) stay an array on
  `doctor_profiles.specializations` — set via a single PUT, not a child table.
- Legacy JSON columns on `doctor_profiles` / `student_profiles` are **left intact**;
  Phase-1 endpoints read/write the new tables only.

### 3.3 Migration `001`

Idempotent SQL: `ALTER TABLE users ADD COLUMN IF NOT EXISTS …` for the 3 columns,
`CREATE TABLE IF NOT EXISTS …` for the 6 tables, plus `CREATE INDEX IF NOT EXISTS`
on each `"userId"`.

---

## 4. Migration infrastructure

```
migrations/
  _runner.js            # applies pending .sql files in order, idempotent
  001_profile_editing.sql
```

- `_runner.js` ensures a `_migrations` ledger table
  (`filename text PK, "appliedAt" timestamptz`), lists `*.sql` files sorted by name,
  skips already-applied, runs the rest inside a transaction each, records them.
- `package.json` gets `"migrate": "node migrations/_runner.js"`.
- Safe to re-run (idempotent files + ledger). Uses the same `DATABASE_URL`.

---

## 5. Security & cross-cutting rules

Enforced on **every** endpoint, server-side (never trust the client):

1. **Auth:** `authMiddleware` on all routes. Role sections additionally guarded by
   `roleMiddleware(['doctor'])` / `(['student'])` / `(['general_user'])`.
2. **Ownership:** child rows are always filtered by `"userId" = req.user.id`. A
   `:entryId` not owned by the caller returns **404** (avoids existence enumeration).
3. **Immutability:**
   - `phoneNumber` is stripped from any profile write (ignored if sent).
   - `email` change rejected with **403** when `isGoogleAuth = true`.
   - When editable, `email` is lower-cased and checked unique (**409** on conflict).
4. **Validation (Joi per endpoint):** field whitelists (mass-assignment protection),
   max lengths, enum checks (gender, etc.), date sanity (`startDate ≤ endDate` when
   both present; dates within a sane range), array caps (languages ≤ 20,
   specialties ≤ 20, interests ≤ 20), integer bounds (`age` 1–150), trims.
5. **SQL:** all parameterized (`$1,$2…`); no string interpolation of user input;
   column lists are static whitelists.
6. **File uploads (certificates):** existing `uploadImagePdf` multer (image/pdf) +
   size limit; on replace/delete the old Cloudinary asset is removed using the stored
   `filePublicId`.
7. **Cache:** every successful write `DEL profile:{userId}` (existing key).
8. **LWW:** every write sets `"updatedAt" = NOW()`. Reads expose `updatedAt` so the
   client resolves conflicts by latest timestamp. No version gate (per decision).
9. **Idempotency:** `PATCH`/`DELETE` are idempotent; delete of a missing/unowned row
   → 404. Standard response envelope everywhere.
10. **Rate limiting:** inherits the global `/api/` limiter; no per-route additions in
    Phase 1.

---

## 6. Endpoints

All paths are under `/api/profile`. Legend: 🔒 auth required; 👤 role-guarded.

### 6.1 Basic contact — all roles

**`PUT /api/profile/me/basic`** 🔒 (extend existing)

Accepts the whitelisted fields below. `phoneNumber` is ignored; `email` rejected if
Google-auth.

| Field | Applies to | Validation |
|---|---|---|
| fullName | all | 1–100 |
| professionalHeadline (headline) | all | ≤150 |
| bio (about) | all | ≤1000 |
| dateOfBirth | all | ISO, ≤ now |
| gender | all | enum |
| city | all | ≤100 |
| languages | all | array ≤20 |
| specialization | doctor | ≤100 |
| degree | student | ≤100 |
| age | general | int 1–150 |
| email (personal) | all (if not Google) | email, unique |
| workEmail | doctor/student | email |
| workPhone | doctor | ≤20 |

> The student "college email" field maps to the existing `workEmail` column
> (institutional email). General users have no work email/phone fields.

**Response 200:** `{ "user": { …formatted… }, "locks": { "personalPhoneLocked": true, "personalEmailLocked": false } }` — message `"Profile updated."`

### 6.2 Header / media

- `POST /api/profile/me/photo` 🔒 (exists) — upload profile photo.
- `POST /api/profile/me/cover` 🔒 (exists) — upload cover photo.
- `DELETE /api/profile/me/photo` 🔒 (new) — clear profile photo (+ Cloudinary delete). → `{ "profilePhoto": null }`
- `DELETE /api/profile/me/cover` 🔒 (new) — clear cover photo. → `{ "coverPhoto": null }`

"Member since" / app-usage label is returned by the hydrate endpoint (§6.9), not a
separate call.

### 6.3 Doctor — education (👤 doctor)

```
GET    /api/profile/me/doctor/education            → { items: [ … ] }
POST   /api/profile/me/doctor/education            → 201 { item }
PATCH  /api/profile/me/doctor/education/:entryId   → { item }
DELETE /api/profile/me/doctor/education/:entryId   → 200 "Entry deleted."
```
Body (POST/PATCH): `{ organizationName, departmentName?, startDate?, endDate?, sortOrder? }`.
`organizationName` required on POST. PATCH updates supplied fields only.

Entry shape:
```json
{ "id": "clx...", "organizationName": "AIIMS", "departmentName": "Cardiology",
  "startDate": "2015-06-01", "endDate": "2018-05-31", "sortOrder": 0,
  "createdAt": "...", "updatedAt": "..." }
```

### 6.4 Doctor — workplace (👤 doctor)

Same CRUD shape under `/api/profile/me/doctor/workplace`.
Body: `{ role?, organizationName, department?, startDate?, endDate?, sortOrder? }`
(`organizationName` required on POST).

### 6.5 Doctor — certificates (👤 doctor)

```
GET    /api/profile/me/doctor/certificates
POST   /api/profile/me/doctor/certificates          (multipart: field `file`, optional)
PATCH  /api/profile/me/doctor/certificates/:entryId (multipart: field `file`, optional)
DELETE /api/profile/me/doctor/certificates/:entryId
```
Body fields: `name` (required on POST), `validationDate?`. If a `file` is uploaded it
is stored on Cloudinary (`doklynk/users/{userId}/certificates`); replacing or deleting
removes the prior asset via `filePublicId`.

Entry shape: `{ id, name, validationDate, fileUrl, createdAt, updatedAt }`.

### 6.6 Doctor — specialties (👤 doctor)

**`PUT /api/profile/me/doctor/specialties`** — body `{ "specialties": ["Cardiology", "..."] }`
(array ≤20, trimmed, de-duped). Sets `doctor_profiles.specializations`. → `{ "specialties": [...] }`

### 6.7 Student — academics & experiences (👤 student)

CRUD under `/api/profile/me/student/academics`:
body `{ collegeName, program?, city?, currentYear?, expectedGraduationDate?, sortOrder? }`
(`collegeName` required on POST).

CRUD under `/api/profile/me/student/experiences`:
body `{ institution, program?, city?, startDate?, endDate?, interests?, sortOrder? }`
(`institution` required on POST; `interests` array ≤20).

### 6.8 General — health interests (👤 general_user)

```
GET    /api/profile/me/general/interests
POST   /api/profile/me/general/interests     body { topic }   → 201 { item }
DELETE /api/profile/me/general/interests/:entryId
```
(De-dupe topic per user, case-insensitive; cap 25.)

### 6.9 Consolidated hydrate

**`GET /api/profile/me/full`** 🔒 — single payload to hydrate the device cache:

```json
{
  "statusCode": 200,
  "data": {
    "user": { /* full formatted user incl. headline, workPhone, degree, age, … */ },
    "locks": { "personalPhoneLocked": true, "personalEmailLocked": false },
    "memberSince": "2025-06-09T...",
    "accountAge": { "label": "1 year", "days": 365 },
    "doctor":  { "specialties": [...], "education": [...], "workplace": [...], "certificates": [...] },
    "student": null,
    "general": null,
    "completion": { "sections": { "basicContact": true, "education": false, ... }, "percent": 60 },
    "verification": { "status": "not_submitted" },
    "updatedAt": "2026-06-09T..."
  },
  "message": "Profile hydrated.",
  "success": true
}
```
Only the section matching the caller's role is populated; the others are `null`.
`verification.status` ∈ `not_submitted | pending | verified | rejected` (read from
existing `doctor_profiles.kycStatus` / `student_profiles.verificationStatus`; full
verification flow is Phase 2).

### 6.10 Completion / dashboard status

**`GET /api/profile/me/completion`** 🔒 (extend existing) — per-section completeness
by role + verification status, same `completion` + `verification` objects as §6.9.

---

## 7. File / code layout

```
migrations/
  _runner.js
  001_profile_editing.sql
src/modules/profile/
  profile.routes.js          # add new routes (existing file)
  profile.controller.js      # basic + media (existing, extended)
  profile.hub.controller.js  # full hydrate + completion (existing, extended)
  profile.lists.controller.js   # NEW: generic CRUD for the 6 child lists
  profile.lists.config.js       # NEW: per-list table/column/validation config
  profile.validators.js         # NEW: Joi schemas for basic + list bodies
  profile.helpers.js            # existing (lock flags, account-age helper added)
```

The six lists share one **generic, config-driven CRUD controller**
(`profile.lists.controller.js`) parameterized by a per-list descriptor (table name,
allowed columns, required column, validators, file handling, role). This keeps each
list to a config entry rather than duplicated handlers — easier to read, test, and
extend.

---

## 8. Testing

- **Unit (Jest):** Joi validators (boundary cases: empty anchor field, oversized
  arrays, bad dates, `startDate > endDate`, age out of range).
- **Ownership/security:** PATCH/DELETE on another user's entry → 404; `email` change
  when Google → 403; `phoneNumber` in body is ignored; duplicate email → 409.
- **CRUD round-trip per list:** create → list → patch → delete; cap enforcement.
- **Hydrate:** returns only the role-matching section; lock flags correct for
  phone-signup vs Google-signup users.
- **Migration runner:** runs `001` on a fresh DB, is a no-op on re-run.

---

## 9. Docs to update (per saved preference `keep-api-docs-in-sync`)

- `docs/profile.md` — all new/changed endpoints + the `full` hydrate payload.
- Root `README.md` — endpoint reference + any new conventions (lock flags, hydrate).
- `docs/conventions.md` — note the LWW/`updatedAt` + lock-flags pattern.

---

## 10. Out of scope for Phase 1 (future phases)

- **Phase 2 — Verification:** `doctor_verifications` table holding Path A (country,
  state, professionType, registrationNumber, highestQualification, optional license
  doc) and Path B (Aadhaar/Gov-ID file, PAN file, workplace details + work-ID file,
  contact number, liveness-pass flag); submit-to-admin; admin approve/reject that
  **emits notifications** + sets the verify tag; same notify-on-decision for students.
  (New notification types `verification_approved` / `verification_rejected`.)
- **Phase 3 — Onboarding + polish:** accept `degree` (student) / `age` (general) at
  `/api/users/onboard`; confirm Google name/photo autofill; remaining hydrate niceties.
- The on-device cache implementation itself (web/iOS/Android) — frontend work.
- Adding/verifying a phone number for Google-signup users (separate OTP flow).
# Edit Profile Rework — Design

**Date:** 2026-06-17
**Status:** Approved (design); pending spec review → implementation plan
**Area:** `src/screens/EditProfile.tsx`, `src/components/profile/*`, `src/lib/api.ts`, `src/lib/profileForms.ts`

## Problem

The edit-profile UI no longer matches the backend. The backend was rebuilt to the
role-based contract documented in `docs/profile.md` (per-row CRUD lists,
`PUT /me/doctor/specialties`, hydrate via `GET /profile/me/full`, dual-path
multipart verification). The current frontend
(`src/components/profile/ProfileForms.tsx` + the `dok.profile.doctor*/student*`
endpoints in `src/lib/api.ts`) was written against an **older** backend shape —
single "save the whole section" PUT blobs, fields that no longer exist
(`fellowships`, `consultationFees`, `servicesOffered`, `npiNumber`), no per-row
add/edit/delete, no General-user section, and a different verification flow.

This is a near-total rework of the edit-profile UI + the profile API layer so the
fields and flows match the built backend, for all three roles.

## Goals

1. Field sets and sections match the spec / `docs/profile.md` for all three roles.
2. Multi-row lists add / edit / delete each row independently, persisted to the
   backend immediately.
3. Sequential two-step doctor verification (Path A → Path B) with a mandatory
   3-second liveness scan.
4. Every uploaded file/image can be previewed full screen, removed, and replaced.
5. The edit-profile screen doubles as the dashboard: completion % per section +
   verification status (Pending / Verified / Rejected).
6. Keep testable logic framework-free (`src/lib/profileForms.ts`) per CLAUDE.md.

## Non-goals

- Avatar/cover photo upload (already handled by `PhotoUploader`; unchanged).
- Backend changes (documented where the frontend assumes new server behavior).
- Admin-side verification review (separate, already built).
- Component/DOM or E2E tests (project has none yet).

## Decisions (from brainstorming)

| Question | Decision |
|---|---|
| Scope | All 3 roles + verification + dashboard in one pass. |
| Row saving | Per-row, persisted to the server immediately (POST/PATCH/DELETE per entry). |
| "Both sides" docs | Single file per document — match the backend; front/back later. |
| Verification paths | Two-step wizard, **two separate POSTs** to the same endpoint: complete Path A (`pathType=credential`) → advance to Path B → submit (`pathType=document`). |
| Dashboard | Reuse the existing edit-profile accordion hub (no separate route). |
| File previews | One reusable upload component with fullscreen preview + remove + replace, used at every upload point. |

## Field map by role (source of truth: `docs/profile.md`)

**Health Professional (doctor) — 5 sections**
1. **Basic Contact:** fullName, headline, DOB, specialization, gender, work email,
   personal email, personal phone\*, work phone, city, languages[], about.
2. **Education** (list): organizationName\*, departmentName, startDate, endDate.
3. **Workplace** (list): role, organizationName\*, department, startDate, endDate.
4. **Professional Details:** specialties[] (single array) + certificates (list:
   name\*, validationDate, optional file).
5. **Verification:** Path A then Path B (see Verification below).

**Medical Student (student) — 3 sections**
1. **Basic Contact:** fullName, headline, gender, degree, DOB, college email
   (`workEmail`), personal email, personal phone\*, city, languages[], about.
2. **Academics** (list): collegeName\*, program, city, currentYear,
   expectedGraduationDate.
3. **Experience & Interest** (list): institution\*, program, city, startDate,
   endDate, interests[] (per row).

**General User (general_user) — 2 sections**
1. **Basic Contact:** fullName, headline, DOB, age, personal email, phone\*, city,
   languages[], about.
2. **Clinic Interests** (list): topic.

\* Personal phone is read-only when locked (OTP signup); personal email is
read-only when locked (Google login). Lock state comes from `locks` in the
hydrate payload. Identity fields pre-filled at onboarding
(fullName, gender, specialization/degree/age) remain fully editable. No field is
required except where the backend enforces it (`*` on POST); partial saves are fine.

## Architecture

### Data flow

- Hydrate the whole screen with a single `GET /profile/me/full` (`dok.profile.full()`),
  which returns `{ user, locks, doctor|student|general, completion, verification }`.
- Each row save/delete calls the matching per-row endpoint and then re-hydrates (or
  patches local state) so completion % and section status stay current.
- Basic contact is a single `PUT /me/basic` (send only changed fields).

### API layer — `src/lib/api.ts`

Replace the stale `dok.profile.doctor*/student*` blob endpoints (only ProfileForms
uses them) with the documented contract. A small `listCrud(base)` helper supplies
`list/add/update/remove` for JSON lists; certificates and verification are special
(multipart).

- **Lists:** `…/doctor/education`, `…/doctor/workplace`, `…/student/academics`,
  `…/student/experiences` — `GET / POST / PATCH / DELETE [/:id]`.
- **General interests:** `GET …/general/interests`, `POST {topic}`, `DELETE /:id`
  (no PATCH; backend 409s on duplicate topic).
- **Certificates:** `GET`; add/update via multipart (`name`, `validationDate`,
  optional `file`); `DELETE /:id`.
- **Specialties:** `PUT /me/doctor/specialties` with `{ specialties: [...] }`.
- **Verification:** `GET /me/doctor/verification`; `POST /me/doctor/verification`
  (multipart) — called once per path with its `pathType`.

### Components — `src/components/profile/`

- **`fields.tsx`** — shared inputs and helpers: `Field`, `Text`, `Num`, `Area`,
  `Select`, `Toggle`, `Tags`, `SaveBar`, `useSave`, and the `prune` re-export.
- **`MediaViewer.tsx`** — fullscreen portal lightbox. Images render full-screen;
  PDFs embed in an `<iframe>` with an "Open in new tab" fallback. Closes on
  backdrop / ✕.
- **`FileUpload.tsx`** — the standard upload field used at every upload point.
  - Empty: dashed "Tap to upload (image / PDF)" tile.
  - Filled: thumbnail + filename → click opens `MediaViewer` fullscreen, plus
    **Replace** and **Remove** actions.
  - `value` is either a local `File` (object-URL preview) or a remote URL string;
    emits `onChange(file | null)`. Local remove/replace are client-side; saved-file
    replace calls the owning endpoint.
- **`EditableList.tsx`** — generic per-row CRUD list driving education, workplace,
  certificates, academics, experiences, interests. Renders rows (each with its own
  Save + Delete and saving/error state), tracks new vs. saved rows, and an
  "Add entry" button. A section declares only its field schema + the three CRUD
  callbacks.
- **`ProfileForms.tsx`** — thin sections built on the above: `BasicContact`
  (role-aware fields + locked phone/email), `DoctorEducation`, `DoctorWorkplace`,
  `DoctorProfessional` (specialties + certificates), `StudentAcademics`,
  `StudentExperiences`, `GeneralInterests`.
- **`VerificationWizard.tsx`** — the two-step verification flow (below). Reuses the
  existing `LivenessCheck` (its captured dataURL → a `livenessMedia` file via
  `dataUrlToFile`).

### Verification wizard

Two-step stepper (1 → 2); each step submits separately to
`POST /me/doctor/verification`.

- **Step 1 · Path A (`pathType=credential`):** countryOfPractice, stateRegion,
  professionType, registrationNumber, highestQualification (all required) +
  licenseDoc (optional file). "Complete Path A" validates + submits, then
  auto-advances to Step 2. Back navigation to Step 1 allowed.
- **Step 2 · Path B (`pathType=document`):** aadhaarDoc, panDoc, workIdCard (single
  file each, required), workplaceContactNumber, workplaceLocation, contactNumber
  (required), workplaceName (optional), and the mandatory 3-second liveness scan
  → livenessMedia (+ livenessPassed). "Submit for verification" submits and sets
  status to **Pending**. Submit is disabled until required docs + liveness are
  present.
- **Status states:** Pending (after submit), Verified (badge), Rejected (show
  reason; resubmit restarts at Path A).

**Backend assumption (flagged):** Path A and Path B are separate POSTs to one
`doctor_verifications` row. The frontend assumes the backend **accumulates both**
(submitting Path B does not wipe Path A credential data) so the admin sees the
full submission. If the backend overwrites on `pathType`, it must be changed to
merge the two paths.

### Dashboard (reuse the edit-profile hub)

The screen header becomes the status dashboard, driven by `completion` +
`verification` from the hydrate payload:
- Overall completion **percent**.
- Per-section **complete / incomplete** (map `completion.sections` keys —
  `basicContact`, `education`, `workplace`, `professionalDetails`, `verification`
  for doctor; `basicContact`, `academics`, `experiences` for student;
  `basicContact`, `interests` for general — to the accordion sections).
- Verification banner: **Pending / Verified / Rejected** (+ rejection reason).

### Pure logic — `src/lib/profileForms.ts` (unit-tested)

Framework-free helpers, covered in `src/lib/__tests__/`:
- `prune(obj)` — drop empty strings / null / empty arrays before sending.
- `dataUrlToFile(dataUrl, name)` — convert the liveness still to a `File`.
- `buildVerificationFormData(pathType, state, files)` — assemble the multipart body
  for a path and report which required fields/files are missing.
- `completionForRole(role, completion)` — map backend section keys to the
  accordion section keys + done count (for the dashboard).

## Error handling

- Per-row Save/Delete show inline error text and keep the row editable on failure;
  a failed delete leaves the row intact.
- Locked fields (phone/email) render read-only with a short hint; never sent.
- Basic contact surfaces `403` (Google email change) and `409` (email in use) as
  field-level messages.
- Verification submit surfaces missing-upload `400`s ("Missing required
  upload(s): …") and disables Submit until requirements are met.
- File uploads show an inline error and keep the previous file on failure.

## Testing

- Unit tests (Vitest) for the `src/lib/profileForms.ts` helpers above.
- No component/DOM tests (out of scope; project has none).

## Files touched

- `src/lib/api.ts` — replace doctor/student blob endpoints with the new contract.
- `src/lib/profileForms.ts` (new) + `src/lib/__tests__/profileForms.test.ts` (new).
- `src/screens/EditProfile.tsx` — `full()` hydrate, dashboard header, role→sections
  map incl. General.
- `src/components/profile/fields.tsx` (new), `EditableList.tsx` (new),
  `MediaViewer.tsx` (new), `FileUpload.tsx` (new), `VerificationWizard.tsx` (new),
  `ProfileForms.tsx` (rewrite).
- `src/components/profile/LivenessCheck.tsx` — unchanged (already returns dataURL).

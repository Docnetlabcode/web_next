# Edit Profile Rework Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the edit-profile UI and the profile API layer so the fields, per-row CRUD, sequential two-step verification, universal file preview/replace, and dashboard status all match the role-based backend documented in `docs/profile.md`.

**Architecture:** A single `GET /profile/me/full` hydrates the whole screen. Multi-row sections (education, workplace, certificates, academics, experiences, interests) use one generic `EditableList` that persists each row immediately (POST/PATCH/DELETE). Every file/image goes through a reusable `FileUpload` + `MediaViewer` (thumbnail → fullscreen, remove, replace). Pure helpers live framework-free in `src/lib/profileForms.ts` and are unit-tested with Vitest.

**Tech Stack:** Next.js 14 App Router, React (`"use client"`), TypeScript (loose — `strict:false`, `ignoreBuildErrors`), Tailwind, axios (`dok` endpoint map), Vitest, lucide-react.

**Spec:** `docs/superpowers/specs/2026-06-17-edit-profile-rework-design.md`
**Backend contract:** `docs/profile.md`

---

## Conventions (read once)

- Screens/components import routing from `@/lib/router`, never `next/navigation`. `cn` from `@/lib/utils`.
- Reuse existing CSS utility classes: `input`, `btn-primary`, `btn-outline`, `card`, `chip`, `press`.
- API calls go through the `dok` map in `src/lib/api.ts`; `unwrap` already strips the `{statusCode,success,message,data}` envelope so callers get `data`.
- Tests are pure-logic only, in `src/lib/__tests__/`, run with `npm test` (Vitest, node env). No component/DOM tests.
- Files are `.tsx`/`.ts` with loose typing to match the codebase (no added generics needed).

## File structure (decomposition)

| File | Responsibility |
|---|---|
| `src/lib/profileForms.ts` (new) | Pure helpers: `prune`, `dataUrlToBlob`, `verificationMissing`, `completionForRole`, `ROLE_SECTION_KEYS`. |
| `src/lib/__tests__/profileForms.test.ts` (new) | Unit tests for the above. |
| `src/lib/api.ts` (modify) | Replace stale doctor/student blob endpoints with the new per-row CRUD + specialties + general interests + dual-path verification. |
| `src/components/profile/fields.tsx` (new) | Shared inputs/helpers: `Field, Text, Num, Area, Select, Toggle, Tags, SaveBar, useSave`. |
| `src/components/profile/MediaViewer.tsx` (new) | Fullscreen lightbox for image/PDF. |
| `src/components/profile/FileUpload.tsx` (new) | Reusable upload field (preview/fullscreen/remove/replace). |
| `src/components/profile/EditableList.tsx` (new) | Generic per-row CRUD list. |
| `src/components/profile/ProfileForms.tsx` (rewrite) | Thin section forms: BasicContact, DoctorEducation, DoctorWorkplace, DoctorProfessional, StudentAcademics, StudentExperiences, GeneralInterests. |
| `src/components/profile/VerificationWizard.tsx` (new) | Two-step doctor verification (Path A → Path B). |
| `src/screens/EditProfile.tsx` (rewrite) | Hydrate via `full()`, dashboard header, role→sections map (incl. General). |
| `src/components/profile/LivenessCheck.tsx` (unchanged) | Already returns a capture dataURL via `onComplete`. |

---

## Task 0: Branch

- [ ] **Step 1: Create a feature branch off `main`**

```bash
git checkout -b feat/edit-profile-rework
```

- [ ] **Step 2: Commit the already-written spec**

```bash
git add docs/superpowers/specs/2026-06-17-edit-profile-rework-design.md docs/superpowers/plans/2026-06-17-edit-profile-rework.md
git commit -m "docs: edit-profile rework spec + plan"
```

---

## Task 1: Pure helpers — `prune` + `completionForRole` + `ROLE_SECTION_KEYS`

**Files:**
- Create: `src/lib/profileForms.ts`
- Test: `src/lib/__tests__/profileForms.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/__tests__/profileForms.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { prune, completionForRole, ROLE_SECTION_KEYS } from "@/lib/profileForms";

describe("prune", () => {
  it("drops empty strings, null, undefined, and empty arrays", () => {
    expect(prune({ a: "x", b: "", c: null, d: undefined, e: [], f: [1], g: 0 }))
      .toEqual({ a: "x", f: [1], g: 0 });
  });
  it("keeps File/Blob and boolean false", () => {
    const blob = new Blob(["x"]);
    expect(prune({ file: blob, flag: false })).toEqual({ file: blob, flag: false });
  });
});

describe("ROLE_SECTION_KEYS", () => {
  it("lists sections per role", () => {
    expect(ROLE_SECTION_KEYS.doctor).toEqual(["basic", "education", "workplace", "professional", "verification"]);
    expect(ROLE_SECTION_KEYS.student).toEqual(["basic", "academics", "experiences"]);
    expect(ROLE_SECTION_KEYS.general_user).toEqual(["basic", "interests"]);
  });
});

describe("completionForRole", () => {
  it("maps backend section keys to internal keys and counts done", () => {
    const completion = {
      percent: 60,
      sections: { basicContact: true, education: true, workplace: false, professionalDetails: true, verification: false },
    };
    const r = completionForRole("doctor", completion);
    expect(r.sections).toEqual({ basic: true, education: true, workplace: false, professional: true, verification: false });
    expect(r.done).toBe(3);
    expect(r.total).toBe(5);
    expect(r.percent).toBe(60);
  });
  it("falls back to computed percent when none provided, defaults unknown role to general_user", () => {
    const r = completionForRole("general_user", { sections: { basicContact: true, interests: false } });
    expect(r.sections).toEqual({ basic: true, interests: false });
    expect(r.percent).toBe(50);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- profileForms`
Expected: FAIL — `Cannot find module '@/lib/profileForms'`.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/profileForms.ts`:

```ts
// Framework-free helpers for the edit-profile flow. Unit-tested in __tests__/profileForms.test.ts.

// Drop empty strings / null / undefined / empty arrays so we never send invalid fields to Joi.
export function prune(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj || {})) {
    if (v === "" || v === null || v === undefined) continue;
    if (Array.isArray(v) && v.length === 0) continue;
    out[k] = v;
  }
  return out;
}

// Internal section keys per role (drives both the accordion and the dashboard).
export const ROLE_SECTION_KEYS = {
  doctor: ["basic", "education", "workplace", "professional", "verification"],
  student: ["basic", "academics", "experiences"],
  general_user: ["basic", "interests"],
};

// Backend completion.sections keys → internal section keys (others map to themselves).
const SECTION_KEY_MAP = { basic: "basicContact", professional: "professionalDetails" };

export function completionForRole(role, completion) {
  const keys = ROLE_SECTION_KEYS[role] || ROLE_SECTION_KEYS.general_user;
  const backend = completion?.sections || {};
  const sections = {};
  let done = 0;
  for (const k of keys) {
    const complete = !!backend[SECTION_KEY_MAP[k] || k];
    sections[k] = complete;
    if (complete) done += 1;
  }
  const total = keys.length;
  const percent = completion?.percent ?? (total ? Math.round((done / total) * 100) : 0);
  return { sections, done, total, percent };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- profileForms`
Expected: PASS (prune, ROLE_SECTION_KEYS, completionForRole).

- [ ] **Step 5: Commit**

```bash
git add src/lib/profileForms.ts src/lib/__tests__/profileForms.test.ts
git commit -m "feat(profile): pure prune + completionForRole helpers"
```

---

## Task 2: Pure helpers — `dataUrlToBlob` + `verificationMissing`

**Files:**
- Modify: `src/lib/profileForms.ts`
- Test: `src/lib/__tests__/profileForms.test.ts`

- [ ] **Step 1: Add failing tests**

Append to `src/lib/__tests__/profileForms.test.ts`:

```ts
import { dataUrlToBlob, verificationMissing } from "@/lib/profileForms";

describe("dataUrlToBlob", () => {
  it("parses a base64 image data URL into a typed Blob", () => {
    // 1x1 transparent gif
    const url = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";
    const blob = dataUrlToBlob(url);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe("image/gif");
    expect(blob.size).toBeGreaterThan(0);
  });
  it("returns null for a non-data URL", () => {
    expect(dataUrlToBlob("https://x/y.jpg")).toBeNull();
    expect(dataUrlToBlob("")).toBeNull();
  });
});

describe("verificationMissing", () => {
  it("flags missing required credential fields (path A)", () => {
    const missing = verificationMissing("credential",
      { countryOfPractice: "India", stateRegion: "", professionType: "Cardiologist", registrationNumber: "MH1", highestQualification: "MD" },
      {});
    expect(missing).toEqual(["stateRegion"]);
  });
  it("path A ignores the optional licenseDoc", () => {
    const missing = verificationMissing("credential",
      { countryOfPractice: "India", stateRegion: "MH", professionType: "C", registrationNumber: "1", highestQualification: "MD" },
      {});
    expect(missing).toEqual([]);
  });
  it("flags missing required document files + text (path B)", () => {
    const missing = verificationMissing("document",
      { workplaceContactNumber: "123", workplaceLocation: "", contactNumber: "999" },
      { aadhaarDoc: new Blob(["a"]), panDoc: null, workIdCard: new Blob(["c"]), livenessMedia: null });
    expect(missing.sort()).toEqual(["livenessMedia", "panDoc", "workplaceLocation"].sort());
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- profileForms`
Expected: FAIL — `dataUrlToBlob`/`verificationMissing` not exported.

- [ ] **Step 3: Implement**

Append to `src/lib/profileForms.ts`:

```ts
// Convert a base64 data URL (e.g. the liveness still) into a typed Blob. null if not a data URL.
export function dataUrlToBlob(dataUrl) {
  if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:")) return null;
  const [head, body] = dataUrl.split(",");
  if (!body) return null;
  const type = (head.match(/data:([^;]+)/) || [])[1] || "application/octet-stream";
  const bin = atob(body);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type });
}

// Required fields/files per verification path. Returns the list of missing keys.
const VERIFICATION_REQUIRED = {
  credential: { text: ["countryOfPractice", "stateRegion", "professionType", "registrationNumber", "highestQualification"], files: [] },
  document: { text: ["workplaceContactNumber", "workplaceLocation", "contactNumber"], files: ["aadhaarDoc", "panDoc", "workIdCard", "livenessMedia"] },
};

export function verificationMissing(pathType, fields = {}, files = {}) {
  const req = VERIFICATION_REQUIRED[pathType] || { text: [], files: [] };
  const missing = [];
  for (const k of req.text) if (!String(fields[k] ?? "").trim()) missing.push(k);
  for (const k of req.files) if (!files[k]) missing.push(k);
  return missing;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- profileForms`
Expected: PASS (all blocks).

- [ ] **Step 5: Commit**

```bash
git add src/lib/profileForms.ts src/lib/__tests__/profileForms.test.ts
git commit -m "feat(profile): dataUrlToBlob + verificationMissing helpers"
```

---

## Task 3: API layer — new role-based profile endpoints

**Files:**
- Modify: `src/lib/api.ts` (helpers near line 88; `dok.profile` block lines ~125–135)

- [ ] **Step 1: Add `patchForm` + `profileList` helpers**

In `src/lib/api.ts`, immediately after the `postForm` definition (currently ends at line 88), add:

```ts
// PATCH multipart/form-data (let the browser set the multipart boundary).
const patchForm = (url, formData) =>
  unwrap(api.patch(url, formData, { headers: { "Content-Type": undefined } }));

// Generic per-row list CRUD (JSON) for the role-based profile lists.
const profileList = (base) => ({
  list: () => unwrap(api.get(base)),                          // { items: [...] }
  add: (b) => unwrap(api.post(base, b)),                      // { item }
  update: (id, b) => unwrap(api.patch(`${base}/${id}`, b)),   // { item }
  remove: (id) => unwrap(api.delete(`${base}/${id}`)),        // "Entry deleted."
});
```

- [ ] **Step 2: Replace the stale doctor/student endpoints**

In `src/lib/api.ts`, delete the block from `// Doctor sections` through the `studentSubmitVerification` line (the 10 lines: `doctorContact … studentSubmitVerification`) and replace with:

```ts
    // --- Role-based profile lists (docs/profile.md §3–5) ---
    education: profileList("/profile/me/doctor/education"),       // { organizationName*, departmentName?, startDate?, endDate? }
    workplace: profileList("/profile/me/doctor/workplace"),       // { role?, organizationName*, department?, startDate?, endDate? }
    academics: profileList("/profile/me/student/academics"),      // { collegeName*, program?, city?, currentYear?, expectedGraduationDate? }
    experiences: profileList("/profile/me/student/experiences"),  // { institution*, program?, city?, startDate?, endDate?, interests?[] }
    certificates: {
      list: () => unwrap(api.get("/profile/me/doctor/certificates")),
      add: ({ name, validationDate, file }) => {
        const f = new FormData();
        f.append("name", name);
        if (validationDate) f.append("validationDate", validationDate);
        if (file instanceof Blob) f.append("file", file); // only a freshly-picked file, never an existing URL
        return postForm("/profile/me/doctor/certificates", f);
      },
      update: (id, { name, validationDate, file }) => {
        const f = new FormData();
        if (name != null) f.append("name", name);
        if (validationDate != null) f.append("validationDate", validationDate);
        if (file instanceof Blob) f.append("file", file); // skip when file is an unchanged URL string
        return patchForm(`/profile/me/doctor/certificates/${id}`, f);
      },
      remove: (id) => unwrap(api.delete(`/profile/me/doctor/certificates/${id}`)),
    },
    interests: {
      list: () => unwrap(api.get("/profile/me/general/interests")),
      add: (topic) => unwrap(api.post("/profile/me/general/interests", { topic })), // 409 on duplicate
      remove: (id) => unwrap(api.delete(`/profile/me/general/interests/${id}`)),
    },
    doctorSpecialties: (specialties) => unwrap(api.put("/profile/me/doctor/specialties", { specialties })), // { specialties }
    // --- Doctor verification (dual-path, multipart, docs/profile.md §8) ---
    verificationGet: () => unwrap(api.get("/profile/me/doctor/verification")),       // { status, rejectionReason?, submission? }
    verificationSubmit: (formData) => postForm("/profile/me/doctor/verification", formData), // pathType=credential|document
```

- [ ] **Step 3: Verify nothing else references the removed endpoints**

Run: `npx rg -n "doctorContact|doctorEducation|doctorWorkplace|doctorProfessional|doctorDocument|doctorCertificates|doctorSubmitVerification|studentAcademic|studentSubmitVerification" src`
Expected: only matches inside `src/components/profile/ProfileForms.tsx` (rewritten in Task 7). No other files.

- [ ] **Step 4: Typecheck the file builds**

Run: `npm run build`
Expected: build succeeds (note: `ignoreBuildErrors` is on, so this mainly catches import/syntax errors).

- [ ] **Step 5: Commit**

```bash
git add src/lib/api.ts
git commit -m "feat(api): role-based profile lists, specialties, general interests, verification"
```

---

## Task 4: Shared inputs — `fields.tsx`

**Files:**
- Create: `src/components/profile/fields.tsx`

- [ ] **Step 1: Create the file**

Create `src/components/profile/fields.tsx` (extracted from the current ProfileForms shared inputs; `SaveBar` gains a `label` prop, `prune` now comes from `profileForms`):

```tsx
"use client";
import { useState } from "react";
import { X, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-ink-700">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-400">{hint}</span>}
    </label>
  );
}

export const Text = ({ value, onChange, ...p }) => (
  <input value={value ?? ""} onChange={(e) => onChange(e.target.value)} className="input" {...p} />
);

export const Num = ({ value, onChange, ...p }) => (
  <input type="number" value={value ?? ""} onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))} className="input" {...p} />
);

export const Area = ({ value, onChange, ...p }) => (
  <textarea value={value ?? ""} onChange={(e) => onChange(e.target.value)} rows={3} className="input resize-none" {...p} />
);

export function Select({ value, onChange, options = [], placeholder = "Select…" }) {
  return (
    <select value={value ?? ""} onChange={(e) => onChange(e.target.value)} className="input">
      <option value="">{placeholder}</option>
      {options.map((o) => (typeof o === "string" ? <option key={o} value={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>))}
    </select>
  );
}

export function Toggle({ label, desc, value, onChange }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1">
        <p className="text-sm font-semibold text-ink-900">{label}</p>
        {desc && <p className="text-xs text-ink-500">{desc}</p>}
      </div>
      <button type="button" onClick={() => onChange(!value)} className={cn("relative h-6 w-11 rounded-full transition", value ? "bg-brand-600" : "bg-ink-900/15")}>
        <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", value ? "left-[1.4rem]" : "left-0.5")} />
      </button>
    </div>
  );
}

export function Tags({ value = [], onChange, placeholder = "Type and press Enter" }) {
  const [draft, setDraft] = useState("");
  const add = () => { const v = draft.trim(); if (v && !value.includes(v)) onChange([...value, v]); setDraft(""); };
  return (
    <div>
      {value.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {value.map((t) => (
            <span key={t} className="chip bg-brand-50 text-brand-700">{t}
              <button type="button" onClick={() => onChange(value.filter((x) => x !== t))} className="ml-1 text-brand-500 hover:text-brand-800"><X size={12} /></button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} placeholder={placeholder} className="input flex-1" />
        <button type="button" onClick={add} className="btn-outline px-3"><Plus size={16} /></button>
      </div>
    </div>
  );
}

export function SaveBar({ onSave, saving, err, ok, label = "Save section" }) {
  return (
    <div className="pt-1">
      {err && <p className="mb-2 text-sm text-rose-600">{err}</p>}
      {ok && <p className="mb-2 text-sm text-emerald-600">Saved ✓</p>}
      <button onClick={onSave} disabled={saving} className="btn-primary w-full py-3 text-sm">{saving ? "Saving…" : label}</button>
    </div>
  );
}

// Wraps a save call: manages saving/err/ok + calls onSaved() to refresh the hub.
export function useSave(onSaved) {
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState(false);
  const run = async (fn) => {
    setErr(""); setOk(false); setSaving(true);
    try { await fn(); setOk(true); onSaved?.(); }
    catch (e) { setErr(e?.response?.data?.message || "Couldn't save. Please try again."); }
    finally { setSaving(false); }
  };
  return { saving, err, ok, run };
}

export const dateInput = (d) => (d ? String(d).slice(0, 10) : "");
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: success.

- [ ] **Step 3: Commit**

```bash
git add src/components/profile/fields.tsx
git commit -m "feat(profile): shared field inputs in fields.tsx"
```

---

## Task 5: `MediaViewer` + `FileUpload`

**Files:**
- Create: `src/components/profile/MediaViewer.tsx`
- Create: `src/components/profile/FileUpload.tsx`

- [ ] **Step 1: Create `MediaViewer.tsx`**

```tsx
"use client";
import { createPortal } from "react-dom";
import { X, ExternalLink } from "lucide-react";

// Fullscreen lightbox. kind: "image" | "pdf".
export default function MediaViewer({ src, kind = "image", onClose }) {
  return createPortal(
    <div className="fixed inset-0 z-[96] flex flex-col bg-ink-900/95 backdrop-blur animate-fade-in" onClick={onClose}>
      <div className="flex justify-end p-4">
        <button onClick={onClose} className="press rounded-full p-2 text-white hover:bg-white/10"><X size={24} /></button>
      </div>
      <div className="flex flex-1 items-center justify-center overflow-auto p-4" onClick={(e) => e.stopPropagation()}>
        {kind === "pdf" ? (
          <div className="flex h-full w-full max-w-3xl flex-col">
            <iframe src={src} title="Document" className="h-full w-full rounded-xl bg-white" />
            <a href={src} target="_blank" rel="noreferrer" className="btn-outline mt-3 inline-flex items-center justify-center gap-2 border-white/30 text-white hover:bg-white/10"><ExternalLink size={16} /> Open in new tab</a>
          </div>
        ) : (
          <img src={src} alt="Preview" className="max-h-full max-w-full rounded-xl object-contain" />
        )}
      </div>
    </div>,
    document.body
  );
}
```

- [ ] **Step 2: Create `FileUpload.tsx`**

```tsx
"use client";
import { useEffect, useRef, useState } from "react";
import { Upload, FileText, Eye, RefreshCw, Trash2 } from "lucide-react";
import MediaViewer from "./MediaViewer";

const urlKind = (url) => (/\.pdf($|\?)/i.test(url) ? "pdf" : "image");

// Reusable upload field. `value` is a Blob/File (local) OR a remote URL string OR null.
// Emits onChange(file | null). disabled hides remove/replace (read-only).
export default function FileUpload({ value, onChange, label, accept = "image/*,application/pdf", disabled }) {
  const ref = useRef(null);
  const [preview, setPreview] = useState(""); // object URL for Blob values
  const [viewer, setViewer] = useState(false);

  useEffect(() => {
    if (value instanceof Blob) {
      const url = URL.createObjectURL(value);
      setPreview(url);
      return () => URL.revokeObjectURL(url);
    }
    setPreview("");
  }, [value]);

  const has = value instanceof Blob || (typeof value === "string" && value);
  const src = value instanceof Blob ? preview : typeof value === "string" ? value : "";
  const kind = value instanceof Blob ? (value.type?.startsWith("image/") ? "image" : "pdf") : typeof value === "string" ? urlKind(value) : "image";
  const name = (value instanceof Blob && value.name) || (typeof value === "string" ? value.split("/").pop() : "") || "Uploaded file";

  const pick = (e) => { const f = e.target.files?.[0]; if (f) onChange(f); e.target.value = ""; };

  if (!has) {
    return (
      <>
        <button type="button" disabled={disabled} onClick={() => ref.current?.click()}
          className="flex w-full items-center gap-3 rounded-xl border-2 border-dashed border-ink-900/15 p-3 text-left transition hover:border-brand-300 disabled:opacity-50">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-ink-900/[.04] text-ink-500"><Upload size={18} /></span>
          <span className="flex-1">
            <span className="block text-sm font-semibold text-ink-900">{label || "Upload file"}</span>
            <span className="block text-xs text-ink-400">Tap to upload (image / PDF)</span>
          </span>
        </button>
        <input ref={ref} type="file" accept={accept} hidden onChange={pick} />
      </>
    );
  }

  return (
    <>
      <div className="flex items-center gap-3 rounded-xl border-2 border-emerald-300 bg-emerald-50 p-3">
        <button type="button" onClick={() => setViewer(true)} className="press grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-white">
          {kind === "image" && src ? <img src={src} alt="" className="h-full w-full object-cover" /> : <FileText size={20} className="text-ink-500" />}
        </button>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-ink-900">{name}</span>
          <button type="button" onClick={() => setViewer(true)} className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700"><Eye size={12} /> View full screen</button>
        </span>
        {!disabled && (
          <div className="flex shrink-0 items-center gap-1">
            <button type="button" onClick={() => ref.current?.click()} title="Replace" className="press grid h-8 w-8 place-items-center rounded-lg text-ink-500 hover:bg-white"><RefreshCw size={15} /></button>
            <button type="button" onClick={() => onChange(null)} title="Remove" className="press grid h-8 w-8 place-items-center rounded-lg text-rose-500 hover:bg-white"><Trash2 size={15} /></button>
          </div>
        )}
      </div>
      <input ref={ref} type="file" accept={accept} hidden onChange={pick} />
      {viewer && src && <MediaViewer src={src} kind={kind} onClose={() => setViewer(false)} />}
    </>
  );
}
```

- [ ] **Step 3: Build + commit**

```bash
npm run build
git add src/components/profile/MediaViewer.tsx src/components/profile/FileUpload.tsx
git commit -m "feat(profile): MediaViewer lightbox + reusable FileUpload"
```

Expected: build succeeds.

---

## Task 6: Generic `EditableList`

**Files:**
- Create: `src/components/profile/EditableList.tsx`

- [ ] **Step 1: Create the file**

```tsx
"use client";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Field, Text, Area, Tags, SaveBar } from "./fields";
import FileUpload from "./FileUpload";
import { prune } from "@/lib/profileForms";

let _uid = 0;
const uid = () => `tmp_${++_uid}`;
const stripMeta = ({ _id, _new, _key, ...rest }) => rest;

// fields: [{ key, label, type?: "text"|"date"|"area"|"tags"|"file", placeholder?, required? }]
function RowField({ f, value, onChange }) {
  if (f.type === "area") return <Area value={value} onChange={onChange} placeholder={f.placeholder} />;
  if (f.type === "tags") return <Tags value={value || []} onChange={onChange} placeholder={f.placeholder || "Type and press Enter"} />;
  if (f.type === "file") return <FileUpload value={value} onChange={onChange} label={f.label} />;
  if (f.type === "date") return <Text type="date" value={value} onChange={onChange} />;
  return <Text value={value} onChange={onChange} placeholder={f.placeholder} />;
}

function RowCard({ index, row, fields, itemLabel, onField, crud, onSaved, onRemoved }) {
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState(false);

  const save = async () => {
    setErr(""); setOk(false);
    const body = prune(stripMeta(row));
    const missing = fields.find((f) => f.required && !body[f.key]);
    if (missing) { setErr(`${missing.label} is required.`); return; }
    setSaving(true);
    try {
      const res = row._new ? await crud.add(body) : await crud.update(row._id, body);
      setOk(true);
      onSaved(res?.item || res || {});
    } catch (e) {
      setErr(e?.response?.data?.message || "Couldn't save. Please try again.");
    } finally { setSaving(false); }
  };

  const remove = async () => {
    if (row._new) { onRemoved(); return; }
    setErr(""); setSaving(true);
    try { await crud.remove(row._id); onRemoved(); }
    catch (e) { setErr(e?.response?.data?.message || "Couldn't delete."); setSaving(false); }
  };

  return (
    <div className="rounded-2xl border border-ink-900/10 p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wide text-ink-400">{itemLabel} {index + 1}</span>
        <button type="button" onClick={remove} disabled={saving} className="text-rose-500 hover:text-rose-700"><Trash2 size={15} /></button>
      </div>
      <div className="space-y-3">
        {fields.map((f) => (
          <Field key={f.key} label={f.label + (f.required ? " *" : "")} hint={f.hint}>
            <RowField f={f} value={row[f.key]} onChange={(v) => onField(f.key, v)} />
          </Field>
        ))}
      </div>
      <div className="mt-3"><SaveBar onSave={save} saving={saving} err={err} ok={ok} label={row._new ? "Save" : "Update"} /></div>
    </div>
  );
}

export default function EditableList({ itemLabel, addLabel, items = [], blank, fields, crud, onChanged, max = 25 }) {
  const [rows, setRows] = useState(() => (items || []).map((it) => ({ ...blank, ...it, _id: it.id, _key: it.id || uid() })));
  const setRow = (key, patch) => setRows((l) => l.map((r) => (r._key === key ? { ...r, ...patch } : r)));
  const addRow = () => setRows((l) => [...l, { ...blank, _new: true, _key: uid() }]);

  return (
    <div className="space-y-4">
      {rows.length === 0 && <p className="text-sm text-ink-400">Nothing added yet.</p>}
      {rows.map((row, i) => (
        <RowCard
          key={row._key}
          index={i}
          row={row}
          fields={fields}
          itemLabel={itemLabel}
          onField={(k, v) => setRow(row._key, { [k]: v })}
          crud={crud}
          onSaved={(item) => { setRow(row._key, { ...item, _id: item.id, _new: false }); onChanged?.(); }}
          onRemoved={() => { setRows((l) => l.filter((r) => r._key !== row._key)); onChanged?.(); }}
        />
      ))}
      {rows.length < max && (
        <button type="button" onClick={addRow} className="btn-outline w-full py-2.5 text-sm"><Plus size={16} /> {addLabel || `Add ${itemLabel?.toLowerCase() || "entry"}`}</button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Build + commit**

```bash
npm run build
git add src/components/profile/EditableList.tsx
git commit -m "feat(profile): generic per-row EditableList"
```

Expected: build succeeds.

---

## Task 7: Rewrite `ProfileForms.tsx` (section forms)

**Files:**
- Rewrite: `src/components/profile/ProfileForms.tsx`

This file becomes thin: BasicContact + the role list sections + GeneralInterests. Verification moves to Task 8.

- [ ] **Step 1: Replace the whole file**

```tsx
"use client";
import { useState } from "react";
import { dok } from "@/lib/api";
import { prune } from "@/lib/profileForms";
import { Field, Text, Num, Area, Select, Tags, SaveBar, useSave, dateInput } from "./fields";
import EditableList from "./EditableList";
import { X } from "lucide-react";

const GENDERS = [
  { value: "male", label: "Male" }, { value: "female", label: "Female" },
  { value: "other", label: "Other" }, { value: "prefer_not_to_say", label: "Prefer not to say" },
];

/* ───────── Basic Contact (role-aware) ───────── */

export function BasicContactForm({ user, role, locks = {}, onSaved }) {
  const { saving, err, ok, run } = useSave(onSaved);
  const [f, setF] = useState({
    fullName: user.fullName || "",
    professionalHeadline: user.professionalHeadline || user.headline || "",
    gender: user.gender || "",
    specialization: user.specialization || "",
    degree: user.degree || "",
    dateOfBirth: dateInput(user.dateOfBirth),
    age: user.age ?? "",
    workEmail: user.workEmail || "",
    email: user.email || "",
    city: user.city || "",
    workPhone: user.workPhone || "",
    languages: user.languages || [],
    bio: user.bio || "",
  });
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }));

  // Personal email/phone come from auth and may be locked; phone is never sent.
  const emailLocked = !!locks.personalEmailLocked;
  const phoneLocked = !!locks.personalPhoneLocked;

  const save = () => run(() => {
    const payload = prune({
      fullName: f.fullName, professionalHeadline: f.professionalHeadline, gender: f.gender,
      dateOfBirth: f.dateOfBirth, city: f.city, languages: f.languages, bio: f.bio,
      workEmail: f.workEmail,
      ...(role === "doctor" ? { specialization: f.specialization, workPhone: f.workPhone } : {}),
      ...(role === "student" ? { degree: f.degree } : {}),
      ...(role === "general_user" ? { age: f.age } : {}),
      ...(emailLocked ? {} : { email: f.email }), // omit personal email when locked (Google)
    });
    return dok.profile.updateBasic(payload);
  });

  return (
    <div className="space-y-4">
      <Field label="Full name"><Text value={f.fullName} onChange={set("fullName")} placeholder="Your full name" /></Field>
      <Field label="Headline" hint="Shown under your name"><Text value={f.professionalHeadline} onChange={set("professionalHeadline")} placeholder="e.g. Interventional Cardiologist" /></Field>

      <div className="grid gap-4 sm:grid-cols-2">
        {role !== "general_user" && <Field label="Gender"><Select value={f.gender} onChange={set("gender")} options={GENDERS} /></Field>}
        {role === "doctor" && <Field label="Specialization"><Text value={f.specialization} onChange={set("specialization")} placeholder="Cardiology" /></Field>}
        {role === "student" && <Field label="Degree"><Text value={f.degree} onChange={set("degree")} placeholder="MBBS" /></Field>}
        <Field label="Date of birth"><Text type="date" value={f.dateOfBirth} onChange={set("dateOfBirth")} /></Field>
        {role === "general_user" && <Field label="Age"><Num value={f.age} onChange={set("age")} placeholder="32" /></Field>}
        <Field label="City"><Text value={f.city} onChange={set("city")} placeholder="Mumbai" /></Field>
      </div>

      {/* Contact: work + personal email/phone */}
      {role === "doctor" && <Field label="Work email"><Text type="email" value={f.workEmail} onChange={set("workEmail")} placeholder="you@hospital.org" /></Field>}
      {role === "student" && <Field label="College email"><Text type="email" value={f.workEmail} onChange={set("workEmail")} placeholder="you@college.edu" /></Field>}
      <Field label="Personal email" hint={emailLocked ? "Used to sign in (Google) — can't be changed" : undefined}>
        <Text type="email" value={f.email} onChange={set("email")} placeholder="you@personal.com" disabled={emailLocked} />
      </Field>
      <Field label="Personal phone" hint={phoneLocked ? "Used to sign in — can't be changed" : "Set during signup"}>
        <Text value={user.phoneNumber || ""} onChange={() => {}} placeholder="—" disabled />
      </Field>
      {role === "doctor" && <Field label="Work phone"><Text value={f.workPhone} onChange={set("workPhone")} placeholder="+91 22 5555 1234" /></Field>}

      <Field label="Languages"><Tags value={f.languages} onChange={set("languages")} placeholder="Add a language" /></Field>
      <Field label="About"><Area value={f.bio} onChange={set("bio")} placeholder="A short bio…" /></Field>
      <SaveBar onSave={save} saving={saving} err={err} ok={ok} />
    </div>
  );
}

/* ───────── Doctor: Education ───────── */

export function DoctorEducation({ doctor, onChanged }) {
  return (
    <EditableList
      itemLabel="Education" addLabel="Add education" onChanged={onChanged}
      items={doctor?.education || []}
      blank={{ organizationName: "", departmentName: "", startDate: "", endDate: "" }}
      crud={dok.profile.education}
      fields={[
        { key: "organizationName", label: "Organization name", required: true, placeholder: "AIIMS New Delhi" },
        { key: "departmentName", label: "Department / unit", placeholder: "Dept. of Cardiology" },
        { key: "startDate", label: "Start date", type: "date" },
        { key: "endDate", label: "End date", type: "date" },
      ]}
    />
  );
}

/* ───────── Doctor: Workplace ───────── */

export function DoctorWorkplace({ doctor, onChanged }) {
  return (
    <EditableList
      itemLabel="Workplace" addLabel="Add workplace" onChanged={onChanged}
      items={doctor?.workplace || []}
      blank={{ role: "", organizationName: "", department: "", startDate: "", endDate: "" }}
      crud={dok.profile.workplace}
      fields={[
        { key: "role", label: "Role / designation", placeholder: "Senior Cardiologist" },
        { key: "organizationName", label: "Organization name", required: true, placeholder: "Apollo Hospital" },
        { key: "department", label: "Department", placeholder: "Cardiology" },
        { key: "startDate", label: "Start date", type: "date" },
        { key: "endDate", label: "End date", type: "date", hint: "Leave blank if current" },
      ]}
    />
  );
}

/* ───────── Doctor: Professional (specialties + certificates) ───────── */

export function DoctorProfessional({ doctor, onChanged }) {
  const { saving, err, ok, run } = useSave(onChanged);
  const [specialties, setSpecialties] = useState(doctor?.specialties || []);
  const saveSpecialties = () => run(() => dok.profile.doctorSpecialties(specialties));

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Field label="Specialties"><Tags value={specialties} onChange={setSpecialties} placeholder="Add a specialty" /></Field>
        <SaveBar onSave={saveSpecialties} saving={saving} err={err} ok={ok} label="Save specialties" />
      </div>
      <div>
        <p className="mb-2 text-sm font-bold text-ink-900">Certificates</p>
        <EditableList
          itemLabel="Certificate" addLabel="Add certificate" onChanged={onChanged}
          items={(doctor?.certificates || []).map((c) => ({ ...c, validationDate: c.validationDate ? String(c.validationDate).slice(0, 10) : "", file: c.file ?? c.fileUrl ?? null }))}
          blank={{ name: "", validationDate: "", file: null }}
          crud={dok.profile.certificates}
          fields={[
            { key: "name", label: "Certificate name", required: true, placeholder: "ACLS" },
            { key: "validationDate", label: "Validation date", type: "date" },
            { key: "file", label: "Certificate file", type: "file", hint: "Image or PDF (optional)" },
          ]}
        />
      </div>
    </div>
  );
}

/* ───────── Student: Academics ───────── */

export function StudentAcademics({ student, onChanged }) {
  return (
    <EditableList
      itemLabel="College" addLabel="Add college" onChanged={onChanged}
      items={student?.academics || []}
      blank={{ collegeName: "", program: "", city: "", currentYear: "", expectedGraduationDate: "" }}
      crud={dok.profile.academics}
      fields={[
        { key: "collegeName", label: "College / school name", required: true, placeholder: "AIIMS New Delhi" },
        { key: "program", label: "Program", placeholder: "MBBS" },
        { key: "city", label: "City", placeholder: "New Delhi" },
        { key: "currentYear", label: "Current year of study", placeholder: "3rd Year" },
        { key: "expectedGraduationDate", label: "Expected graduation date", type: "date" },
      ]}
    />
  );
}

/* ───────── Student: Experience & Interest ───────── */

export function StudentExperiences({ student, onChanged }) {
  return (
    <EditableList
      itemLabel="Experience" addLabel="Add experience" onChanged={onChanged}
      items={student?.experiences || []}
      blank={{ institution: "", program: "", city: "", startDate: "", endDate: "", interests: [] }}
      crud={dok.profile.experiences}
      fields={[
        { key: "institution", label: "Institution / college name", required: true, placeholder: "Apollo Hospital" },
        { key: "program", label: "Program", placeholder: "Clinical rotation" },
        { key: "city", label: "City", placeholder: "Chennai" },
        { key: "startDate", label: "Start date", type: "date" },
        { key: "endDate", label: "End date", type: "date" },
        { key: "interests", label: "Interests", type: "tags", placeholder: "e.g. Surgery" },
      ]}
    />
  );
}

/* ───────── General: Clinic Interests ───────── */

export function GeneralInterests({ general, onChanged }) {
  const [items, setItems] = useState(general?.interests || []);
  const [draft, setDraft] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const add = async () => {
    const topic = draft.trim();
    if (!topic) return;
    setErr(""); setBusy(true);
    try {
      const res = await dok.profile.interests.add(topic);
      setItems((l) => [...l, res?.item || res]);
      setDraft(""); onChanged?.();
    } catch (e) { setErr(e?.response?.data?.message || "Couldn't add (maybe a duplicate)."); }
    finally { setBusy(false); }
  };
  const remove = async (id) => {
    try { await dok.profile.interests.remove(id); setItems((l) => l.filter((x) => x.id !== id)); onChanged?.(); }
    catch (e) { setErr(e?.response?.data?.message || "Couldn't remove."); }
  };

  return (
    <div className="space-y-3">
      {items.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {items.map((it) => (
            <span key={it.id} className="chip bg-brand-50 text-brand-700">{it.topic}
              <button type="button" onClick={() => remove(it.id)} className="ml-1 text-brand-500 hover:text-brand-800"><X size={12} /></button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} placeholder="Add a health topic" className="input flex-1" />
        <button type="button" onClick={add} disabled={busy} className="btn-outline px-4">Add</button>
      </div>
      {err && <p className="text-sm text-rose-600">{err}</p>}
    </div>
  );
}
```

- [ ] **Step 2: Build + commit**

```bash
npm run build
git add src/components/profile/ProfileForms.tsx
git commit -m "feat(profile): rewrite section forms for new backend"
```

Expected: build succeeds.

---

## Task 8: `VerificationWizard` (Path A → Path B)

**Files:**
- Create: `src/components/profile/VerificationWizard.tsx`

- [ ] **Step 1: Create the file**

```tsx
"use client";
import { useEffect, useState } from "react";
import { ShieldCheck, ScanFace, Check, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { dok } from "@/lib/api";
import { dataUrlToBlob, verificationMissing } from "@/lib/profileForms";
import { Field, Text } from "./fields";
import FileUpload from "./FileUpload";
import MediaViewer from "./MediaViewer";
import LivenessCheck from "./LivenessCheck";

const STATUS_LABEL = {
  not_submitted: { text: "Not started", cls: "bg-ink-900/5 text-ink-600" },
  pending: { text: "Pending review", cls: "bg-amber-50 text-amber-700" },
  verified: { text: "Verified", cls: "bg-emerald-50 text-emerald-700" },
  rejected: { text: "Rejected", cls: "bg-rose-50 text-rose-700" },
};

const labelFor = (k) => ({
  countryOfPractice: "Country of practice", stateRegion: "State / region", professionType: "Profession type",
  registrationNumber: "Registration number", highestQualification: "Highest qualification",
  aadhaarDoc: "Aadhaar / Gov-ID", panDoc: "PAN card", workIdCard: "Work ID card", livenessMedia: "Liveness scan",
  workplaceContactNumber: "Workplace contact number", workplaceLocation: "Workplace location", contactNumber: "Your contact number",
}[k] || k);

export default function VerificationWizard({ onChanged }) {
  const [status, setStatus] = useState("not_submitted");
  const [rejection, setRejection] = useState("");
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // Path A (credential)
  const [a, setA] = useState({ countryOfPractice: "", stateRegion: "", professionType: "", registrationNumber: "", highestQualification: "" });
  const [licenseDoc, setLicenseDoc] = useState(null);
  const setAk = (k) => (v) => setA((s) => ({ ...s, [k]: v }));

  // Path B (document + liveness)
  const [b, setB] = useState({ workplaceName: "", workplaceContactNumber: "", workplaceLocation: "", contactNumber: "" });
  const [aadhaarDoc, setAadhaar] = useState(null);
  const [panDoc, setPan] = useState(null);
  const [workIdCard, setWorkId] = useState(null);
  const [livenessBlob, setLivenessBlob] = useState(null);
  const [scanOpen, setScanOpen] = useState(false);
  const [livenessView, setLivenessView] = useState(false);
  const setBk = (k) => (v) => setB((s) => ({ ...s, [k]: v }));

  useEffect(() => {
    dok.profile.verificationGet()
      .then((d) => { setStatus(d?.status || "not_submitted"); setRejection(d?.rejectionReason || ""); })
      .catch(() => {});
  }, []);

  const submitA = async () => {
    setErr("");
    const missing = verificationMissing("credential", a, {});
    if (missing.length) { setErr(`${labelFor(missing[0])} is required.`); return; }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("pathType", "credential");
      Object.entries(a).forEach(([k, v]) => v && fd.append(k, v));
      if (licenseDoc instanceof Blob) fd.append("licenseDoc", licenseDoc, licenseDoc.name || "license");
      await dok.profile.verificationSubmit(fd);
      setStep(2);
    } catch (e) { setErr(e?.response?.data?.message || "Couldn't submit Path A."); }
    finally { setBusy(false); }
  };

  const submitB = async () => {
    setErr("");
    const files = { aadhaarDoc, panDoc, workIdCard, livenessMedia: livenessBlob };
    const missing = verificationMissing("document", b, files);
    if (missing.length) { setErr(`${labelFor(missing[0])} is required.`); return; }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("pathType", "document");
      Object.entries(b).forEach(([k, v]) => v && fd.append(k, v));
      fd.append("aadhaarDoc", aadhaarDoc, aadhaarDoc.name || "aadhaar");
      fd.append("panDoc", panDoc, panDoc.name || "pan");
      fd.append("workIdCard", workIdCard, workIdCard.name || "workid");
      fd.append("livenessMedia", livenessBlob, "liveness.jpg");
      fd.append("livenessPassed", "true");
      await dok.profile.verificationSubmit(fd);
      setStatus("pending");
      onChanged?.();
    } catch (e) { setErr(e?.response?.data?.message || "Couldn't submit Path B."); }
    finally { setBusy(false); }
  };

  const label = STATUS_LABEL[status] || STATUS_LABEL.not_submitted;
  const submitted = status === "pending" || status === "verified";

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-2xl bg-brand-50 p-4">
        <ShieldCheck size={22} className="mt-0.5 text-brand-600" />
        <div className="flex-1">
          <p className="flex items-center gap-2 text-sm font-bold text-brand-800">Verification <span className={cn("chip text-[10px]", label.cls)}>{label.text}</span></p>
          <p className="mt-0.5 text-sm text-brand-700/80">Complete Path A, then Path B. Submissions are reviewed by our team.</p>
          {status === "rejected" && rejection && <p className="mt-1 text-sm text-rose-600">Reason: {rejection}</p>}
        </div>
      </div>

      {submitted ? (
        <p className="rounded-xl bg-ink-900/[.03] p-4 text-center text-sm text-ink-500">
          {status === "verified" ? "Your profile is verified ✓" : "Your submission is pending review."}
        </p>
      ) : (
        <>
          {/* stepper */}
          <div className="flex items-center gap-2 text-xs font-semibold">
            <span className={cn("rounded-full px-3 py-1", step === 1 ? "bg-brand-600 text-white" : "bg-emerald-50 text-emerald-700")}>1 · Credential</span>
            <span className="h-px flex-1 bg-ink-900/10" />
            <span className={cn("rounded-full px-3 py-1", step === 2 ? "bg-brand-600 text-white" : "bg-ink-900/5 text-ink-500")}>2 · Documents</span>
          </div>

          {step === 1 ? (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Country of practice *"><Text value={a.countryOfPractice} onChange={setAk("countryOfPractice")} placeholder="India" /></Field>
                <Field label="State / region *"><Text value={a.stateRegion} onChange={setAk("stateRegion")} placeholder="Maharashtra" /></Field>
                <Field label="Profession type *"><Text value={a.professionType} onChange={setAk("professionType")} placeholder="Cardiologist" /></Field>
                <Field label="Registration number *"><Text value={a.registrationNumber} onChange={setAk("registrationNumber")} placeholder="MH-2014-55821" /></Field>
              </div>
              <Field label="Highest qualification *"><Text value={a.highestQualification} onChange={setAk("highestQualification")} placeholder="DM Cardiology" /></Field>
              <Field label="License document" hint="Image or PDF (optional)"><FileUpload value={licenseDoc} onChange={setLicenseDoc} label="License document" /></Field>
              {err && <p className="text-sm text-rose-600">{err}</p>}
              <button onClick={submitA} disabled={busy} className="btn-primary w-full py-3 text-sm">{busy ? "Submitting…" : "Complete Path A →"}</button>
            </div>
          ) : (
            <div className="space-y-3">
              <button onClick={() => setStep(1)} className="flex items-center gap-1 text-sm text-ink-500 hover:text-brand-700"><ArrowLeft size={15} /> Back to Path A</button>
              <Field label="Aadhaar / Government ID *"><FileUpload value={aadhaarDoc} onChange={setAadhaar} label="Aadhaar / Gov-ID" /></Field>
              <Field label="PAN card *"><FileUpload value={panDoc} onChange={setPan} label="PAN card" /></Field>
              <Field label="Work ID card *"><FileUpload value={workIdCard} onChange={setWorkId} label="Work ID card" /></Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Workplace name"><Text value={b.workplaceName} onChange={setBk("workplaceName")} placeholder="Lilavati Hospital" /></Field>
                <Field label="Workplace contact number *"><Text value={b.workplaceContactNumber} onChange={setBk("workplaceContactNumber")} placeholder="+91 22 5555 1234" /></Field>
                <Field label="Workplace location *"><Text value={b.workplaceLocation} onChange={setBk("workplaceLocation")} placeholder="Bandra, Mumbai" /></Field>
                <Field label="Your contact number *"><Text value={b.contactNumber} onChange={setBk("contactNumber")} placeholder="+91 98765 43210" /></Field>
              </div>

              {/* liveness */}
              <div className={cn("flex items-center gap-3 rounded-xl border-2 p-3", livenessBlob ? "border-emerald-300 bg-emerald-50" : "border-ink-900/15")}>
                <button type="button" onClick={() => livenessBlob && setLivenessView(true)} className={cn("grid h-10 w-10 place-items-center overflow-hidden rounded-xl", livenessBlob ? "bg-emerald-100 text-emerald-600" : "bg-ink-900/[.04] text-ink-500")}>
                  {livenessBlob ? <Check size={18} /> : <ScanFace size={18} />}
                </button>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-ink-900">Liveness check *</p>
                  <p className="text-xs text-ink-400">{livenessBlob ? "Captured ✓ — tap icon to view" : "3-second live face scan (required)"}</p>
                </div>
                <button type="button" onClick={() => setScanOpen(true)} className="btn-outline px-3 py-2 text-xs">{livenessBlob ? "Re-scan" : "Start"}</button>
              </div>

              {err && <p className="text-sm text-rose-600">{err}</p>}
              <button onClick={submitB} disabled={busy} className="btn-primary w-full py-3 text-sm">{busy ? "Submitting…" : "Submit for verification"}</button>
            </div>
          )}
        </>
      )}

      {scanOpen && (
        <LivenessCheck
          onClose={() => setScanOpen(false)}
          onComplete={(dataUrl) => { setLivenessBlob(dataUrlToBlob(dataUrl)); setScanOpen(false); }}
        />
      )}
      {livenessView && livenessBlob && (
        <MediaViewer src={URL.createObjectURL(livenessBlob)} kind="image" onClose={() => setLivenessView(false)} />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Build + commit**

```bash
npm run build
git add src/components/profile/VerificationWizard.tsx
git commit -m "feat(profile): two-step verification wizard with liveness"
```

Expected: build succeeds.

---

## Task 9: Rewrite `EditProfile.tsx` (hydrate + dashboard + role maps)

**Files:**
- Rewrite: `src/screens/EditProfile.tsx`

- [ ] **Step 1: Replace the whole file**

```tsx
"use client";
import { useEffect, useState } from "react";
import { useNavigate } from "@/lib/router";
import { User, GraduationCap, Briefcase, Stethoscope, BadgeCheck, Heart, ChevronDown, Check, ArrowLeft, Camera } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Spinner, Avatar } from "@/components/ui/Primitives";
import { useAuth } from "@/context/AuthContext";
import { dok } from "@/lib/api";
import { cn } from "@/lib/utils";
import { ROLE_SECTION_KEYS, completionForRole } from "@/lib/profileForms";
import PhotoUploader from "@/components/profile/PhotoUploader";
import VerificationWizard from "@/components/profile/VerificationWizard";
import {
  BasicContactForm, DoctorEducation, DoctorWorkplace, DoctorProfessional,
  StudentAcademics, StudentExperiences, GeneralInterests,
} from "@/components/profile/ProfileForms";

const SECTION_META = {
  basic: { title: "Basic Contact", icon: User },
  education: { title: "Education", icon: GraduationCap },
  workplace: { title: "Workplace", icon: Briefcase },
  professional: { title: "Professional Details", icon: Stethoscope },
  verification: { title: "Verification (KYC)", icon: BadgeCheck },
  academics: { title: "Academic Details", icon: GraduationCap },
  experiences: { title: "Experience & Interest", icon: Briefcase },
  interests: { title: "Clinic Interests", icon: Heart },
};

const VERIFICATION_BANNER = {
  pending: { text: "Verification pending review", cls: "bg-amber-50 text-amber-700" },
  verified: { text: "Verified", cls: "bg-emerald-50 text-emerald-700" },
  rejected: { text: "Verification rejected — please resubmit", cls: "bg-rose-50 text-rose-700" },
};

export default function EditProfile() {
  const { user: authUser, demo, updateUser } = useAuth();
  const nav = useNavigate();
  const [data, setData] = useState(null); // full payload
  const [open, setOpen] = useState("basic");
  const [uploader, setUploader] = useState(null);
  const [loading, setLoading] = useState(!demo);

  const load = async () => {
    const full = await dok.profile.full();
    setData(full);
    if (full?.user) updateUser(full.user);
  };

  useEffect(() => {
    if (demo) return;
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [demo]);

  if (demo) {
    return (
      <div className="mx-auto max-w-2xl pb-24">
        <PageHeader title="Edit profile" subtitle="Complete your profile across each section" />
        <div className="card p-8 text-center text-ink-500">
          <p className="text-sm">You're exploring the demo. <button onClick={() => nav("/login")} className="font-semibold text-brand-700">Sign in</button> to edit your real profile.</p>
        </div>
      </div>
    );
  }

  const user = data?.user || authUser || {};
  const role = user.role || "general_user";
  const locks = data?.locks || {};
  const doctor = data?.doctor || {};
  const student = data?.student || {};
  const general = data?.general || {};
  const verificationStatus = data?.verification?.status || "not_submitted";
  const { sections: doneMap, done, total, percent } = completionForRole(role, data?.completion);
  const keys = ROLE_SECTION_KEYS[role] || ROLE_SECTION_KEYS.general_user;

  const renderSection = (key) => {
    switch (key) {
      case "basic": return <BasicContactForm user={user} role={role} locks={locks} onSaved={load} />;
      case "education": return <DoctorEducation doctor={doctor} onChanged={load} />;
      case "workplace": return <DoctorWorkplace doctor={doctor} onChanged={load} />;
      case "professional": return <DoctorProfessional doctor={doctor} onChanged={load} />;
      case "verification": return <VerificationWizard onChanged={load} />;
      case "academics": return <StudentAcademics student={student} onChanged={load} />;
      case "experiences": return <StudentExperiences student={student} onChanged={load} />;
      case "interests": return <GeneralInterests general={general} onChanged={load} />;
      default: return null;
    }
  };

  const banner = VERIFICATION_BANNER[verificationStatus];

  return (
    <div className="mx-auto max-w-2xl pb-24">
      <button onClick={() => nav("/app/profile")} className="mb-2 flex items-center gap-1 text-sm text-ink-500 hover:text-brand-700"><ArrowLeft size={16} /> Back to profile</button>
      <PageHeader title="Edit profile" subtitle={`${done} of ${total} sections complete`} />

      {/* Header: cover + avatar */}
      <div className="card mb-3 overflow-hidden">
        <div className="relative h-28 bg-gradient-to-br from-brand-500 via-brand-600 to-brand-900">
          {user.coverPhoto && <img src={user.coverPhoto} alt="" className="absolute inset-0 h-full w-full object-cover" />}
          <button onClick={() => setUploader("cover")} className="press absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur hover:bg-black/60"><Camera size={14} /> Cover</button>
        </div>
        <div className="px-5 pb-4">
          <div className="-mt-10 flex items-end gap-3">
            <div className="relative">
              <Avatar user={user} size={84} className="ring-4 ring-white" />
              <button onClick={() => setUploader("avatar")} className="press absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center rounded-full bg-brand-600 text-white ring-2 ring-white hover:bg-brand-700"><Camera size={14} /></button>
            </div>
            <div className="pb-1">
              <p className="font-display text-lg font-bold text-ink-900">{user.fullName || "Your name"}</p>
              <p className="text-sm text-ink-500">{user.professionalHeadline || user.headline || ""}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard: progress + verification status */}
      <div className="card mb-3 p-4">
        <div className="mb-1.5 flex items-center justify-between text-sm">
          <span className="font-semibold text-ink-700">Profile completion</span>
          <span className="font-bold text-brand-700">{percent}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-ink-900/10"><div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${percent}%` }} /></div>
        {role === "doctor" && banner && (
          <div className={cn("mt-3 rounded-xl px-3 py-2 text-xs font-semibold", banner.cls)}>{banner.text}</div>
        )}
      </div>

      {loading ? (
        <div className="grid place-items-center py-16"><Spinner className="h-7 w-7" /></div>
      ) : (
        <div className="space-y-3">
          {keys.map((key) => {
            const meta = SECTION_META[key];
            const Icon = meta.icon;
            const opened = open === key;
            const complete = !!doneMap[key];
            return (
              <div key={key} className="card overflow-hidden">
                <button onClick={() => setOpen(opened ? null : key)} className="flex w-full items-center gap-3 p-4 text-left">
                  <span className={cn("grid h-10 w-10 place-items-center rounded-xl", complete ? "bg-emerald-50 text-emerald-600" : "bg-brand-50 text-brand-600")}><Icon size={18} /></span>
                  <span className="flex-1">
                    <span className="block text-sm font-bold text-ink-900">{meta.title}</span>
                    <span className={cn("block text-xs", complete ? "text-emerald-600" : "text-ink-400")}>{complete ? "Complete" : "Incomplete"}</span>
                  </span>
                  {complete && <Check size={16} className="text-emerald-600" />}
                  <ChevronDown size={18} className={cn("text-ink-400 transition", opened && "rotate-180")} />
                </button>
                {opened && <div className="border-t border-ink-900/[.06] p-4">{renderSection(key)}</div>}
              </div>
            );
          })}
        </div>
      )}

      {uploader && (
        <PhotoUploader
          kind={uploader}
          onClose={() => setUploader(null)}
          onUploaded={(url) => {
            const field = uploader === "avatar" ? "profilePhoto" : "coverPhoto";
            setData((d) => ({ ...(d || {}), user: { ...(d?.user || {}), [field]: url } }));
            updateUser({ [field]: url });
          }}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Build + lint**

Run: `npm run build && npm run lint`
Expected: build succeeds; lint clean (or only pre-existing warnings).

- [ ] **Step 3: Run unit tests**

Run: `npm test`
Expected: all pass, including `profileForms`.

- [ ] **Step 4: Commit**

```bash
git add src/screens/EditProfile.tsx
git commit -m "feat(profile): hydrate via full(), dashboard header, role section maps"
```

---

## Task 10: Manual smoke test + cleanup

**Files:** none (verification only)

- [ ] **Step 1: Run the app**

Run: `npm run dev` (serves on http://localhost:5173)

- [ ] **Step 2: Verify each role's editor**

Sign in and open `/app/profile/edit`. Confirm for the logged-in user's role:
- Correct sections render (doctor 5 / student 3 / general 2) and the completion bar + (doctor) verification banner show.
- Basic Contact: personal phone is read-only; personal email is read-only **only** for Google accounts; identity fields (name/gender/specialization|degree|age) are editable. Save persists (reload keeps values).
- A list section (e.g. Education/Academics/Interests): add a row → Save → reload shows it; edit → Update; delete removes it.
- Doctor Professional: specialties save; add a certificate with a file → the file shows a thumbnail → tap opens fullscreen → Replace and Remove work.
- Verification (doctor): fill Path A → "Complete Path A" advances to Path B; run the liveness scan (captured still previews, Re-scan works); Submit sets status to Pending and the banner updates.

- [ ] **Step 3: Confirm no stale references / dead code**

Run: `npx rg -n "ProfileForms\"|VerificationForm|StudentAcademicForm|EducationForm|WorkplaceForm|ProfessionalForm" src`
Expected: only the new imports in `EditProfile.tsx`/`ProfileForms.tsx`; no references to the removed `VerificationForm`/`EducationForm`/etc. exports.

- [ ] **Step 4: Final commit (if any cleanup was needed)**

```bash
git add -A
git commit -m "chore(profile): edit-profile rework cleanup"
```

---

## Backend follow-ups (flagged in spec — not frontend tasks)

1. **Verification accumulation:** Path A (`pathType=credential`) and Path B (`pathType=document`) are submitted as two separate POSTs to one `doctor_verifications` row. The backend must **merge/retain both** so the admin sees the full submission — submitting Path B must not wipe Path A credential fields.
2. **Clear-just-the-file:** there is no endpoint to remove only a saved certificate's file (keep the entry). Today "Remove" on a *saved* certificate's file isn't possible — only Replace (PATCH new file) or deleting the whole certificate. Add a "clear file" affordance server-side if standalone removal is wanted.

---

## Self-review notes (done)

- **Spec coverage:** all three roles' field maps (Tasks 7), per-row CRUD (Task 6 + 7), certificates with file (Task 7), specialties (Task 7), general interests (Task 7), two-step verification + liveness (Task 8), universal file preview/replace (Task 5, used in 7 & 8), dashboard completion + verification status (Task 9), lock handling (Task 7 BasicContact), pure-logic unit tests (Tasks 1–2). ✓
- **Placeholders:** none — every code step is complete.
- **Type/name consistency:** `crud` shape `{list, add, update, remove}` from `profileList`/`certificates`/`interests` matches `EditableList`/`ProfileForms` usage; `completionForRole`/`ROLE_SECTION_KEYS` names match across `profileForms.ts` and `EditProfile.tsx`; `dataUrlToBlob`/`verificationMissing` names match Task 2 ↔ Task 8; `SaveBar` `label` prop added in Task 4 and used in Tasks 6–7.

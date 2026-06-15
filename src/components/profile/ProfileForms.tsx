"use client";
import { useState, useRef } from "react";
import { X, Plus, Trash2, ShieldCheck, Upload, FileCheck2, ScanFace, Check } from "lucide-react";
import { dok } from "@/lib/api";
import { cn } from "@/lib/utils";
import LivenessCheck from "./LivenessCheck";

/* ───────────────────────── shared inputs ───────────────────────── */

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
export function CheckGroup({ value = [], onChange, options }) {
  const toggle = (v) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button key={o.value} type="button" onClick={() => toggle(o.value)}
          className={cn("rounded-xl border-2 px-3 py-2 text-sm font-semibold transition", value.includes(o.value) ? "border-brand-600 bg-brand-50 text-brand-700" : "border-ink-900/10 text-ink-600 hover:border-brand-300")}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

// Drop empty strings / nulls / empty arrays so we never send invalid fields to Joi.
export function prune(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === "" || v === null || v === undefined) continue;
    if (Array.isArray(v) && v.length === 0) continue;
    out[k] = v;
  }
  return out;
}

function SaveBar({ onSave, saving, err, ok }) {
  return (
    <div className="pt-1">
      {err && <p className="mb-2 text-sm text-rose-600">{err}</p>}
      {ok && <p className="mb-2 text-sm text-emerald-600">Saved ✓</p>}
      <button onClick={onSave} disabled={saving} className="btn-primary w-full py-3 text-sm">{saving ? "Saving…" : "Save section"}</button>
    </div>
  );
}

// Wraps a section's save call: manages saving/err/ok + calls onSaved() to refresh the hub.
function useSave(onSaved) {
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

const dateInput = (d) => (d ? String(d).slice(0, 10) : "");

/* ───────────────────────── Basic Contact (all roles) ───────────────────────── */

export function BasicContactForm({ user, role, onSaved }) {
  const { saving, err, ok, run } = useSave(onSaved);
  const [f, setF] = useState({
    fullName: user.fullName || "", titlePrefix: user.titlePrefix || "",
    professionalHeadline: user.professionalHeadline || user.headline || "",
    pronouns: user.pronouns || "", gender: user.gender || "",
    dateOfBirth: dateInput(user.dateOfBirth), age: user.age || "",
    workEmail: user.workEmail || "", city: user.city || "", country: user.country || "",
    languages: user.languages || [], bio: user.bio || "",
  });
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }));
  const save = () => run(() => dok.profile.updateBasic(prune(f)));

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-[110px_1fr]">
        <Field label="Title"><Text value={f.titlePrefix} onChange={set("titlePrefix")} placeholder="Dr." /></Field>
        <Field label="Full name"><Text value={f.fullName} onChange={set("fullName")} placeholder="Your full name" /></Field>
      </div>
      <Field label="Headline" hint="Shown under your name"><Text value={f.professionalHeadline} onChange={set("professionalHeadline")} placeholder="e.g. Cardiologist · 8 yrs experience" /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Gender"><Select value={f.gender} onChange={set("gender")} options={[{ value: "male", label: "Male" }, { value: "female", label: "Female" }, { value: "other", label: "Other" }, { value: "prefer_not_to_say", label: "Prefer not to say" }]} /></Field>
        <Field label="Pronouns"><Text value={f.pronouns} onChange={set("pronouns")} placeholder="she/her" /></Field>
        <Field label="Date of birth"><Text type="date" value={f.dateOfBirth} onChange={set("dateOfBirth")} /></Field>
        {role === "general_user" && <Field label="Age"><Num value={f.age} onChange={set("age")} placeholder="32" /></Field>}
        <Field label="City"><Text value={f.city} onChange={set("city")} placeholder="Mumbai" /></Field>
        <Field label="Country"><Text value={f.country} onChange={set("country")} placeholder="India" /></Field>
      </div>
      <Field label="Work email"><Text type="email" value={f.workEmail} onChange={set("workEmail")} placeholder="you@hospital.org" /></Field>
      <Field label="Languages"><Tags value={f.languages} onChange={set("languages")} placeholder="Add a language" /></Field>
      <Field label="About"><Area value={f.bio} onChange={set("bio")} placeholder="A short professional bio…" /></Field>
      <SaveBar onSave={save} saving={saving} err={err} ok={ok} />
    </div>
  );
}

/* ───────────────────────── Doctor: Education (multi) ───────────────────────── */

const blankEdu = { organizationName: "", departmentName: "", degreeName: "", startDate: "", endDate: "" };

export function EducationForm({ roleProfile, meta, onSaved }) {
  const { saving, err, ok, run } = useSave(onSaved);
  const [education, setEducation] = useState((roleProfile.education || []).map((e) => ({ ...blankEdu, ...e, startDate: dateInput(e.startDate), endDate: dateInput(e.endDate) })));
  const [fellowships, setFellowships] = useState(roleProfile.fellowships || []);
  const [highestDegree, setHighestDegree] = useState(roleProfile.highestDegree || "");

  const update = (i, k, v) => setEducation((list) => list.map((e, idx) => (idx === i ? { ...e, [k]: v } : e)));
  const save = () => run(() => dok.profile.doctorEducation(prune({ education: education.map(prune), fellowships, highestDegree })));

  return (
    <div className="space-y-4">
      {education.map((e, i) => (
        <div key={i} className="rounded-2xl border border-ink-900/10 p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wide text-ink-400">Education {i + 1}</span>
            <button type="button" onClick={() => setEducation((l) => l.filter((_, idx) => idx !== i))} className="text-rose-500 hover:text-rose-700"><Trash2 size={15} /></button>
          </div>
          <div className="space-y-3">
            <Field label="Institution"><Text value={e.organizationName} onChange={(v) => update(i, "organizationName", v)} placeholder="AIIMS New Delhi" /></Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Degree"><Text value={e.degreeName} onChange={(v) => update(i, "degreeName", v)} placeholder="MD (Cardiology)" /></Field>
              <Field label="Department"><Text value={e.departmentName} onChange={(v) => update(i, "departmentName", v)} placeholder="Dept. of Cardiology" /></Field>
              <Field label="Start"><Text type="date" value={e.startDate} onChange={(v) => update(i, "startDate", v)} /></Field>
              <Field label="End"><Text type="date" value={e.endDate} onChange={(v) => update(i, "endDate", v)} /></Field>
            </div>
          </div>
        </div>
      ))}
      <button type="button" onClick={() => setEducation((l) => [...l, { ...blankEdu }])} className="btn-outline w-full py-2.5 text-sm"><Plus size={16} /> Add education</button>
      <Field label="Highest degree"><Select value={highestDegree} onChange={setHighestDegree} options={meta.degrees || []} /></Field>
      <Field label="Fellowships"><Tags value={fellowships} onChange={setFellowships} placeholder="Add a fellowship" /></Field>
      <SaveBar onSave={save} saving={saving} err={err} ok={ok} />
    </div>
  );
}

/* ───────────────────────── Doctor: Workplace (multi) ───────────────────────── */

const blankJob = { name: "", designation: "", address: "", startDate: "", endDate: "" };

export function WorkplaceForm({ roleProfile, onSaved }) {
  const { saving, err, ok, run } = useSave(onSaved);
  const [hospitals, setHospitals] = useState((roleProfile.hospitals || []).map((h) => ({ ...blankJob, ...h, startDate: dateInput(h.startDate), endDate: dateInput(h.endDate) })));
  const [consultationFees, setFees] = useState(roleProfile.consultationFees ?? "");
  const [availableForOnlineConsult, setOnline] = useState(!!roleProfile.availableForOnlineConsult);

  const update = (i, k, v) => setHospitals((list) => list.map((h, idx) => (idx === i ? { ...h, [k]: v } : h)));
  const save = () => run(() => dok.profile.doctorWorkplace(prune({ hospitals: hospitals.map(prune), consultationFees, availableForOnlineConsult })));

  return (
    <div className="space-y-4">
      {hospitals.map((h, i) => (
        <div key={i} className="rounded-2xl border border-ink-900/10 p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wide text-ink-400">Workplace {i + 1}</span>
            <button type="button" onClick={() => setHospitals((l) => l.filter((_, idx) => idx !== i))} className="text-rose-500 hover:text-rose-700"><Trash2 size={15} /></button>
          </div>
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Role / designation"><Text value={h.designation} onChange={(v) => update(i, "designation", v)} placeholder="Senior Cardiologist" /></Field>
              <Field label="Organization"><Text value={h.name} onChange={(v) => update(i, "name", v)} placeholder="Apollo Hospital" /></Field>
            </div>
            <Field label="Address / city"><Text value={h.address} onChange={(v) => update(i, "address", v)} placeholder="Greams Road, Chennai" /></Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Start"><Text type="date" value={h.startDate} onChange={(v) => update(i, "startDate", v)} /></Field>
              <Field label="End" hint="Leave blank if current"><Text type="date" value={h.endDate} onChange={(v) => update(i, "endDate", v)} /></Field>
            </div>
          </div>
        </div>
      ))}
      <button type="button" onClick={() => setHospitals((l) => [...l, { ...blankJob }])} className="btn-outline w-full py-2.5 text-sm"><Plus size={16} /> Add workplace</button>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Consultation fee" hint="Per consult"><Num value={consultationFees} onChange={setFees} placeholder="800" /></Field>
        <div className="flex items-end pb-1"><Toggle label="Available online" desc="Open to online consults" value={availableForOnlineConsult} onChange={setOnline} /></div>
      </div>
      <SaveBar onSave={save} saving={saving} err={err} ok={ok} />
    </div>
  );
}

/* ───────────────────────── Doctor: Professional ───────────────────────── */

const SERVICES = [
  { value: "curbside_consult", label: "Curbside Consult" },
  { value: "mentorship", label: "Mentorship" },
  { value: "speaking_webinars", label: "Speaking & Webinars" },
];

export function ProfessionalForm({ roleProfile, meta, onSaved }) {
  const { saving, err, ok, run } = useSave(onSaved);
  const [f, setF] = useState({
    professionType: roleProfile.professionType || "",
    mainSpecialization: roleProfile.mainSpecialization || "",
    specializations: roleProfile.specializations || [],
    yearsOfExperience: roleProfile.yearsOfExperience ?? "",
    countryOfPractice: roleProfile.countryOfPractice || "",
    servicesOffered: roleProfile.servicesOffered || [],
    isPaidConsult: !!roleProfile.isPaidConsult,
    abmsBoardCertifications: roleProfile.abmsBoardCertifications || [],
  });
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }));
  const save = () => run(() => dok.profile.doctorProfessional(prune(f)));

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Profession type"><Text value={f.professionType} onChange={set("professionType")} placeholder="Specialist" /></Field>
        <Field label="Years of experience"><Num value={f.yearsOfExperience} onChange={set("yearsOfExperience")} placeholder="8" /></Field>
      </div>
      <Field label="Primary specialization"><Select value={f.mainSpecialization} onChange={set("mainSpecialization")} options={meta.specializations || []} /></Field>
      <Field label="All specialties"><Tags value={f.specializations} onChange={set("specializations")} placeholder="Add a specialty" /></Field>
      <Field label="Country of practice"><Text value={f.countryOfPractice} onChange={set("countryOfPractice")} placeholder="India" /></Field>
      <Field label="Services offered"><CheckGroup value={f.servicesOffered} onChange={set("servicesOffered")} options={SERVICES} /></Field>
      <Toggle label="Paid consults" desc="Charge for consultations" value={f.isPaidConsult} onChange={set("isPaidConsult")} />
      <Field label="Board certifications (ABMS)"><Tags value={f.abmsBoardCertifications} onChange={set("abmsBoardCertifications")} placeholder="Add a certification" /></Field>
      <SaveBar onSave={save} saving={saving} err={err} ok={ok} />
    </div>
  );
}

/* ───────────────────────── Doctor: Verification (license path) ─────────────────────────
   The full KYC document path + 3s liveness face scan lands in a later pass. */

const KYC_LABEL = {
  not_started: { text: "Not started", cls: "bg-ink-900/5 text-ink-600" },
  pending: { text: "Pending review", cls: "bg-amber-50 text-amber-700" },
  in_review: { text: "In review", cls: "bg-amber-50 text-amber-700" },
  verified: { text: "Verified", cls: "bg-emerald-50 text-emerald-700" },
  rejected: { text: "Rejected", cls: "bg-rose-50 text-rose-700" },
};

function DocTile({ label, type, uploaded, onUploaded }) {
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const pick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr(""); setBusy(true);
    try { const res = await dok.profile.doctorDocument(file, type); onUploaded(res?.url || true); }
    catch (e2) { setErr(e2?.response?.data?.message || "Upload failed"); }
    finally { setBusy(false); }
  };
  return (
    <>
      <button type="button" onClick={() => ref.current?.click()} disabled={busy}
        className={cn("flex w-full items-center gap-3 rounded-xl border-2 border-dashed p-3 text-left transition", uploaded ? "border-emerald-300 bg-emerald-50" : "border-ink-900/15 hover:border-brand-300")}>
        <span className={cn("grid h-10 w-10 place-items-center rounded-xl", uploaded ? "bg-emerald-100 text-emerald-600" : "bg-ink-900/[.04] text-ink-500")}>{uploaded ? <FileCheck2 size={18} /> : <Upload size={18} />}</span>
        <span className="flex-1">
          <span className="block text-sm font-semibold text-ink-900">{label}</span>
          <span className="block text-xs text-ink-400">{busy ? "Uploading…" : uploaded ? "Uploaded ✓" : "Tap to upload (image / PDF)"}</span>
          {err && <span className="block text-xs text-rose-600">{err}</span>}
        </span>
      </button>
      <input ref={ref} type="file" accept="image/*,application/pdf" hidden onChange={pick} />
    </>
  );
}

const DOC_TILES = [
  { type: "aadhaar_card", label: "Aadhaar / Government ID" },
  { type: "pan_card", label: "PAN card" },
  { type: "degree_certificate", label: "Degree certificate" },
  { type: "workplace_proof", label: "Workplace proof" },
];

export function VerificationForm({ roleProfile, onSaved }) {
  const { saving, err, ok, run } = useSave(onSaved);
  const kyc = roleProfile.kyc || {};
  const status = kyc.status || "not_started";
  const label = KYC_LABEL[status] || KYC_LABEL.not_started;

  const [path, setPath] = useState(kyc.verificationPath === "kyc_document" ? "kyc_document" : "license");
  const [f, setF] = useState({
    countryOfPractice: roleProfile.countryOfPractice || "",
    licenseType: roleProfile.licenseType || "",
    medicalLicenseNumber: roleProfile.medicalLicenseNumber || "",
    npiNumber: roleProfile.npiNumber || "",
    registrationNumber: roleProfile.registrationNumber || "",
    registrationCouncil: roleProfile.registrationCouncil || "",
    abmsBoardCertifications: roleProfile.abmsBoardCertifications || [],
  });
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }));

  const [docs, setDocs] = useState({});            // { [type]: url }
  const [liveness, setLiveness] = useState(false); // 3s scan completed
  const [scanOpen, setScanOpen] = useState(false);
  const hasDoc = Object.keys(docs).length > 0;

  const submitLicense = () =>
    run(async () => {
      await dok.profile.doctorProfessional(prune(f));
      await dok.profile.doctorSubmitVerification({ verificationPath: "license" });
    });
  const submitKyc = () =>
    run(async () => dok.profile.doctorSubmitVerification({ verificationPath: "kyc_document" }));

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-2xl bg-brand-50 p-4">
        <ShieldCheck size={22} className="mt-0.5 text-brand-600" />
        <div className="flex-1">
          <p className="flex items-center gap-2 text-sm font-bold text-brand-800">Verification <span className={cn("chip text-[10px]", label.cls)}>{label.text}</span></p>
          <p className="mt-0.5 text-sm text-brand-700/80">Choose one path. Submissions are reviewed by our team, usually within 24 hours.</p>
          {status === "rejected" && kyc.rejectionReason && <p className="mt-1 text-sm text-rose-600">Reason: {kyc.rejectionReason}</p>}
        </div>
      </div>

      {/* path switch */}
      <div className="flex gap-2">
        {[{ k: "license", t: "License number" }, { k: "kyc_document", t: "KYC documents" }].map((o) => (
          <button key={o.k} type="button" onClick={() => setPath(o.k)}
            className={cn("flex-1 rounded-xl border-2 py-2 text-sm font-semibold transition", path === o.k ? "border-brand-600 bg-brand-50 text-brand-700" : "border-ink-900/10 text-ink-600 hover:border-brand-300")}>
            {o.t}
          </button>
        ))}
      </div>

      {path === "license" ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Country of practice"><Text value={f.countryOfPractice} onChange={set("countryOfPractice")} placeholder="India" /></Field>
            <Field label="License type"><Text value={f.licenseType} onChange={set("licenseType")} placeholder="State Medical License" /></Field>
            <Field label="Medical license number"><Text value={f.medicalLicenseNumber} onChange={set("medicalLicenseNumber")} placeholder="MH-DOC-12345" /></Field>
            <Field label="NPI number" hint="Optional"><Text value={f.npiNumber} onChange={set("npiNumber")} placeholder="1234567890" /></Field>
            <Field label="Registration number"><Text value={f.registrationNumber} onChange={set("registrationNumber")} placeholder="MH-12345" /></Field>
            <Field label="Registration council"><Text value={f.registrationCouncil} onChange={set("registrationCouncil")} placeholder="Maharashtra Medical Council" /></Field>
          </div>
          <Field label="ABMS board certifications" hint="Optional"><Tags value={f.abmsBoardCertifications} onChange={set("abmsBoardCertifications")} placeholder="Add a certification" /></Field>
          <SaveBar onSave={submitLicense} saving={saving} err={err} ok={ok} />
        </>
      ) : (
        <>
          <div className="space-y-2">
            {DOC_TILES.map((d) => (
              <DocTile key={d.type} label={d.label} type={d.type} uploaded={!!docs[d.type]} onUploaded={(url) => setDocs((s) => ({ ...s, [d.type]: url }))} />
            ))}
          </div>

          {/* liveness gate */}
          <div className={cn("flex items-center gap-3 rounded-xl border-2 p-3", liveness ? "border-emerald-300 bg-emerald-50" : "border-ink-900/15")}>
            <span className={cn("grid h-10 w-10 place-items-center rounded-xl", liveness ? "bg-emerald-100 text-emerald-600" : "bg-ink-900/[.04] text-ink-500")}>{liveness ? <Check size={18} /> : <ScanFace size={18} />}</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-ink-900">Liveness check</p>
              <p className="text-xs text-ink-400">{liveness ? "Completed ✓" : "3-second live face scan (required)"}</p>
            </div>
            {!liveness && <button type="button" onClick={() => setScanOpen(true)} className="btn-outline px-3 py-2 text-xs">Start</button>}
          </div>

          {err && <p className="text-sm text-rose-600">{err}</p>}
          {ok && <p className="text-sm text-emerald-600">Submitted for review ✓</p>}
          <button onClick={submitKyc} disabled={saving || !hasDoc || !liveness} className="btn-primary w-full py-3 text-sm">{saving ? "Submitting…" : "Submit for verification"}</button>
          {(!hasDoc || !liveness) && <p className="text-center text-xs text-ink-400">Upload at least one document and complete the liveness check to submit.</p>}

          {scanOpen && <LivenessCheck onClose={() => setScanOpen(false)} onComplete={() => { setLiveness(true); setScanOpen(false); }} />}
        </>
      )}
    </div>
  );
}

/* ───────────────────────── Student: Academic Details (multi-college via publications) ───────────────────────── */

const blankPub = { title: "", link: "", year: "" };

export function StudentAcademicForm({ roleProfile, meta, onSaved }) {
  const { saving, err, ok, run } = useSave(onSaved);
  const [f, setF] = useState({
    course: roleProfile.course || "",
    institution: roleProfile.institution || roleProfile.collegeName || "",
    yearOfStudy: roleProfile.yearOfStudy || "",
    graduationYear: roleProfile.graduationYear ?? "",
    areasOfInterest: roleProfile.areasOfInterest || [],
    skills: roleProfile.skills || [],
    openToMentorship: !!roleProfile.openToMentorship,
    about: roleProfile.about || "",
  });
  const [pubs, setPubs] = useState((roleProfile.researchPublications || []).map((p) => ({ ...blankPub, ...p })));
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }));
  const updatePub = (i, k, v) => setPubs((l) => l.map((p, idx) => (idx === i ? { ...p, [k]: v } : p)));

  const save = () =>
    run(() => {
      const researchPublications = pubs.map(prune).filter((p) => p.title);
      return dok.profile.studentAcademic(prune({ ...f, researchPublications }));
    });

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Course / degree"><Select value={f.course} onChange={set("course")} options={meta.degrees || []} placeholder="Select course…" /></Field>
        <Field label="Year of study"><Text value={f.yearOfStudy} onChange={set("yearOfStudy")} placeholder="3rd Year" /></Field>
      </div>
      <Field label="College / institution"><Text value={f.institution} onChange={set("institution")} placeholder="AIIMS New Delhi" /></Field>
      <Field label="Expected graduation year"><Num value={f.graduationYear} onChange={set("graduationYear")} placeholder="2027" /></Field>
      <Field label="Areas of interest"><Tags value={f.areasOfInterest} onChange={set("areasOfInterest")} placeholder="e.g. Surgery" /></Field>
      <Field label="Skills"><Tags value={f.skills} onChange={set("skills")} placeholder="e.g. ECG interpretation" /></Field>

      <div>
        <p className="mb-2 text-sm font-semibold text-ink-700">Research & publications</p>
        <div className="space-y-3">
          {pubs.map((p, i) => (
            <div key={i} className="rounded-2xl border border-ink-900/10 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wide text-ink-400">Publication {i + 1}</span>
                <button type="button" onClick={() => setPubs((l) => l.filter((_, idx) => idx !== i))} className="text-rose-500 hover:text-rose-700"><Trash2 size={15} /></button>
              </div>
              <div className="space-y-2">
                <Text value={p.title} onChange={(v) => updatePub(i, "title", v)} placeholder="Title" />
                <div className="grid gap-2 sm:grid-cols-[1fr_110px]">
                  <Text value={p.link} onChange={(v) => updatePub(i, "link", v)} placeholder="https://…" />
                  <Num value={p.year} onChange={(v) => updatePub(i, "year", v)} placeholder="2025" />
                </div>
              </div>
            </div>
          ))}
        </div>
        <button type="button" onClick={() => setPubs((l) => [...l, { ...blankPub }])} className="btn-outline mt-3 w-full py-2.5 text-sm"><Plus size={16} /> Add publication</button>
      </div>

      <Toggle label="Open to mentorship" desc="Show you're seeking mentors" value={f.openToMentorship} onChange={set("openToMentorship")} />
      <Field label="About"><Area value={f.about} onChange={set("about")} placeholder="Tell peers about your academic focus…" /></Field>
      <SaveBar onSave={save} saving={saving} err={err} ok={ok} />
    </div>
  );
}

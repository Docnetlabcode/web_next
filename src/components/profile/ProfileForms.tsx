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

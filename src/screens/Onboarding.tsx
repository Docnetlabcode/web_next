"use client";
import { useEffect, useState } from "react";
import { useNavigate, Navigate } from "@/lib/router";
import { ArrowRight, CheckCircle2, Home, UserCog } from "lucide-react";
import { Logo } from "@/components/ui/Primitives";
import NavArrows from "@/components/ui/NavArrows";
import { useAuth } from "@/context/AuthContext";
import { dok } from "@/lib/api";
import { cn } from "@/lib/utils";

const GENDERS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

const ROLE_COPY = {
  doctor: "Confirm your name and primary specialization to finish setting up.",
  student: "Confirm your name and degree to finish setting up.",
  general_user: "Just a couple of details and you're in.",
};

export default function Onboarding() {
  const nav = useNavigate();
  const { user, isProfileComplete, demo, updateUser } = useAuth();
  const role = user?.role || "general_user";

  const [fullName, setFullName] = useState(user?.fullName || "");
  const [gender, setGender] = useState(user?.gender || "");
  const [specialization, setSpecialization] = useState("");
  const [degree, setDegree] = useState("");
  const [age, setAge] = useState("");
  const [meta, setMeta] = useState({ specializations: [], degrees: [] });
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // Pull the specialization / degree lists for the dropdowns (public endpoint).
  useEffect(() => {
    let alive = true;
    dok.auth
      .meta()
      .then((d) => alive && setMeta({ specializations: d.specializations || [], degrees: d.degrees || [] }))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // Already onboarded (or just a demo session) — nothing to do here.
  if (!user) return <Navigate to="/login" replace />;
  if (done) return <SuccessScreen name={fullName} onHome={() => nav("/app", { replace: true })} onProfile={() => nav("/app/profile/edit", { replace: true })} />;
  if (demo || isProfileComplete) return <Navigate to="/app" replace />;

  const submit = async () => {
    if (!fullName.trim()) return setErr("Please enter your full name.");
    if (!gender) return setErr("Please select your gender.");
    if (role === "doctor" && !specialization) return setErr("Please choose your specialization.");
    if (role === "student" && !degree) return setErr("Please choose your degree.");
    if (role === "general_user" && (!age || Number(age) <= 0)) return setErr("Please enter a valid age.");

    const payload = { fullName: fullName.trim(), gender };
    if (role === "doctor") payload.specializations = [specialization];
    if (role === "student") payload.degree = degree;
    if (role === "general_user") payload.age = Number(age);

    setErr(""); setBusy(true);
    try {
      const data = await dok.users.onboard(payload);
      updateUser({ ...(data.user || data), isProfileComplete: true });
      setDone(true);
    } catch (e) {
      setErr(e?.response?.data?.message || "Couldn't save your profile. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-brand-50/40 px-6 py-12">
      <NavArrows variant="floating" />
      <div className="w-full max-w-md animate-fade-up rounded-3xl bg-white p-8 shadow-card ring-1 ring-ink-900/5">
        <Logo />
        <h1 className="mt-7 font-display text-3xl font-extrabold text-ink-900">Complete your profile</h1>
        <p className="mt-2 text-ink-500">{ROLE_COPY[role]}</p>

        <label className="mt-7 block text-sm font-semibold text-ink-700">Full name</label>
        <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Dr. Priya Sharma" className="input mt-2 w-full" />

        <label className="mt-5 block text-sm font-semibold text-ink-700">Gender</label>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {GENDERS.map((g) => (
            <button key={g.value} type="button" onClick={() => setGender(g.value)}
              className={cn("rounded-xl border-2 py-2.5 text-sm font-semibold transition",
                gender === g.value ? "border-brand-600 bg-brand-50 text-brand-700" : "border-ink-900/10 text-ink-600 hover:border-brand-300")}>
              {g.label}
            </button>
          ))}
        </div>

        {role === "doctor" && (
          <>
            <label className="mt-5 block text-sm font-semibold text-ink-700">Primary specialization</label>
            <select value={specialization} onChange={(e) => setSpecialization(e.target.value)} className="input mt-2 w-full">
              <option value="">Select specialization…</option>
              {meta.specializations.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </>
        )}

        {role === "student" && (
          <>
            <label className="mt-5 block text-sm font-semibold text-ink-700">Degree</label>
            <select value={degree} onChange={(e) => setDegree(e.target.value)} className="input mt-2 w-full">
              <option value="">Select degree…</option>
              {meta.degrees.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </>
        )}

        {role === "general_user" && (
          <>
            <label className="mt-5 block text-sm font-semibold text-ink-700">Age</label>
            <input value={age} onChange={(e) => setAge(e.target.value.replace(/\D/g, ""))} placeholder="32" inputMode="numeric" maxLength={3} className="input mt-2 w-full" />
          </>
        )}

        {err && <p className="mt-4 text-sm text-rose-600">{err}</p>}

        <button onClick={submit} disabled={busy} className="btn-primary mt-7 w-full py-3.5 text-base">
          {busy ? "Saving…" : <>Enter DokLynk <ArrowRight size={18} /></>}
        </button>
      </div>
    </div>
  );
}

function SuccessScreen({ name, onHome, onProfile }) {
  const first = (name || "").trim().split(/\s+/)[0] || "there";
  return (
    <div className="grid min-h-screen place-items-center bg-brand-50/40 px-6 py-12">
      <div className="w-full max-w-md animate-fade-up rounded-3xl bg-white p-8 text-center shadow-card ring-1 ring-ink-900/5">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-50 text-emerald-600 anim-pop"><CheckCircle2 size={34} /></div>
        <h1 className="mt-5 font-display text-3xl font-extrabold text-ink-900">You're all set, {first}!</h1>
        <p className="mt-2 text-ink-500">Your account is ready. Jump straight in, or finish your full profile so colleagues can find and trust you.</p>
        <button onClick={onHome} className="btn-primary mt-7 w-full py-3.5 text-base"><Home size={18} /> Enter home</button>
        <button onClick={onProfile} className="btn-outline mt-3 w-full py-3.5 text-base"><UserCog size={18} /> Complete profile</button>
      </div>
    </div>
  );
}

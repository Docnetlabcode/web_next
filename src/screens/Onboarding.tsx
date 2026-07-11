"use client";
import { useEffect, useState } from "react";
import { useNavigate, Navigate } from "@/lib/router";
import { ArrowRight, CheckCircle2, Home, UserCog, Stethoscope, GraduationCap, User, Check } from "lucide-react";
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

const ROLE_META = {
  doctor: { icon: Stethoscope, label: "Health professional", copy: "Confirm your name and primary specialization to finish setting up." },
  student: { icon: GraduationCap, label: "Medical student", copy: "Confirm your name and degree to finish setting up." },
  general_user: { icon: User, label: "General user", copy: "Just a couple of details and you're in." },
};

export default function Onboarding() {
  const nav = useNavigate();
  const { user, isProfileComplete, demo, updateUser } = useAuth();
  const role = user?.role || "general_user";
  const meta_ = ROLE_META[role] || ROLE_META.general_user;
  const RoleIcon = meta_.icon;

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
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-ink-50 px-6 py-12">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 mesh opacity-70" />
      <NavArrows variant="floating" />

      <div className="relative w-full max-w-md">
        <div className="card anim-pop p-8">
          <div className="flex items-center justify-between">
            <Logo />
            <span className="chip bg-brand-50 text-brand-700"><RoleIcon size={14} /> {meta_.label}</span>
          </div>

          <h1 className="mt-7 font-display text-3xl font-extrabold tracking-tight text-ink-900 text-balance">Complete your profile</h1>
          <p className="mt-2 text-ink-500">{meta_.copy}</p>

          <label htmlFor="fullName" className="mt-7 block text-sm font-semibold text-ink-700">Full name</label>
          <input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Dr. Priya Sharma" className="input mt-2" />

          <span className="mt-5 block text-sm font-semibold text-ink-700">Gender</span>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {GENDERS.map((g) => {
              const active = gender === g.value;
              return (
                <button
                  key={g.value}
                  type="button"
                  onClick={() => setGender(g.value)}
                  aria-pressed={active}
                  className={cn(
                    "press flex items-center justify-center gap-1.5 rounded-xl border-2 py-2.5 text-sm font-semibold transition-colors duration-200",
                    active ? "border-brand-600 bg-brand-50 text-brand-700" : "border-ink-900/10 text-ink-600 hover:border-brand-300"
                  )}
                >
                  {active && <Check size={15} strokeWidth={3} className="anim-pop" />}
                  {g.label}
                </button>
              );
            })}
          </div>

          {role === "doctor" && (
            <>
              <label htmlFor="spec" className="mt-5 block text-sm font-semibold text-ink-700">Primary specialization</label>
              <select id="spec" value={specialization} onChange={(e) => setSpecialization(e.target.value)} className="input mt-2">
                <option value="">Select specialization…</option>
                {meta.specializations.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </>
          )}

          {role === "student" && (
            <>
              <label htmlFor="degree" className="mt-5 block text-sm font-semibold text-ink-700">Degree</label>
              <select id="degree" value={degree} onChange={(e) => setDegree(e.target.value)} className="input mt-2">
                <option value="">Select degree…</option>
                {meta.degrees.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </>
          )}

          {role === "general_user" && (
            <>
              <label htmlFor="age" className="mt-5 block text-sm font-semibold text-ink-700">Age</label>
              <input id="age" value={age} onChange={(e) => setAge(e.target.value.replace(/\D/g, ""))} placeholder="32" inputMode="numeric" maxLength={3} className="input mt-2" />
            </>
          )}

          {err && <p className="mt-4 text-sm font-medium text-danger-700">{err}</p>}

          <button onClick={submit} disabled={busy} className="btn-primary mt-7 w-full py-3.5 text-base">
            {busy ? "Saving…" : <>Enter Orovion <ArrowRight size={18} /></>}
          </button>
        </div>

        <p className="mt-4 text-center text-xs text-ink-400">Step 1 of 2 · You can complete the rest of your profile anytime.</p>
      </div>
    </div>
  );
}

function SuccessScreen({ name, onHome, onProfile }) {
  const first = (name || "").trim().split(/\s+/)[0] || "there";
  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-ink-50 px-6 py-12">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 mesh opacity-80" />
      <div className="relative w-full max-w-md">
        <div className="card anim-pop p-8 text-center">
          <div className="relative mx-auto grid h-20 w-20 place-items-center">
            <span className="absolute inset-0 rounded-full bg-success-50" />
            <span className="absolute inset-0 animate-ping rounded-full bg-success-500/20" style={{ animationIterationCount: 2 }} />
            <CheckCircle2 size={40} className="relative anim-pop text-success-500" />
          </div>
          <h1 className="mt-6 font-display text-3xl font-extrabold tracking-tight text-ink-900 text-balance">You're all set, {first}!</h1>
          <p className="mx-auto mt-2 max-w-sm text-ink-500">Your account is ready. Jump straight in, or finish your full profile so colleagues can find and trust you.</p>
          <button onClick={onHome} className="btn-primary mt-7 w-full py-3.5 text-base"><Home size={18} /> Enter home</button>
          <button onClick={onProfile} className="btn-outline mt-3 w-full py-3.5 text-base"><UserCog size={18} /> Complete profile</button>
        </div>
      </div>
    </div>
  );
}

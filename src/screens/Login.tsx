"use client";
import { useState, useEffect } from "react";
import { useNavigate, Link } from "@/lib/router";
import { Stethoscope, GraduationCap, User, ArrowRight, ArrowLeft, ShieldCheck, Lock, BadgeCheck, Check } from "lucide-react";
import { Logo } from "@/components/ui/Primitives";
import NavArrows from "@/components/ui/NavArrows";
import CountrySelect from "@/components/ui/CountrySelect";
import { COUNTRIES } from "@/data/countries";
import { useAuth } from "@/context/AuthContext";
import { dok } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  firebaseEnabled,
  startPhoneSignIn,
  confirmPhoneCode,
  signInWithGoogle,
  deviceInfo,
} from "@/lib/firebaseAuth";

const ROLES = [
  { key: "doctor", icon: Stethoscope, title: "Health professional", desc: "Doctor, surgeon, dentist, nurse, or allied healthcare professional." },
  { key: "student", icon: GraduationCap, title: "Medical student", desc: "Enrolled in a medical, or allied health program." },
  { key: "general_user", icon: User, title: "General user", desc: "Patient, caregiver, family member, or anyone interested in healthcare." },
];

const TRUST = [
  { icon: ShieldCheck, text: "Complete professional verification to earn a verified badge" },
  { icon: Lock, text: "Connect, message and manage private consultations" },
  { icon: BadgeCheck, text: "Build your identity through your professional profile and expertise" },
];

const STEP_LABELS = ["Role", "Number", "Verify"];

// Map Firebase / axios errors to a friendly line.
function authError(e) {
  if (e?.message === "FIREBASE_OFF")
    return "Phone & Google sign-in aren't configured yet. Add your Firebase keys to continue.";
  const code = e?.code || "";
  if (code.includes("invalid-phone-number")) return "That phone number looks invalid — check the country code and try again.";
  if (code.includes("invalid-verification-code")) return "That code didn't match. Please re-enter it.";
  if (code.includes("code-expired")) return "That code expired — tap resend for a new one.";
  if (code.includes("too-many-requests")) return "Too many attempts. Please wait a little and try again.";
  if (code.includes("popup-closed-by-user") || code.includes("cancelled-popup")) return "Google sign-in was cancelled.";
  if (code.includes("unauthorized-domain")) return "This domain isn't authorized in Firebase yet (Authentication → Settings → Authorized domains).";
  const status = e?.response?.status;
  if (status === 429) return e?.response?.data?.message || "Too many OTP requests — please wait before retrying.";
  if (e?.response) return e.response.data?.message || "Something went wrong. Please try again.";
  if (e?.request) return "Backend not reachable — please check your connection and try again.";
  return e?.message || "Something went wrong. Please try again.";
}

export default function Login() {
  const nav = useNavigate();
  const { setSession } = useAuth();
  const [step, setStep] = useState(0); // 0 role, 1 phone, 2 otp
  const [role, setRole] = useState("doctor");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState(COUNTRIES[0]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // Send the authenticated user to onboarding (new / incomplete) or into the app.
  const enter = (res) => {
    setSession({ accessToken: res.accessToken, csrfToken: res.csrfToken, user: res.user });
    const complete = res.user?.isProfileComplete ?? Boolean(res.user?.fullName && res.user?.gender);
    nav(res.isNewUser || !complete ? "/onboarding" : "/app", { replace: true });
  };

  // Register the role + rate-limit on the backend, then have Firebase send the OTP SMS.
  const requestOtp = async () => {
    if (!firebaseEnabled) throw new Error("FIREBASE_OFF");
    await dok.auth.sendOtp({ phoneNumber: phone, countryCode: country.dial, role });
    await startPhoneSignIn(`${country.dial}${phone}`);
  };

  const sendOtp = async () => {
    setErr(""); setBusy(true);
    try {
      await requestOtp();
      setStep(2);
    } catch (e) {
      setErr(authError(e));
    } finally {
      setBusy(false);
    }
  };

  const googleSignIn = async () => {
    setErr(""); setBusy(true);
    try {
      if (!firebaseEnabled) throw new Error("FIREBASE_OFF");
      const firebaseIdToken = await signInWithGoogle();
      const res = await dok.auth.google({ firebaseIdToken, role, deviceInfo: deviceInfo() });
      enter(res);
    } catch (e) {
      setErr(authError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <NavArrows variant="floating" />

      {/* Brand panel */}
      <aside className="relative hidden flex-col justify-between overflow-hidden p-12 text-white lg:flex">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900" />
        <div className="absolute inset-0 mesh opacity-90" />
        <div className="absolute inset-0 grid-bg opacity-[.18]" />
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />

        <div className="relative flex items-center justify-between">
          <Link to="/" className="press"><Logo light /></Link>
          <span className="chip bg-white/10 text-white/90 ring-1 ring-white/20">For clinicians</span>
        </div>

        <div className="relative max-w-md">
          <h1 className="font-display text-[2.75rem] font-extrabold leading-[1.04] tracking-tight text-balance">
            Built on trust. <br /> Made for healthcare.
          </h1>
          <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-white/75">
            Connect, share knowledge and build your professional presence in a network designed around healthcare.
          </p>
          <ul className="mt-9 space-y-4">
            {TRUST.map(({ icon: Icon, text }, i) => (
              <li key={i} className="flex items-start gap-3.5 anim-pop" style={{ animationDelay: `${120 + i * 90}ms` }}>
                <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/12 ring-1 ring-white/15">
                  <Icon size={18} />
                </span>
                <span className="text-sm leading-snug text-white/85">{text}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* mb lifts the footer clear above the fixed bottom-left NavArrows pill (bottom-5, ~48px tall) */}
        <p className="relative mb-16 text-xs text-white/55">© 2026 Orovion · Built for the healthcare community.</p>
      </aside>

      {/* Form panel */}
      <main className="flex items-center justify-center px-6 py-12 sm:px-10">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center justify-between lg:hidden">
            <Logo />
            <span className="chip bg-brand-50 text-brand-700">Healthcare network</span>
          </div>

          <StepProgress step={step} />

          <div key={step} className="anim-pop">
            {step === 0 && (
              <>
                <h2 className="mt-7 font-display text-3xl font-extrabold tracking-tight text-ink-900 text-balance">Which best describes you?</h2>
                <p className="mt-2 text-ink-500">This helps us personalize your experience and access within.</p>
                <div className="mt-7 space-y-3">
                  {ROLES.map((r, i) => {
                    const active = role === r.key;
                    return (
                      <button
                        key={r.key}
                        type="button"
                        onClick={() => setRole(r.key)}
                        aria-pressed={active}
                        style={{ animationDelay: `${i * 70}ms` }}
                        className={cn(
                          "press lift anim-pop flex w-full items-center gap-4 rounded-2xl border-2 p-4 text-left transition-colors duration-200",
                          active ? "border-brand-600 bg-brand-50 shadow-glow" : "border-ink-900/10 bg-surface hover:border-brand-300"
                        )}
                      >
                        <span className={cn("grid h-12 w-12 shrink-0 place-items-center rounded-xl transition-colors", active ? "bg-brand-600 text-white" : "bg-ink-900/[.05] text-ink-700")}>
                          <r.icon size={22} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-semibold text-ink-900">{r.title}</span>
                          <span className="block text-sm leading-snug text-ink-500">{r.desc}</span>
                        </span>
                        <span className={cn("grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 transition-all", active ? "border-brand-600 bg-brand-600 text-white" : "border-ink-400/40 text-transparent")}>
                          <Check size={14} strokeWidth={3} className={active ? "anim-pop" : ""} />
                        </span>
                      </button>
                    );
                  })}
                </div>
                <button onClick={() => setStep(1)} className="btn-primary mt-7 w-full py-3.5 text-base">Continue <ArrowRight size={18} /></button>
              </>
            )}

            {step === 1 && (
              <>
                <button onClick={() => { setErr(""); setStep(0); }} className="press mt-7 -ml-1 flex items-center gap-1 rounded-lg px-1 py-1 text-sm text-ink-500 transition hover:text-brand-700"><ArrowLeft size={16} /> Back</button>
                <h2 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-ink-900 text-balance">Enter your number</h2>
                <p className="mt-2 text-ink-500">Sign in or create your account. We'll text a 6-digit code.</p>

                <label htmlFor="phone" className="mt-7 block text-sm font-semibold text-ink-700">Phone number</label>
                <div className="mt-2 flex gap-2">
                  <CountrySelect value={country.dial} onChange={setCountry} />
                  <input id="phone" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))} placeholder="98765 43210" inputMode="numeric" className="input flex-1" maxLength={12} />
                </div>

                {err && <p className="mt-3 text-sm font-medium text-danger-700">{err}</p>}

                <button onClick={sendOtp} disabled={busy || phone.length < 6} className="btn-primary mt-6 w-full py-3.5 text-base">{busy ? "Sending…" : <>Send code <ArrowRight size={18} /></>}</button>

                <div className="my-5 flex items-center gap-3 text-xs font-medium text-ink-400"><span className="h-px flex-1 bg-ink-900/10" /> or <span className="h-px flex-1 bg-ink-900/10" /></div>

                <button onClick={googleSignIn} disabled={busy} className="btn-outline w-full py-3.5 text-base"><GoogleIcon /> {busy ? "Please wait…" : "Continue with Google"}</button>

                <p className="mt-7 text-center text-xs leading-relaxed text-ink-400">
                  By continuing you agree to our{" "}
                  <Link to="/terms" className="font-semibold text-ink-600 underline-offset-2 hover:text-brand-700 hover:underline">Terms</Link>{" "}and{" "}
                  <Link to="/privacy" className="font-semibold text-ink-600 underline-offset-2 hover:text-brand-700 hover:underline">Privacy Policy</Link>.
                </p>
              </>
            )}

            {step === 2 && (
              <Otp
                dial={country.dial}
                phone={phone}
                onResend={requestOtp}
                onVerify={async (code) => {
                  const firebaseIdToken = await confirmPhoneCode(code);
                  const res = await dok.auth.verifyOtp({ firebaseIdToken, deviceInfo: deviceInfo() });
                  enter(res);
                }}
                onBack={() => { setErr(""); setStep(1); }}
              />
            )}
          </div>

          {/* Invisible reCAPTCHA mount point required by Firebase Phone Auth. */}
          <div id="recaptcha-container" />
        </div>
      </main>
    </div>
  );
}

/* Slim role → number → verify progress. */
function StepProgress({ step }) {
  return (
    <div className="flex items-center gap-2" aria-hidden>
      {STEP_LABELS.map((label, i) => (
        <div key={label} className="flex flex-1 flex-col gap-1.5">
          <span className={cn("h-1 rounded-full transition-colors duration-300", i <= step ? "bg-brand-600" : "bg-ink-900/10")} />
          <span className={cn("text-[11px] font-semibold transition-colors", i === step ? "text-brand-700" : "text-ink-400")}>{label}</span>
        </div>
      ))}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden focusable="false">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
    </svg>
  );
}

function Otp({ dial, phone, onVerify, onResend, onBack }) {
  const [code, setCode] = useState(Array(6).fill(""));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [cooldown, setCooldown] = useState(60);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const set = (i, v) => {
    if (!/^\d?$/.test(v)) return;
    const next = [...code]; next[i] = v; setCode(next);
    if (v && i < 5) document.getElementById(`otp-${i + 1}`)?.focus();
  };

  const onKeyDown = (i, e) => {
    if (e.key === "Backspace" && !code[i] && i > 0) document.getElementById(`otp-${i - 1}`)?.focus();
  };

  // Premium detail: pasting the full SMS code fills every box at once.
  const onPaste = (e) => {
    const text = (e.clipboardData?.getData("text") || "").replace(/\D/g, "").slice(0, 6);
    if (!text) return;
    e.preventDefault();
    const next = Array(6).fill("");
    for (let i = 0; i < text.length; i += 1) next[i] = text[i];
    setCode(next);
    document.getElementById(`otp-${Math.min(text.length, 6) - 1}`)?.focus();
  };

  const verify = async () => {
    const value = code.join("");
    if (value.length < 6) { setErr("Enter all 6 digits."); return; }
    setErr(""); setBusy(true);
    try {
      await onVerify(value);
    } catch (e) {
      setErr(authError(e));
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    if (cooldown > 0 || busy) return;
    setErr("");
    try {
      await onResend();
      setCode(Array(6).fill(""));
      setCooldown(60);
    } catch (e) {
      setErr(authError(e));
    }
  };

  return (
    <>
      <button onClick={onBack} className="press mt-7 -ml-1 flex items-center gap-1 rounded-lg px-1 py-1 text-sm text-ink-500 transition hover:text-brand-700"><ArrowLeft size={16} /> Back</button>
      <h2 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-ink-900 text-balance">Verify it's you</h2>
      <p className="mt-2 text-ink-500">Enter the 6-digit code sent to {dial} {phone ? `•••• ${phone.slice(-4)}` : "your number"}.</p>

      <div className="mt-7 flex gap-2.5" onPaste={onPaste}>
        {code.map((c, i) => (
          <input
            key={i}
            id={`otp-${i}`}
            value={c}
            onChange={(e) => set(i, e.target.value)}
            onKeyDown={(e) => onKeyDown(i, e)}
            inputMode="numeric"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            maxLength={1}
            aria-label={`Digit ${i + 1}`}
            className={cn(
              "h-14 w-full rounded-xl border-2 text-center text-xl font-bold tabular-nums outline-none transition-all duration-150 focus:border-brand-500 focus:ring-4 focus:ring-brand-100",
              c ? "border-brand-500 bg-brand-50/60 text-ink-900" : "border-ink-900/[.12] text-ink-900"
            )}
          />
        ))}
      </div>

      {err && <p className="mt-3 text-sm font-medium text-danger-700">{err}</p>}

      <button onClick={verify} disabled={busy} className="btn-primary mt-7 w-full py-3.5 text-base">{busy ? "Verifying…" : <>Verify &amp; continue <ArrowRight size={18} /></>}</button>

      <p className="mt-4 text-center text-sm text-ink-400">
        Didn't receive a code?{" "}
        <button onClick={resend} disabled={cooldown > 0} className="font-semibold text-brand-700 transition disabled:text-ink-300">
          {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
        </button>
      </p>
    </>
  );
}

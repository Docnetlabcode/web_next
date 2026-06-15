"use client";
import { useState, useEffect } from "react";
import { useNavigate, Link } from "@/lib/router";
import { Stethoscope, GraduationCap, User, ArrowRight, ArrowLeft, ShieldCheck } from "lucide-react";
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
  { key: "doctor", icon: Stethoscope, title: "Health professional", desc: "Verified doctors, specialists & clinicians" },
  { key: "student", icon: GraduationCap, title: "Medical student", desc: "MBBS, MD, BDS & other medical degrees" },
  { key: "general_user", icon: User, title: "General user", desc: "Patients, caregivers & health enthusiasts" },
];

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
    <div className="grid min-h-screen lg:grid-cols-2">
      <NavArrows variant="floating" />
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 p-12 text-white lg:flex">
        <div className="absolute inset-0 grid-bg opacity-25" />
        <Link to="/" className="relative"><Logo light /></Link>
        <div className="relative">
          <h1 className="font-display text-4xl font-extrabold leading-tight">Verified by license.<br />Always private.</h1>
          <p className="mt-4 max-w-sm text-white/80">Join 12,400+ clinicians sharing cases, research and reels — and consulting in real time.</p>
          <div className="mt-8 flex items-center gap-3 rounded-2xl bg-white/10 p-4 backdrop-blur">
            <ShieldCheck size={28} />
            <p className="text-sm text-white/90">Every health professional is checked against medical registries before the badge appears.</p>
          </div>
        </div>
        <p className="relative text-xs text-white/60">© 2026 DokLynk</p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md animate-fade-up">
          <div className="lg:hidden"><Logo /></div>

          {step === 0 && (
            <>
              <h2 className="mt-8 font-display text-3xl font-extrabold text-ink-900">Which best describes you?</h2>
              <p className="mt-2 text-ink-500">We tailor your feed and verification flow to your role.</p>
              <div className="mt-7 space-y-3">
                {ROLES.map((r) => (
                  <button key={r.key} onClick={() => setRole(r.key)}
                    className={cn("flex w-full items-center gap-4 rounded-2xl border-2 p-4 text-left transition",
                      role === r.key ? "border-brand-600 bg-brand-50" : "border-ink-900/10 hover:border-brand-300")}>
                    <span className={cn("grid h-11 w-11 place-items-center rounded-xl", role === r.key ? "bg-brand-600 text-white" : "bg-ink-900/5 text-ink-700")}>
                      <r.icon size={20} />
                    </span>
                    <span className="flex-1">
                      <span className="block font-semibold text-ink-900">{r.title}</span>
                      <span className="block text-sm text-ink-500">{r.desc}</span>
                    </span>
                    <span className={cn("h-5 w-5 rounded-full border-2", role === r.key ? "border-brand-600 bg-brand-600" : "border-ink-400/40")} />
                  </button>
                ))}
              </div>
              <button onClick={() => setStep(1)} className="btn-primary mt-7 w-full py-3.5 text-base">Continue <ArrowRight size={18} /></button>
            </>
          )}

          {step === 1 && (
            <>
              <button onClick={() => { setErr(""); setStep(0); }} className="mt-8 flex items-center gap-1 text-sm text-ink-500 hover:text-brand-700"><ArrowLeft size={16} /> Back</button>
              <h2 className="mt-4 font-display text-3xl font-extrabold text-ink-900">Welcome back!</h2>
              <p className="mt-2 text-ink-500">Sign in or create your account with your phone number.</p>
              <label className="mt-7 block text-sm font-semibold text-ink-700">Phone number</label>
              <div className="mt-2 flex gap-2">
                <CountrySelect value={country.dial} onChange={setCountry} />
                <input value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))} placeholder="98765 43210" className="input flex-1" maxLength={12} />
              </div>
              {err && <p className="mt-3 text-sm text-rose-600">{err}</p>}
              <button onClick={sendOtp} disabled={busy || phone.length < 6} className="btn-primary mt-6 w-full py-3.5 text-base">{busy ? "Sending…" : "Continue"}</button>
              <div className="my-5 flex items-center gap-3 text-xs text-ink-400"><span className="h-px flex-1 bg-ink-900/10" /> or <span className="h-px flex-1 bg-ink-900/10" /></div>
              <button onClick={googleSignIn} disabled={busy} className="btn-outline w-full py-3.5 text-base">{busy ? "Please wait…" : "Continue with Google"}</button>
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

          {/* Invisible reCAPTCHA mount point required by Firebase Phone Auth. */}
          <div id="recaptcha-container" />
        </div>
      </div>
    </div>
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
      <button onClick={onBack} className="mt-8 flex items-center gap-1 text-sm text-ink-500 hover:text-brand-700"><ArrowLeft size={16} /> Back</button>
      <h2 className="mt-4 font-display text-3xl font-extrabold text-ink-900">Verify it's you.</h2>
      <p className="mt-2 text-ink-500">We sent a 6-digit code to {dial} {phone ? `•••• ${phone.slice(-4)}` : "your number"}.</p>
      <div className="mt-7 flex gap-2.5">
        {code.map((c, i) => (
          <input key={i} id={`otp-${i}`} value={c} onChange={(e) => set(i, e.target.value)} onKeyDown={(e) => onKeyDown(i, e)} inputMode="numeric" maxLength={1}
            className="h-14 w-full rounded-xl border-2 border-ink-900/[.12] text-center text-xl font-bold outline-none focus:border-brand-500" />
        ))}
      </div>
      {err && <p className="mt-3 text-sm text-rose-600">{err}</p>}
      <button onClick={verify} disabled={busy} className="btn-primary mt-7 w-full py-3.5 text-base">{busy ? "Verifying…" : "Verify & continue"}</button>
      <p className="mt-4 text-center text-sm text-ink-400">
        Didn't receive a code?{" "}
        <button onClick={resend} disabled={cooldown > 0} className="font-semibold text-brand-700 disabled:text-ink-300">
          {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
        </button>
      </p>
    </>
  );
}

"use client";
import { useEffect, useState } from "react";
import { useNavigate } from "@/lib/router";
import {
  ShieldCheck, Search, FileText, CheckCircle2, XCircle,
  RotateCcw, Eye, KeyRound, ChevronRight, X, LogOut, Loader2, UserRound, Phone,
} from "lucide-react";
import { Avatar, Logo, Spinner } from "@/components/ui/Primitives";
import NavArrows from "@/components/ui/NavArrows";
import { useAuth } from "@/context/AuthContext";
import { dok, setAdminKey } from "@/lib/api";
import { cn, compact, timeAgo } from "@/lib/utils";

/**
 * Standalone admin console at /admin — completely separate from the user app.
 * There is no link to it anywhere in the product UI; operators reach it only
 * by URL. Access requires the identity gate below (role, name, phone, and the
 * backend ADMIN_SECRET_KEY as password), verified against a live admin
 * endpoint before anything renders. The session lasts for the browser tab.
 */

const SESSION_KEY = "dl_admin_session";

const readSession = () => {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw || !localStorage.getItem("dl_admin_key")) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const STATUS = {
  not_started: { label: "Not started", cls: "bg-ink-900/[.06] text-ink-600" },
  pending: { label: "Pending", cls: "bg-amber-50 text-amber-600" },
  in_review: { label: "In review", cls: "bg-sky-50 text-sky-600" },
  verified: { label: "Verified", cls: "bg-emerald-50 text-emerald-600" },
  rejected: { label: "Rejected", cls: "bg-rose-50 text-rose-600" },
};
const TABS = ["pending", "in_review", "verified", "rejected", "all"];

export default function Admin() {
  const { demo } = useAuth();
  // null until mounted (avoids SSR/hydration mismatch reading sessionStorage)
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState(null);

  useEffect(() => {
    setSession(readSession());
    setReady(true);
  }, []);

  const signOut = () => {
    setAdminKey(null);
    sessionStorage.removeItem(SESSION_KEY);
    setSession(null);
  };

  if (!ready) {
    return <div className="grid min-h-screen place-items-center bg-ink-50"><Spinner className="h-8 w-8" /></div>;
  }
  if (!session) return <AdminGate demo={demo} onUnlock={setSession} />;
  return <AdminConsole session={session} demo={demo} onSignOut={signOut} />;
}

/* ---------------- identity gate ---------------- */

function AdminGate({ demo, onUnlock }) {
  const nav = useNavigate();
  const [form, setForm] = useState({ role: "Administrator", name: "", phone: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const valid =
    form.name.trim().length >= 2 &&
    /^\+?[\d\s-]{8,16}$/.test(form.phone.trim()) &&
    form.password.length >= 4;

  const submit = async (e) => {
    e.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    setErr("");
    setAdminKey(form.password);
    try {
      // Live check against a protected admin endpoint — wrong key → 401/403.
      await dok.admin.stats();
      const s = { role: form.role, name: form.name.trim(), phone: form.phone.trim(), at: Date.now() };
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
      onUnlock(s);
    } catch {
      setAdminKey(null);
      setErr("Access denied. The password doesn't match the admin secret key.");
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-ink-900 px-4 py-10">
      <NavArrows variant="floating" />
      {/* deliberately spare: this surface is for operators, not users */}
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2 text-white/80">
          <Logo withText={false} size={28} />
          <span className="font-display text-lg font-extrabold text-white">DokLynk <span className="text-brand-300">Admin</span></span>
        </div>

        <form onSubmit={submit} className="anim-pop rounded-3xl bg-white p-6 shadow-2xl">
          <div className="mb-5 flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-600 text-white shadow-glow"><ShieldCheck size={22} /></span>
            <div>
              <h1 className="font-display text-lg font-extrabold text-ink-900">Restricted area</h1>
              <p className="text-xs text-ink-500">Identify yourself to open the console.</p>
            </div>
          </div>

          <label className="mb-1 block text-xs font-bold text-ink-600" htmlFor="adm-role">Role</label>
          <select id="adm-role" value={form.role} onChange={set("role")} className="input mb-3 appearance-none">
            <option>Administrator</option>
            <option>Moderator</option>
            <option>Verification reviewer</option>
          </select>

          <label className="mb-1 block text-xs font-bold text-ink-600" htmlFor="adm-name">Full name</label>
          <div className="relative mb-3">
            <UserRound size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
            <input id="adm-name" value={form.name} onChange={set("name")} placeholder="Operator name" autoComplete="name" className="input pl-9" />
          </div>

          <label className="mb-1 block text-xs font-bold text-ink-600" htmlFor="adm-phone">Phone number</label>
          <div className="relative mb-3">
            <Phone size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
            <input id="adm-phone" value={form.phone} onChange={set("phone")} placeholder="+91 98xxxxxx00" inputMode="tel" autoComplete="tel" className="input pl-9" />
          </div>

          <label className="mb-1 block text-xs font-bold text-ink-600" htmlFor="adm-pass">Password</label>
          <div className="relative">
            <KeyRound size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
            <input id="adm-pass" value={form.password} onChange={set("password")} type="password" placeholder="Admin secret key" autoComplete="off" className="input pl-9" />
          </div>
          <p className="mt-1.5 text-[11px] text-ink-400">Sent as <code className="rounded bg-ink-900/[.05] px-1 py-0.5">x-admin-key</code> and checked against the backend before entry.</p>

          {err && <p role="alert" className="anim-pop mt-3 rounded-xl bg-danger-50 px-3 py-2 text-xs font-semibold text-danger-700">{err}</p>}

          <button type="submit" disabled={!valid || busy} className="btn-primary mt-4 w-full py-3 text-sm">
            {busy ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />} Enter console
          </button>
        </form>

        <button onClick={() => nav("/")} className="mx-auto mt-5 block text-xs text-white/50 transition hover:text-white/80">← Back to doklynk.app</button>
      </div>
    </div>
  );
}

/* ---------------- console ---------------- */

function AdminConsole({ session, demo, onSignOut }) {
  const [stats, setStats] = useState(null);
  const [tab, setTab] = useState("pending");
  const [rows, setRows] = useState(null);
  const [selected, setSelected] = useState(null);

  const load = () => {
    dok.admin.stats().then((d) => setStats(d.stats)).catch(() => setStats(null));
    dok.admin.list(tab).then((d) => setRows(d.verifications || [])).catch(() => setRows([]));
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [tab]);

  const act = async (userId, action, body) => {
    setRows((r) => r?.filter((x) => x.userId !== userId) ?? r);
    setSelected(null);
    try { await dok.admin[action](userId, body || {}); load(); } catch {}
  };

  return (
    <div className="min-h-screen bg-ink-50 pb-24">
      {/* console topbar */}
      <header className="glass sticky top-0 z-40 border-b border-ink-900/[.06]">
        <div className="mx-auto flex h-16 max-w-4xl items-center gap-3 px-4 sm:px-6">
          <Logo withText={false} size={28} />
          <NavArrows />
          <span className="font-display font-extrabold text-ink-900">Admin console</span>
          <span className="chip bg-brand-50 text-brand-700"><ShieldCheck size={13} /> {session.role}</span>
          <div className="ml-auto text-right">
            <p className="text-sm font-semibold leading-tight text-ink-900">{session.name}</p>
            <p className="text-[11px] leading-tight text-ink-400">{session.phone}</p>
          </div>
          <button onClick={onSignOut} title="Sign out of the console" className="press ml-2 flex items-center gap-1.5 rounded-full border border-ink-900/[.1] bg-white px-3 py-1.5 text-xs font-bold text-ink-600 transition hover:border-danger-500/40 hover:text-danger-500">
            <LogOut size={13} /> Sign out
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 pt-6 sm:px-6">
        <h1 className="font-display text-2xl font-extrabold text-ink-900">Verifications</h1>
        <p className="text-sm text-ink-500">Review doctor KYC submissions and reported content.</p>

        {/* Stat cards */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {stats && Object.entries(stats).map(([k, v]) => {
            const s = STATUS[k] || { label: k.replace("_", " "), cls: "bg-ink-900/[.06] text-ink-600" };
            return (
              <button key={k} onClick={() => TABS.includes(k) && setTab(k)} className="card p-3.5 text-left transition hover:-translate-y-0.5 hover:shadow-glow">
                <p className="text-2xl font-extrabold text-ink-900">{compact(v)}</p>
                <span className={cn("chip mt-1 text-[10px]", s.cls)}>{s.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tabs */}
        <div className="mt-6 flex gap-2 overflow-x-auto">
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)} className={cn("whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold capitalize transition", tab === t ? "bg-brand-600 text-white shadow-glow" : "bg-white text-ink-600 hover:bg-brand-50")}>
              {t.replace("_", " ")}
            </button>
          ))}
        </div>

        {/* Queue */}
        <div className="card mt-4 divide-y divide-ink-900/[.05]">
          {(rows || []).length === 0 ? (
            <div className="py-16 text-center">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-brand-50 text-brand-600"><CheckCircle2 size={26} /></span>
              <p className="mt-3 font-semibold">Queue is clear</p>
              <p className="text-sm text-ink-500">No {tab.replace("_", " ")} verifications right now.</p>
            </div>
          ) : (
            (rows || []).map((v) => {
              const s = STATUS[v.kycStatus];
              return (
                <button key={v.userId} onClick={() => setSelected(v)} className="flex w-full items-center gap-3 p-4 text-left transition hover:bg-ink-900/[.02]">
                  <Avatar user={v.user} size={44} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-ink-900">{v.user.fullName}</p>
                    <p className="truncate text-xs text-ink-500">{v.specializations?.join(", ")} · {v.countryOfPractice} · submitted {timeAgo(v.submittedAt)}</p>
                  </div>
                  <div className="hidden items-center gap-2 sm:flex">
                    <span className="chip bg-ink-900/[.04] text-ink-600 text-[10px]"><FileText size={11} /> {v.certificatesCount} docs</span>
                    <span className={cn("chip text-[10px]", s.cls)}>{s.label}</span>
                  </div>
                  <ChevronRight size={18} className="text-ink-300" />
                </button>
              );
            })
          )}
        </div>
      </div>

      {selected && <ReviewDrawer v={selected} onClose={() => setSelected(null)} onAct={act} />}
    </div>
  );
}

function ReviewDrawer({ v, onClose, onAct }) {
  const [reason, setReason] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const s = STATUS[v.kycStatus];
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 animate-fade-in bg-ink-900/40" onClick={onClose} />
      <div className="relative ml-auto flex h-full w-full max-w-md animate-[scale-in_.3s_cubic-bezier(.21,.65,.36,1)_both] flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-ink-900/[.06] p-5">
          <h3 className="font-display text-lg font-extrabold">Review verification</h3>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-ink-900/5"><X size={18} /></button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          <div className="flex items-center gap-3">
            <Avatar user={v.user} size={56} />
            <div>
              <p className="font-bold text-ink-900">{v.user.fullName}</p>
              <p className="text-xs text-ink-500">{v.user.email} · {v.user.phoneNumber}</p>
              <span className={cn("chip mt-1.5 text-[10px]", s.cls)}>{s.label}</span>
            </div>
          </div>

          <Detail label="Verification path" value={v.verificationPath} />
          <Detail label="Specializations" value={v.specializations?.join(", ")} />
          <Detail label="Medical license #" value={v.medicalLicenseNumber || "—"} />
          <Detail label="Registration #" value={v.registrationNumber || "—"} />
          <Detail label="Country of practice" value={v.countryOfPractice} />
          <Detail label="License type" value={v.licenseType} />

          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-400">Documents ({v.certificatesCount})</p>
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: Math.max(v.certificatesCount, 1) }).map((_, i) => (
                <div key={i} className="grid aspect-square place-items-center rounded-xl border border-ink-900/[.08] bg-ink-900/[.02] text-ink-400">
                  <FileText size={20} />
                </div>
              ))}
            </div>
          </div>

          {v.rejectionReason && (
            <div className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">Last rejection: {v.rejectionReason}</div>
          )}

          {rejecting && (
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="Reason for rejection (required, shown to the doctor)…" className="input resize-none" />
          )}
        </div>

        {/* Action bar */}
        <div className="border-t border-ink-900/[.06] p-4">
          {!rejecting ? (
            <div className="grid grid-cols-2 gap-2">
              {v.kycStatus === "pending" && (
                <button onClick={() => onAct(v.userId, "review", { adminNotes: "Reviewing" })} className="btn-outline col-span-2 py-2.5 text-sm"><Eye size={16} /> Mark in review</button>
              )}
              <button onClick={() => onAct(v.userId, "approve", { adminNotes: "All documents verified" })} className="btn-primary py-2.5 text-sm"><CheckCircle2 size={16} /> Approve</button>
              <button onClick={() => setRejecting(true)} className="btn py-2.5 text-sm bg-rose-50 text-rose-600 hover:bg-rose-100"><XCircle size={16} /> Reject</button>
              <button onClick={() => onAct(v.userId, "reset", { adminNotes: "Reset for re-submission" })} className="btn-outline col-span-2 py-2.5 text-sm"><RotateCcw size={16} /> Reset to not started</button>
            </div>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => setRejecting(false)} className="btn-outline flex-1 py-2.5 text-sm">Cancel</button>
              <button disabled={!reason.trim()} onClick={() => onAct(v.userId, "reject", { rejectionReason: reason })} className="btn flex-1 py-2.5 text-sm bg-rose-600 text-white hover:bg-rose-700">Confirm rejection</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div className="flex items-center justify-between border-b border-ink-900/[.05] pb-2">
      <span className="text-sm text-ink-500">{label}</span>
      <span className="text-sm font-semibold capitalize text-ink-900">{value}</span>
    </div>
  );
}

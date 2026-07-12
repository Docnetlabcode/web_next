"use client";
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "@/lib/router";
import {
  ShieldCheck, LayoutDashboard, Users2, FileStack, BadgeCheck, Flag, MessageSquareText,
  Trash2, ScrollText, LogOut, Loader2, KeyRound, UserRound, Search, X, ChevronRight,
  CheckCircle2, XCircle, RotateCcw, Eye, Ban, UserX, RefreshCw, Circle, AlertTriangle,
  Stethoscope, GraduationCap, User, Film, FileText, BookOpen, Dot,
} from "lucide-react";
import { Avatar, Logo, Spinner } from "@/components/ui/Primitives";
import NavArrows from "@/components/ui/NavArrows";
import { dok, ADMIN_TOKENS } from "@/lib/api";
import { cn, compact, timeAgo } from "@/lib/utils";

/**
 * Operator-only admin console at /admin — fully separate from the product app.
 * No link points here; operators reach it by URL. Login uses the server's env
 * ADMIN_USERNAME / ADMIN_PASSWORD, verified against the backend, which returns a
 * short-lived admin JWT (held in sessionStorage by ADMIN_TOKENS). The session
 * lasts for the browser tab.
 */

/* =========================================================================
   Root: auth gate
   ========================================================================= */
export default function Admin() {
  const [ready, setReady] = useState(false);
  const [admin, setAdmin] = useState<any>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (ADMIN_TOKENS.access) {
        try {
          const { admin } = await dok.admin.me();
          if (alive) setAdmin(admin);
        } catch { ADMIN_TOKENS.clear(); }
      }
      if (alive) setReady(true);
    })();
    const onExpire = () => setAdmin(null);
    window.addEventListener("dl:admin-expired", onExpire);
    return () => { alive = false; window.removeEventListener("dl:admin-expired", onExpire); };
  }, []);

  const signOut = async () => { await dok.admin.logout(); setAdmin(null); };

  if (!ready) return <div className="grid min-h-screen place-items-center bg-ink-50"><Spinner className="h-8 w-8" /></div>;
  if (!admin) return <AdminGate onIn={setAdmin} />;
  return <AdminConsole admin={admin} onSignOut={signOut} />;
}

/* =========================================================================
   Login gate
   ========================================================================= */
function AdminGate({ onIn }: { onIn: (a: any) => void }) {
  const nav = useNavigate();
  const [form, setForm] = useState({ username: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const valid = form.username.trim().length >= 1 && form.password.length >= 1;

  const submit = async (e) => {
    e.preventDefault();
    if (!valid || busy) return;
    setBusy(true); setErr("");
    try {
      const { admin } = await dok.admin.login(form.username.trim(), form.password);
      onIn(admin);
    } catch (e: any) {
      setErr(e?.response?.data?.message || "Access denied. Check your credentials.");
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-ink-950 px-4 py-10">
      <NavArrows variant="floating" className="" />
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2">
          <Logo withText={false} size={28} light />
          <span className="font-display text-lg font-extrabold text-white">Orovion <span className="text-brand-300">Admin</span></span>
        </div>
        <form onSubmit={submit} className="anim-pop rounded-3xl bg-surface p-6 shadow-2xl">
          <div className="mb-5 flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-600 text-white shadow-glow"><ShieldCheck size={22} /></span>
            <div>
              <h1 className="font-display text-lg font-extrabold text-ink-900">Restricted area</h1>
              <p className="text-xs text-ink-500">Sign in with your admin credentials.</p>
            </div>
          </div>

          <label className="mb-1 block text-xs font-bold text-ink-600" htmlFor="adm-user">User ID</label>
          <div className="relative mb-3">
            <UserRound size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
            <input id="adm-user" value={form.username} onChange={set("username")} placeholder="admin username" autoComplete="username" className="input pl-9" />
          </div>

          <label className="mb-1 block text-xs font-bold text-ink-600" htmlFor="adm-pass">Password</label>
          <div className="relative">
            <KeyRound size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
            <input id="adm-pass" value={form.password} onChange={set("password")} type="password" placeholder="password" autoComplete="current-password" className="input pl-9" />
          </div>

          {err && <p role="alert" className="anim-pop mt-3 rounded-xl bg-danger-50 px-3 py-2 text-xs font-semibold text-danger-700">{err}</p>}

          <button type="submit" disabled={!valid || busy} className="btn-primary mt-4 w-full py-3 text-sm">
            {busy ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />} Enter console
          </button>
        </form>
        <button onClick={() => nav("/")} className="mx-auto mt-5 block text-xs text-white/50 transition hover:text-white/80">← Back to orovion.app</button>
      </div>
    </div>
  );
}

/* =========================================================================
   Console shell
   ========================================================================= */
const NAV = [
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "users", label: "Users", icon: Users2 },
  { key: "content", label: "Content", icon: FileStack },
  { key: "verifications", label: "Verifications", icon: BadgeCheck },
  { key: "reports", label: "Reports", icon: Flag },
  { key: "feedback", label: "Feedback", icon: MessageSquareText },
  { key: "deletions", label: "Deletions", icon: Trash2 },
  { key: "audit", label: "Audit log", icon: ScrollText },
];

function AdminConsole({ admin, onSignOut }: { admin: any; onSignOut: () => void }) {
  const [tab, setTab] = useState("overview");

  return (
    <div className="min-h-screen bg-ink-50">
      <header className="glass sticky top-0 z-40 border-b border-ink-900/[.06]">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
          <Logo withText={false} size={28} />
          <span className="font-display font-extrabold text-ink-900">Admin console</span>
          <span className="chip bg-brand-50 text-brand-700"><ShieldCheck size={13} /> {admin?.role === "SUPER_ADMIN" ? "Super admin" : admin?.role}</span>
          <div className="ml-auto text-right">
            <p className="text-sm font-semibold leading-tight text-ink-900">{admin?.username}</p>
          </div>
          <button onClick={onSignOut} title="Sign out" className="press ml-2 flex items-center gap-1.5 rounded-full border border-ink-900/[.1] bg-surface px-3 py-1.5 text-xs font-bold text-ink-600 transition hover:border-danger-500/40 hover:text-danger-500">
            <LogOut size={13} /> Sign out
          </button>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6 sm:px-6">
        {/* Sidebar */}
        <nav className="hidden w-52 shrink-0 lg:block">
          <div className="sticky top-24 space-y-1">
            {NAV.map((n) => (
              <button key={n.key} onClick={() => setTab(n.key)}
                className={cn("flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition",
                  tab === n.key ? "bg-brand-600 text-white shadow-glow" : "text-ink-600 hover:bg-surface")}>
                <n.icon size={17} /> {n.label}
              </button>
            ))}
          </div>
        </nav>

        {/* Mobile tab pills */}
        <div className="min-w-0 flex-1">
          <div className="mb-4 flex gap-2 overflow-x-auto lg:hidden">
            {NAV.map((n) => (
              <button key={n.key} onClick={() => setTab(n.key)}
                className={cn("flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-2 text-xs font-semibold transition",
                  tab === n.key ? "bg-brand-600 text-white" : "bg-surface text-ink-600")}>
                <n.icon size={14} /> {n.label}
              </button>
            ))}
          </div>

          {tab === "overview" && <Overview />}
          {tab === "users" && <UsersSection />}
          {tab === "content" && <ContentSection />}
          {tab === "verifications" && <VerificationsSection />}
          {tab === "reports" && <ReportsSection />}
          {tab === "feedback" && <FeedbackSection />}
          {tab === "deletions" && <DeletionsSection />}
          {tab === "audit" && <AuditSection />}
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   Shared bits
   ========================================================================= */
function Stat({ label, value, tone = "ink" }: { label: string; value: any; tone?: string }) {
  const tones: any = {
    ink: "text-ink-900", brand: "text-brand-600", emerald: "text-emerald-600",
    amber: "text-amber-600", rose: "text-rose-600", sky: "text-sky-600",
  };
  return (
    <div className="card p-4">
      <p className={cn("text-2xl font-extrabold", tones[tone] || tones.ink)}>{compact(value ?? 0)}</p>
      <p className="mt-0.5 text-xs font-medium text-ink-500">{label}</p>
    </div>
  );
}

function SectionHead({ title, subtitle, right }: any) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-ink-900">{title}</h1>
        {subtitle && <p className="text-sm text-ink-500">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

function Empty({ icon: Icon = CheckCircle2, title = "Nothing here", sub = "" }) {
  return (
    <div className="card py-16 text-center">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-brand-50 text-brand-600"><Icon size={26} /></span>
      <p className="mt-3 font-semibold text-ink-900">{title}</p>
      {sub && <p className="text-sm text-ink-500">{sub}</p>}
    </div>
  );
}

const STATUS_CHIP: any = {
  ACTIVE: "bg-emerald-50 text-emerald-600", DEACTIVATED: "bg-ink-900/[.06] text-ink-600",
  SUSPENDED: "bg-rose-50 text-rose-600", PENDING_DELETION: "bg-amber-50 text-amber-600",
};
const ROLE_ICON: any = { doctor: Stethoscope, student: GraduationCap, general_user: User };

/* =========================================================================
   Overview
   ========================================================================= */
function Overview() {
  const [o, setO] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async (refresh = false) => {
    setLoading(true);
    try { const d = await dok.admin.overview(refresh); setO(d.overview); } catch { setO(null); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  if (loading && !o) return <div className="grid h-64 place-items-center"><Spinner className="h-7 w-7" /></div>;
  if (!o) return <Empty icon={AlertTriangle} title="Couldn't load overview" sub="Try refreshing." />;

  const u = o.users, c = o.content;
  return (
    <div className="space-y-6">
      <SectionHead title="Overview" subtitle={`Live snapshot · presence: ${o.presenceSource}`}
        right={<button onClick={() => load(true)} className="btn-outline px-3 py-2 text-xs"><RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh</button>} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Total users" value={u.total} tone="brand" />
        <Stat label="Online now" value={u.onlineNow} tone="emerald" />
        <Stat label="Offline" value={u.offline} />
        <Stat label="Active (7d)" value={u.active7d} tone="sky" />
        <Stat label="Verified pros" value={u.verified} tone="emerald" />
        <Stat label="New (7d)" value={u.new7d} tone="brand" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="By role">
          <Row label="Doctors" value={u.byRole.doctor} icon={Stethoscope} />
          <Row label="Students" value={u.byRole.student} icon={GraduationCap} />
          <Row label="General users" value={u.byRole.general_user} icon={User} />
        </Panel>
        <Panel title="Account status">
          <Row label="Active" value={u.byStatus.active} tone="emerald" />
          <Row label="Suspended (blocked)" value={u.byStatus.suspended} tone="rose" />
          <Row label="Deactivated" value={u.byStatus.deactivated} />
          <Row label="Pending deletion" value={u.byStatus.pending_deletion} tone="amber" />
        </Panel>
        <Panel title="Deletions">
          <Row label="Scheduled" value={o.deletions.scheduled} tone="amber" />
          <Row label="Permanently deleted (all-time)" value={o.deletions.permanentAllTime} tone="rose" />
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Content">
          <Row label="Posts" value={c.posts.post} icon={FileText} />
          <Row label="Research" value={c.posts.research} icon={BookOpen} />
          <Row label="Thesis" value={c.posts.thesis} icon={BookOpen} />
          <Row label="Case studies (posts)" value={c.posts.case_study} icon={BookOpen} />
          <Row label="Reels" value={c.reels} icon={Film} />
          <Row label="Clinical cases" value={c.clinicalCases} icon={FileStack} />
        </Panel>
        <Panel title="Consultations">
          <Row label="Total" value={o.consultations.total} tone="brand" />
          <Row label="Pending" value={o.consultations.pending} tone="amber" />
          <Row label="Approved" value={o.consultations.approved} tone="emerald" />
          <Row label="Declined / refunded" value={o.consultations.declined + o.consultations.refunded} />
        </Panel>
        <Panel title="Feedback & moderation">
          <Row label="Feedback total" value={o.feedback.total} tone="brand" />
          <Row label="Reports pending" value={o.reports.pending} tone="rose" />
          <Row label="Doctor KYC pending" value={o.verifications.doctor.submitted + o.verifications.doctor.inReview} tone="amber" />
          <Row label="Student KYC pending" value={o.verifications.student.submitted} tone="amber" />
        </Panel>
      </div>
    </div>
  );
}

function Panel({ title, children }: any) {
  return (
    <div className="card p-4">
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-400">{title}</p>
      <div className="divide-y divide-ink-900/[.05]">{children}</div>
    </div>
  );
}
function Row({ label, value, tone = "ink", icon: Icon }: any) {
  const tones: any = { ink: "text-ink-900", brand: "text-brand-600", emerald: "text-emerald-600", amber: "text-amber-600", rose: "text-rose-600" };
  return (
    <div className="flex items-center justify-between py-2">
      <span className="flex items-center gap-2 text-sm text-ink-600">{Icon && <Icon size={15} className="text-ink-400" />}{label}</span>
      <span className={cn("text-sm font-extrabold", tones[tone])}>{compact(value ?? 0)}</span>
    </div>
  );
}

/* =========================================================================
   Users
   ========================================================================= */
const ROLE_FILTERS = ["", "doctor", "student", "general_user"];
const STATUS_FILTERS = ["", "active", "suspended", "deactivated", "pending_deletion"];

function UsersSection() {
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [rows, setRows] = useState<any[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState<any>(null);

  const load = useCallback(async (reset = true) => {
    setLoading(true);
    try {
      const params: any = { limit: 20 };
      if (q.trim()) params.q = q.trim();
      if (role) params.role = role;
      if (status) params.status = status;
      if (!reset && cursor) params.cursor = cursor;
      const d = await dok.admin.users(params);
      setRows((prev) => (reset ? d.users : [...prev, ...d.users]));
      setHasMore(d.hasMore); setCursor(d.nextCursor);
    } catch { if (reset) setRows([]); }
    setLoading(false);
  }, [q, role, status, cursor]);

  // reload whenever filters change (debounced on q)
  useEffect(() => { const t = setTimeout(() => load(true), 250); return () => clearTimeout(t); /* eslint-disable-next-line */ }, [q, role, status]);

  return (
    <div>
      <SectionHead title="Users" subtitle="Search, block, deactivate, or permanently delete accounts." />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email, username, phone…" className="input pl-9" />
        </div>
        <Select value={role} onChange={setRole} options={ROLE_FILTERS} labels={{ "": "All roles", doctor: "Doctors", student: "Students", general_user: "General" }} />
        <Select value={status} onChange={setStatus} options={STATUS_FILTERS} labels={{ "": "All status", active: "Active", suspended: "Blocked", deactivated: "Deactivated", pending_deletion: "Pending delete" }} />
      </div>

      <div className="card divide-y divide-ink-900/[.05]">
        {loading && rows.length === 0 ? (
          <div className="grid h-40 place-items-center"><Spinner className="h-6 w-6" /></div>
        ) : rows.length === 0 ? (
          <Empty icon={Users2} title="No users found" sub="Try a different search or filter." />
        ) : rows.map((u) => (
          <button key={u.id} onClick={() => setSel(u)} className="flex w-full items-center gap-3 p-3.5 text-left transition hover:bg-ink-900/[.02]">
            <div className="relative">
              <Avatar user={u} size={42} />
              {u.isOnline && <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-surface bg-emerald-500" title="Online" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-ink-900">{u.fullName || "—"} {u.isVerified && <BadgeCheck size={13} className="inline text-brand-500" />}</p>
              <p className="truncate text-xs text-ink-500">{u.email || u.phoneNumber || u.uniqueUsername || u.id}</p>
            </div>
            <span className="hidden text-xs capitalize text-ink-500 sm:block">{u.role?.replace("_", " ")}</span>
            <span className={cn("chip text-[10px]", STATUS_CHIP[u.accountStatus] || "bg-ink-900/[.06] text-ink-600")}>{u.accountStatus?.replace("_", " ").toLowerCase()}</span>
            <ChevronRight size={18} className="text-ink-300" />
          </button>
        ))}
      </div>

      {hasMore && <button onClick={() => load(false)} disabled={loading} className="btn-outline mx-auto mt-4 block px-4 py-2 text-sm">{loading ? "Loading…" : "Load more"}</button>}

      {sel && <UserDrawer userRow={sel} onClose={() => setSel(null)} onChanged={() => { setSel(null); load(true); }} />}
    </div>
  );
}

function Select({ value, onChange, options, labels }: any) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="input w-auto appearance-none py-2 text-sm">
      {options.map((o: string) => <option key={o} value={o}>{labels[o] ?? o}</option>)}
    </select>
  );
}

function UserDrawer({ userRow, onClose, onChanged }: any) {
  const [detail, setDetail] = useState<any>(null);
  const [mode, setMode] = useState<null | "suspend" | "delete">(null);
  const [reason, setReason] = useState("");
  const [hours, setHours] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { dok.admin.user(userRow.id).then(setDetail).catch(() => setDetail({ user: userRow, stats: null })); }, [userRow.id]);

  const act = async (fn: () => Promise<any>) => { setBusy(true); try { await fn(); onChanged(); } catch (e: any) { alert(e?.response?.data?.message || "Action failed."); setBusy(false); } };

  const u = detail?.user || userRow;
  const s = detail?.stats;

  return (
    <Drawer onClose={onClose} title="User details">
      <div className="flex items-center gap-3">
        <div className="relative"><Avatar user={u} size={56} />{u.isOnline && <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-surface bg-emerald-500" />}</div>
        <div className="min-w-0">
          <p className="truncate font-bold text-ink-900">{u.fullName || "—"} {u.isVerified && <BadgeCheck size={14} className="inline text-brand-500" />}</p>
          <p className="truncate text-xs text-ink-500">{u.email || u.phoneNumber} · @{u.uniqueUsername || "—"}</p>
          <span className={cn("chip mt-1.5 text-[10px]", STATUS_CHIP[u.accountStatus] || "bg-ink-900/[.06] text-ink-600")}>{u.accountStatus?.replace("_", " ").toLowerCase()}</span>
        </div>
      </div>

      {u.suspendedUntil && <div className="mt-3 rounded-xl bg-rose-50 p-2.5 text-xs text-rose-700">Blocked until {new Date(u.suspendedUntil).toLocaleString()}{u.suspensionReason ? ` · ${u.suspensionReason}` : ""}</div>}
      {u.accountStatus === "SUSPENDED" && !u.suspendedUntil && <div className="mt-3 rounded-xl bg-rose-50 p-2.5 text-xs text-rose-700">Permanently blocked{u.suspensionReason ? ` · ${u.suspensionReason}` : ""}</div>}

      {s && (
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          {[["Posts", s.content?.posts], ["Reels", s.content?.reels], ["Cases", s.content?.cases],
            ["As patient", s.consultations?.asPatient], ["As doctor", s.consultations?.asDoctor], ["Reports", s.pendingReportsAgainst]].map(([l, v]) => (
            <div key={l as string} className="rounded-xl bg-ink-900/[.03] p-2">
              <p className="text-lg font-extrabold text-ink-900">{compact((v as number) ?? 0)}</p>
              <p className="text-[10px] text-ink-500">{l}</p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 space-y-1 text-xs text-ink-500">
        <p>Role: <span className="capitalize text-ink-700">{u.role?.replace("_", " ")}</span></p>
        <p>Joined: {timeAgo(u.createdAt)}</p>
        {u.lastActiveAt && <p>Last active: {timeAgo(u.lastActiveAt)}</p>}
        <p className="break-all">ID: {u.id}</p>
      </div>

      {/* Action forms */}
      {mode === "suspend" && (
        <div className="mt-4 space-y-2 rounded-xl border border-rose-200 bg-rose-50/50 p-3">
          <p className="text-sm font-bold text-rose-700">Block user</p>
          <input value={hours} onChange={(e) => setHours(e.target.value)} placeholder="Duration in hours (blank = permanent)" inputMode="numeric" className="input text-sm" />
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="Reason (shown to the user)…" className="input resize-none text-sm" />
          <div className="flex gap-2">
            <button onClick={() => setMode(null)} className="btn-outline flex-1 py-2 text-sm">Cancel</button>
            <button disabled={busy} onClick={() => act(() => dok.admin.suspendUser(u.id, { reason: reason || null, durationHours: hours ? Number(hours) : undefined }))} className="btn flex-1 bg-rose-600 py-2 text-sm text-white hover:bg-rose-700">{busy ? "…" : hours ? "Block temporarily" : "Block permanently"}</button>
          </div>
        </div>
      )}
      {mode === "delete" && (
        <div className="mt-4 space-y-2 rounded-xl border border-rose-300 bg-rose-50 p-3">
          <p className="flex items-center gap-1.5 text-sm font-bold text-rose-700"><AlertTriangle size={15} /> Permanently delete</p>
          <p className="text-xs text-rose-600">This erases the account and all their content across every service. It cannot be undone. Type <b>DELETE</b> to confirm.</p>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="Reason (recorded in the audit log)…" className="input resize-none text-sm" />
          <input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="Type DELETE" className="input text-sm" />
          <div className="flex gap-2">
            <button onClick={() => setMode(null)} className="btn-outline flex-1 py-2 text-sm">Cancel</button>
            <button disabled={busy || confirmText !== "DELETE"} onClick={() => act(() => dok.admin.deleteUser(u.id, { reason: reason || null }))} className="btn flex-1 bg-rose-700 py-2 text-sm text-white hover:bg-rose-800 disabled:opacity-40">{busy ? "Deleting…" : "Delete forever"}</button>
          </div>
        </div>
      )}

      {!mode && (
        <div className="mt-5 grid grid-cols-2 gap-2">
          {u.accountStatus === "SUSPENDED"
            ? <button disabled={busy} onClick={() => act(() => dok.admin.unsuspendUser(u.id))} className="btn-primary col-span-2 py-2.5 text-sm"><RotateCcw size={16} /> Unblock user</button>
            : <button onClick={() => { setReason(""); setHours(""); setMode("suspend"); }} className="btn col-span-2 bg-rose-50 py-2.5 text-sm text-rose-600 hover:bg-rose-100"><Ban size={16} /> Block user</button>}
          {u.accountStatus !== "DEACTIVATED" && u.accountStatus !== "SUSPENDED" &&
            <button disabled={busy} onClick={() => act(() => dok.admin.deactivateUser(u.id, {}))} className="btn-outline col-span-2 py-2.5 text-sm"><UserX size={16} /> Deactivate (reversible)</button>}
          <button onClick={() => { setReason(""); setConfirmText(""); setMode("delete"); }} className="btn col-span-2 border border-rose-300 bg-surface py-2.5 text-sm text-rose-700 hover:bg-rose-50"><Trash2 size={16} /> Permanently delete</button>
        </div>
      )}
    </Drawer>
  );
}

/* =========================================================================
   Content
   ========================================================================= */
const CONTENT_TABS = [
  { key: "post", label: "Posts", icon: FileText },
  { key: "research", label: "Research", icon: BookOpen },
  { key: "thesis", label: "Thesis", icon: BookOpen },
  { key: "case_study", label: "Case studies", icon: BookOpen },
  { key: "reel", label: "Reels", icon: Film },
  { key: "clinical_case", label: "Clinical cases", icon: FileStack },
];

function ContentSection() {
  const [type, setType] = useState("post");
  const [q, setQ] = useState("");
  const [items, setItems] = useState<any[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (reset = true) => {
    setLoading(true);
    try {
      const params: any = { type, limit: 20 };
      if (q.trim()) params.q = q.trim();
      if (!reset && cursor) params.cursor = cursor;
      const d = await dok.admin.content(params);
      setItems((prev) => (reset ? d.items : [...prev, ...d.items]));
      setHasMore(d.hasMore); setCursor(d.nextCursor);
    } catch { if (reset) setItems([]); }
    setLoading(false);
  }, [type, q, cursor]);
  useEffect(() => { const t = setTimeout(() => load(true), 250); return () => clearTimeout(t); /* eslint-disable-next-line */ }, [type, q]);

  const del = async (it: any) => {
    if (!confirm(`Delete this ${type.replace("_", " ")}? It will be removed from the app.`)) return;
    try { await dok.admin.deleteContent(type, it.id, {}); setItems((prev) => prev.filter((x) => x.id !== it.id)); } catch (e: any) { alert(e?.response?.data?.message || "Failed."); }
  };

  return (
    <div>
      <SectionHead title="Content" subtitle="Remove any post, reel, thesis, case study, or clinical case." />
      <div className="mb-4 flex gap-2 overflow-x-auto">
        {CONTENT_TABS.map((t) => (
          <button key={t.key} onClick={() => setType(t.key)} className={cn("flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-semibold transition", type === t.key ? "bg-brand-600 text-white shadow-glow" : "bg-surface text-ink-600 hover:bg-brand-50")}>
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>
      <div className="relative mb-4">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search content…" className="input pl-9" />
      </div>

      <div className="card divide-y divide-ink-900/[.05]">
        {loading && items.length === 0 ? <div className="grid h-40 place-items-center"><Spinner className="h-6 w-6" /></div>
          : items.length === 0 ? <Empty icon={FileStack} title="No content" sub="Nothing matches here." />
          : items.map((it) => (
            <div key={it.id} className="flex items-center gap-3 p-3.5">
              <Avatar user={it.author} size={38} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink-900">{it.title || <span className="italic text-ink-400">(no text)</span>}</p>
                <p className="truncate text-xs text-ink-500">
                  {it.author?.fullName} · {compact(it.likesCount || 0)} likes · {compact(it.commentsCount || 0)} comments · {timeAgo(it.createdAt)}
                  {it.isDeleted && <span className="ml-1 text-rose-500">· deleted</span>}
                </p>
              </div>
              {!it.isDeleted && <button onClick={() => del(it)} className="press rounded-lg bg-rose-50 p-2 text-rose-600 transition hover:bg-rose-100" title="Delete"><Trash2 size={16} /></button>}
            </div>
          ))}
      </div>
      {hasMore && <button onClick={() => load(false)} disabled={loading} className="btn-outline mx-auto mt-4 block px-4 py-2 text-sm">{loading ? "Loading…" : "Load more"}</button>}
    </div>
  );
}

/* =========================================================================
   Verifications (doctor + student)
   ========================================================================= */
const KYC_TABS = ["SUBMITTED", "IN_REVIEW", "APPROVED", "REJECTED"];
const KYC_CHIP: any = { SUBMITTED: "bg-amber-50 text-amber-600", IN_REVIEW: "bg-sky-50 text-sky-600", APPROVED: "bg-emerald-50 text-emerald-600", REJECTED: "bg-rose-50 text-rose-600" };

function VerificationsSection() {
  const [kind, setKind] = useState<"doctor" | "student">("doctor");
  return (
    <div>
      <SectionHead title="Verifications" subtitle="Review health-professional and student KYC submissions." />
      <div className="mb-4 flex gap-2">
        <button onClick={() => setKind("doctor")} className={cn("flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold", kind === "doctor" ? "bg-brand-600 text-white" : "bg-surface text-ink-600")}><Stethoscope size={15} /> Doctors</button>
        <button onClick={() => setKind("student")} className={cn("flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold", kind === "student" ? "bg-brand-600 text-white" : "bg-surface text-ink-600")}><GraduationCap size={15} /> Students</button>
      </div>
      {kind === "doctor" ? <DoctorVerifications /> : <StudentVerifications />}
    </div>
  );
}

function DoctorVerifications() {
  const [tab, setTab] = useState("SUBMITTED");
  const [stats, setStats] = useState<any>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState<any>(null);
  const [reason, setReason] = useState("");
  const [rejecting, setRejecting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    dok.admin.vStats().then(setStats).catch(() => {});
    try { const d = await dok.admin.vList(tab); setRows(d.verifications || []); } catch { setRows([]); }
    setLoading(false);
  }, [tab]);
  useEffect(() => { load(); }, [load]);

  const act = async (userId: string, fn: () => Promise<any>) => {
    setRows((r) => r.filter((x) => x.userId !== userId)); setSel(null); setRejecting(false); setReason("");
    try { await fn(); load(); } catch { load(); }
  };

  return (
    <>
      {stats && (
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Submitted" value={stats.submitted} tone="amber" />
          <Stat label="In review" value={stats.inReview} tone="sky" />
          <Stat label="Approved" value={stats.approved} tone="emerald" />
          <Stat label="Rejected" value={stats.rejected} tone="rose" />
        </div>
      )}
      <div className="mb-4 flex gap-2 overflow-x-auto">
        {KYC_TABS.map((t) => <button key={t} onClick={() => setTab(t)} className={cn("whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold capitalize", tab === t ? "bg-brand-600 text-white" : "bg-surface text-ink-600")}>{t.replace("_", " ").toLowerCase()}</button>)}
      </div>
      <div className="card divide-y divide-ink-900/[.05]">
        {loading ? <div className="grid h-40 place-items-center"><Spinner className="h-6 w-6" /></div>
          : rows.length === 0 ? <Empty title="Queue is clear" sub={`No ${tab.replace("_", " ").toLowerCase()} submissions.`} />
          : rows.map((v) => (
            <button key={v.userId} onClick={() => setSel(v)} className="flex w-full items-center gap-3 p-4 text-left transition hover:bg-ink-900/[.02]">
              <Avatar user={v.user} size={42} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-ink-900">{v.user?.fullName}</p>
                <p className="truncate text-xs text-ink-500">{(v.specializations || []).join(", ") || v.professionType || "—"} · {v.countryOfPractice || ""}</p>
              </div>
              <span className={cn("chip text-[10px]", KYC_CHIP[v.kycStatus])}>{v.kycStatus?.replace("_", " ").toLowerCase()}</span>
              <ChevronRight size={18} className="text-ink-300" />
            </button>
          ))}
      </div>

      {sel && (
        <Drawer onClose={() => { setSel(null); setRejecting(false); }} title="Review verification">
          <div className="flex items-center gap-3">
            <Avatar user={sel.user} size={52} />
            <div><p className="font-bold text-ink-900">{sel.user?.fullName}</p><p className="text-xs text-ink-500">{sel.user?.email} · {sel.user?.phoneNumber}</p></div>
          </div>
          <div className="mt-4 space-y-2 text-sm">
            <Detail label="Registration #" value={sel.registrationNumber} />
            <Detail label="Profession" value={sel.professionType} />
            <Detail label="Country" value={sel.countryOfPractice} />
            <Detail label="Specializations" value={(sel.specializations || []).join(", ")} />
            <Detail label="Submitted" value={sel.submittedAt ? timeAgo(sel.submittedAt) : "—"} />
          </div>
          {sel.kycRejectionReason && <div className="mt-3 rounded-xl bg-rose-50 p-2.5 text-xs text-rose-700">Last rejection: {sel.kycRejectionReason}</div>}
          {rejecting && <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="Reason for rejection (shown to the doctor)…" className="input mt-3 resize-none text-sm" />}
          <div className="mt-5">
            {!rejecting ? (
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => act(sel.userId, () => dok.admin.vInReview(sel.userId))} className="btn-outline col-span-2 py-2.5 text-sm"><Eye size={16} /> Mark in review</button>
                <button onClick={() => act(sel.userId, () => dok.admin.vApprove(sel.userId))} className="btn-primary py-2.5 text-sm"><CheckCircle2 size={16} /> Approve</button>
                <button onClick={() => setRejecting(true)} className="btn bg-rose-50 py-2.5 text-sm text-rose-600 hover:bg-rose-100"><XCircle size={16} /> Reject</button>
                <button onClick={() => act(sel.userId, () => dok.admin.vReset(sel.userId))} className="btn-outline col-span-2 py-2.5 text-sm"><RotateCcw size={16} /> Reset</button>
              </div>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => setRejecting(false)} className="btn-outline flex-1 py-2.5 text-sm">Cancel</button>
                <button disabled={!reason.trim()} onClick={() => act(sel.userId, () => dok.admin.vReject(sel.userId, reason))} className="btn flex-1 bg-rose-600 py-2.5 text-sm text-white hover:bg-rose-700">Confirm rejection</button>
              </div>
            )}
          </div>
        </Drawer>
      )}
    </>
  );
}

function StudentVerifications() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState<any>(null);
  const [reason, setReason] = useState("");
  const [rejecting, setRejecting] = useState(false);

  const load = useCallback(async () => { setLoading(true); try { const d = await dok.admin.svList(); setRows(d.profiles || []); } catch { setRows([]); } setLoading(false); }, []);
  useEffect(() => { load(); }, [load]);

  const act = async (userId: string, fn: () => Promise<any>) => { setRows((r) => r.filter((x) => x.userId !== userId)); setSel(null); setRejecting(false); setReason(""); try { await fn(); } catch { load(); } };

  return (
    <>
      <div className="card divide-y divide-ink-900/[.05]">
        {loading ? <div className="grid h-40 place-items-center"><Spinner className="h-6 w-6" /></div>
          : rows.length === 0 ? <Empty title="Queue is clear" sub="No student submissions." />
          : rows.map((v) => (
            <button key={v.userId} onClick={() => setSel(v)} className="flex w-full items-center gap-3 p-4 text-left transition hover:bg-ink-900/[.02]">
              <Avatar user={v.user} size={42} />
              <div className="min-w-0 flex-1"><p className="truncate font-semibold text-ink-900">{v.user?.fullName}</p><p className="truncate text-xs text-ink-500">{v.user?.email}</p></div>
              <ChevronRight size={18} className="text-ink-300" />
            </button>
          ))}
      </div>
      {sel && (
        <Drawer onClose={() => { setSel(null); setRejecting(false); }} title="Student verification">
          <div className="flex items-center gap-3"><Avatar user={sel.user} size={52} /><div><p className="font-bold text-ink-900">{sel.user?.fullName}</p><p className="text-xs text-ink-500">{sel.user?.email}</p></div></div>
          {rejecting && <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="Reason for rejection…" className="input mt-4 resize-none text-sm" />}
          <div className="mt-5">
            {!rejecting ? (
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => act(sel.userId, () => dok.admin.svApprove(sel.userId))} className="btn-primary py-2.5 text-sm"><CheckCircle2 size={16} /> Approve</button>
                <button onClick={() => setRejecting(true)} className="btn bg-rose-50 py-2.5 text-sm text-rose-600 hover:bg-rose-100"><XCircle size={16} /> Reject</button>
              </div>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => setRejecting(false)} className="btn-outline flex-1 py-2.5 text-sm">Cancel</button>
                <button disabled={!reason.trim()} onClick={() => act(sel.userId, () => dok.admin.svReject(sel.userId, reason))} className="btn flex-1 bg-rose-600 py-2.5 text-sm text-white hover:bg-rose-700">Confirm</button>
              </div>
            )}
          </div>
        </Drawer>
      )}
    </>
  );
}

function Detail({ label, value }: any) {
  return <div className="flex items-center justify-between border-b border-ink-900/[.05] pb-1.5"><span className="text-ink-500">{label}</span><span className="font-semibold text-ink-900">{value || "—"}</span></div>;
}

/* =========================================================================
   Reports
   ========================================================================= */
function ReportsSection() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => { setLoading(true); try { const d = await dok.admin.reports("pending"); setRows(d.reports || []); } catch { setRows([]); } setLoading(false); }, []);
  useEffect(() => { load(); }, [load]);

  const dismiss = async (id: string) => { setRows((r) => r.filter((x) => x.id !== id)); try { await dok.admin.dismissReport(id); } catch { load(); } };
  const remove = async (r: any) => { if (!confirm("Delete this reported post?")) return; setRows((x) => x.filter((y) => y.id !== r.id)); try { await dok.admin.deletePost(r.post.id); } catch { load(); } };

  return (
    <div>
      <SectionHead title="Reported content" subtitle="Pending user reports on posts." />
      <div className="card divide-y divide-ink-900/[.05]">
        {loading ? <div className="grid h-40 place-items-center"><Spinner className="h-6 w-6" /></div>
          : rows.length === 0 ? <Empty title="No open reports" sub="The queue is clear." />
          : rows.map((r) => (
            <div key={r.id} className="p-4">
              <div className="flex items-center gap-2 text-xs">
                <span className="chip bg-rose-50 text-rose-600">{r.category}</span>
                <span className="text-ink-400">reported by @{r.reporter?.uniqueUsername || "—"} · {timeAgo(r.createdAt)}</span>
              </div>
              {r.reason && <p className="mt-1.5 text-xs text-ink-500">"{r.reason}"</p>}
              <div className="mt-2 rounded-xl bg-ink-900/[.03] p-3">
                <p className="text-xs text-ink-400">Post by {r.author?.fullName} · {compact(r.post?.likesCount || 0)} likes</p>
                <p className="mt-0.5 line-clamp-3 text-sm text-ink-800">{r.post?.content || <span className="italic text-ink-400">(media only)</span>}</p>
              </div>
              <div className="mt-2 flex gap-2">
                <button onClick={() => dismiss(r.id)} className="btn-outline flex-1 py-2 text-sm">Dismiss</button>
                <button onClick={() => remove(r)} className="btn flex-1 bg-rose-600 py-2 text-sm text-white hover:bg-rose-700"><Trash2 size={15} /> Delete post</button>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

/* =========================================================================
   Feedback
   ========================================================================= */
const FB_CATS = ["", "SUGGESTION", "IDEA", "BUG", "FEATURE_REQUEST", "EXPERIENCE"];
function FeedbackSection() {
  const [cat, setCat] = useState("");
  const [rows, setRows] = useState<any[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (reset = true) => {
    setLoading(true);
    try {
      const params: any = { limit: 20 };
      if (cat) params.category = cat;
      if (!reset && cursor) params.cursor = cursor;
      const d = await dok.admin.feedback(params);
      setRows((p) => (reset ? d.feedback : [...p, ...d.feedback])); setHasMore(d.hasMore); setCursor(d.nextCursor);
    } catch { if (reset) setRows([]); }
    setLoading(false);
  }, [cat, cursor]);
  useEffect(() => { load(true); /* eslint-disable-next-line */ }, [cat]);

  return (
    <div>
      <SectionHead title="Feedback" subtitle="What users submitted through the app." />
      <div className="mb-4 flex gap-2 overflow-x-auto">
        {FB_CATS.map((c) => <button key={c} onClick={() => setCat(c)} className={cn("whitespace-nowrap rounded-full px-3.5 py-2 text-xs font-semibold", cat === c ? "bg-brand-600 text-white" : "bg-surface text-ink-600")}>{c ? c.replace("_", " ").toLowerCase() : "all"}</button>)}
      </div>
      <div className="card divide-y divide-ink-900/[.05]">
        {loading && rows.length === 0 ? <div className="grid h-40 place-items-center"><Spinner className="h-6 w-6" /></div>
          : rows.length === 0 ? <Empty icon={MessageSquareText} title="No feedback" />
          : rows.map((f) => (
            <div key={f.id} className="flex gap-3 p-4">
              <Avatar user={f.user} size={38} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2"><span className="chip bg-brand-50 text-brand-700 text-[10px]">{f.category?.replace("_", " ").toLowerCase()}</span><span className="text-xs text-ink-400">{f.user?.fullName} · {timeAgo(f.createdAt)}</span></div>
                <p className="mt-1 text-sm text-ink-800">{f.message}</p>
                {f.imageUrls?.length > 0 && <div className="mt-2 flex gap-1.5">{f.imageUrls.map((u: string, i: number) => <a key={i} href={u} target="_blank" rel="noreferrer" className="text-xs text-brand-600 underline">image {i + 1}</a>)}</div>}
              </div>
            </div>
          ))}
      </div>
      {hasMore && <button onClick={() => load(false)} disabled={loading} className="btn-outline mx-auto mt-4 block px-4 py-2 text-sm">{loading ? "Loading…" : "Load more"}</button>}
    </div>
  );
}

/* =========================================================================
   Deletions queue
   ========================================================================= */
function DeletionsSection() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { dok.admin.deletions({ limit: 50 }).then((d) => setRows(d.users || [])).catch(() => setRows([])).finally(() => setLoading(false)); }, []);
  return (
    <div>
      <SectionHead title="Deletion queue" subtitle="Accounts scheduled for deletion (PENDING_DELETION)." />
      <div className="card divide-y divide-ink-900/[.05]">
        {loading ? <div className="grid h-40 place-items-center"><Spinner className="h-6 w-6" /></div>
          : rows.length === 0 ? <Empty icon={Trash2} title="Queue is empty" sub="No accounts pending deletion." />
          : rows.map((u) => (
            <div key={u.id} className="flex items-center gap-3 p-3.5">
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-ink-900">{u.fullName || "—"}</p>
                <p className="truncate text-xs text-ink-500">{u.email || u.phoneNumber} · requested {timeAgo(u.createdAt)}</p>
              </div>
              {u.scheduledDeletionAt && <span className="chip bg-amber-50 text-amber-600 text-[10px]">purges {timeAgo(u.scheduledDeletionAt)}</span>}
            </div>
          ))}
      </div>
    </div>
  );
}

/* =========================================================================
   Audit log
   ========================================================================= */
function AuditSection() {
  const [rows, setRows] = useState<any[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async (reset = true) => {
    setLoading(true);
    try {
      const params: any = { limit: 30 };
      if (!reset && cursor) params.cursor = cursor;
      const d = await dok.admin.audit(params);
      setRows((p) => (reset ? d.entries : [...p, ...d.entries])); setHasMore(d.hasMore); setCursor(d.nextCursor);
    } catch { if (reset) setRows([]); }
    setLoading(false);
  }, [cursor]);
  useEffect(() => { load(true); /* eslint-disable-next-line */ }, []);

  return (
    <div>
      <SectionHead title="Audit log" subtitle="Every action taken from this console." />
      <div className="card divide-y divide-ink-900/[.05]">
        {loading && rows.length === 0 ? <div className="grid h-40 place-items-center"><Spinner className="h-6 w-6" /></div>
          : rows.length === 0 ? <Empty icon={ScrollText} title="No activity yet" />
          : rows.map((e) => (
            <div key={e.id} className="flex items-start gap-3 p-3.5">
              <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-ink-900/[.04] text-ink-500"><Dot size={22} /></span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink-900">{e.action}</p>
                <p className="truncate text-xs text-ink-500">
                  {e.adminUsername || "—"} · {e.targetType || ""} {e.targetId ? `#${String(e.targetId).slice(0, 8)}` : ""} · {timeAgo(e.createdAt)}
                  {e.metadata?.reason ? ` · "${e.metadata.reason}"` : ""}
                </p>
              </div>
              {e.ipAddress && <span className="text-[10px] text-ink-400">{e.ipAddress}</span>}
            </div>
          ))}
      </div>
      {hasMore && <button onClick={() => load(false)} disabled={loading} className="btn-outline mx-auto mt-4 block px-4 py-2 text-sm">{loading ? "Loading…" : "Load more"}</button>}
    </div>
  );
}

/* =========================================================================
   Drawer shell
   ========================================================================= */
function Drawer({ children, onClose, title }: any) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 animate-fade-in bg-ink-950/40" onClick={onClose} />
      <div className="relative ml-auto flex h-full w-full max-w-md animate-[scale-in_.3s_cubic-bezier(.21,.65,.36,1)_both] flex-col bg-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-ink-900/[.06] p-5">
          <h3 className="font-display text-lg font-extrabold">{title}</h3>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-ink-900/5"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

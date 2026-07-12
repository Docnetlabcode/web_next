"use client";
import { useEffect, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "@/lib/router";
import { Stethoscope, Search, Inbox, History as HistoryIcon, Settings, Wallet, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Spinner } from "@/components/ui/Primitives";
import { useAuth } from "@/context/AuthContext";
import { dok } from "@/lib/api";
import { cn } from "@/lib/utils";
import { parseDoctor, parseRequest, ConsultationRequest, CallsDoctor } from "@/lib/consultations/types";
import { DoctorCard, RequestRow, Empty } from "@/components/consult/parts";
import HistoryView from "@/screens/consults/HistoryView";

type Tab = "discover" | "mine" | "requests" | "history";

export default function ConsultsHub() {
  const { user } = useAuth();
  const isDoctor = user?.role === "doctor";
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const initial = (sp.get("tab") as Tab) || "discover";
  const [tab, setTab] = useState<Tab>(initial);

  const TABS: { key: Tab; label: string; icon: any }[] = [
    { key: "discover", label: "Discover", icon: Search },
    ...(isDoctor ? [{ key: "requests" as Tab, label: "Requests", icon: Inbox }] : [{ key: "mine" as Tab, label: "My requests", icon: Inbox }]),
    { key: "history", label: "History", icon: HistoryIcon },
  ];

  return (
    <div className="mx-auto w-full max-w-3xl pb-24">
      <PageHeader
        title="Consultations"
        subtitle={isDoctor ? "Manage requests, history and settings" : "Find a doctor and book a consultation"}
        right={isDoctor ? (
          <div className="flex items-center gap-2">
            <button onClick={() => nav("/app/consults/payout")} className="press grid h-10 w-10 place-items-center rounded-full border border-ink-900/[.08] bg-surface text-ink-700 transition hover:border-brand-300 hover:text-brand-700" aria-label="Payout settings"><Wallet size={18} /></button>
            <button onClick={() => nav("/app/consults/settings")} className="press grid h-10 w-10 place-items-center rounded-full border border-ink-900/[.08] bg-surface text-ink-700 transition hover:border-brand-300 hover:text-brand-700" aria-label="Consultation settings"><Settings size={18} /></button>
          </div>
        ) : undefined}
      />

      {/* Tabs */}
      <div className="mb-5 flex gap-1 rounded-2xl border border-ink-900/[.06] bg-surface p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition",
              tab === t.key ? "bg-brand-600 text-white shadow-glow" : "text-ink-600 hover:bg-brand-50 hover:text-brand-700"
            )}
          >
            <t.icon size={16} /> <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {tab === "discover" && <DiscoverTab />}
      {tab === "mine" && <MyRequestsTab />}
      {tab === "requests" && <DoctorRequestsTab />}
      {tab === "history" && <HistoryView viewerIsDoctor={isDoctor} />}
    </div>
  );
}

// ── Discover ────────────────────────────────────────────────────────────────
function DiscoverTab() {
  const [doctors, setDoctors] = useState<CallsDoctor[] | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [q, setQ] = useState("");
  const [specialty, setSpecialty] = useState("");

  const load = useCallback(async (reset: boolean) => {
    const params = new URLSearchParams({ limit: "20" });
    if (specialty) params.set("specialty", specialty);
    if (!reset && cursor) params.set("cursor", cursor);
    const data = await dok.consults.discoverDoctors(`?${params.toString()}`);
    const list = (data.doctors || []).map(parseDoctor);
    setDoctors((prev) => (reset || !prev ? list : [...prev, ...list]));
    setCursor(data.nextCursor || null);
  }, [cursor, specialty]);

  useEffect(() => { setDoctors(null); setCursor(null); load(true).catch(() => setDoctors([])); /* eslint-disable-next-line */ }, [specialty]);

  const filtered = (doctors || []).filter((d) =>
    !q || `${d.fullName} ${d.specialization || ""} ${d.headline || ""}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div>
      <div className="relative mb-4">
        <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search doctors by name or specialty…"
          className="w-full rounded-full border border-ink-900/10 bg-surface py-2.5 pl-11 pr-4 text-sm outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-100" />
      </div>
      {doctors === null ? (
        <div className="grid place-items-center py-16"><Spinner className="h-7 w-7" /></div>
      ) : filtered.length === 0 ? (
        <Empty title="No doctors found" hint="Try a different specialty or search term." />
      ) : (
        <div className="space-y-3">
          {filtered.map((d) => <DoctorCard key={d.id} doctor={d} />)}
          {cursor && !q && (
            <button onClick={() => { setLoadingMore(true); load(false).finally(() => setLoadingMore(false)); }}
              className="press mx-auto mt-2 flex items-center gap-2 rounded-full border border-ink-900/10 bg-surface px-5 py-2.5 text-sm font-semibold text-ink-700 hover:border-brand-300">
              {loadingMore ? <Loader2 size={15} className="animate-spin" /> : null} Load more
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── My requests (requester) ───────────────────────────────────────────────────
function MyRequestsTab() {
  const [reqs, setReqs] = useState<ConsultationRequest[] | null>(null);
  useEffect(() => {
    dok.consults.listMyRequests().then((d) => setReqs((d.requests || []).map(parseRequest))).catch(() => setReqs([]));
  }, []);
  if (reqs === null) return <div className="grid place-items-center py-16"><Spinner className="h-7 w-7" /></div>;
  if (reqs.length === 0) return <Empty icon={Inbox} title="No active requests" hint="Book a consultation from the Discover tab." />;
  return <div className="space-y-3">{reqs.map((r) => <RequestRow key={r.id} req={r} viewerIsDoctor={false} href={`/app/consults/${r.id}`} />)}</div>;
}

// ── Doctor requests (incoming queue) ──────────────────────────────────────────
function DoctorRequestsTab() {
  const [reqs, setReqs] = useState<ConsultationRequest[] | null>(null);
  useEffect(() => {
    dok.consults.listDoctorRequests().then((d) => setReqs((d.requests || []).map(parseRequest))).catch(() => setReqs([]));
  }, []);
  if (reqs === null) return <div className="grid place-items-center py-16"><Spinner className="h-7 w-7" /></div>;
  if (reqs.length === 0) return <Empty icon={Inbox} title="No pending requests" hint="New consultation requests will appear here." />;
  return <div className="space-y-3">{reqs.map((r) => <RequestRow key={r.id} req={r} viewerIsDoctor href={`/app/consults/${r.id}`} />)}</div>;
}

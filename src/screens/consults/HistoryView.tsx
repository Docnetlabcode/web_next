"use client";
import { useEffect, useMemo, useState } from "react";
import { Search, SlidersHorizontal, ArrowDownUp, History as HistoryIcon } from "lucide-react";
import { Spinner } from "@/components/ui/Primitives";
import { dok } from "@/lib/api";
import { cn } from "@/lib/utils";
import { parseRequest, ConsultationRequest } from "@/lib/consultations/types";
import {
  applyConsultationQuery, computeHistoryStats, emptyQuery, activeFilterCount,
  ConsultationHistoryQuery, HistorySort, HistoryStatusFilter, HistoryTypeFilter,
} from "@/lib/consultations/historyFilter";
import { RequestRow, Empty } from "@/components/consult/parts";

const SORTS: { value: HistorySort; label: string }[] = [
  { value: "newest", label: "Newest" }, { value: "oldest", label: "Oldest" },
  { value: "feeHigh", label: "Fee: high → low" }, { value: "feeLow", label: "Fee: low → high" },
  { value: "durationLong", label: "Longest call" }, { value: "ratingHigh", label: "Highest rated" },
  { value: "alphabetical", label: "Name A → Z" },
];
const STATUSES: { value: HistoryStatusFilter; label: string }[] = [
  { value: "all", label: "All" }, { value: "completed", label: "Completed" }, { value: "pending", label: "Pending" },
  { value: "approved", label: "Scheduled" }, { value: "declined", label: "Declined" }, { value: "cancelled", label: "Cancelled" },
];
const TYPES: { value: HistoryTypeFilter; label: string }[] = [
  { value: "all", label: "All" }, { value: "paid", label: "Paid" }, { value: "free", label: "Free" },
];

export default function HistoryView({ viewerIsDoctor }: { viewerIsDoctor: boolean }) {
  const [items, setItems] = useState<ConsultationRequest[] | null>(null);
  const [query, setQuery] = useState<ConsultationHistoryQuery>(emptyQuery());
  const [showFilters, setShowFilters] = useState(false);
  const [showSort, setShowSort] = useState(false);

  useEffect(() => {
    const fetcher = viewerIsDoctor ? dok.consults.doctorHistory : dok.consults.myHistory;
    fetcher().then((d) => setItems((d.history || []).map(parseRequest))).catch(() => setItems([]));
  }, [viewerIsDoctor]);

  const filtered = useMemo(() => applyConsultationQuery(items || [], query), [items, query]);
  const stats = useMemo(() => computeHistoryStats(items || []), [items]);
  const filterCount = activeFilterCount(query);

  if (items === null) return <div className="grid place-items-center py-16"><Spinner className="h-7 w-7" /></div>;

  return (
    <div>
      {/* Analytics header — client-side from loaded list, no extra API call */}
      {items.length > 0 && (
        <div className="mb-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
          <Stat label="Total" value={stats.total} />
          <Stat label="Completed" value={stats.completed} />
          {viewerIsDoctor
            ? <Stat label="Earned" value={`₹${Math.round(stats.totalEarningsRupees).toLocaleString("en-IN")}`} />
            : <Stat label="Paid" value={stats.paid} />}
          <Stat label="Avg rating" value={stats.avgRating ? stats.avgRating.toFixed(1) : "—"} />
        </div>
      )}

      {/* Search + controls */}
      <div className="mb-3 flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
          <input value={query.search} onChange={(e) => setQuery((q) => ({ ...q, search: e.target.value }))}
            placeholder="Search name, diagnosis, medicine…"
            className="w-full rounded-full border border-ink-900/10 bg-surface py-2.5 pl-11 pr-4 text-sm outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-100" />
        </div>
        <div className="relative">
          <button onClick={() => { setShowFilters((s) => !s); setShowSort(false); }}
            className={cn("press relative grid h-11 w-11 place-items-center rounded-full border bg-surface transition", filterCount ? "border-brand-400 text-brand-600" : "border-ink-900/10 text-ink-600 hover:border-brand-300")}>
            <SlidersHorizontal size={17} />
            {filterCount > 0 && <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white">{filterCount}</span>}
          </button>
          {showFilters && <FilterSheet query={query} setQuery={setQuery} onClose={() => setShowFilters(false)} />}
        </div>
        <div className="relative">
          <button onClick={() => { setShowSort((s) => !s); setShowFilters(false); }}
            className="press grid h-11 w-11 place-items-center rounded-full border border-ink-900/10 bg-surface text-ink-600 transition hover:border-brand-300"><ArrowDownUp size={17} /></button>
          {showSort && (
            <div onMouseLeave={() => setShowSort(false)} className="absolute right-0 z-30 mt-2 w-52 animate-scale-in rounded-2xl border border-ink-900/[.06] bg-surface p-1.5 shadow-card">
              {SORTS.map((s) => (
                <button key={s.value} onClick={() => { setQuery((q) => ({ ...q, sort: s.value })); setShowSort(false); }}
                  className={cn("flex w-full items-center rounded-xl px-3 py-2 text-sm font-medium transition hover:bg-brand-50", query.sort === s.value ? "text-brand-700" : "text-ink-700")}>
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <Empty icon={HistoryIcon} title={items.length === 0 ? "No past consultations" : "No matches"} hint={items.length === 0 ? "Completed and past consultations will appear here." : "Adjust your filters or search."} />
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => <RequestRow key={r.id} req={r} viewerIsDoctor={viewerIsDoctor} href={`/app/consults/${r.id}`} />)}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded-2xl border border-ink-900/[.06] bg-surface p-3 text-center">
      <p className="text-lg font-extrabold text-ink-900">{value}</p>
      <p className="text-[11px] font-medium text-ink-500">{label}</p>
    </div>
  );
}

function FilterSheet({ query, setQuery, onClose }: { query: ConsultationHistoryQuery; setQuery: (f: (q: ConsultationHistoryQuery) => ConsultationHistoryQuery) => void; onClose: () => void }) {
  return (
    <div onMouseLeave={onClose} className="absolute right-0 z-30 mt-2 w-72 animate-scale-in rounded-2xl border border-ink-900/[.06] bg-surface p-4 shadow-card">
      <Section label="Status">
        <Chips options={STATUSES} value={query.status} onChange={(v) => setQuery((q) => ({ ...q, status: v }))} />
      </Section>
      <Section label="Type">
        <Chips options={TYPES} value={query.type} onChange={(v) => setQuery((q) => ({ ...q, type: v }))} />
      </Section>
      <Section label="Minimum rating">
        <div className="flex gap-1.5">
          {[0, 3, 4, 5].map((r) => (
            <button key={r} onClick={() => setQuery((q) => ({ ...q, minRating: r }))}
              className={cn("rounded-full border px-3 py-1.5 text-xs font-semibold transition", query.minRating === r ? "border-brand-500 bg-brand-50 text-brand-700" : "border-ink-900/10 text-ink-600")}>
              {r === 0 ? "Any" : `${r}★+`}
            </button>
          ))}
        </div>
      </Section>
      <div className="mt-2 space-y-1.5">
        <Toggle label="Has prescription" checked={query.hasPrescription} onChange={(v) => setQuery((q) => ({ ...q, hasPrescription: v }))} />
        <Toggle label="Has attachments" checked={query.hasAttachments} onChange={(v) => setQuery((q) => ({ ...q, hasAttachments: v }))} />
      </div>
      <button onClick={() => setQuery(() => emptyQuery())} className="mt-3 w-full rounded-xl border border-ink-900/10 py-2 text-sm font-semibold text-ink-600 hover:bg-ink-900/5">Reset filters</button>
    </div>
  );
}
function Section({ label, children }: { label: string; children: any }) {
  return <div className="mb-3"><p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-ink-400">{label}</p>{children}</div>;
}
function Chips<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button key={o.value} onClick={() => onChange(o.value)}
          className={cn("rounded-full border px-3 py-1.5 text-xs font-semibold transition", value === o.value ? "border-brand-500 bg-brand-50 text-brand-700" : "border-ink-900/10 text-ink-600")}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!checked)} className="flex w-full items-center justify-between rounded-xl px-1 py-1.5 text-sm text-ink-700">
      <span>{label}</span>
      <span className={cn("relative h-5 w-9 rounded-full transition", checked ? "bg-brand-600" : "bg-ink-900/15")}>
        <span className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all", checked ? "left-[1.15rem]" : "left-0.5")} />
      </span>
    </button>
  );
}

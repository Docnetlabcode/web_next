"use client";
import { useEffect, useState } from "react";
import { BottomSheet } from "@/components/ui/Overlays";
import { cn } from "@/lib/utils";

/**
 * Slide-out parameter drawer for unified search (PRD §3).
 * Tab-aware: Profiles → role/location/workplace/education; Posts → time/type/affiliation.
 * Holds a local draft and only lifts it on Apply so results don't refetch per keystroke.
 */

export const EMPTY_PROFILE = { role: "", country: "", state: "", city: "", workplace: "", education: "" };
export const EMPTY_POST = { time: "", type: "", affiliation: "" };

const ROLES = [["", "Any"], ["doctor", "Doctor"], ["student", "Student"], ["general_user", "General"]];
const WINDOWS = [["", "Any time"], ["24h", "Past 24h"], ["week", "Past week"], ["month", "Past month"]];
// /search/posts is posts-only (reels live in /search/content + the hashtag workspace).
const TYPES = [["", "Any"], ["post", "Posts"], ["case_study", "Case studies"], ["research", "Research"], ["thesis", "Theses"]];

export default function SearchFilters({ open, onClose, tab, profile, post, onApply, onClear }) {
  const [pf, setPf] = useState(profile);
  const [po, setPo] = useState(post);

  // Re-sync the draft each time the drawer opens.
  useEffect(() => { if (open) { setPf(profile); setPo(post); } }, [open]); // eslint-disable-line

  const isPeople = tab === "People";
  const setP = (k) => (v) => setPf((s) => ({ ...s, [k]: v }));
  const setO = (k) => (v) => setPo((s) => ({ ...s, [k]: v }));

  return (
    <BottomSheet open={open} onClose={onClose} title="Filters" subtitle={isPeople ? "Refine people results" : "Refine post results"}>
      <div className="max-h-[60vh] space-y-5 overflow-y-auto px-5 pb-2">
        {isPeople ? (
          <>
            <ChipRow label="Role" value={pf.role} onChange={setP("role")} options={ROLES} />
            <div>
              <Label>Location</Label>
              <div className="grid grid-cols-3 gap-2">
                <Text value={pf.country} onChange={setP("country")} placeholder="Country" />
                <Text value={pf.state} onChange={setP("state")} placeholder="State" />
                <Text value={pf.city} onChange={setP("city")} placeholder="City" />
              </div>
            </div>
            <Field label="Workplace"><Text value={pf.workplace} onChange={setP("workplace")} placeholder="e.g. Apollo Hospital" /></Field>
            <Field label="Education / college"><Text value={pf.education} onChange={setP("education")} placeholder="e.g. AIIMS" /></Field>
          </>
        ) : (
          <>
            <ChipRow label="Posted" value={po.time} onChange={setO("time")} options={WINDOWS} />
            <ChipRow label="Type" value={po.type} onChange={setO("type")} options={TYPES} />
            <Field label="Author affiliation"><Text value={po.affiliation} onChange={setO("affiliation")} placeholder="e.g. AIIMS, Mayo Clinic" /></Field>
          </>
        )}
      </div>

      <div className="flex gap-3 border-t border-ink-900/[.06] px-5 pb-1 pt-3">
        <button onClick={() => { onClear(); onClose(); }} className="btn-outline flex-1 py-2.5 text-sm">Clear all</button>
        <button onClick={() => { onApply(isPeople ? { profile: pf } : { post: po }); onClose(); }} className="btn-primary flex-1 py-2.5 text-sm">Apply filters</button>
      </div>
    </BottomSheet>
  );
}

function Label({ children }) {
  return <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-400">{children}</p>;
}
function Field({ label, children }) {
  return <div><Label>{label}</Label>{children}</div>;
}
function Text({ value, onChange, placeholder }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-xl border border-ink-900/10 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-100 placeholder:text-ink-400"
    />
  );
}
function Chip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={cn("press shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold transition",
        active ? "bg-brand-600 text-white shadow-glow" : "bg-white text-ink-600 ring-1 ring-ink-900/[.08] hover:bg-brand-50")}
    >
      {children}
    </button>
  );
}
function ChipRow({ label, value, onChange, options }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="no-scrollbar flex gap-2 overflow-x-auto">
        {options.map(([v, l]) => <Chip key={v} active={value === v} onClick={() => onChange(v)}>{l}</Chip>)}
      </div>
    </div>
  );
}

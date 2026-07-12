"use client";
import { useEffect, useState } from "react";
import { useNavigate } from "@/lib/router";
import { Plus, Trash2, Loader2, Coffee, CalendarX, Save } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { DetailSkeleton } from "@/components/ui/Skeletons";
import { useToast } from "@/components/ui/Toast";
import { dok } from "@/lib/api";
import { cn } from "@/lib/utils";
import { parseSettings } from "@/lib/consultations/types";
import {
  AvailabilitySchedule, DAY_KEYS, DAY_LABELS, TIMEZONES, TimeSlot, DayKey,
  tryParseAvailability, defaultAvailability, availabilityToString, slotIsValid, slotsOverlap,
} from "@/lib/consultations/availability";

export default function AvailabilityEditor() {
  const nav = useNavigate();
  const toast = useToast();
  const [sched, setSched] = useState<AvailabilitySchedule | null>(null);
  const [error, setError] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setError(false);
    dok.consults.getSettings().then((d) => {
      const s = parseSettings(d.settings);
      setSched(tryParseAvailability(s.availability) || defaultAvailability());
    }).catch(() => setError(true));
  };
  useEffect(() => { load(); }, []);

  const update = (fn: (s: AvailabilitySchedule) => AvailabilitySchedule) => {
    setSched((s) => (s ? fn(structuredClone(s)) : s));
    setDirty(true);
  };

  const validate = (s: AvailabilitySchedule): string | null => {
    for (const d of DAY_KEYS) {
      const day = s.week[d];
      if (!day.enabled) continue;
      for (const slot of [...day.slots, ...day.breaks]) {
        if (!slotIsValid(slot)) return `${DAY_LABELS[d]}: "${slot.start}–${slot.end}" is not a valid time range.`;
      }
      for (let i = 0; i < day.slots.length; i++) for (let j = i + 1; j < day.slots.length; j++) {
        if (slotsOverlap(day.slots[i], day.slots[j])) return `${DAY_LABELS[d]}: consultation slots overlap.`;
      }
    }
    return null;
  };

  const save = async () => {
    if (!sched) return;
    const err = validate(sched);
    if (err) return toast?.error(err);
    setSaving(true);
    try {
      await dok.consults.updateSettings({ availability: availabilityToString(sched) });
      toast?.success("Availability saved.");
      setDirty(false);
      nav("/app/consults/settings", { replace: true });
    } catch (e: any) { toast?.error(e?.response?.data?.message || "Couldn't save availability."); }
    finally { setSaving(false); }
  };

  if (error) return <div className="mx-auto w-full max-w-xl"><PageHeader title="Availability" /><div className="card p-8 text-center"><p className="text-sm text-ink-600">Couldn't load availability.</p><button onClick={load} className="btn-primary mx-auto mt-4 px-5 py-2 text-sm">Retry</button></div></div>;
  if (!sched) return <div className="mx-auto w-full max-w-xl pb-28 pt-2"><DetailSkeleton blocks={4} /></div>;

  return (
    <div className="mx-auto w-full max-w-xl pb-28">
      <PageHeader title="Availability" subtitle="Weekly schedule, breaks and exceptions" forward={false} />

      {/* Master switch + timezone */}
      <div className="card mb-4 p-4">
        <button onClick={() => update((s) => ({ ...s, enabled: !s.enabled }))} className="flex w-full items-center justify-between text-left">
          <span><span className="block text-sm font-semibold text-ink-900">Accept bookings</span><span className="block text-xs text-ink-500">Turn off to pause all consultations</span></span>
          <span className={cn("relative h-6 w-11 shrink-0 rounded-full transition", sched.enabled ? "bg-brand-600" : "bg-ink-900/15")}>
            <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", sched.enabled ? "left-[1.35rem]" : "left-0.5")} />
          </span>
        </button>
        <div className="my-3 h-px bg-ink-900/[.06]" />
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-ink-600">Timezone</span>
          <select value={sched.timezone} onChange={(e) => update((s) => ({ ...s, timezone: e.target.value }))}
            className="w-full rounded-xl border border-ink-900/10 bg-surface px-3 py-2.5 text-sm outline-none focus:border-brand-400">
            {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
          </select>
        </label>
      </div>

      {/* Weekly schedule */}
      {sched.enabled && DAY_KEYS.map((d) => (
        <DayCard key={d} dayKey={d} day={sched.week[d]} onChange={(day) => update((s) => ({ ...s, week: { ...s.week, [d]: day } }))} />
      ))}

      {/* Exceptions */}
      {sched.enabled && (
        <div className="card mb-4 p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="flex items-center gap-2 text-sm font-bold text-ink-900"><CalendarX size={15} className="text-brand-600" /> Date exceptions</p>
            <button onClick={() => update((s) => ({ ...s, exceptions: [...s.exceptions, { date: new Date().toISOString().slice(0, 10), type: "unavailable", slots: [] }] }))}
              className="press flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700"><Plus size={13} /> Add</button>
          </div>
          {sched.exceptions.length === 0 && <p className="text-xs text-ink-400">No exceptions. Add holidays or one-off available days.</p>}
          <div className="space-y-2">
            {sched.exceptions.map((ex, i) => (
              <div key={i} className="flex items-center gap-2 rounded-xl border border-ink-900/[.06] bg-surface p-2.5">
                <input type="date" value={ex.date} onChange={(e) => update((s) => { s.exceptions[i].date = e.target.value; return s; })}
                  className="rounded-lg border border-ink-900/10 px-2 py-1.5 text-sm outline-none focus:border-brand-400" />
                <select value={ex.type} onChange={(e) => update((s) => { s.exceptions[i].type = e.target.value as any; return s; })}
                  className="flex-1 rounded-lg border border-ink-900/10 px-2 py-1.5 text-sm outline-none focus:border-brand-400">
                  <option value="unavailable">Unavailable</option>
                  <option value="available">Available</option>
                </select>
                <button onClick={() => update((s) => ({ ...s, exceptions: s.exceptions.filter((_, j) => j !== i) }))} className="text-rose-500"><Trash2 size={15} /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="sticky bottom-4">
        <button onClick={save} disabled={saving || !dirty} className="btn-primary w-full justify-center py-3.5 text-[15px] disabled:opacity-50">
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={17} />} {dirty ? "Save availability" : "Saved"}
        </button>
      </div>
    </div>
  );
}

function DayCard({ dayKey, day, onChange }: { dayKey: DayKey; day: { enabled: boolean; slots: TimeSlot[]; breaks: TimeSlot[] }; onChange: (d: any) => void }) {
  const set = (patch: any) => onChange({ ...day, ...patch });
  return (
    <div className="card mb-3 p-4">
      <button onClick={() => set({ enabled: !day.enabled })} className="flex w-full items-center justify-between text-left">
        <span className="text-sm font-bold text-ink-900">{DAY_LABELS[dayKey]}</span>
        <span className={cn("relative h-5 w-9 shrink-0 rounded-full transition", day.enabled ? "bg-brand-600" : "bg-ink-900/15")}>
          <span className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all", day.enabled ? "left-[1.15rem]" : "left-0.5")} />
        </span>
      </button>
      {day.enabled && (
        <div className="mt-3 space-y-3">
          <SlotList label="Consultation hours" slots={day.slots} icon={null}
            onAdd={() => set({ slots: [...day.slots, { start: "09:00", end: "17:00" }] })}
            onChange={(slots) => set({ slots })} />
          <SlotList label="Breaks" slots={day.breaks} icon={Coffee}
            onAdd={() => set({ breaks: [...day.breaks, { start: "13:00", end: "14:00" }] })}
            onChange={(breaks) => set({ breaks })} />
        </div>
      )}
    </div>
  );
}

function SlotList({ label, slots, icon: Icon, onAdd, onChange }: { label: string; slots: TimeSlot[]; icon: any; onAdd: () => void; onChange: (s: TimeSlot[]) => void }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-400">{Icon && <Icon size={12} />} {label}</span>
        <button onClick={onAdd} className="press flex items-center gap-1 text-xs font-semibold text-brand-700"><Plus size={12} /> Add</button>
      </div>
      {slots.length === 0 && <p className="text-xs text-ink-400">None</p>}
      <div className="space-y-1.5">
        {slots.map((slot, i) => (
          <div key={i} className="flex items-center gap-2">
            <input type="time" value={slot.start} onChange={(e) => onChange(slots.map((x, j) => j === i ? { ...x, start: e.target.value } : x))}
              className="rounded-lg border border-ink-900/10 px-2 py-1.5 text-sm outline-none focus:border-brand-400" />
            <span className="text-ink-400">–</span>
            <input type="time" value={slot.end} onChange={(e) => onChange(slots.map((x, j) => j === i ? { ...x, end: e.target.value } : x))}
              className="rounded-lg border border-ink-900/10 px-2 py-1.5 text-sm outline-none focus:border-brand-400" />
            <button onClick={() => onChange(slots.filter((_, j) => j !== i))} className="ml-auto text-rose-500"><Trash2 size={15} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

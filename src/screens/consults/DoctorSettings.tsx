"use client";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@/lib/router";
import { Loader2, CalendarClock, Wallet, ChevronRight, IndianRupee } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { DetailSkeleton } from "@/components/ui/Skeletons";
import { useToast } from "@/components/ui/Toast";
import { dok } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  parseSettings, DoctorConsultationSettings, WHO_CAN_REQUEST_OPTIONS,
} from "@/lib/consultations/types";
import { tryParseAvailability, availabilitySummary } from "@/lib/consultations/availability";

// Fee lattice — mirrors backend validateFee (consultations.config.js):
// MIN ₹199, MAX ₹4999, STEP ₹50. Slider/field must land on this lattice or PUT 400s.
const MIN_RUPEES = 199, MAX_RUPEES = 4999, STEP_RUPEES = 50;
const snapFee = (rupees: number) => {
  const clamped = Math.max(MIN_RUPEES, Math.min(MAX_RUPEES, rupees));
  return MIN_RUPEES + Math.round((clamped - MIN_RUPEES) / STEP_RUPEES) * STEP_RUPEES;
};

export default function DoctorSettings() {
  const nav = useNavigate();
  const toast = useToast();
  const [s, setS] = useState<DoctorConsultationSettings | null>(null);
  const [feeText, setFeeText] = useState("");
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef<any>(null);

  const load = () => {
    setError(false);
    dok.consults.getSettings().then((d) => {
      const parsed = parseSettings(d.settings);
      setS(parsed);
      setFeeText(String(Math.round(parsed.consultationFeePaise / 100) || MIN_RUPEES));
    }).catch(() => setError(true));
  };
  useEffect(() => { load(); }, []);

  // Persist a partial patch; surfaces backend validation errors (e.g. fee lattice).
  const persist = async (patch: Partial<Record<string, any>>, optimistic?: Partial<DoctorConsultationSettings>) => {
    if (optimistic && s) setS({ ...s, ...optimistic });
    setSaving(true);
    try {
      const d = await dok.consults.updateSettings(patch);
      setS(parseSettings(d.settings));
    } catch (e: any) {
      toast?.error(e?.response?.data?.message || "Couldn't save. Please try again.");
      load(); // re-sync from server on failure
    } finally { setSaving(false); }
  };

  const commitFee = (rupees: number) => {
    const snapped = snapFee(rupees);
    setFeeText(String(snapped));
    persist({ consultationFeePaise: snapped * 100 }, { consultationFeePaise: snapped * 100 });
  };

  if (error) return <div className="mx-auto w-full max-w-xl"><PageHeader title="Consultation settings" /><div className="card p-8 text-center"><p className="text-sm text-ink-600">Couldn't load your settings.</p><button onClick={load} className="btn-primary mx-auto mt-4 px-5 py-2 text-sm">Retry</button></div></div>;
  if (!s) return <div className="mx-auto w-full max-w-xl pb-24 pt-2"><DetailSkeleton blocks={3} /></div>;

  const consultEnabled = s.paidCallsEnabled || s.freeConsultationsAllowed;
  const avail = tryParseAvailability(s.availability);
  const feeRupees = snapFee(parseInt(feeText, 10) || MIN_RUPEES);

  return (
    <div className="mx-auto w-full max-w-xl pb-24">
      <PageHeader title="Consultation settings" subtitle="Control who can book you and how" forward={false}
        right={saving ? <Loader2 size={16} className="animate-spin text-brand-600" /> : undefined} />

      {/* Master enable */}
      <Card>
        <Toggle label="Accept consultations" hint="Master switch for paid and free consultations"
          checked={consultEnabled}
          onChange={(v) => persist(
            v ? { paidCallsEnabled: true } : { paidCallsEnabled: false, freeConsultationsAllowed: false },
            v ? { paidCallsEnabled: true } : { paidCallsEnabled: false, freeConsultationsAllowed: false })}
        />
      </Card>

      {consultEnabled && (<>
        {/* Paid vs free */}
        <Section title="Pricing" />
        <Card>
          <Toggle label="Paid consultations" hint="Charge a fee per consultation"
            checked={s.paidCallsEnabled}
            onChange={(v) => persist({ paidCallsEnabled: v }, { paidCallsEnabled: v })} />
          <Divider />
          <Toggle label="Allow free consultations" hint="Let patients book without payment"
            checked={s.freeConsultationsAllowed}
            onChange={(v) => persist({ freeConsultationsAllowed: v }, { freeConsultationsAllowed: v })} />
        </Card>

        {s.paidCallsEnabled && (
          <Card>
            <p className="mb-1 text-sm font-semibold text-ink-900">Consultation fee</p>
            <p className="mb-3 text-xs text-ink-500">₹{MIN_RUPEES}–₹{MAX_RUPEES}, in steps of ₹{STEP_RUPEES}.</p>
            <div className="mb-3 flex items-center gap-2">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-600"><IndianRupee size={17} /></span>
              <input
                type="number" value={feeText}
                onChange={(e) => setFeeText(e.target.value)}
                onBlur={() => commitFee(parseInt(feeText, 10) || MIN_RUPEES)}
                onKeyDown={(e) => { if (e.key === "Enter") commitFee(parseInt(feeText, 10) || MIN_RUPEES); }}
                className="w-32 rounded-xl border border-ink-900/10 bg-surface px-3 py-2.5 text-sm outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100" />
            </div>
            <input
              type="range" min={MIN_RUPEES} max={MAX_RUPEES} step={STEP_RUPEES} value={feeRupees}
              onChange={(e) => setFeeText(e.target.value)}
              onMouseUp={(e) => commitFee(parseInt((e.target as HTMLInputElement).value, 10))}
              onTouchEnd={(e) => commitFee(parseInt((e.target as HTMLInputElement).value, 10))}
              className="w-full accent-brand-600" />
          </Card>
        )}

        {/* Who can request */}
        <Section title="Access" />
        <Card>
          <p className="mb-2 text-sm font-semibold text-ink-900">Who can request</p>
          <div className="flex flex-col gap-1.5">
            {WHO_CAN_REQUEST_OPTIONS.map((o) => (
              <button key={o.value} onClick={() => persist({ whoCanRequest: o.value }, { whoCanRequest: o.value })}
                className={cn("flex items-center justify-between rounded-xl border px-3.5 py-3 text-left text-sm transition",
                  normalizedWho(s.whoCanRequest) === o.value ? "border-brand-500 bg-brand-50 font-semibold text-brand-700" : "border-ink-900/10 text-ink-700 hover:border-brand-300")}>
                {o.label}
                <span className={cn("grid h-4 w-4 place-items-center rounded-full border-2", normalizedWho(s.whoCanRequest) === o.value ? "border-brand-600" : "border-ink-300")}>
                  {normalizedWho(s.whoCanRequest) === o.value && <span className="h-2 w-2 rounded-full bg-brand-600" />}
                </span>
              </button>
            ))}
          </div>
          <Divider />
          <Toggle label="Require a reason" hint="Patients must describe their concern when booking"
            checked={s.requireReason}
            onChange={(v) => persist({ requireReason: v }, { requireReason: v })} />
        </Card>

        {/* Availability + payout links */}
        <Section title="Schedule & payouts" />
        <Card noPad>
          <NavRow icon={CalendarClock} label="Availability" value={avail ? availabilitySummary(avail) : "Not set up"} onClick={() => nav("/app/consults/settings/availability")} />
          <Divider />
          <NavRow icon={Wallet} label="Payout settings" value="Bank accounts & verification" onClick={() => nav("/app/consults/payout")} />
        </Card>
      </>)}
    </div>
  );
}

// whoCanRequest can arrive as a legacy value; normalize to the 3-option set.
function normalizedWho(v: string): string {
  if (v === "all" || v === "BOTH" || v === "GENERAL_USER" || v === "STUDENT") return "all";
  if (v === "connections" || v === "followers") return "connections";
  if (v === "invite_only") return "invite_only";
  return "all";
}

function Card({ children, noPad }: { children: any; noPad?: boolean }) {
  return <div className={cn("card mb-4", noPad ? "" : "p-4")}>{children}</div>;
}
function Section({ title }: { title: string }) {
  return <p className="mb-2 mt-1 px-1 text-xs font-bold uppercase tracking-wide text-ink-400">{title}</p>;
}
function Divider() { return <div className="my-3 h-px bg-ink-900/[.06]" />; }

function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!checked)} className="flex w-full items-center justify-between gap-3 text-left">
      <span className="min-w-0"><span className="block text-sm font-semibold text-ink-900">{label}</span>{hint && <span className="block text-xs text-ink-500">{hint}</span>}</span>
      <span className={cn("relative h-6 w-11 shrink-0 rounded-full transition", checked ? "bg-brand-600" : "bg-ink-900/15")}>
        <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", checked ? "left-[1.35rem]" : "left-0.5")} />
      </span>
    </button>
  );
}
function NavRow({ icon: Icon, label, value, onClick }: { icon: any; label: string; value: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 p-4 text-left transition hover:bg-ink-900/[.02]">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-600"><Icon size={18} /></span>
      <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-ink-900">{label}</span><span className="block truncate text-xs text-ink-500">{value}</span></span>
      <ChevronRight size={18} className="text-ink-300" />
    </button>
  );
}

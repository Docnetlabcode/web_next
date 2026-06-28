"use client";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "@/lib/router";
import { Plus, Trash2, Upload, FileText, X, Loader2, Pill, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Spinner } from "@/components/ui/Primitives";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/context/AuthContext";
import { dok } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  parseRequest, ConsultationRequest, Medicine, emptyMedicine, dosagePattern,
  ConsultAttachment, ClinicalSummary, isCompleted,
} from "@/lib/consultations/types";

export default function SummaryEditor() {
  const { requestId } = useParams<{ requestId: string }>();
  const nav = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [req, setReq] = useState<ConsultationRequest | null>(null);
  const [denied, setDenied] = useState(false);
  const [diagnosis, setDiagnosis] = useState("");
  const [summary, setSummary] = useState("");
  const [advice, setAdvice] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [nextVisit, setNextVisit] = useState("");
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [atts, setAtts] = useState<ConsultAttachment[]>([]);
  const [editing, setEditing] = useState<{ index: number; med: Medicine } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    dok.consults.getRequest(requestId).then((d) => {
      const r = parseRequest(d.request);
      const myId = user?._id || user?.id;
      if (myId !== r.doctorId) { setDenied(true); return; }
      setReq(r);
      if (r.clinicalSummary) { // resume editing if already drafted
        const cs = r.clinicalSummary;
        setDiagnosis(cs.diagnosis); setSummary(cs.summary); setAdvice(cs.advice);
        setFollowUp(cs.followUp); setNextVisit(cs.nextVisit || "");
        setMedicines(cs.medicines); setAtts(cs.attachments);
      }
    }).catch(() => setDenied(true));
    /* eslint-disable-next-line */
  }, [requestId]);

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (fileRef.current) fileRef.current.value = "";
    setUploading(true);
    for (const file of files) {
      try {
        const res = await dok.consults.uploadAttachment(file);
        if (res?.attachment?.url) setAtts((p) => [...p, { url: res.attachment.url, publicId: res.attachment.publicId || "", name: res.attachment.name || file.name }]);
      } catch { toast?.error(`Couldn't upload "${file.name}".`); }
    }
    setUploading(false);
  };

  const finish = async () => {
    if (!diagnosis.trim() && !summary.trim() && medicines.length === 0) {
      return toast?.error("Add at least a diagnosis, summary, or prescription.");
    }
    setSaving(true);
    const payload: ClinicalSummary = {
      diagnosis: diagnosis.trim(), summary: summary.trim(), advice: advice.trim(),
      followUp: followUp.trim(), nextVisit: nextVisit.trim() || null, medicines, attachments: atts,
    };
    try {
      await dok.consults.completeConsultation(requestId, {
        diagnosis: payload.diagnosis, summary: payload.summary, advice: payload.advice,
        followUp: payload.followUp, nextVisit: payload.nextVisit,
        medicines, attachments: atts,
      });
      toast?.success("Consultation completed.");
      nav(`/app/consults/${requestId}`, { replace: true });
    } catch (e: any) { toast?.error(e?.response?.data?.message || "Couldn't finish the consultation."); setSaving(false); }
  };

  if (denied) return <div className="mx-auto w-full max-w-2xl"><PageHeader title="Consultation summary" /><div className="card p-8 text-center text-sm text-ink-600">You don't have access to write this summary.</div></div>;
  if (!req) return <div className="grid min-h-[60vh] place-items-center"><Spinner className="h-8 w-8" /></div>;
  if (isCompleted(req.status) && req.clinicalSummary) {
    // Already finalized — bounce to the read-only detail.
    nav(`/app/consults/${requestId}`, { replace: true });
    return null;
  }

  return (
    <div className="mx-auto w-full max-w-2xl pb-28">
      <PageHeader title="Consultation summary" subtitle={`For ${req.requester?.fullName || "the patient"}`} forward={false} />

      <Field label="Diagnosis" value={diagnosis} onChange={setDiagnosis} placeholder="Primary diagnosis / clinical impression" rows={2} />
      <Field label="Summary" value={summary} onChange={setSummary} placeholder="Summary of the consultation" rows={4} />
      <Field label="Advice" value={advice} onChange={setAdvice} placeholder="Advice and care instructions" rows={3} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Follow-up" value={followUp} onChange={setFollowUp} placeholder="e.g. In 2 weeks" rows={1} />
        <Field label="Next visit" value={nextVisit} onChange={setNextVisit} placeholder="e.g. 2026-07-15" rows={1} />
      </div>

      {/* Prescription */}
      <div className="mb-2 mt-2 flex items-center justify-between">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-ink-700"><Pill size={14} /> Prescription</p>
        <button onClick={() => setEditing({ index: -1, med: emptyMedicine() })} className="press flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700"><Plus size={13} /> Add medicine</button>
      </div>
      <div className="mb-5 space-y-2">
        {medicines.length === 0 && <p className="rounded-xl border border-dashed border-ink-900/10 p-4 text-center text-xs text-ink-400">No medicines added.</p>}
        {medicines.map((m, i) => (
          <div key={i} className="flex items-start gap-2 rounded-xl border border-ink-900/[.06] bg-white p-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink-900">{m.name || "Medicine"} {m.strength && <span className="font-normal text-ink-500">· {m.strength}</span>}</p>
              <p className="mt-0.5 text-xs text-ink-500">{dosagePattern(m)} · {m.beforeFood ? "Before food" : "After food"}{m.duration ? ` · ${m.duration}` : ""}</p>
              {m.instructions && <p className="mt-0.5 text-xs text-ink-500">{m.instructions}</p>}
            </div>
            <button onClick={() => setEditing({ index: i, med: { ...m } })} className="text-xs font-semibold text-brand-700">Edit</button>
            <button onClick={() => setMedicines((p) => p.filter((_, j) => j !== i))} className="text-rose-500"><Trash2 size={15} /></button>
          </div>
        ))}
      </div>

      {/* Attachments */}
      <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-ink-700"><FileText size={14} /> Documents</p>
      <input ref={fileRef} type="file" multiple accept=".jpg,.jpeg,.png,.webp,.pdf" onChange={onPick} className="hidden" />
      <div className="mb-6 flex flex-wrap gap-2">
        <button onClick={() => fileRef.current?.click()} disabled={uploading} className="press flex items-center gap-2 rounded-xl border-2 border-dashed border-brand-400 px-4 py-2.5 text-sm font-semibold text-brand-600 disabled:opacity-50">
          {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />} Upload
        </button>
        {atts.map((a, i) => (
          <span key={i} className="inline-flex items-center gap-2 rounded-xl border border-ink-900/[.08] bg-white px-3 py-2 text-sm">
            <FileText size={14} className="text-brand-600" /><span className="max-w-[140px] truncate">{a.name}</span>
            <button onClick={() => setAtts((p) => p.filter((_, j) => j !== i))} className="text-ink-400 hover:text-rose-500"><X size={13} /></button>
          </span>
        ))}
      </div>

      <div className="sticky bottom-4">
        <button onClick={finish} disabled={saving} className="btn-primary w-full justify-center py-3.5 text-[15px] disabled:opacity-50">
          {saving ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />} Finish consultation
        </button>
      </div>

      {editing && (
        <MedicineSheet
          med={editing.med}
          onCancel={() => setEditing(null)}
          onSave={(med) => {
            setMedicines((p) => editing.index < 0 ? [...p, med] : p.map((x, j) => j === editing.index ? med : x));
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function Field({ label, value, onChange, placeholder, rows }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; rows: number }) {
  return (
    <div className="mb-4">
      <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-ink-700">{label}</p>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} placeholder={placeholder}
        className="w-full resize-none rounded-xl border border-ink-900/10 bg-white p-3 text-sm outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-100" />
    </div>
  );
}

function MedicineSheet({ med, onSave, onCancel }: { med: Medicine; onSave: (m: Medicine) => void; onCancel: () => void }) {
  const [m, setM] = useState<Medicine>(med);
  const up = (patch: Partial<Medicine>) => setM((x) => ({ ...x, ...patch }));
  return (
    <div className="fixed inset-0 z-[80] grid place-items-end sm:place-items-center" role="dialog" aria-modal>
      <div className="absolute inset-0 bg-ink-900/40" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-md animate-[fade-up_.3s_ease-out_both] rounded-t-3xl bg-white p-5 shadow-card sm:rounded-3xl">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-base font-bold text-ink-900">{med.name ? "Edit medicine" : "Add medicine"}</p>
          <button onClick={onCancel} className="text-ink-400"><X size={18} /></button>
        </div>
        <Input label="Name" value={m.name} onChange={(v) => up({ name: v })} placeholder="e.g. Paracetamol" />
        <Input label="Strength" value={m.strength} onChange={(v) => up({ strength: v })} placeholder="e.g. 500mg" />
        <p className="mb-1.5 mt-3 text-xs font-bold uppercase tracking-wide text-ink-700">Timing</p>
        <div className="mb-3 flex gap-2">
          {([["morning", "Morning"], ["afternoon", "Afternoon"], ["night", "Night"]] as const).map(([k, label]) => (
            <button key={k} onClick={() => up({ [k]: !m[k] } as any)}
              className={cn("flex-1 rounded-xl border py-2 text-sm font-semibold transition", (m as any)[k] ? "border-brand-500 bg-brand-50 text-brand-700" : "border-ink-900/10 text-ink-600")}>
              {label}
            </button>
          ))}
        </div>
        <div className="mb-3 flex gap-2">
          {([[true, "Before food"], [false, "After food"]] as const).map(([v, label]) => (
            <button key={String(v)} onClick={() => up({ beforeFood: v })}
              className={cn("flex-1 rounded-xl border py-2 text-sm font-semibold transition", m.beforeFood === v ? "border-brand-500 bg-brand-50 text-brand-700" : "border-ink-900/10 text-ink-600")}>
              {label}
            </button>
          ))}
        </div>
        <Input label="Duration" value={m.duration} onChange={(v) => up({ duration: v })} placeholder="e.g. 5 days" />
        <Input label="Instructions" value={m.instructions} onChange={(v) => up({ instructions: v })} placeholder="Optional" />
        <button onClick={() => onSave(m)} disabled={!m.name.trim()} className="btn-primary mt-4 w-full justify-center py-2.5 text-sm disabled:opacity-50">Save medicine</button>
      </div>
    </div>
  );
}
function Input({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="mb-2 block">
      <span className="mb-1 block text-xs font-semibold text-ink-600">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full rounded-xl border border-ink-900/10 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100" />
    </label>
  );
}

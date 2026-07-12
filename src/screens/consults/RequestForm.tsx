"use client";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "@/lib/router";
import { Lock, Upload, X, FileText, RefreshCw, Loader2, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Avatar, Verified } from "@/components/ui/Primitives";
import { DetailSkeleton } from "@/components/ui/Skeletons";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/context/AuthContext";
import { dok } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  parseDoctor, parseRequest, CallsDoctor, FeeBreakdown,
  doctorIsAvailable, doctorIsFree, formatRupees,
} from "@/lib/consultations/types";
import { FeeTable, Rating } from "@/components/consult/parts";
import { openRazorpayCheckout } from "@/lib/consultations/razorpay";

interface LocalAttachment {
  id: string;
  name: string;
  file: File;
  uploading: boolean;
  failed: boolean;
  url?: string;
  isImage: boolean;
}

const IMG_RE = /\.(jpe?g|png|webp|heic|gif|bmp)$/i;

export default function RequestForm() {
  const { doctorId } = useParams<{ doctorId: string }>();
  const nav = useNavigate();
  const toast = useToast();
  const { user } = useAuth();

  const [doctor, setDoctor] = useState<CallsDoctor | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [reason, setReason] = useState("");
  const [atts, setAtts] = useState<LocalAttachment[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadConfig = () => {
    setLoadError(false);
    dok.consults.getDoctor(doctorId).then((d) => setDoctor(parseDoctor(d.doctor)))
      .catch(() => setLoadError(true));
  };
  useEffect(() => { loadConfig(); /* eslint-disable-next-line */ }, [doctorId]);

  const fees: FeeBreakdown | null = doctor?.fees ?? null;
  const uploadInFlight = atts.some((a) => a.uploading);

  // ── Attachments ────────────────────────────────────────────────────────────
  const upload = async (att: LocalAttachment) => {
    try {
      const res = await dok.consults.uploadAttachment(att.file);
      const url = res?.attachment?.url;
      setAtts((prev) => prev.map((a) => a.id === att.id ? { ...a, uploading: false, url: url || undefined, failed: !url } : a));
      if (!url) toast?.error(`Couldn't upload "${att.name}". Tap to retry.`);
    } catch {
      setAtts((prev) => prev.map((a) => a.id === att.id ? { ...a, uploading: false, failed: true } : a));
      toast?.error(`Couldn't upload "${att.name}". Tap to retry.`);
    }
  };
  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      const att: LocalAttachment = { id: `${Date.now()}_${Math.random()}`, name: file.name, file, uploading: true, failed: false, isImage: IMG_RE.test(file.name) };
      setAtts((prev) => [...prev, att]);
      upload(att);
    }
    if (fileRef.current) fileRef.current.value = "";
  };
  const retry = (att: LocalAttachment) => { setAtts((prev) => prev.map((a) => a.id === att.id ? { ...a, uploading: true, failed: false } : a)); upload({ ...att, uploading: true, failed: false }); };
  const remove = (id: string) => setAtts((prev) => prev.filter((a) => a.id !== id));

  // ── Proceed ──────────────────────────────────────────────────────────────────
  const proceed = async () => {
    if (submitting || !doctor) return;
    const r = reason.trim();
    if (!doctorIsAvailable(doctor)) return toast?.error("This doctor is not accepting consultations right now.");
    if (doctor.requireReason && !r) return toast?.error("Please add a reason for the consultation.");
    if (uploadInFlight) return toast?.error("Please wait for attachments to finish uploading.");
    if (atts.some((a) => a.failed)) return toast?.error("Remove or retry the failed attachment before continuing.");

    const urls = atts.map((a) => a.url).filter((u): u is string => !!u);
    setSubmitting(true);
    try {
      // FREE path — skip payment, create request directly (mirrors Flutter _proceed).
      if (doctorIsFree(doctor)) {
        const res = await dok.consults.createRequest({ doctorId: doctor.id, ...(r ? { reason: r } : {}), attachments: urls });
        const req = parseRequest(res.request);
        nav(`/app/consults/${req.id}?new=1`, { replace: true });
        return;
      }
      if (!fees) { toast?.error("Couldn't load the fee details. Please try again."); loadConfig(); setSubmitting(false); return; }

      // PAID path — reuse the secure backend Razorpay flow (create-order → verify).
      const intent = await dok.consults.createPaymentIntent({ doctorId: doctor.id, ...(r ? { reason: r } : {}) });
      const order = intent.order || {};
      const result = await openRazorpayCheckout({
        order: { orderId: order.orderId, amount: order.amount ?? fees.totalPaise, currency: order.currency, keyId: order.keyId },
        name: "Orovion Consultation",
        description: `Consultation with ${doctor.fullName}`,
        prefill: { name: user?.fullName, email: user?.email, contact: user?.phone },
      });
      const res = await dok.consults.verifyPayment({
        razorpayOrderId: result.razorpay_order_id,
        razorpayPaymentId: result.razorpay_payment_id,
        razorpaySignature: result.razorpay_signature,
        attachments: urls,
      });
      const req = parseRequest(res.request);
      toast?.success("Payment successful — request submitted.");
      nav(`/app/consults/${req.id}?new=1`, { replace: true });
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || "Couldn't submit your request. Please try again.";
      toast?.error(msg);
      setSubmitting(false);
    }
  };

  if (loadError) {
    return (
      <div className="mx-auto w-full max-w-2xl pb-24">
        <PageHeader title="Request a consultation" />
        <div className="card p-8 text-center">
          <p className="text-sm text-ink-600">Couldn't load this doctor's consultation details.</p>
          <button onClick={loadConfig} className="btn-primary mx-auto mt-4 px-5 py-2 text-sm">Retry</button>
        </div>
      </div>
    );
  }
  if (!doctor) return <div className="mx-auto w-full max-w-2xl pb-28 pt-2"><DetailSkeleton blocks={3} /></div>;

  const free = doctorIsFree(doctor);
  const available = doctorIsAvailable(doctor);

  return (
    <div className="mx-auto w-full max-w-2xl pb-28">
      <PageHeader title="Request a consultation" subtitle="Private 1:1 consultation via audio or video" forward={false} />

      {/* Doctor card */}
      <div className="card mb-5 flex items-center gap-3.5 border border-brand-100 bg-brand-50/40 p-4">
        <Avatar user={{ fullName: doctor.fullName, profilePhoto: doctor.profilePhoto }} size={52} />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1 truncate text-[15px] font-bold text-ink-900">{doctor.fullName} {doctor.isVerified && <Verified size={13} />}</p>
          <p className="truncate text-xs text-ink-500">{doctor.headline || doctor.specialization || "Doctor"}{doctor.location ? ` · ${doctor.location}` : ""}</p>
          <div className="mt-1"><Rating value={doctor.avgRating} count={doctor.ratingCount} /></div>
        </div>
      </div>

      {/* Reason */}
      <Label title="Reason for consultation" trailing={doctor.requireReason ? "Required" : "Optional"} />
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        maxLength={1000}
        rows={5}
        placeholder="Describe your concern, question, or the support you're seeking."
        className="mb-5 w-full resize-none rounded-xl border border-ink-900/10 bg-surface p-3.5 text-sm outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
      />

      {/* Attachments */}
      <Label title="Attachments" trailing="Optional" />
      <input ref={fileRef} type="file" multiple accept=".jpg,.jpeg,.png,.webp,.heic,.pdf" onChange={onPick} className="hidden" />
      <div className="mb-3 flex flex-wrap gap-3">
        <button onClick={() => fileRef.current?.click()} className="press grid h-[84px] w-[84px] place-items-center gap-1.5 rounded-xl border-2 border-dashed border-brand-400 text-brand-600 transition hover:bg-brand-50">
          <Upload size={20} /><span className="text-[11px] font-semibold">Upload</span>
        </button>
        {atts.map((a) => (
          <div key={a.id} className="relative h-[84px] w-[84px]">
            <button
              onClick={() => a.failed && retry(a)}
              className={cn("flex h-full w-full flex-col items-center justify-center gap-1 overflow-hidden rounded-xl border bg-brand-50 p-1 text-center", a.failed ? "border-rose-300" : "border-brand-100")}
            >
              {a.isImage && !a.failed
                ? <img src={URL.createObjectURL(a.file)} alt={a.name} className="h-full w-full rounded-lg object-cover" />
                : (<>{a.failed ? <RefreshCw size={20} className="text-rose-500" /> : <FileText size={20} className="text-brand-600" />}<span className={cn("line-clamp-1 px-0.5 text-[10px] font-semibold", a.failed ? "text-rose-600" : "text-brand-700")}>{a.failed ? "Retry" : a.name}</span></>)}
            </button>
            {a.uploading && <div className="absolute inset-0 grid place-items-center rounded-xl bg-ink-950/35"><Loader2 size={18} className="animate-spin text-white" /></div>}
            <button onClick={() => remove(a.id)} className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-ink-950 text-white"><X size={12} /></button>
          </div>
        ))}
      </div>
      <div className="mb-6 flex items-start gap-2 rounded-xl bg-brand-50 p-3 text-xs text-ink-600">
        <Lock size={14} className="mt-0.5 shrink-0 text-brand-700" />
        Attachments are shared only with the professional reviewing your consultation request.
      </div>

      {/* Fee */}
      {free ? (
        <div className="card mb-3 flex items-center gap-3 border border-emerald-200 bg-emerald-50/50 p-4">
          <ShieldCheck size={20} className="text-emerald-600" />
          <div><p className="text-sm font-bold text-ink-900">Free consultation</p><p className="text-xs text-ink-500">This doctor isn't charging — no payment required.</p></div>
        </div>
      ) : fees ? (
        <div className="mb-3"><FeeTable req={fees} /></div>
      ) : (
        <div className="card mb-3 flex items-center justify-between p-4"><span className="text-sm text-ink-600">Couldn't load fee details.</span><button onClick={loadConfig} className="text-sm font-semibold text-brand-700">Retry</button></div>
      )}
      <p className="mb-6 text-xs leading-relaxed text-ink-400">
        {free
          ? "Your request will be sent for the doctor to review and schedule the call."
          : "The consultation request will be sent after successful payment and must be approved before the call can begin."}
      </p>

      {/* Action bar */}
      <div className="sticky bottom-4 z-10">
        <button
          onClick={proceed}
          disabled={submitting || !available || (!free && !fees)}
          className="btn-primary w-full justify-center py-3.5 text-[15px] disabled:opacity-50"
        >
          {submitting ? <Loader2 size={18} className="animate-spin" /> : null}
          {free ? "Submit request" : `Proceed to payment${fees ? ` · ${formatRupees(fees.totalPaise)}` : ""}`}
        </button>
      </div>
    </div>
  );
}

function Label({ title, trailing }: { title: string; trailing: string }) {
  return (
    <div className="mb-2 flex items-baseline gap-2">
      <span className="text-xs font-bold uppercase tracking-wide text-ink-700">{title}</span>
      <span className="text-xs text-ink-400">({trailing})</span>
    </div>
  );
}

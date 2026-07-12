"use client";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "@/lib/router";
import {
  Video, MessageSquare, CheckCircle2, XCircle, CalendarClock, Clock, Loader2,
  Receipt, Star, FileText, Pill, Stethoscope, ClipboardList, X,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Avatar, Verified } from "@/components/ui/Primitives";
import { DetailSkeleton } from "@/components/ui/Skeletons";
import { useToast } from "@/components/ui/Toast";
import { useAuth } from "@/context/AuthContext";
import { useCall } from "@/context/CallContext";
import { dok } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  parseRequest, ConsultationRequest, formatRupees,
  isPendingPayment, isSubmitted, isUnderReview, isApproved, isCompleted, isDeclined, isCancelled,
} from "@/lib/consultations/types";
import { openRazorpayCheckout } from "@/lib/consultations/razorpay";
import { StatusPill, AttachmentChip, FeeTable, Rating } from "@/components/consult/parts";
import { dosagePattern } from "@/lib/consultations/types";

export default function RequestDetail() {
  const { requestId } = useParams<{ requestId: string }>();
  const nav = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const myId = user?._id || user?.id;
  const [sp] = useSearchParams();
  const isNew = sp.get("new") === "1";

  const [req, setReq] = useState<ConsultationRequest | null>(null);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = () => {
    setError(false);
    dok.consults.getRequest(requestId).then((d) => setReq(parseRequest(d.request))).catch(() => setError(true));
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [requestId]);

  if (error) return (
    <div className="mx-auto w-full max-w-2xl"><PageHeader title="Consultation" />
      <div className="card p-8 text-center"><p className="text-sm text-ink-600">Couldn't load this consultation.</p><button onClick={load} className="btn-primary mx-auto mt-4 px-5 py-2 text-sm">Retry</button></div></div>
  );
  if (!req) return <div className="mx-auto w-full max-w-2xl pb-24 pt-2"><DetailSkeleton blocks={3} /></div>;

  const viewerIsDoctor = myId === req.doctorId;
  const other = viewerIsDoctor
    ? { fullName: req.requester?.fullName, profilePhoto: req.requester?.profilePhoto, id: req.requesterId, isVerified: false }
    : { fullName: req.doctor?.fullName, profilePhoto: req.doctor?.profilePhoto, id: req.doctorId, isVerified: req.doctor?.isVerified };

  const refresh = () => dok.consults.getRequest(requestId).then((d) => setReq(parseRequest(d.request))).catch(() => {});

  return (
    <div className="mx-auto w-full max-w-2xl pb-24">
      <PageHeader title="Consultation" subtitle={viewerIsDoctor ? "Patient request" : "Your consultation"} forward={false}
        right={<StatusPill status={req.status} />} />

      {isNew && (isSubmitted(req.status) || isApproved(req.status)) && (
        <div className="card mb-4 flex items-center gap-3 border border-emerald-200 bg-emerald-50/60 p-4">
          <CheckCircle2 size={22} className="text-emerald-600" />
          <div><p className="text-sm font-bold text-ink-900">Request submitted</p><p className="text-xs text-ink-500">{viewerIsDoctor ? "" : "The doctor will review and schedule your consultation."}</p></div>
        </div>
      )}

      {/* Party */}
      <div className="card mb-4 flex items-center gap-3.5 p-4">
        <Avatar user={other} size={50} />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1 truncate text-[15px] font-bold text-ink-900">{other.fullName || "—"} {other.isVerified && <Verified size={13} />}</p>
          <p className="truncate text-xs text-ink-500">{viewerIsDoctor ? "Patient" : (req.doctor?.specialization || req.doctor?.headline || "Doctor")}</p>
        </div>
        {req.totalPaise > 0
          ? <span className="chip bg-brand-50 text-brand-700 text-xs font-semibold">{formatRupees(req.totalPaise)}</span>
          : <span className="chip bg-emerald-50 text-emerald-700 text-xs font-semibold">Free</span>}
      </div>

      {/* Reason + patient attachments */}
      {(req.reason || req.attachments.length > 0) && (
        <div className="card mb-4 p-4">
          {req.reason && (<><p className="mb-1 text-xs font-bold uppercase tracking-wide text-ink-400">Reason</p><p className="mb-3 whitespace-pre-wrap text-sm text-ink-700">{req.reason}</p></>)}
          {req.attachments.length > 0 && (<>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-400">Attachments</p>
            <div className="flex flex-wrap gap-2">{req.attachments.map((a, i) => <AttachmentChip key={i} att={a} />)}</div>
          </>)}
        </div>
      )}

      {/* Status-specific action panels */}
      {viewerIsDoctor && (isSubmitted(req.status) || isUnderReview(req.status))
        ? <DoctorReviewPanel req={req} busy={busy} setBusy={setBusy} onChanged={refresh} />
        : null}

      {isApproved(req.status) && <ScheduledPanel req={req} viewerIsDoctor={viewerIsDoctor} otherId={other.id} otherName={other.fullName} otherPhoto={other.profilePhoto} onComplete={() => nav(`/app/consults/${req.id}/summary`)} />}

      {!viewerIsDoctor && isPendingPayment(req.status) && (
        <PayPanel req={req} busy={busy} setBusy={setBusy} onChanged={refresh} user={user} />
      )}

      {!viewerIsDoctor && (isSubmitted(req.status) || isUnderReview(req.status)) && (
        <div className="card mb-4 flex flex-col items-center gap-2 p-6 text-center">
          <Clock size={26} className="text-brand-500" />
          <p className="text-sm font-semibold text-ink-800">Awaiting the doctor's review</p>
          <p className="text-xs text-ink-500">You'll be notified once it's approved and scheduled.</p>
        </div>
      )}

      {isDeclined(req.status) && (
        <div className="card mb-4 flex items-start gap-3 border border-rose-200 bg-rose-50/50 p-4">
          <XCircle size={20} className="mt-0.5 text-rose-500" />
          <div><p className="text-sm font-bold text-ink-900">Request declined</p>{req.declineReason && <p className="mt-0.5 text-xs text-ink-600">{req.declineReason}</p>}</div>
        </div>
      )}
      {isCancelled(req.status) && (
        <div className="card mb-4 p-4 text-sm text-ink-600">This consultation was cancelled.</div>
      )}

      {/* Completed clinical summary */}
      {isCompleted(req.status) && req.clinicalSummary && <ClinicalSummaryView req={req} />}
      {isCompleted(req.status) && !req.clinicalSummary && viewerIsDoctor && (
        <button onClick={() => nav(`/app/consults/${req.id}/summary`)} className="btn-primary mb-4 w-full justify-center py-3 text-sm"><ClipboardList size={16} /> Write consultation summary</button>
      )}

      {/* Invoice (paid) */}
      {req.totalPaise > 0 && (isCompleted(req.status) || isApproved(req.status)) && (
        <button onClick={() => nav(`/app/consults/${req.id}/invoice`)} className="mb-3 flex w-full items-center gap-3 rounded-xl border border-ink-900/[.08] bg-surface p-3.5 text-left text-sm font-medium text-ink-700 transition hover:border-brand-300">
          <Receipt size={17} className="text-brand-600" /> View invoice
        </button>
      )}

      {/* Rating (requester, completed, not yet rated) */}
      {!viewerIsDoctor && isCompleted(req.status) && !req.rating && <RatePanel req={req} onRated={refresh} />}
      {isCompleted(req.status) && req.rating && (
        <div className="card mb-3 flex items-center gap-2 p-4">
          <span className="text-sm font-semibold text-ink-700">Your rating:</span>
          <span className="inline-flex">{[1,2,3,4,5].map((n) => <Star key={n} size={16} className={cn(n <= req.rating!.stars ? "fill-amber-400 text-amber-400" : "text-ink-300")} />)}</span>
        </div>
      )}

      {/* Message (completed) — reuse existing chat */}
      {isCompleted(req.status) && <MessageButton otherId={other.id} />}
    </div>
  );
}

// ── Doctor review (approve / decline) ─────────────────────────────────────────
function DoctorReviewPanel({ req, busy, setBusy, onChanged }: { req: ConsultationRequest; busy: string | null; setBusy: (b: string | null) => void; onChanged: () => void }) {
  const toast = useToast();
  const [when, setWhen] = useState("");
  const [declining, setDeclining] = useState(false);
  const [declineReason, setDeclineReason] = useState("");

  const approve = async () => {
    if (!when) return toast?.error("Pick a date and time for the consultation.");
    setBusy("approve");
    try {
      await dok.consults.approveRequest(req.id, new Date(when).toISOString());
      toast?.success("Consultation approved — patient notified.");
      onChanged();
    } catch (e: any) { toast?.error(e?.response?.data?.message || "Couldn't approve. Try again."); }
    finally { setBusy(null); }
  };
  const decline = async () => {
    setBusy("decline");
    try {
      await dok.consults.declineRequest(req.id, declineReason.trim() || undefined);
      toast?.success("Request declined.");
      onChanged();
    } catch (e: any) { toast?.error(e?.response?.data?.message || "Couldn't decline. Try again."); }
    finally { setBusy(null); setDeclining(false); }
  };

  const minLocal = new Date(Date.now() + 5 * 60000).toISOString().slice(0, 16);

  return (
    <div className="card mb-4 p-4">
      <p className="mb-2 flex items-center gap-2 text-sm font-bold text-ink-900"><CalendarClock size={16} className="text-brand-600" /> Schedule the consultation</p>
      <input type="datetime-local" min={minLocal} value={when} onChange={(e) => setWhen(e.target.value)}
        className="mb-3 w-full rounded-xl border border-ink-900/10 bg-surface px-3.5 py-2.5 text-sm outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100" />
      <div className="flex gap-2">
        <button onClick={approve} disabled={!!busy} className="btn-primary flex-1 justify-center py-2.5 text-sm disabled:opacity-50">
          {busy === "approve" ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />} Approve
        </button>
        <button onClick={() => setDeclining((d) => !d)} disabled={!!busy} className="flex-1 justify-center rounded-full border border-rose-200 py-2.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50">
          Decline
        </button>
      </div>
      {declining && (
        <div className="mt-3 rounded-xl border border-ink-900/[.06] bg-ink-900/[.02] p-3">
          <textarea value={declineReason} onChange={(e) => setDeclineReason(e.target.value)} rows={2} placeholder="Reason (optional, shared with the patient)"
            className="mb-2 w-full resize-none rounded-lg border border-ink-900/10 bg-surface p-2.5 text-sm outline-none focus:border-brand-400" />
          <button onClick={decline} disabled={!!busy} className="w-full rounded-full bg-rose-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
            {busy === "decline" ? "Declining…" : "Confirm decline"}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Scheduled / call panel ────────────────────────────────────────────────────
function ScheduledPanel({ req, viewerIsDoctor, otherId, otherName, otherPhoto, onComplete }: {
  req: ConsultationRequest; viewerIsDoctor: boolean; otherId: string; otherName?: string; otherPhoto?: string | null; onComplete: () => void;
}) {
  const toast = useToast();
  const call = useCall();
  const [, force] = useState(0);
  const [joining, setJoining] = useState(false);

  // Tick every second for the countdown.
  useEffect(() => { const t = setInterval(() => force((n) => n + 1), 1000); return () => clearInterval(t); }, []);

  const scheduled = req.scheduledAt ? new Date(req.scheduledAt) : null;
  const diffMin = scheduled ? (scheduled.getTime() - Date.now()) / 60000 : 0;
  const inWindow = !scheduled || (diffMin <= 5 && diffMin >= -15); // 5 min before → 15 min after
  const countdown = (() => {
    if (!scheduled) return "";
    let s = Math.max(0, Math.floor((scheduled.getTime() - Date.now()) / 1000));
    const h = Math.floor(s / 3600); s -= h * 3600; const m = Math.floor(s / 60); s -= m * 60;
    return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
  })();

  const startCall = async () => {
    setJoining(true);
    try {
      await dok.consults.joinCall(req.id).catch(() => {}); // mark call started server-side (best-effort)
      call.startCall(otherId, otherName || "Consultation", otherPhoto || null, "video");
    } catch { toast?.error("Couldn't start the call."); }
    finally { setJoining(false); }
  };

  return (
    <div className="card mb-4 p-4">
      <div className="flex items-center gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-xl bg-brand-50 text-center">
          <span className="text-[10px] font-extrabold leading-none text-brand-600">{scheduled ? scheduled.toLocaleString("en-US", { month: "short" }).toUpperCase() : "—"}</span>
          <span className="text-base font-extrabold leading-none text-ink-900">{scheduled ? scheduled.getDate() : "?"}</span>
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-ink-900">{scheduled ? scheduled.toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "Scheduled"}</p>
          <p className="text-xs text-ink-500">Encrypted 1:1 call</p>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-brand-600 py-3 text-white">
        <Clock size={16} /> <span className="text-sm font-bold">Starts in {countdown}</span>
      </div>
      <button onClick={startCall} disabled={!inWindow || joining || call.phase !== "idle"}
        className="btn-primary mt-3 w-full justify-center py-3 text-sm disabled:opacity-50">
        {joining ? <Loader2 size={16} className="animate-spin" /> : <Video size={16} />}
        {inWindow ? "Start consultation" : `Starts in ${countdown}`}
      </button>
      {viewerIsDoctor && (
        <button onClick={onComplete} className="mt-2 w-full justify-center rounded-full border border-ink-900/10 py-2.5 text-sm font-semibold text-ink-700 transition hover:border-brand-300">
          <ClipboardList size={15} className="mr-1 inline" /> Complete & write summary
        </button>
      )}
    </div>
  );
}

// ── Pay panel (requester, pending payment) ────────────────────────────────────
function PayPanel({ req, busy, setBusy, onChanged, user }: { req: ConsultationRequest; busy: string | null; setBusy: (b: string | null) => void; onChanged: () => void; user: any }) {
  const toast = useToast();
  const pay = async () => {
    setBusy("pay");
    try {
      const order = await dok.consults.createPaymentOrder(req.id);
      const o = order.order || order;
      const result = await openRazorpayCheckout({
        order: { orderId: o.orderId || o.id, amount: o.amount ?? req.totalPaise, currency: o.currency, keyId: o.keyId },
        name: "Orovion Consultation", description: `Consultation with ${req.doctor?.fullName || "doctor"}`,
        prefill: { name: user?.fullName, email: user?.email, contact: user?.phone },
      });
      await dok.consults.confirmPayment(req.id, {
        razorpay_payment_id: result.razorpay_payment_id,
        razorpay_order_id: result.razorpay_order_id,
        razorpay_signature: result.razorpay_signature,
      });
      toast?.success("Payment successful.");
      onChanged();
    } catch (e: any) { toast?.error(e?.message || "Payment failed."); }
    finally { setBusy(null); }
  };
  const cancel = async () => {
    setBusy("cancel");
    try { await dok.consults.cancelRequest(req.id); toast?.success("Request cancelled."); onChanged(); }
    catch { toast?.error("Couldn't cancel."); }
    finally { setBusy(null); }
  };
  return (
    <div className="card mb-4 p-4">
      <div className="mb-3"><FeeTable req={req} /></div>
      <button onClick={pay} disabled={!!busy} className="btn-primary w-full justify-center py-3 text-sm disabled:opacity-50">
        {busy === "pay" ? <Loader2 size={16} className="animate-spin" /> : null} Pay {formatRupees(req.totalPaise)}
      </button>
      <button onClick={cancel} disabled={!!busy} className="mt-2 w-full rounded-full py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50">Cancel request</button>
    </div>
  );
}

// ── Rating ────────────────────────────────────────────────────────────────────
function RatePanel({ req, onRated }: { req: ConsultationRequest; onRated: () => void }) {
  const toast = useToast();
  const [stars, setStars] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (stars < 1) return toast?.error("Tap a star to rate.");
    setBusy(true);
    try { await dok.consults.submitRating({ consultationRequestId: req.id, stars, ...(comment.trim() ? { comment: comment.trim() } : {}) }); toast?.success("Thanks for your feedback!"); onRated(); }
    catch (e: any) { toast?.error(e?.response?.data?.message || "Couldn't submit rating."); }
    finally { setBusy(false); }
  };
  return (
    <div className="card mb-3 p-4">
      <p className="mb-2 text-sm font-bold text-ink-900">Rate your consultation</p>
      <div className="mb-3 flex gap-1" onMouseLeave={() => setHover(0)}>
        {[1,2,3,4,5].map((n) => (
          <button key={n} onMouseEnter={() => setHover(n)} onClick={() => setStars(n)}>
            <Star size={28} className={cn((hover || stars) >= n ? "fill-amber-400 text-amber-400" : "text-ink-300")} />
          </button>
        ))}
      </div>
      <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2} placeholder="Add a comment (optional)"
        className="mb-2 w-full resize-none rounded-xl border border-ink-900/10 bg-surface p-2.5 text-sm outline-none focus:border-brand-400" />
      <button onClick={submit} disabled={busy} className="btn-primary w-full justify-center py-2.5 text-sm disabled:opacity-50">{busy ? "Submitting…" : "Submit rating"}</button>
    </div>
  );
}

// ── Message button (reuse chat) ──────────────────────────────────────────────
function MessageButton({ otherId }: { otherId: string }) {
  const nav = useNavigate();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const open = async () => {
    setBusy(true);
    try {
      const d = await dok.chat.start({ recipientId: otherId });
      const cid = d?.conversation?.id || d?.conversation?._id || d?.conversationId;
      nav(cid ? `/app/messages?c=${cid}` : "/app/messages");
    } catch { toast?.error("Couldn't open the conversation"); }
    finally { setBusy(false); }
  };
  return (
    <button onClick={open} disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-full border border-ink-900/10 bg-surface py-3 text-sm font-semibold text-ink-700 transition hover:border-brand-300 disabled:opacity-50">
      {busy ? <Loader2 size={16} className="animate-spin" /> : <MessageSquare size={16} />} Message
    </button>
  );
}

// ── Clinical summary (read-only, both parties) ────────────────────────────────
export function ClinicalSummaryView({ req }: { req: ConsultationRequest }) {
  const cs = req.clinicalSummary!;
  return (
    <div className="card mb-4 p-4">
      <p className="mb-3 flex items-center gap-2 text-sm font-bold text-ink-900"><Stethoscope size={16} className="text-brand-600" /> Consultation summary</p>
      {cs.diagnosis && <Field icon={Stethoscope} label="Diagnosis" value={cs.diagnosis} />}
      {cs.summary && <Field icon={ClipboardList} label="Summary" value={cs.summary} />}
      {cs.advice && <Field icon={CheckCircle2} label="Advice" value={cs.advice} />}
      {cs.followUp && <Field icon={CalendarClock} label="Follow-up" value={cs.followUp} />}
      {cs.nextVisit && <Field icon={CalendarClock} label="Next visit" value={cs.nextVisit} />}
      {cs.medicines.length > 0 && (
        <div className="mt-3">
          <p className="mb-1.5 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-ink-400"><Pill size={13} /> Prescription</p>
          <div className="space-y-2">
            {cs.medicines.map((m, i) => (
              <div key={i} className="rounded-xl border border-ink-900/[.06] bg-surface p-3">
                <p className="text-sm font-semibold text-ink-900">{m.name} {m.strength && <span className="font-normal text-ink-500">· {m.strength}</span>}</p>
                <p className="mt-0.5 text-xs text-ink-500">
                  {dosagePattern(m)} · {m.beforeFood ? "Before food" : "After food"}{m.duration ? ` · ${m.duration}` : ""}
                </p>
                {m.instructions && <p className="mt-0.5 text-xs text-ink-500">{m.instructions}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
      {cs.attachments.length > 0 && (
        <div className="mt-3">
          <p className="mb-1.5 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-ink-400"><FileText size={13} /> Documents</p>
          <div className="flex flex-wrap gap-2">{cs.attachments.map((a, i) => <AttachmentChip key={i} att={a} />)}</div>
        </div>
      )}
    </div>
  );
}
function Field({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="mb-3 last:mb-0">
      <p className="mb-0.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-ink-400"><Icon size={13} /> {label}</p>
      <p className="whitespace-pre-wrap text-sm text-ink-700">{value}</p>
    </div>
  );
}

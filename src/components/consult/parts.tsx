"use client";
/**
 * Shared presentational parts for the consultation module. Pure UI — all data
 * comes from the backend via dok.consults.*; no business logic lives here.
 */
import { Link } from "@/lib/router";
import { Avatar, Verified } from "@/components/ui/Primitives";
import { Star, Paperclip, FileText, ImageIcon, Stethoscope } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CallsDoctor, ConsultationRequest, ConsultAttachment, formatRupees,
  statusLabel, doctorIsFree,
} from "@/lib/consultations/types";

// Status → tone mapping for pills.
const STATUS_TONE: Record<string, string> = {
  PENDING_PAYMENT: "bg-amber-50 text-amber-700",
  PAYMENT_FAILED: "bg-rose-50 text-rose-700",
  SUBMITTED: "bg-sky-50 text-sky-700",
  UNDER_REVIEW: "bg-sky-50 text-sky-700",
  APPROVED_SCHEDULED: "bg-brand-50 text-brand-700",
  COMPLETED: "bg-emerald-50 text-emerald-700",
  DECLINED: "bg-rose-50 text-rose-700",
  CANCELLED: "bg-ink-900/5 text-ink-600",
  EXPIRED: "bg-ink-900/5 text-ink-600",
};

export function StatusPill({ status, className }: { status: string; className?: string }) {
  return (
    <span className={cn("chip text-[11px] font-semibold", STATUS_TONE[status] || "bg-ink-900/5 text-ink-600", className)}>
      {statusLabel(status)}
    </span>
  );
}

export function FeeBadge({ doctor }: { doctor: CallsDoctor }) {
  if (doctorIsFree(doctor)) return <span className="chip bg-emerald-50 text-emerald-700 text-[11px] font-semibold">Free</span>;
  if (doctor.consultationFeePaise > 0) return <span className="chip bg-brand-50 text-brand-700 text-[11px] font-semibold">{formatRupees(doctor.consultationFeePaise)}</span>;
  return <span className="chip bg-ink-900/5 text-ink-600 text-[11px]">Unavailable</span>;
}

export function Rating({ value, count }: { value?: number | null; count?: number }) {
  if (!value) return <span className="text-xs text-ink-400">No ratings yet</span>;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-ink-600">
      <Star size={13} className="fill-amber-400 text-amber-400" /> {value.toFixed(1)}
      {count ? <span className="text-ink-400">({count})</span> : null}
    </span>
  );
}

export const isImageUrl = (url: string) => /\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/i.test(url) || /\/image\/upload\//.test(url);
export const isPdfUrl = (url: string) => /\.pdf(\?|$)/i.test(url) || /\/(raw|image)\/upload\/.*\.pdf/i.test(url);

/** A tappable attachment chip — opens the file in a new tab (image / PDF / doc). */
export function AttachmentChip({ att, onOpen }: { att: ConsultAttachment; onOpen?: (att: ConsultAttachment) => void }) {
  const Icon = isImageUrl(att.url) ? ImageIcon : FileText;
  return (
    <button
      type="button"
      onClick={() => (onOpen ? onOpen(att) : window.open(att.url, "_blank", "noopener"))}
      className="press inline-flex max-w-[200px] items-center gap-2 rounded-xl border border-ink-900/[.08] bg-surface px-3 py-2 text-left text-sm transition hover:border-brand-300 hover:bg-brand-50"
    >
      <Icon size={16} className="shrink-0 text-brand-600" />
      <span className="truncate">{att.name || "Attachment"}</span>
    </button>
  );
}

export function DoctorCard({ doctor }: { doctor: CallsDoctor }) {
  return (
    <Link
      to={`/app/consults/request/${doctor.id}`}
      className="card group flex items-center gap-4 p-4 transition hover:shadow-glow"
    >
      <Avatar user={{ fullName: doctor.fullName, profilePhoto: doctor.profilePhoto }} size={52} />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1 truncate text-[15px] font-semibold text-ink-900">
          {doctor.fullName} {doctor.isVerified && <Verified size={13} />}
        </p>
        <p className="truncate text-xs text-ink-500">
          {doctor.specialization || doctor.headline || "Doctor"}{doctor.location ? ` · ${doctor.location}` : ""}
        </p>
        <div className="mt-1.5 flex items-center gap-2">
          <FeeBadge doctor={doctor} />
          <Rating value={doctor.avgRating} count={doctor.ratingCount} />
        </div>
      </div>
      <Stethoscope size={18} className="shrink-0 text-ink-300 transition group-hover:text-brand-600" />
    </Link>
  );
}

export function RequestRow({ req, href, viewerIsDoctor }: { req: ConsultationRequest; href: string; viewerIsDoctor: boolean }) {
  const other = viewerIsDoctor
    ? { fullName: req.requester?.fullName, profilePhoto: req.requester?.profilePhoto }
    : { fullName: req.doctor?.fullName, profilePhoto: req.doctor?.profilePhoto };
  return (
    <Link to={href} className="card flex items-center gap-3.5 p-4 transition hover:shadow-glow">
      <Avatar user={other} size={46} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink-900">{other.fullName || "Consultation"}</p>
        {req.reason && <p className="truncate text-xs text-ink-500">{req.reason}</p>}
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <StatusPill status={req.status} />
          {req.totalPaise > 0
            ? <span className="text-xs text-ink-500">{formatRupees(req.totalPaise)}</span>
            : <span className="text-xs text-emerald-600">Free</span>}
          {(req.attachments.length > 0) && (
            <span className="inline-flex items-center gap-1 text-xs text-ink-400"><Paperclip size={12} /> {req.attachments.length}</span>
          )}
        </div>
      </div>
    </Link>
  );
}

export function Empty({ icon: Icon = Stethoscope, title, hint }: { icon?: any; title: string; hint?: string }) {
  return (
    <div className="grid place-items-center rounded-2xl border border-dashed border-ink-900/10 py-16 text-center">
      <Icon size={30} className="text-ink-300" />
      <p className="mt-3 text-sm font-semibold text-ink-700">{title}</p>
      {hint && <p className="mt-1 max-w-xs text-xs text-ink-400">{hint}</p>}
    </div>
  );
}

/** Fee breakdown table used in the request + payment screens. */
export function FeeTable({ req }: { req: { consultationFeePaise: number; platformFeePaise: number; gstPaise: number; totalPaise: number } }) {
  const Row = ({ label, paise, bold }: { label: string; paise: number; bold?: boolean }) => (
    <div className={cn("flex items-center justify-between py-1.5 text-sm", bold ? "font-bold text-ink-900" : "text-ink-600")}>
      <span>{label}</span><span>{formatRupees(paise)}</span>
    </div>
  );
  return (
    <div className="rounded-xl border border-ink-900/[.08] bg-surface p-4">
      <Row label="Consultation fee" paise={req.consultationFeePaise} />
      <Row label="Platform fee" paise={req.platformFeePaise} />
      <Row label="GST" paise={req.gstPaise} />
      <div className="my-1 h-px bg-ink-900/[.06]" />
      <Row label="Total" paise={req.totalPaise} bold />
    </div>
  );
}

/**
 * Consultation V2 types + parsers — the TypeScript mirror of
 * docnet/lib/features/calls/calls_models.dart.
 *
 * All money fields are paise (integer) from the server; `*Rupees` helpers divide
 * by 100. Parsers tolerate the same backend field-name variance the Dart models do.
 * Framework-free so the logic is unit-testable without the React tree.
 */

const toInt = (v: any): number => {
  if (typeof v === "number") return Math.trunc(v);
  const n = parseInt(String(v ?? ""), 10);
  return Number.isNaN(n) ? 0 : n;
};
const toNum = (v: any): number => {
  if (typeof v === "number") return v;
  const n = parseFloat(String(v ?? ""));
  return Number.isNaN(n) ? 0 : n;
};
export const rupees = (paise: number) => toInt(paise) / 100;
export const formatRupees = (paise: number) =>
  `₹${(toInt(paise) / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

// ── Doctor ─────────────────────────────────────────────────────────────────
export interface FeeBreakdown {
  consultationFeePaise: number;
  platformFeePaise: number;
  gstPaise: number;
  totalPaise: number;
}
export function parseFeeBreakdown(j: any): FeeBreakdown {
  return {
    consultationFeePaise: toInt(j?.consultationFeePaise),
    platformFeePaise: toInt(j?.platformFeePaise),
    gstPaise: toInt(j?.gstPaise),
    totalPaise: toInt(j?.totalPaise),
  };
}

export interface CallsDoctor {
  id: string;
  fullName: string;
  profilePhoto?: string | null;
  specialization?: string | null;
  headline?: string | null;
  location?: string | null;
  isVerified: boolean;
  consultationFeePaise: number;
  freeConsultationsAllowed: boolean;
  whoCanRequest: string;
  requireReason: boolean;
  avgRating?: number | null;
  ratingCount: number;
  paidCallsEnabled: boolean;
  fees?: FeeBreakdown | null;
}
export function parseDoctor(j: any): CallsDoctor {
  return {
    id: String(j?.id ?? ""),
    fullName: String(j?.fullName ?? ""),
    profilePhoto: j?.profilePhoto ?? null,
    specialization: j?.specialization ?? null,
    headline: j?.headline ?? null,
    location: j?.location ?? null,
    isVerified: j?.isVerified === true,
    consultationFeePaise: toInt(j?.consultationFeePaise),
    freeConsultationsAllowed: j?.freeConsultationsAllowed === true,
    whoCanRequest: String(j?.whoCanRequest ?? "BOTH"),
    requireReason: j?.requireReason === true,
    avgRating: j?.avgRating != null ? toNum(j.avgRating) : null,
    ratingCount: toInt(j?.ratingCount),
    paidCallsEnabled: j?.paidCallsEnabled == null ? true : j.paidCallsEnabled === true,
    fees: j?.fees && typeof j.fees === "object" ? parseFeeBreakdown(j.fees) : null,
  };
}
export const doctorIsAvailable = (d: CallsDoctor) =>
  (d.paidCallsEnabled && d.consultationFeePaise > 0) || d.freeConsultationsAllowed;
/** Free path when the doctor isn't charging but allows free consults. */
export const doctorIsFree = (d: CallsDoctor) => !d.paidCallsEnabled && d.freeConsultationsAllowed;

// ── Attachment ─────────────────────────────────────────────────────────────
export interface ConsultAttachment {
  url: string;
  publicId: string;
  name: string;
}
export function parseAttachment(j: any): ConsultAttachment {
  return {
    url: String(j?.url ?? ""),
    publicId: String(j?.publicId ?? ""),
    name: String(j?.name ?? "attachment"),
  };
}

// ── Medicine + Clinical summary ──────────────────────────────────────────────
export interface Medicine {
  name: string;
  strength: string;
  morning: boolean;
  afternoon: boolean;
  night: boolean;
  beforeFood: boolean; // false = after food
  duration: string;
  instructions: string;
}
export const emptyMedicine = (): Medicine => ({
  name: "", strength: "", morning: false, afternoon: false, night: false,
  beforeFood: false, duration: "", instructions: "",
});
export const dosagePattern = (m: Medicine) =>
  `${m.morning ? 1 : 0}-${m.afternoon ? 1 : 0}-${m.night ? 1 : 0}`;
export function parseMedicine(j: any): Medicine {
  return {
    name: String(j?.name ?? ""),
    strength: String(j?.strength ?? ""),
    morning: j?.morning === true,
    afternoon: j?.afternoon === true,
    night: j?.night === true,
    beforeFood: j?.beforeFood === true,
    duration: String(j?.duration ?? ""),
    instructions: String(j?.instructions ?? ""),
  };
}

export interface ClinicalSummary {
  diagnosis: string;
  summary: string;
  advice: string;
  followUp: string;
  nextVisit?: string | null;
  medicines: Medicine[];
  attachments: ConsultAttachment[];
  completedAt?: string | null;
}
export function parseClinicalSummary(j: any): ClinicalSummary {
  return {
    diagnosis: String(j?.diagnosis ?? ""),
    summary: String(j?.summary ?? ""),
    advice: String(j?.advice ?? ""),
    followUp: String(j?.followUp ?? ""),
    nextVisit: j?.nextVisit ?? null,
    medicines: Array.isArray(j?.medicines) ? j.medicines.map(parseMedicine) : [],
    attachments: Array.isArray(j?.attachments) ? j.attachments.map(parseAttachment) : [],
    completedAt: j?.completedAt ?? null,
  };
}

// ── Rating ───────────────────────────────────────────────────────────────────
export interface ConsultRating {
  id: string;
  stars: number;
  comment?: string | null;
  createdAt?: string | null;
}
export function parseRating(j: any): ConsultRating {
  return {
    id: String(j?.id ?? ""),
    stars: toInt(j?.stars),
    comment: j?.comment ?? null,
    createdAt: j?.createdAt ?? null,
  };
}

// ── Consultation request ─────────────────────────────────────────────────────
export interface ConsultationRequest {
  id: string;
  requesterId: string;
  doctorId: string;
  status: string;
  consultationFeePaise: number;
  platformFeePaise: number;
  gstPaise: number;
  totalPaise: number;
  doctorPayoutPaise: number;
  reason?: string | null;
  scheduledAt?: string | null;
  declineReason?: string | null;
  cancelledBy?: string | null;
  paymentOrderId?: string | null;
  paymentId?: string | null;
  refundId?: string | null;
  createdAt?: string | null;
  doctor?: CallsDoctor | null;
  requester?: any | null;
  call?: any | null;
  rating?: ConsultRating | null;
  attachments: ConsultAttachment[];
  clinicalSummary?: ClinicalSummary | null;
}
export function parseRequest(j: any): ConsultationRequest {
  return {
    id: String(j?.id ?? ""),
    requesterId: String(j?.requesterId ?? ""),
    doctorId: String(j?.doctorId ?? ""),
    status: String(j?.status ?? "PENDING_PAYMENT"),
    consultationFeePaise: toInt(j?.consultationFeePaise),
    platformFeePaise: toInt(j?.platformFeePaise),
    gstPaise: toInt(j?.gstPaise),
    totalPaise: toInt(j?.totalPaise),
    doctorPayoutPaise: toInt(j?.doctorPayoutPaise),
    reason: j?.reason ?? null,
    scheduledAt: j?.scheduledAt ?? null,
    declineReason: j?.declineReason ?? null,
    cancelledBy: j?.cancelledBy ?? null,
    paymentOrderId: j?.paymentOrderId ?? null,
    paymentId: j?.paymentId ?? null,
    refundId: j?.refundId ?? null,
    createdAt: j?.createdAt ?? null,
    doctor: j?.doctor && typeof j.doctor === "object" ? parseDoctor(j.doctor) : null,
    requester: j?.requester ?? null,
    call: j?.call ?? null,
    rating: j?.rating && typeof j.rating === "object" ? parseRating(j.rating) : null,
    attachments: Array.isArray(j?.attachments) ? j.attachments.map(parseAttachment) : [],
    clinicalSummary: j?.clinicalSummary && typeof j.clinicalSummary === "object"
      ? parseClinicalSummary(j.clinicalSummary) : null,
  };
}

// Status predicates — mirror the Dart getters exactly.
export const isPendingPayment = (s: string) => s === "PENDING_PAYMENT" || s === "PAYMENT_FAILED";
export const isSubmitted = (s: string) => s === "SUBMITTED";
export const isUnderReview = (s: string) => s === "UNDER_REVIEW";
export const isApproved = (s: string) => s === "APPROVED_SCHEDULED";
export const isCompleted = (s: string) => s === "COMPLETED";
export const isDeclined = (s: string) => s === "DECLINED";
export const isCancelled = (s: string) => s === "CANCELLED";
export const isTerminal = (s: string) =>
  isCompleted(s) || isDeclined(s) || isCancelled(s) || s === "EXPIRED";

export const STATUS_LABELS: Record<string, string> = {
  PENDING_PAYMENT: "Pending payment",
  PAYMENT_FAILED: "Payment failed",
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under review",
  APPROVED_SCHEDULED: "Scheduled",
  COMPLETED: "Completed",
  DECLINED: "Declined",
  CANCELLED: "Cancelled",
  EXPIRED: "Expired",
};
export const statusLabel = (s: string) => STATUS_LABELS[s] ?? s;

// Hashtags extracted from the reason text (mirrors Dart `tags`).
export const reasonTags = (reason?: string | null): string[] =>
  reason ? (reason.match(/#\w+/g) ?? []) : [];

export const requesterName = (r: ConsultationRequest) => String(r.requester?.fullName ?? "");
export const requesterPhoto = (r: ConsultationRequest): string | null => r.requester?.profilePhoto ?? null;

// ── Doctor settings ──────────────────────────────────────────────────────────
export interface DoctorConsultationSettings {
  paidCallsEnabled: boolean;
  freeConsultationsAllowed: boolean;
  consultationFeePaise: number;
  whoCanRequest: string;
  requireReason: boolean;
  availability: string;
}
export function parseSettings(j: any): DoctorConsultationSettings {
  return {
    paidCallsEnabled: j?.paidCallsEnabled === true,
    freeConsultationsAllowed: j?.freeConsultationsAllowed === true,
    consultationFeePaise: toInt(j?.consultationFeePaise),
    whoCanRequest: String(j?.whoCanRequest ?? "BOTH"),
    requireReason: j?.requireReason === true,
    availability: String(j?.availability ?? "Mon-Fri eve"),
  };
}

// ── Bank account ─────────────────────────────────────────────────────────────
export interface DoctorBankAccount {
  id: string;
  accountHolderName: string;
  bankName: string;
  accountNumberMasked: string;
  ifscCode: string;
  accountType: string;
  isPrimary: boolean;
  isVerified: boolean;
  verificationStatus: string;
  razorpayContactId?: string | null;
  razorpayFundAccountId?: string | null;
  createdAt?: string | null;
}
export function parseBankAccount(j: any): DoctorBankAccount {
  return {
    id: String(j?.id ?? ""),
    accountHolderName: String(j?.accountHolderName ?? ""),
    bankName: String(j?.bankName ?? ""),
    accountNumberMasked: String(j?.accountNumberMasked ?? ""),
    ifscCode: String(j?.ifscCode ?? ""),
    accountType: String(j?.accountType ?? "SAVINGS"),
    isPrimary: j?.isPrimary === true,
    isVerified: j?.isVerified === true,
    verificationStatus: String(j?.verificationStatus ?? "PENDING"),
    razorpayContactId: j?.razorpayContactId ?? null,
    razorpayFundAccountId: j?.razorpayFundAccountId ?? null,
    createdAt: j?.createdAt ?? null,
  };
}

// ── Earnings ─────────────────────────────────────────────────────────────────
export interface EarningsSummary {
  grossEarningsPaise: number;
  netEarningsPaise: number;
  platformFeesPaise: number;
  completedCount: number;
}
export function parseEarnings(j: any): EarningsSummary {
  return {
    grossEarningsPaise: toInt(j?.grossEarningsPaise),
    netEarningsPaise: toInt(j?.netEarningsPaise),
    platformFeesPaise: toInt(j?.platformFeesPaise),
    completedCount: toInt(j?.completedCount),
  };
}

// whoCanRequest options — consolidated set used by the settings editor.
export const WHO_CAN_REQUEST_OPTIONS = [
  { value: "all", label: "Anyone" },
  { value: "connections", label: "Followers & connections" },
  { value: "invite_only", label: "Invite only" },
];
export const whoCanRequestLabel = (v: string) => {
  switch (v) {
    case "all": case "BOTH": return "Anyone";
    case "connections": case "followers": return "Followers & connections";
    case "invite_only": return "Invite only";
    case "GENERAL_USER": return "General users";
    case "STUDENT": return "Students";
    default: return v;
  }
};

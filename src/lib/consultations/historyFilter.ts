/**
 * Framework-free filter / sort / search + stats engine for consultation history.
 * TypeScript mirror of docnet/lib/features/calls/consultation_history_filter.dart.
 * Pure (no React) so it is unit-testable and shared by doctor + patient history.
 */
import {
  ConsultationRequest, requesterName, rupees,
  isCompleted, isApproved, isDeclined, isCancelled, isSubmitted, isUnderReview, isPendingPayment,
} from "./types";

export type HistoryStatusFilter = "all" | "completed" | "pending" | "approved" | "declined" | "cancelled";
export type HistoryTypeFilter = "all" | "paid" | "free";
export type HistorySort =
  | "newest" | "oldest" | "feeHigh" | "feeLow" | "durationLong" | "ratingHigh" | "alphabetical";

export interface ConsultationHistoryQuery {
  search: string;
  status: HistoryStatusFilter;
  type: HistoryTypeFilter;
  minRating: number; // 0 = any
  hasPrescription: boolean;
  hasAttachments: boolean;
  unreadOnly: boolean;
  sort: HistorySort;
}

export const emptyQuery = (): ConsultationHistoryQuery => ({
  search: "", status: "all", type: "all", minRating: 0,
  hasPrescription: false, hasAttachments: false, unreadOnly: false, sort: "newest",
});

export const queryIsActive = (q: ConsultationHistoryQuery): boolean =>
  q.search.trim() !== "" || q.status !== "all" || q.type !== "all" ||
  q.minRating > 0 || q.hasPrescription || q.hasAttachments || q.unreadOnly;

export const activeFilterCount = (q: ConsultationHistoryQuery): number =>
  (q.status !== "all" ? 1 : 0) + (q.type !== "all" ? 1 : 0) + (q.minRating > 0 ? 1 : 0) +
  (q.hasPrescription ? 1 : 0) + (q.hasAttachments ? 1 : 0) + (q.unreadOnly ? 1 : 0);

// ── Field accessors (shared so card + filter agree) ─────────────────────────
export const consultationDurationSeconds = (r: ConsultationRequest): number => {
  const d = r.call?.durationSeconds;
  return typeof d === "number" ? Math.trunc(d) : parseInt(String(d ?? ""), 10) || 0;
};
export const consultationRating = (r: ConsultationRequest): number => r.rating?.stars ?? 0;
export const consultationHasPrescription = (r: ConsultationRequest): boolean =>
  (r.clinicalSummary?.medicines.length ?? 0) > 0;
export const consultationHasAttachments = (r: ConsultationRequest): boolean =>
  (r.clinicalSummary?.attachments.length ?? 0) > 0 || r.attachments.length > 0;
export const consultationIsPaid = (r: ConsultationRequest): boolean => r.totalPaise > 0;

function matchesStatus(r: ConsultationRequest, f: HistoryStatusFilter): boolean {
  switch (f) {
    case "all": return true;
    case "completed": return isCompleted(r.status);
    case "approved": return isApproved(r.status);
    case "declined": return isDeclined(r.status);
    case "cancelled": return isCancelled(r.status);
    case "pending": return isSubmitted(r.status) || isUnderReview(r.status) || isPendingPayment(r.status);
  }
}

function matchesSearch(r: ConsultationRequest, q: string): boolean {
  if (!q) return true;
  const cs = r.clinicalSummary;
  const hay = [
    requesterName(r), r.reason, cs?.diagnosis, cs?.summary,
    ...(cs?.medicines.map((m) => m.name) ?? []),
  ].filter((x): x is string => typeof x === "string").join(" ").toLowerCase();
  return hay.includes(q);
}

const ts = (iso?: string | null): number => (iso ? new Date(iso).getTime() || 0 : 0);

/** Apply a query to a loaded list. Pure — returns a new sorted/filtered list. */
export function applyConsultationQuery(
  items: ConsultationRequest[],
  q: ConsultationHistoryQuery,
  unreadOf?: (r: ConsultationRequest) => number,
): ConsultationRequest[] {
  const search = q.search.trim().toLowerCase();
  const out = items.filter((r) => {
    if (!matchesStatus(r, q.status)) return false;
    if (q.type === "paid" && !consultationIsPaid(r)) return false;
    if (q.type === "free" && consultationIsPaid(r)) return false;
    if (q.minRating > 0 && consultationRating(r) < q.minRating) return false;
    if (q.hasPrescription && !consultationHasPrescription(r)) return false;
    if (q.hasAttachments && !consultationHasAttachments(r)) return false;
    if (q.unreadOnly && (unreadOf?.(r) ?? 0) <= 0) return false;
    if (!matchesSearch(r, search)) return false;
    return true;
  });

  switch (q.sort) {
    case "newest": out.sort((a, b) => ts(b.createdAt) - ts(a.createdAt)); break;
    case "oldest": out.sort((a, b) => ts(a.createdAt) - ts(b.createdAt)); break;
    case "feeHigh": out.sort((a, b) => b.totalPaise - a.totalPaise); break;
    case "feeLow": out.sort((a, b) => a.totalPaise - b.totalPaise); break;
    case "durationLong": out.sort((a, b) => consultationDurationSeconds(b) - consultationDurationSeconds(a)); break;
    case "ratingHigh": out.sort((a, b) => consultationRating(b) - consultationRating(a)); break;
    case "alphabetical": out.sort((a, b) => requesterName(a).toLowerCase().localeCompare(requesterName(b).toLowerCase())); break;
  }
  return out;
}

export interface ConsultationHistoryStats {
  total: number; completed: number; pending: number; cancelled: number; declined: number;
  paid: number; free: number; totalEarningsRupees: number; avgRating: number; avgDurationSeconds: number;
}

/** Aggregate stats over a loaded list (analytics header). Client-side; no extra API call. */
export function computeHistoryStats(items: ConsultationRequest[]): ConsultationHistoryStats {
  const base: ConsultationHistoryStats = {
    total: 0, completed: 0, pending: 0, cancelled: 0, declined: 0,
    paid: 0, free: 0, totalEarningsRupees: 0, avgRating: 0, avgDurationSeconds: 0,
  };
  if (items.length === 0) return base;
  let completed = 0, pending = 0, cancelled = 0, declined = 0, paid = 0, free = 0;
  let earnings = 0, ratingSum = 0, ratingCount = 0, durSum = 0, durCount = 0;
  for (const r of items) {
    if (isCompleted(r.status)) {
      completed++;
      earnings += rupees(r.doctorPayoutPaise);
      const d = consultationDurationSeconds(r);
      if (d > 0) { durSum += d; durCount++; }
    } else if (isCancelled(r.status)) {
      cancelled++;
    } else if (isDeclined(r.status)) {
      declined++;
    } else {
      pending++;
    }
    consultationIsPaid(r) ? paid++ : free++;
    const stars = consultationRating(r);
    if (stars > 0) { ratingSum += stars; ratingCount++; }
  }
  return {
    total: items.length, completed, pending, cancelled, declined, paid, free,
    totalEarningsRupees: earnings,
    avgRating: ratingCount === 0 ? 0 : ratingSum / ratingCount,
    avgDurationSeconds: durCount === 0 ? 0 : Math.round(durSum / durCount),
  };
}

import { describe, it, expect } from "vitest";
import {
  tryParseAvailability, availabilityToString, defaultAvailability,
  availabilitySummary, slotIsValid, slotsOverlap,
} from "@/lib/consultations/availability";
import {
  applyConsultationQuery, computeHistoryStats, emptyQuery, activeFilterCount,
} from "@/lib/consultations/historyFilter";
import {
  parseRequest, parseDoctor, doctorIsFree, reasonTags, statusLabel, rupees, formatRupees,
} from "@/lib/consultations/types";

describe("availability model (mirror availability_model.dart)", () => {
  it("returns null for legacy free-text / empty", () => {
    expect(tryParseAvailability("Mon-Fri eve")).toBeNull();
    expect(tryParseAvailability("")).toBeNull();
    expect(tryParseAvailability(null)).toBeNull();
  });

  it("round-trips through JSON", () => {
    const a = defaultAvailability();
    const parsed = tryParseAvailability(availabilityToString(a));
    expect(parsed).not.toBeNull();
    expect(parsed!.timezone).toBe("Asia/Kolkata");
    expect(parsed!.week.mon.enabled).toBe(true);
    expect(parsed!.week.mon.slots[0]).toEqual({ start: "09:00", end: "17:00" });
    expect(parsed!.week.sun.enabled).toBe(false);
  });

  it("validates and overlaps slots", () => {
    expect(slotIsValid({ start: "09:00", end: "17:00" })).toBe(true);
    expect(slotIsValid({ start: "17:00", end: "09:00" })).toBe(false);
    expect(slotsOverlap({ start: "09:00", end: "12:00" }, { start: "11:00", end: "13:00" })).toBe(true);
    expect(slotsOverlap({ start: "09:00", end: "12:00" }, { start: "12:00", end: "13:00" })).toBe(false);
  });

  it("summarizes", () => {
    expect(availabilitySummary(defaultAvailability())).toBe("5 days · Kolkata");
    const off = { ...defaultAvailability(), enabled: false };
    expect(availabilitySummary(off)).toBe("Consultations off");
  });
});

describe("types parsers + money helpers", () => {
  it("parses paise into rupees", () => {
    expect(rupees(19900)).toBe(199);
    expect(formatRupees(19900)).toBe("₹199");
  });

  it("free path = paid disabled + free allowed", () => {
    const d = parseDoctor({ id: "d1", fullName: "Dr A", paidCallsEnabled: false, freeConsultationsAllowed: true });
    expect(doctorIsFree(d)).toBe(true);
  });

  it("extracts hashtags from reason", () => {
    expect(reasonTags("Fever #pediatrics and #fever")).toEqual(["#pediatrics", "#fever"]);
    expect(reasonTags(null)).toEqual([]);
  });

  it("maps status labels", () => {
    expect(statusLabel("APPROVED_SCHEDULED")).toBe("Scheduled");
    expect(statusLabel("COMPLETED")).toBe("Completed");
  });

  it("parses a request envelope", () => {
    const r = parseRequest({
      id: "r1", requesterId: "u1", doctorId: "d1", status: "COMPLETED",
      totalPaise: 23600, doctorPayoutPaise: 17000,
      clinicalSummary: { diagnosis: "Flu", medicines: [{ name: "Para", morning: true }] },
      attachments: [{ url: "x", publicId: "p", name: "scan.pdf" }],
    });
    expect(r.status).toBe("COMPLETED");
    expect(r.clinicalSummary!.medicines[0].name).toBe("Para");
    expect(r.attachments[0].name).toBe("scan.pdf");
  });
});

describe("history filter (mirror consultation_history_filter.dart)", () => {
  const mk = (over: any) => parseRequest({
    id: over.id, requesterId: "u", doctorId: "d", status: over.status ?? "COMPLETED",
    totalPaise: over.totalPaise ?? 0, doctorPayoutPaise: over.payout ?? 0,
    createdAt: over.createdAt, requester: { fullName: over.name ?? "Z" },
    rating: over.stars ? { id: "x", stars: over.stars } : undefined,
    clinicalSummary: over.summary, reason: over.reason,
  });

  const items = [
    mk({ id: "1", status: "COMPLETED", totalPaise: 23600, payout: 17000, stars: 5, createdAt: "2026-06-01", name: "Alice", summary: { diagnosis: "Flu", medicines: [{ name: "Para" }] } }),
    mk({ id: "2", status: "DECLINED", createdAt: "2026-06-02", name: "Bob" }),
    mk({ id: "3", status: "COMPLETED", totalPaise: 0, createdAt: "2026-06-03", name: "Carol" }),
  ];

  it("filters by status + type and sorts newest first", () => {
    const out = applyConsultationQuery(items, { ...emptyQuery(), status: "completed" });
    expect(out.map((r) => r.id)).toEqual(["3", "1"]);
    const paid = applyConsultationQuery(items, { ...emptyQuery(), type: "paid" });
    expect(paid.map((r) => r.id)).toEqual(["1"]);
  });

  it("searches across name/diagnosis/medicine", () => {
    expect(applyConsultationQuery(items, { ...emptyQuery(), search: "para" }).map((r) => r.id)).toEqual(["1"]);
    expect(applyConsultationQuery(items, { ...emptyQuery(), search: "bob" }).map((r) => r.id)).toEqual(["2"]);
  });

  it("filters hasPrescription", () => {
    const out = applyConsultationQuery(items, { ...emptyQuery(), hasPrescription: true });
    expect(out.map((r) => r.id)).toEqual(["1"]);
  });

  it("counts active filters and computes stats", () => {
    expect(activeFilterCount({ ...emptyQuery(), status: "completed", type: "paid" })).toBe(2);
    const stats = computeHistoryStats(items);
    expect(stats.total).toBe(3);
    expect(stats.completed).toBe(2);
    expect(stats.declined).toBe(1);
    expect(stats.paid).toBe(1);
    expect(stats.totalEarningsRupees).toBe(170);
    expect(stats.avgRating).toBe(5);
  });
});

/**
 * Doctor availability — the TypeScript mirror of
 * docnet/lib/features/calls/availability_model.dart and the backend
 * consultations.availability.js JSON contract. Serialized into the existing
 * `doctors_consultation_settings.availability` TEXT column as a JSON string —
 * NO new backend table/column. Framework-free + unit-testable.
 */

export const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type DayKey = (typeof DAY_KEYS)[number];

export const DAY_LABELS: Record<DayKey, string> = {
  mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday",
  fri: "Friday", sat: "Saturday", sun: "Sunday",
};

export const TIMEZONES = [
  "Asia/Kolkata", "Asia/Dubai", "Asia/Singapore", "Asia/Karachi", "Asia/Dhaka",
  "Europe/London", "Europe/Berlin", "America/New_York", "America/Chicago",
  "America/Los_Angeles", "Australia/Sydney", "UTC",
];

export interface TimeSlot { start: string; end: string } // 'HH:mm'
export interface DaySchedule { enabled: boolean; slots: TimeSlot[]; breaks: TimeSlot[] }
export interface AvailabilityException {
  date: string; // 'yyyy-MM-dd'
  type: "unavailable" | "available";
  slots: TimeSlot[];
}
export interface AvailabilitySchedule {
  version: number;
  enabled: boolean;
  timezone: string;
  week: Record<DayKey, DaySchedule>;
  exceptions: AvailabilityException[];
}

export const slotToMinutes = (hhmm: string): number => {
  const m = /^(\d{1,2}):(\d{2})$/.exec((hhmm ?? "").trim());
  if (!m) return -1;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
};
export const slotIsValid = (s: TimeSlot): boolean => {
  const a = slotToMinutes(s.start), b = slotToMinutes(s.end);
  return a >= 0 && b >= 0 && b > a;
};
export const slotsOverlap = (a: TimeSlot, b: TimeSlot): boolean =>
  slotToMinutes(a.start) < slotToMinutes(b.end) && slotToMinutes(b.start) < slotToMinutes(a.end);

const emptyDay = (): DaySchedule => ({ enabled: false, slots: [], breaks: [] });
const emptyWeek = (): Record<DayKey, DaySchedule> =>
  DAY_KEYS.reduce((acc, d) => { acc[d] = emptyDay(); return acc; }, {} as Record<DayKey, DaySchedule>);

export function defaultAvailability(): AvailabilitySchedule {
  const week = emptyWeek();
  for (const d of ["mon", "tue", "wed", "thu", "fri"] as DayKey[]) {
    week[d] = { enabled: true, slots: [{ start: "09:00", end: "17:00" }], breaks: [] };
  }
  return { version: 1, enabled: true, timezone: "Asia/Kolkata", week, exceptions: [] };
}

function parseSlots(v: any): TimeSlot[] {
  if (!Array.isArray(v)) return [];
  return v.filter((s) => s && typeof s === "object")
    .map((s) => ({ start: String(s.start ?? ""), end: String(s.end ?? "") }));
}
function parseDay(j: any): DaySchedule {
  return { enabled: j?.enabled === true, slots: parseSlots(j?.slots), breaks: parseSlots(j?.breaks) };
}

/** Parse the column value. Returns null for legacy free-text/empty. */
export function tryParseAvailability(raw?: string | null): AvailabilitySchedule | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s || !s.startsWith("{")) return null; // legacy ('Mon-Fri eve') / empty
  try {
    const j = JSON.parse(s);
    const weekJson = (j.week && typeof j.week === "object") ? j.week : {};
    const week = DAY_KEYS.reduce((acc, d) => {
      acc[d] = weekJson[d] && typeof weekJson[d] === "object" ? parseDay(weekJson[d]) : emptyDay();
      return acc;
    }, {} as Record<DayKey, DaySchedule>);
    return {
      version: Number(j.version) || 1,
      enabled: j.enabled !== false,
      timezone: String(j.timezone ?? "Asia/Kolkata"),
      week,
      exceptions: Array.isArray(j.exceptions)
        ? j.exceptions.filter((e: any) => e && typeof e === "object").map((e: any) => ({
            date: String(e.date ?? ""),
            type: e.type === "available" ? "available" : "unavailable",
            slots: parseSlots(e.slots),
          }))
        : [],
    };
  } catch {
    return null;
  }
}

export function availabilityToJson(a: AvailabilitySchedule): any {
  return {
    version: a.version,
    enabled: a.enabled,
    timezone: a.timezone,
    week: DAY_KEYS.reduce((acc, d) => {
      acc[d] = { enabled: a.week[d].enabled, slots: a.week[d].slots, breaks: a.week[d].breaks };
      return acc;
    }, {} as Record<string, any>),
    exceptions: a.exceptions.map((e) => ({
      date: e.date,
      type: e.type,
      ...(e.type === "available" ? { slots: e.slots } : {}),
    })),
  };
}
export const availabilityToString = (a: AvailabilitySchedule): string =>
  JSON.stringify(availabilityToJson(a));

/** Short human summary for the settings row (e.g. "5 days · Kolkata" / "Off"). */
export function availabilitySummary(a: AvailabilitySchedule): string {
  if (!a.enabled) return "Consultations off";
  const activeDays = DAY_KEYS.filter((d) => a.week[d].enabled && a.week[d].slots.length > 0).length;
  if (activeDays === 0) return "No days set";
  const tzShort = a.timezone.split("/").pop()!.replace(/_/g, " ");
  return `${activeDays} ${activeDays === 1 ? "day" : "days"} · ${tzShort}`;
}

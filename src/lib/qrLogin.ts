/**
 * qrLogin — pure helpers for the "log in on the web by QR" flow.
 *
 * How it works (and why the web page only DISPLAYS a code):
 *   1. web asks the backend for a challenge → gets a `challengeId`
 *   2. web renders it as a QR, encoding the deep link below
 *   3. the user's ALREADY-logged-in Orovion mobile app scans it and approves
 *   4. web polls until approved, then redeems for its own (secondary) session
 *
 * The web has no token yet, so it can never approve anything itself — approval
 * is the primary mobile device's job. Kept framework-free so the deep-link
 * format and the state machine are unit-testable without React (see
 * __tests__/qrLogin.test.ts), per this repo's testing convention.
 */

/** Custom scheme the mobile app registers. Matches the backend APP_SCHEME. */
export const QR_LOGIN_SCHEME = "orovion";

/**
 * The string encoded into the QR. The mobile scanner parses `challengeId` out of
 * this and POSTs it to /auth/qr/approve. Using a deep link (not the raw id) means
 * the phone camera can open the app directly, and the app can tell an Orovion
 * login code apart from any other QR it might see.
 */
export function qrDeepLink(challengeId: string): string {
  return `${QR_LOGIN_SCHEME}://qr-login?challengeId=${encodeURIComponent(challengeId)}&platform=web`;
}

/** The backend challenge lifecycle, as the poll endpoint reports it. */
export type QrRemoteStatus = "pending" | "approved" | "expired";

/** The UI's view of where we are. */
export type QrUiPhase =
  | "loading"    // creating the challenge
  | "waiting"    // QR shown, waiting for the phone to approve
  | "redeeming"  // approved — exchanging the code for a session
  | "expired"    // the 60s window elapsed (or the backend says so)
  | "error";     // something failed; offer a retry

export interface QrPollResult {
  status?: QrRemoteStatus;
  redemptionCode?: string | null;
}

/**
 * Decide the next UI phase from a poll result + the local countdown.
 *
 * Local expiry wins: if the countdown hit zero we show "expired" even if a slow
 * poll still says "pending", so the UI and the (already dead) challenge never
 * disagree. "approved" only advances to redeeming when a code is actually
 * present — an approved-without-code response keeps waiting rather than trying to
 * redeem nothing.
 */
export function nextPhase(poll: QrPollResult | null, secondsLeft: number): QrUiPhase {
  if (secondsLeft <= 0) return "expired";
  if (!poll) return "waiting";
  if (poll.status === "expired") return "expired";
  if (poll.status === "approved" && poll.redemptionCode) return "redeeming";
  return "waiting";
}

/** Poll cadence and window. The backend challenge lives ~60s. */
export const QR_POLL_INTERVAL_MS = 2000;
export const QR_DEFAULT_TTL_SEC = 60;

/** Clamp a backend-provided expiry to something sane for the countdown. */
export function normaliseTtl(expiresIn: unknown): number {
  const n = Number(expiresIn);
  if (!Number.isFinite(n) || n <= 0) return QR_DEFAULT_TTL_SEC;
  return Math.min(Math.floor(n), 300);
}

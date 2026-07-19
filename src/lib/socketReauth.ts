/**
 * socketReauth — pure helpers for recovering a socket whose handshake was DENIED.
 *
 * Why this exists (the "real-time chat randomly stops" bug):
 *
 * A socket's access token is verified ONCE, at handshake. So a live socket keeps
 * working long past the ~15-minute token expiry, and everything looks fine. The
 * failure only shows up when the connection drops (phone sleeps, wifi→cellular,
 * chat-service redeploy) and socket.io reconnects using a token that has since
 * expired. The server denies the handshake — and a **middleware denial is not a
 * transport error**: socket.io sets `socket.active = false` and STOPS
 * reconnecting for good. Auto-reconnect never fires again.
 *
 * The old code refreshed the token on `connect_error` and assumed socket.io
 * would retry. It does not. The refreshed token was never used, so the socket
 * stayed dead until a full page reload — while REST kept working (its own 401
 * interceptor refreshes), which is exactly why the app still looked online.
 *
 * Kept framework-free so it is unit-testable (see __tests__/socketReauth.test.ts).
 */

/** Server messages that mean "your credentials were rejected at handshake". */
export function isAuthHandshakeError(message: unknown): boolean {
  if (typeof message !== "string") return false;
  return /auth|token|unauthor/i.test(message);
}

/**
 * True only for a rejection a fresh access token can actually fix.
 *
 * chat-service answers "Token expired" (recoverable — refresh and reconnect) vs
 * "Invalid token" / "Authentication required" (forged, wrong secret, or signed
 * out — reconnecting would just hammer the server). Older builds sent one opaque
 * message for both, so anything auth-shaped is treated as recoverable to stay
 * backward compatible; only an explicitly *invalid* token is refused.
 */
export function isRecoverableAuthError(message: unknown): boolean {
  if (!isAuthHandshakeError(message)) return false;
  return !/invalid token|authentication required/i.test(String(message));
}

/** Hard cap so a genuinely signed-out client can never spin on connect/deny. */
export const MAX_REAUTH_ATTEMPTS = 5;

/** Backoff between re-auth attempts (ms), capped. Attempt is 1-based. */
export function reauthDelayMs(attempt: number): number {
  const n = Number.isFinite(attempt) && attempt > 0 ? Math.floor(attempt) : 1;
  return Math.min(300 * 2 ** (n - 1), 5000);
}

/**
 * Decide what to do after a `connect_error`.
 *
 * `active` is socket.io's own flag: true = it is still retrying by itself
 * (transport blip — do nothing, the auth callback will send the newest token on
 * the next attempt); false = the connection was DENIED and only an explicit
 * connect() will ever revive it.
 */
export function planReauth(
  message: unknown,
  opts: { active: boolean; attempts: number },
): { refresh: boolean; reconnect: boolean; delayMs: number } {
  const none = { refresh: false, reconnect: false, delayMs: 0 };
  if (!isAuthHandshakeError(message)) return none;
  if (opts.attempts >= MAX_REAUTH_ATTEMPTS) return none;
  if (!isRecoverableAuthError(message)) return none;

  const nextAttempt = opts.attempts + 1;
  return {
    refresh: true,
    // Only take over the reconnect when socket.io has given up; otherwise we
    // would race its retry loop and open duplicate connections.
    reconnect: !opts.active,
    delayMs: reauthDelayMs(nextAttempt),
  };
}

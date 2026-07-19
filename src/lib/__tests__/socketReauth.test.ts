import { describe, it, expect } from "vitest";
import {
  isAuthHandshakeError,
  isRecoverableAuthError,
  reauthDelayMs,
  planReauth,
  MAX_REAUTH_ATTEMPTS,
} from "../socketReauth";

describe("isAuthHandshakeError", () => {
  it("matches the server's auth rejection messages", () => {
    for (const m of ["Token expired", "Invalid token", "Authentication required", "unauthorized"]) {
      expect(isAuthHandshakeError(m)).toBe(true);
    }
  });

  it("ignores transport/network errors (socket.io retries those itself)", () => {
    for (const m of ["xhr poll error", "timeout", "websocket error", "server error"]) {
      expect(isAuthHandshakeError(m)).toBe(false);
    }
  });

  it("never throws on a non-string", () => {
    for (const m of [undefined, null, 42, {}, []]) {
      expect(() => isAuthHandshakeError(m)).not.toThrow();
      expect(isAuthHandshakeError(m)).toBe(false);
    }
  });
});

describe("isRecoverableAuthError", () => {
  it("an EXPIRED token is recoverable — refreshing genuinely fixes it", () => {
    expect(isRecoverableAuthError("Token expired")).toBe(true);
  });

  it("a forged token or a signed-out client is NOT recoverable (don't hammer the server)", () => {
    expect(isRecoverableAuthError("Invalid token")).toBe(false);
    expect(isRecoverableAuthError("Authentication required")).toBe(false);
  });

  it("an unknown auth-shaped message stays recoverable (older builds sent one opaque error)", () => {
    expect(isRecoverableAuthError("auth failed")).toBe(true);
  });
});

describe("reauthDelayMs", () => {
  it("backs off and caps", () => {
    expect(reauthDelayMs(1)).toBe(300);
    expect(reauthDelayMs(2)).toBe(600);
    expect(reauthDelayMs(3)).toBe(1200);
    expect(reauthDelayMs(99)).toBe(5000);
  });

  it("is defensive about junk input", () => {
    expect(reauthDelayMs(0)).toBe(300);
    expect(reauthDelayMs(-5)).toBe(300);
    expect(reauthDelayMs(NaN)).toBe(300);
  });
});

describe("planReauth — the actual bug this fixes", () => {
  it("DENIED handshake (active=false) → refresh AND reconnect, because socket.io has given up for good", () => {
    const plan = planReauth("Token expired", { active: false, attempts: 0 });
    expect(plan.refresh).toBe(true);
    expect(plan.reconnect).toBe(true);
    expect(plan.delayMs).toBeGreaterThan(0);
  });

  it("still-retrying socket (active=true) → refresh but do NOT reconnect (would duplicate connections)", () => {
    const plan = planReauth("Token expired", { active: true, attempts: 0 });
    expect(plan.refresh).toBe(true);
    expect(plan.reconnect).toBe(false);
  });

  it("transport error → do nothing, socket.io handles it", () => {
    expect(planReauth("xhr poll error", { active: true, attempts: 0 })).toEqual({
      refresh: false,
      reconnect: false,
      delayMs: 0,
    });
  });

  it("a genuinely signed-out client never spins", () => {
    const plan = planReauth("Invalid token", { active: false, attempts: 0 });
    expect(plan.refresh).toBe(false);
    expect(plan.reconnect).toBe(false);
  });

  it("gives up after the attempt cap so a broken session can't loop forever", () => {
    const plan = planReauth("Token expired", { active: false, attempts: MAX_REAUTH_ATTEMPTS });
    expect(plan.refresh).toBe(false);
    expect(plan.reconnect).toBe(false);
  });

  it("backs off further with each attempt", () => {
    const a = planReauth("Token expired", { active: false, attempts: 0 }).delayMs;
    const b = planReauth("Token expired", { active: false, attempts: 2 }).delayMs;
    expect(b).toBeGreaterThan(a);
  });
});

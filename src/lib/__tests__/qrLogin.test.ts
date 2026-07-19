import { describe, it, expect } from "vitest";
import { qrDeepLink, nextPhase, normaliseTtl, QR_DEFAULT_TTL_SEC } from "../qrLogin";

describe("qrDeepLink", () => {
  it("encodes the challengeId into the app deep link", () => {
    expect(qrDeepLink("9f3c1a2b")).toBe("orovion://qr-login?challengeId=9f3c1a2b");
  });

  it("url-encodes an unusual challengeId so the link never breaks", () => {
    expect(qrDeepLink("a b/c")).toBe("orovion://qr-login?challengeId=a%20b%2Fc");
  });
});

describe("nextPhase", () => {
  it("waits while pending and time remains", () => {
    expect(nextPhase({ status: "pending" }, 40)).toBe("waiting");
  });

  it("waits when there is no poll result yet", () => {
    expect(nextPhase(null, 40)).toBe("waiting");
  });

  it("redeems once approved WITH a code", () => {
    expect(nextPhase({ status: "approved", redemptionCode: "abc" }, 40)).toBe("redeeming");
  });

  it("keeps waiting if approved but the code hasn't arrived yet", () => {
    expect(nextPhase({ status: "approved", redemptionCode: null }, 40)).toBe("waiting");
  });

  it("expires when the backend says so", () => {
    expect(nextPhase({ status: "expired" }, 40)).toBe("expired");
  });

  it("LOCAL expiry wins even if a slow poll still says pending", () => {
    expect(nextPhase({ status: "pending" }, 0)).toBe("expired");
  });

  it("never redeems after local expiry, even if approved arrives late", () => {
    expect(nextPhase({ status: "approved", redemptionCode: "abc" }, 0)).toBe("expired");
  });
});

describe("normaliseTtl", () => {
  it("passes a sane value through", () => {
    expect(normaliseTtl(60)).toBe(60);
    expect(normaliseTtl(45)).toBe(45);
  });

  it("falls back to the default for junk", () => {
    for (const bad of [undefined, null, 0, -5, "abc", NaN]) {
      expect(normaliseTtl(bad)).toBe(QR_DEFAULT_TTL_SEC);
    }
  });

  it("caps an absurd value so the countdown can't run forever", () => {
    expect(normaliseTtl(99999)).toBe(300);
  });
});

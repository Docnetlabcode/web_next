import { describe, it, expect } from "vitest";
import { deriveState } from "@/lib/relationships";

describe("deriveState — network follow/connect state machine", () => {
  it("returns 'self' for the current user or missing data", () => {
    expect(deriveState(undefined)).toBe("self");
    expect(deriveState({ isSelf: true })).toBe("self");
  });

  it("State A — not following", () => {
    expect(deriveState({ isFollowing: false })).toBe("follow");
    expect(deriveState({ isFollowing: false, isRequested: true })).toBe("requested");
    expect(deriveState({ isFollowing: false, followStatus: "requested" })).toBe("requested");
  });

  it("State B — following, by connection status", () => {
    expect(deriveState({ isFollowing: true })).toBe("connect");
    expect(deriveState({ isFollowing: true, connectionStatus: "none" })).toBe("connect");
    expect(deriveState({ isFollowing: true, connectionStatus: "pending_outgoing" })).toBe("connecting");
    expect(deriveState({ isFollowing: true, connectionStatus: "pending_incoming" })).toBe("accept");
    expect(deriveState({ isFollowing: true, connectionStatus: "connected" })).toBe("message");
  });
});

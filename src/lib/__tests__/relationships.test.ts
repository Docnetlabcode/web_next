import { describe, it, expect } from "vitest";
import { deriveState, reconcileFollowState } from "@/lib/relationships";

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

describe("reconcileFollowState — cross-surface follow sync", () => {
  it("a pending request wins over everything", () => {
    expect(reconcileFollowState("follow", { following: false, requested: true }, true)).toBe("requested");
    expect(reconcileFollowState("connect", { following: true, requested: true }, false)).toBe("requested");
  });

  it("unfollow drops to 'follow' on every surface", () => {
    expect(reconcileFollowState("following", { following: false }, true)).toBe("follow");
    expect(reconcileFollowState("connect", { following: false }, false)).toBe("follow");
    expect(reconcileFollowState("message", { following: false }, false)).toBe("follow");
  });

  it("simple buttons show 'following' once followed (posts, reels, suggestion cards, profile toggle)", () => {
    expect(reconcileFollowState("follow", { following: true }, true)).toBe("following");
    expect(reconcileFollowState("requested", { following: true }, true)).toBe("following");
  });

  it("full buttons settle at 'connect' from a non-following state but keep an existing connection sub-state", () => {
    expect(reconcileFollowState("follow", { following: true }, false)).toBe("connect");
    expect(reconcileFollowState("requested", { following: true }, false)).toBe("connect");
    expect(reconcileFollowState("connecting", { following: true }, false)).toBe("connecting");
    expect(reconcileFollowState("message", { following: true }, false)).toBe("message");
  });

  it("never touches 'self'", () => {
    expect(reconcileFollowState("self", { following: true }, true)).toBe("self");
    expect(reconcileFollowState("self", { following: false }, false)).toBe("self");
  });
});

import { describe, it, expect } from "vitest";
import { routeFor } from "@/lib/notify";

describe("routeFor — notification deep-link routing", () => {
  it("routes comment/mention notifications to the post + comment anchor", () => {
    expect(routeFor({ type: "mention_comment", meta: { postId: "p1", commentId: "c1" } }))
      .toBe("/app/post/p1?comment=c1");
    expect(routeFor({ type: "post_comment", meta: { postId: "p1" } })).toBe("/app/post/p1");
    expect(routeFor({ type: "comment_reply", meta: { postId: "p2", commentId: "c9" } }))
      .toBe("/app/post/p2?comment=c9");
  });

  it("routes likes to the post", () => {
    expect(routeFor({ type: "post_like", meta: { postId: "p1" } })).toBe("/app/post/p1");
  });

  it("routes reel activity to the reels tab", () => {
    expect(routeFor({ type: "reel_like" })).toBe("/app/reels");
    expect(routeFor({ type: "mention_reel", meta: { reelId: "r1" } })).toBe("/app/reels");
  });

  it("routes follow/connection acceptance to the sender profile", () => {
    expect(routeFor({ type: "follow", sender: { id: "u1" } })).toBe("/app/profile/u1");
    expect(routeFor({ type: "connection_accepted", sender: { _id: "u2" } })).toBe("/app/profile/u2");
  });

  it("routes connection requests to the network page", () => {
    expect(routeFor({ type: "connection_request" })).toBe("/app/network");
  });

  it("routes messages and verification updates", () => {
    expect(routeFor({ type: "message" })).toBe("/app/messages");
    expect(routeFor({ type: "verification_approved" })).toBe("/app/profile/edit");
    expect(routeFor({ type: "verification_rejected" })).toBe("/app/profile/edit");
  });

  it("routes consultation notifications to the request detail", () => {
    expect(routeFor({ type: "consultation_approved", meta: { requestId: "r1" } })).toBe("/app/consults/r1");
    expect(routeFor({ type: "consultation_completed", meta: { consultationId: "c9" } })).toBe("/app/consults/c9");
    expect(routeFor({ type: "consultation_prescription", meta: {} })).toBe("/app/consults");
  });

  it("falls back by meta/sender, then null", () => {
    expect(routeFor({ type: "unknown", meta: { postId: "p9" } })).toBe("/app/post/p9");
    expect(routeFor({ type: "unknown", sender: { id: "u9" } })).toBe("/app/profile/u9");
    expect(routeFor({ type: "unknown" })).toBeNull();
    expect(routeFor(null)).toBeNull();
  });
});

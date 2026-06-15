import { describe, it, expect, beforeEach, vi } from "vitest";

// Record every call the dok endpoint map makes against a fake axios instance.
const h = vi.hoisted(() => {
  const calls: { method: string; url: string; body?: unknown }[] = [];
  const make = (method: string) => (url: string, body?: unknown) => {
    calls.push({ method, url, body });
    return Promise.resolve({ data: { data: { ok: true } } });
  };
  const instance = {
    get: make("get"),
    post: make("post"),
    put: make("put"),
    delete: make("delete"),
    interceptors: { request: { use: () => {} }, response: { use: () => {} } },
  };
  return { calls, instance };
});

vi.mock("axios", () => ({ default: { create: () => h.instance } }));

import { dok } from "@/lib/api";

const last = () => h.calls[h.calls.length - 1];
beforeEach(() => { h.calls.length = 0; });

describe("dok.reels — endpoints added for the Pulse viewer", () => {
  it("builds comment + like + lifecycle URLs", async () => {
    await dok.reels.comments("r1", "?limit=20");
    expect(last()).toMatchObject({ method: "get", url: "/reels/r1/comments?limit=20" });

    await dok.reels.comment("r1", { content: "hi" });
    expect(last()).toMatchObject({ method: "post", url: "/reels/r1/comments", body: { content: "hi" } });

    await dok.reels.replies("r1", "c1", "?limit=20");
    expect(last()).toMatchObject({ method: "get", url: "/reels/r1/comments/c1/replies?limit=20" });

    await dok.reels.likeComment("r1", "c1");
    expect(last()).toMatchObject({ method: "post", url: "/reels/r1/comments/c1/like" });

    await dok.reels.deleteComment("r1", "c1");
    expect(last()).toMatchObject({ method: "delete", url: "/reels/r1/comments/c1" });

    await dok.reels.likes("r1");
    expect(last()).toMatchObject({ method: "get", url: "/reels/r1/likes" });

    await dok.reels.notInterested("r1");
    expect(last()).toMatchObject({ method: "post", url: "/reels/r1/not-interested" });

    await dok.reels.watched("r1");
    expect(last()).toMatchObject({ method: "post", url: "/reels/r1/watched" });

    await dok.reels.update("r1", { caption: "x" });
    expect(last()).toMatchObject({ method: "put", url: "/reels/r1", body: { caption: "x" } });

    await dok.reels.remove("r1");
    expect(last()).toMatchObject({ method: "delete", url: "/reels/r1" });
  });
});

describe("dok.notifications — endpoints added for the tray", () => {
  it("builds read/remove/preferences URLs", async () => {
    await dok.notifications.read("n1");
    expect(last()).toMatchObject({ method: "put", url: "/notifications/n1/read" });

    await dok.notifications.remove("n1");
    expect(last()).toMatchObject({ method: "delete", url: "/notifications/n1" });

    await dok.notifications.readAll();
    expect(last()).toMatchObject({ method: "put", url: "/notifications/read-all" });

    await dok.notifications.preferences();
    expect(last()).toMatchObject({ method: "get", url: "/notifications/preferences" });
  });
});

describe("dok — existing post + network contracts still hold", () => {
  it("posts like/comment and network accept use the documented paths", async () => {
    await dok.posts.like("p1");
    expect(last()).toMatchObject({ method: "post", url: "/posts/p1/like" });

    await dok.network.accept("req1");
    expect(last()).toMatchObject({ method: "put", url: "/network/request/req1/accept" });

    await dok.follows.acceptRequest("u1");
    expect(last()).toMatchObject({ method: "post", url: "/follows/requests/u1/accept" });
  });
});

describe("envelope unwrap", () => {
  it("returns data.data from the { data: { data } } envelope", async () => {
    const res = await dok.reels.remove("r1");
    expect(res).toEqual({ ok: true });
  });
});

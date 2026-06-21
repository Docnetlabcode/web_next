import { describe, it, expect } from "vitest";
import { cn, compact, roleLabel, initials, timeAgo, timeAgoLong, avatarColor, reelPoster } from "@/lib/utils";

describe("cn", () => {
  it("joins truthy class names and drops falsy ones", () => {
    expect(cn("a", false, "b", null, undefined, "c")).toBe("a b c");
    expect(cn()).toBe("");
  });
});

describe("compact", () => {
  it("formats counts the way the feed metrics expect", () => {
    expect(compact(0)).toBe("0");
    expect(compact(999)).toBe("999");
    expect(compact(1000)).toBe("1k");
    expect(compact(1500)).toBe("1.5k");
    expect(compact(1_000_000)).toBe("1.0M");
    expect(compact(2_500_000)).toBe("2.5M");
  });
  it("defaults to 0", () => {
    expect(compact()).toBe("0");
  });
});

describe("roleLabel", () => {
  it("maps backend role keys to display labels", () => {
    expect(roleLabel("doctor")).toBe("Health Professional");
    expect(roleLabel("student")).toBe("Medical Student");
    expect(roleLabel("general_user")).toBe("General User");
    expect(roleLabel("anything-else")).toBe("Member");
  });
});

describe("initials", () => {
  it("strips honorifics and takes up to two initials", () => {
    expect(initials("Dr. Priya Sharma")).toBe("PS");
    expect(initials("John")).toBe("J");
    expect(initials("")).toBe("");
  });
});

describe("timeAgo / timeAgoLong", () => {
  const ago = (ms: number) => new Date(Date.now() - ms).toISOString();
  it("renders relative buckets", () => {
    expect(timeAgo(ago(0))).toBe("now");
    expect(timeAgo(ago(2 * 60_000))).toBe("2m");
    expect(timeAgo(ago(3 * 3600_000))).toBe("3h");
    expect(timeAgo(ago(2 * 86_400_000))).toBe("2d");
    expect(timeAgo("")).toBe("");
  });
  it("appends 'ago' but never says 'now ago'", () => {
    expect(timeAgoLong(ago(0))).toBe("just now");
    expect(timeAgoLong(ago(5 * 60_000))).toBe("5m ago");
  });
});

describe("avatarColor", () => {
  it("is deterministic for a given seed", () => {
    expect(avatarColor("Priya")).toBe(avatarColor("Priya"));
  });
});

describe("reelPoster", () => {
  const mp4 = "https://res.cloudinary.com/x/video/upload/v1/r/a.mp4";
  it("derives a Cloudinary .jpg frame from the video url", () => {
    expect(reelPoster({ videoUrl: mp4 })).toBe("https://res.cloudinary.com/x/video/upload/v1/r/a.jpg");
  });
  it("ignores thumbnailUrl/posterUrl when they point at a video file (the backend's current bug)", () => {
    // backend sends every media field as the same .mp4 — an <img> can't render that
    expect(reelPoster({ videoUrl: mp4, thumbnailUrl: mp4, posterUrl: mp4 }))
      .toBe("https://res.cloudinary.com/x/video/upload/v1/r/a.jpg");
  });
  it("prefers a real image thumbnail when the backend provides one", () => {
    expect(reelPoster({ videoUrl: mp4, thumbnailUrl: "https://cdn/x/cover.jpg" })).toBe("https://cdn/x/cover.jpg");
  });
  it("falls back to hlsUrl and strips query strings", () => {
    expect(reelPoster({ hlsUrl: "https://cdn/x/a.m3u8?token=1" })).toBe("https://cdn/x/a.jpg");
  });
  it("returns undefined when there is no media at all", () => {
    expect(reelPoster({})).toBeUndefined();
    expect(reelPoster(null)).toBeUndefined();
  });
});

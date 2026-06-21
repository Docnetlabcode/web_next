import { useEffect, useRef, useState } from "react";

export const cn = (...c) => c.filter(Boolean).join(" ");

export function timeAgo(date) {
  if (!date) return "";
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return "now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w}w`;
  return new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** "2h" → "2h ago", but "now" → "just now" (avoids "now ago"). */
export function timeAgoLong(date) {
  const t = timeAgo(date);
  return t === "now" ? "just now" : `${t} ago`;
}

export function initials(name = "") {
  return name
    .replace(/^(Dr\.?|Prof\.?)\s+/i, "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export function compact(n = 0) {
  if (n < 1000) return `${n}`;
  if (n < 1e6) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`;
  return `${(n / 1e6).toFixed(1)}M`;
}

const PALETTE = ["#1E7B74", "#2a9085", "#48ac9f", "#19625e", "#7ccabe"];
export function avatarColor(seed = "") {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

export const roleLabel = (r) =>
  ({ doctor: "Health Professional", student: "Medical Student", general_user: "General User" }[r] || "Member");

// A URL is only usable as an <img>/poster if it points at an actual image file.
const isImageUrl = (u) => /\.(jpe?g|png|webp|gif|avif)(\?|#|$)/i.test(u || "");

/**
 * Poster frame for a reel/Pulse. The backend currently points `thumbnailUrl`/
 * `posterUrl` at the raw Cloudinary .mp4 (not an image), so an <img> with those
 * fails to load. Cloudinary serves a real JPEG frame when the video extension is
 * swapped to .jpg, so derive that — and only trust the thumbnail fields when they
 * actually are an image (e.g. if the backend starts returning real posters).
 */
export function reelPoster(r) {
  if (!r) return undefined;
  const real = [r.thumbnailUrl, r.posterUrl].find(isImageUrl);
  if (real) return real;
  const video = r.videoUrl || r.hlsUrl || r.thumbnailUrl || r.posterUrl;
  return video ? video.replace(/\.(mp4|mov|webm|m3u8)(\?.*)?$/i, ".jpg") : undefined;
}

/** Animate elements with .reveal into view as they scroll. */
export function useScrollReveal() {
  useEffect(() => {
    const els = document.querySelectorAll(".reveal");
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  });
}

/** count-up number animation for stats */
export function useCountUp(target, duration = 1400) {
  const [val, setVal] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    let raf;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const start = performance.now();
      const tick = (now) => {
        const p = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        setVal(Math.round(target * eased));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    });
    if (ref.current) io.observe(ref.current);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [target, duration]);
  return [val, ref];
}

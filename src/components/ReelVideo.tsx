"use client";
import { useEffect, useRef } from "react";
import { Loader2, VideoOff } from "lucide-react";

/**
 * HLS reel player (docs/modules/reels.md). Plays `hlsUrl` via the browser's
 * native HLS (Safari/iOS) when available, otherwise lazy-loads hls.js
 * (Chrome/Firefox/Edge). While the upload is still transcoding
 * (processingStatus !== "COMPLETED") or has no stream yet, it shows the
 * thumbnail with a status overlay instead.
 */
export default function ReelVideo({ src, poster, muted = true, status, onDoubleClick, loop = true, onEnded }) {
  const ref = useRef(null);

  // Keep muted in sync without re-loading the stream (React's `muted` prop is unreliable).
  useEffect(() => { if (ref.current) ref.current.muted = muted; }, [muted]);

  // HLS only for real .m3u8 manifests; progressive files (mp4/webm) play natively.
  const isHls = Boolean(src) && /\.m3u8(\?|#|$)/i.test(src);

  useEffect(() => {
    const video = ref.current;
    if (!video || !src) return;
    let hls;
    let cancelled = false;

    if (!isHls) {
      video.src = src; // progressive mp4/webm — direct playback
      video.play?.().catch(() => {});
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src; // native HLS (Safari / iOS)
      video.play?.().catch(() => {});
    } else {
      import("hls.js")
        .then(({ default: Hls }) => {
          if (cancelled) return;
          if (Hls.isSupported()) {
            hls = new Hls({ enableWorker: true });
            hls.loadSource(src);
            hls.attachMedia(video);
            hls.on(Hls.Events.MANIFEST_PARSED, () => video.play?.().catch(() => {}));
          } else {
            video.src = src; // best effort on browsers with partial support
          }
        })
        .catch(() => {});
    }
    return () => { cancelled = true; try { hls?.destroy(); } catch {} };
  }, [src, isHls]);

  // Status is optional; compare case-insensitively (backend sends "completed").
  const state = status ? String(status).toUpperCase() : "COMPLETED";
  const notReady = !src || state !== "COMPLETED";
  if (notReady) {
    const failed = state === "FAILED";
    return (
      <div className="relative h-full w-full" onDoubleClick={onDoubleClick}>
        {poster && <img src={poster} alt="" className="h-full w-full object-cover opacity-60" />}
        <div className="absolute inset-0 grid place-items-center text-white/90">
          <div className="flex flex-col items-center gap-2">
            {failed ? <VideoOff size={26} /> : <Loader2 size={24} className="animate-spin" />}
            <span className="text-sm">{failed ? "Video unavailable" : "Still processing…"}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <video
      ref={ref}
      poster={poster}
      className="h-full w-full object-cover"
      autoPlay
      loop={loop}
      playsInline
      muted={muted}
      onEnded={onEnded}
      onDoubleClick={onDoubleClick}
    />
  );
}

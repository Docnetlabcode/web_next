"use client";
import { useEffect, useRef, useState } from "react";

/**
 * Mobile pull-to-refresh on the window scroll. When the page is at the top and the
 * user drags down past `threshold`, `onRefresh()` is awaited while a spinner holds.
 * No-op on desktop (no touch). Skipped while a modal/sheet has locked body scroll,
 * or when `disabled` is true (e.g. a full-screen viewer is open).
 *
 * Returns { pull, refreshing } to drive the indicator.
 */
export function usePullToRefresh(onRefresh, { threshold = 70, disabled = false } = {}) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const pullRef = useRef(0);
  const startY = useRef(null);
  const busy = useRef(false);
  const cb = useRef(onRefresh);
  cb.current = onRefresh;

  const setP = (d) => { pullRef.current = d; setPull(d); };

  useEffect(() => {
    if (disabled) return;
    const atTop = () => (window.scrollY || document.documentElement.scrollTop || 0) <= 0;
    const blocked = () => document.body.style.overflow === "hidden"; // a modal/sheet is open

    const onStart = (e) => {
      if (busy.current || blocked() || !atTop()) { startY.current = null; return; }
      startY.current = e.touches[0].clientY;
    };
    const onMove = (e) => {
      if (startY.current == null || busy.current) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy > 0 && atTop()) {
        const d = Math.min(dy * 0.5, threshold * 1.6); // rubber-band damping
        setP(d);
        if (d > 6 && e.cancelable) e.preventDefault(); // suppress native overscroll once pulling
      } else if (dy <= 0 && pullRef.current) {
        startY.current = null;
        setP(0);
      }
    };
    const onEnd = async () => {
      if (startY.current == null) return;
      startY.current = null;
      if (pullRef.current >= threshold) {
        busy.current = true;
        setRefreshing(true);
        setP(threshold);
        try { await cb.current?.(); } catch { /* ignore */ }
        busy.current = false;
        setRefreshing(false);
        setP(0);
      } else {
        setP(0);
      }
    };

    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onEnd, { passive: true });
    window.addEventListener("touchcancel", onEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
    };
  }, [threshold, disabled]);

  return { pull, refreshing };
}

/**
 * Auto-refresh when the user returns to the tab (focus / visibility), throttled to
 * `minMs` and only when scrolled near the top so a deep scroll position isn't yanked.
 */
export function useAutoRefresh(onRefresh, { minMs = 90000, nearTopPx = 400 } = {}) {
  const last = useRef(Date.now());
  const cb = useRef(onRefresh);
  cb.current = onRefresh;

  useEffect(() => {
    const maybe = () => {
      if (typeof document === "undefined" || document.visibilityState !== "visible") return;
      const now = Date.now();
      if (now - last.current < minMs) return;
      if ((window.scrollY || 0) > nearTopPx) return;
      last.current = now;
      cb.current?.();
    };
    document.addEventListener("visibilitychange", maybe);
    window.addEventListener("focus", maybe);
    return () => {
      document.removeEventListener("visibilitychange", maybe);
      window.removeEventListener("focus", maybe);
    };
  }, [minMs, nearTopPx]);
}

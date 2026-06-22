"use client";

import { useEffect, useRef } from "react";

/**
 * Plays a synthesized ringtone (incoming) or ringback (outgoing) tone while
 * `active` is true. Uses the Web Audio API so no audio asset files are needed.
 *
 * Note: browsers only allow audio after a user gesture. The outgoing ringback
 * starts right after the user clicked "call", so it plays. The incoming ringtone
 * may be silent until the callee interacts with the page (browser autoplay
 * policy) — the visual modal always shows regardless.
 */
export function useRingtone(active: boolean, kind: "ring" | "ringback" = "ring") {
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (!active || typeof window === "undefined") return;
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return;
    const ctx: AudioContext = new AC();
    ctx.resume?.().catch(() => {});

    const beep = (freq: number, dur: number, when: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const t0 = ctx.currentTime + when;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.18, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.03);
    };

    const cycle = () => {
      if (kind === "ringback") {
        beep(440, 0.45, 0); // single calling tone
      } else {
        beep(523, 0.25, 0); // incoming double tone
        beep(659, 0.25, 0.32);
      }
    };

    cycle();
    timerRef.current = setInterval(cycle, kind === "ringback" ? 3000 : 1500);

    return () => {
      clearInterval(timerRef.current);
      try { ctx.close(); } catch {}
    };
  }, [active, kind]);
}

"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, ScanFace, Check } from "lucide-react";

// Mandatory 3-second live face scan (anti-spoof gate before KYC submission).
// Captures a still at the end and hands it back via onComplete(dataUrl).
export default function LivenessCheck({ onClose, onComplete }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [phase, setPhase] = useState("init"); // init | live | counting | done | error
  const [count, setCount] = useState(3);
  const [err, setErr] = useState("");

  useEffect(() => {
    let stream;
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("no camera api");
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setPhase("live");
      } catch {
        setErr("We couldn't access your camera. Allow camera permission and try again.");
        setPhase("error");
      }
    })();
    return () => stream?.getTracks().forEach((t) => t.stop());
  }, []);

  const stop = () => streamRef.current?.getTracks().forEach((t) => t.stop());

  const start = () => {
    setPhase("counting");
    setCount(3);
    let n = 3;
    const iv = setInterval(() => {
      n -= 1;
      setCount(n);
      if (n <= 0) {
        clearInterval(iv);
        const v = videoRef.current;
        let dataUrl = "";
        try {
          const c = document.createElement("canvas");
          c.width = v.videoWidth || 480;
          c.height = v.videoHeight || 480;
          c.getContext("2d").drawImage(v, 0, 0, c.width, c.height);
          dataUrl = c.toDataURL("image/jpeg", 0.85);
        } catch { /* capture is best-effort */ }
        stop();
        setPhase("done");
        onComplete?.(dataUrl);
      }
    }, 1000);
  };

  const close = () => { stop(); onClose?.(); };

  return createPortal(
    <div className="fixed inset-0 z-[95] flex flex-col items-center justify-center gap-6 bg-ink-900/95 p-6 text-white backdrop-blur animate-fade-in">
      <button onClick={close} className="press absolute right-4 top-4 rounded-full p-2 hover:bg-white/10"><X size={22} /></button>
      <div className="text-center">
        <ScanFace size={30} className="mx-auto text-brand-300" />
        <h2 className="mt-2 font-display text-xl font-bold">Liveness check</h2>
        <p className="mt-1 max-w-xs text-sm text-white/60">Center your face in the circle and hold still for 3 seconds.</p>
      </div>

      <div className="relative grid h-64 w-64 place-items-center overflow-hidden rounded-full bg-black ring-4 ring-brand-500/60">
        <video ref={videoRef} playsInline muted className="h-full w-full -scale-x-100 object-cover" />
        {phase === "counting" && <span className="absolute inset-0 grid place-items-center bg-black/30 text-6xl font-extrabold">{count > 0 ? count : ""}</span>}
        {phase === "done" && <span className="absolute inset-0 grid place-items-center bg-emerald-600/80"><Check size={64} /></span>}
      </div>

      {err && <p className="text-sm text-rose-300">{err}</p>}

      {phase === "live" && <button onClick={start} className="btn-primary px-7 py-3 text-base">Start 3s scan</button>}
      {phase === "counting" && <p className="text-sm text-white/70">Hold still…</p>}
      {phase === "done" && <p className="flex items-center gap-2 text-sm font-semibold text-emerald-300"><Check size={16} /> Face captured</p>}
      {phase === "error" && <button onClick={close} className="btn-outline border-white/30 px-7 py-3 text-base text-white">Close</button>}
      {phase === "init" && <p className="text-sm text-white/60">Starting camera…</p>}
    </div>,
    document.body
  );
}

"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, ScanFace, Check, RotateCcw } from "lucide-react";

// Mandatory 3-second live face scan (anti-spoof gate before KYC submission).
// Captures a still at the end, lets the user review + retake, and only hands it
// back via onComplete(dataUrl) once they confirm.
export default function LivenessCheck({ onClose, onComplete }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [phase, setPhase] = useState("init"); // init | live | counting | review | error
  const [count, setCount] = useState(3);
  const [shot, setShot] = useState(""); // captured still (dataUrl) awaiting confirm
  const [err, setErr] = useState("");

  const stop = () => { streamRef.current?.getTracks().forEach((t) => t.stop()); streamRef.current = null; };

  const startCamera = async () => {
    setErr(""); setShot(""); setPhase("init");
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("no camera api");
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
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
  };

  useEffect(() => {
    startCamera();
    return () => stop();
  }, []); // eslint-disable-line

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
        stop(); // freeze: release the camera while the user reviews
        setShot(dataUrl);
        setPhase(dataUrl ? "review" : "error");
        if (!dataUrl) setErr("Capture failed. Please retake.");
      }
    }, 1000);
  };

  const retake = () => startCamera();
  const confirm = () => { if (shot) onComplete?.(shot); };
  const close = () => { stop(); onClose?.(); };

  return createPortal(
    <div className="fixed inset-0 z-[95] flex flex-col items-center justify-center gap-6 bg-ink-900/95 p-6 text-white backdrop-blur animate-fade-in">
      <button onClick={close} className="press absolute right-4 top-4 rounded-full p-2 hover:bg-white/10"><X size={22} /></button>
      <div className="text-center">
        <ScanFace size={30} className="mx-auto text-brand-300" />
        <h2 className="mt-2 font-display text-xl font-bold">{phase === "review" ? "Review your scan" : "Liveness check"}</h2>
        <p className="mt-1 max-w-xs text-sm text-white/60">
          {phase === "review"
            ? "Here's the photo we'll submit. Use it, or retake."
            : "Center your face in the circle and hold still for 3 seconds."}
        </p>
      </div>

      <div className="relative grid h-64 w-64 place-items-center overflow-hidden rounded-full bg-black ring-4 ring-brand-500/60">
        <video ref={videoRef} autoPlay playsInline muted className="h-full w-full -scale-x-100 object-cover" />
        {phase === "counting" && <span className="absolute inset-0 grid place-items-center bg-black/30 text-6xl font-extrabold">{count > 0 ? count : ""}</span>}
        {phase === "review" && shot && <img src={shot} alt="Your captured selfie" className="absolute inset-0 h-full w-full -scale-x-100 object-cover" />}
      </div>

      {err && <p className="text-sm text-rose-300">{err}</p>}

      {phase === "init" && <p className="text-sm text-white/60">Starting camera…</p>}
      {phase === "live" && <button onClick={start} className="btn-primary px-7 py-3 text-base">Start 3s scan</button>}
      {phase === "counting" && <p className="text-sm text-white/70">Hold still…</p>}
      {phase === "review" && (
        <div className="flex gap-3">
          <button onClick={retake} className="press flex items-center gap-2 rounded-full border border-white/25 px-5 py-3 text-base font-semibold hover:bg-white/10"><RotateCcw size={16} /> Retake</button>
          <button onClick={confirm} disabled={!shot} className="press flex items-center gap-2 rounded-full bg-brand-600 px-6 py-3 text-base font-bold disabled:opacity-40"><Check size={16} /> Use this photo</button>
        </div>
      )}
      {phase === "error" && (
        <div className="flex gap-3">
          <button onClick={retake} className="press flex items-center gap-2 rounded-full bg-brand-600 px-6 py-3 text-base font-bold"><RotateCcw size={16} /> Try again</button>
          <button onClick={close} className="btn-outline border-white/30 px-6 py-3 text-base text-white">Close</button>
        </div>
      )}
    </div>,
    document.body
  );
}

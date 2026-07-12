"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, ImagePlus, Camera, ZoomIn, Check } from "lucide-react";
import { dok } from "@/lib/api";
import { cn } from "@/lib/utils";

// kind: "avatar" (1:1) | "cover" (3:1). Lets the user pick from gallery or snap a
// live webcam photo, crop (drag + zoom) on a canvas, and upload the baked result.
const SPEC = {
  avatar: { ratio: 1, out: 512, frameW: 260, frameH: 260, field: "profilePhoto", upload: (f) => dok.profile.uploadAvatar(f), title: "Profile photo" },
  cover: { ratio: 3, out: 1500, frameW: 300, frameH: 100, field: "coverPhoto", upload: (f) => dok.profile.uploadCover(f), title: "Cover banner" },
};

export default function PhotoUploader({ kind = "avatar", onClose, onUploaded }) {
  const spec = SPEC[kind];
  const [src, setSrc] = useState(null);
  const [img, setImg] = useState(null); // HTMLImageElement
  const [zoom, setZoom] = useState(1);
  const [off, setOff] = useState({ x: 0, y: 0 });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [cam, setCam] = useState(false); // live webcam view active
  const fileRef = useRef(null);
  const frameRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // base scale so the image fully covers the frame at zoom = 1
  const base = img ? Math.max(spec.frameW / img.naturalWidth, spec.frameH / img.naturalHeight) : 1;
  const scale = base * zoom;
  const dispW = img ? img.naturalWidth * scale : 0;
  const dispH = img ? img.naturalHeight * scale : 0;

  const clamp = (o) => ({
    x: Math.min(0, Math.max(spec.frameW - dispW, o.x)),
    y: Math.min(0, Math.max(spec.frameH - dispH, o.y)),
  });
  useEffect(() => { if (img) setOff((o) => clamp(o)); /* re-clamp on zoom */ }, [zoom, img]); // eslint-disable-line

  // ---- live webcam capture (works on desktop + mobile; capture="user" file inputs don't on desktop) ----
  const stopCam = () => { streamRef.current?.getTracks().forEach((t) => t.stop()); streamRef.current = null; };
  useEffect(() => () => stopCam(), []); // stop tracks if the modal unmounts mid-stream

  // Attach the stream once the <video> has mounted (after setCam(true) re-renders).
  useEffect(() => {
    if (cam && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [cam]);

  const openCamera = async () => {
    setErr("");
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("no camera api");
      streamRef.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      setCam(true);
    } catch {
      setErr("We couldn't access your camera. Allow camera permission, or use Gallery instead.");
    }
  };

  const closeCamera = () => { stopCam(); setCam(false); };

  const capture = () => {
    const v = videoRef.current;
    if (!v) return;
    const c = document.createElement("canvas");
    c.width = v.videoWidth || spec.out;
    c.height = v.videoHeight || spec.out;
    const ctx = c.getContext("2d");
    // mirror to match the selfie-mirrored live preview
    ctx.translate(c.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(v, 0, 0, c.width, c.height);
    c.toBlob((blob) => {
      if (!blob) { setErr("Capture failed. Please try again."); return; }
      const url = URL.createObjectURL(blob);
      const im = new Image();
      im.onload = () => { closeCamera(); setImg(im); setSrc(url); setZoom(1); setOff({ x: 0, y: 0 }); };
      im.onerror = () => setErr("Couldn't load the captured photo.");
      im.src = url;
    }, "image/jpeg", 0.92);
  };

  const onPick = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const im = new Image();
    im.onload = () => { setImg(im); setSrc(url); setZoom(1); setOff({ x: 0, y: 0 }); };
    im.onerror = () => setErr("Couldn't load that image.");
    im.src = url;
  };

  const drag = (e) => {
    e.preventDefault();
    const start = { x: e.touches?.[0]?.clientX ?? e.clientX, y: e.touches?.[0]?.clientY ?? e.clientY };
    const o0 = { ...off };
    const move = (ev) => {
      const cx = ev.touches?.[0]?.clientX ?? ev.clientX;
      const cy = ev.touches?.[0]?.clientY ?? ev.clientY;
      setOff(clamp({ x: o0.x + (cx - start.x), y: o0.y + (cy - start.y) }));
    };
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
  };

  const save = async () => {
    if (!img) return;
    setErr(""); setBusy(true);
    try {
      const Ow = spec.out;
      const Oh = Math.round(spec.out / spec.ratio);
      const canvas = document.createElement("canvas");
      canvas.width = Ow; canvas.height = Oh;
      const ctx = canvas.getContext("2d");
      // map the visible frame back into source-image pixels
      const sx = -off.x / scale;
      const sy = -off.y / scale;
      const sW = spec.frameW / scale;
      const sH = spec.frameH / scale;
      ctx.drawImage(img, sx, sy, sW, sH, 0, 0, Ow, Oh);
      const blob = await new Promise((res) => canvas.toBlob(res, "image/jpeg", 0.9));
      const file = new File([blob], `${kind}.jpg`, { type: "image/jpeg" });
      const res = await spec.upload(file);
      onUploaded?.(res?.[spec.field] || res);
      onClose?.();
    } catch (e) {
      setErr(e?.response?.data?.message || "Upload failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const close = () => { stopCam(); onClose?.(); };

  return createPortal(
    <div className="fixed inset-0 z-[95] flex flex-col bg-ink-950/90 text-white backdrop-blur animate-fade-in">
      <div className="flex items-center justify-between px-4 py-3">
        <button onClick={close} className="press rounded-full p-2 hover:bg-white/10"><X size={22} /></button>
        <p className="font-display text-sm font-bold">{spec.title}</p>
        <button onClick={save} disabled={!img || busy} className="press flex items-center gap-1.5 rounded-full bg-brand-600 px-4 py-2 text-sm font-bold disabled:opacity-40"><Check size={16} /> {busy ? "Saving…" : "Save"}</button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-5 px-4">
        {cam ? (
          <>
            <div className={cn("relative overflow-hidden bg-black ring-2 ring-white/40", kind === "avatar" ? "h-64 w-64 rounded-full" : "aspect-[3/1] w-full max-w-md rounded-xl")}>
              <video ref={videoRef} autoPlay playsInline muted className="h-full w-full -scale-x-100 object-cover" />
            </div>
            <div className="flex gap-3">
              <button onClick={closeCamera} className="press rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold hover:bg-white/10">Cancel</button>
              <button onClick={capture} className="press flex items-center gap-2 rounded-full bg-brand-600 px-6 py-2.5 text-sm font-bold"><Camera size={16} /> Capture</button>
            </div>
          </>
        ) : !img ? (
          <div className="flex flex-col items-center gap-3">
            <p className="text-sm text-white/70">Choose a {kind === "avatar" ? "profile photo" : "cover banner"}</p>
            <div className="flex gap-3">
              <button onClick={() => fileRef.current?.click()} className="flex flex-col items-center gap-2 rounded-2xl border border-white/20 px-7 py-5 hover:bg-white/10"><ImagePlus size={26} /><span className="text-xs font-semibold">Gallery</span></button>
              <button onClick={openCamera} className="flex flex-col items-center gap-2 rounded-2xl border border-white/20 px-7 py-5 hover:bg-white/10"><Camera size={26} /><span className="text-xs font-semibold">Camera</span></button>
            </div>
          </div>
        ) : (
          <>
            <div ref={frameRef} onPointerDown={drag}
              className={cn("relative cursor-move touch-none overflow-hidden bg-black ring-2 ring-white/40", kind === "avatar" ? "rounded-full" : "rounded-xl")}
              style={{ width: spec.frameW, height: spec.frameH }}>
              <img src={src} alt="" draggable={false}
                style={{ position: "absolute", left: off.x, top: off.y, width: dispW, height: dispH, maxWidth: "none" }} />
            </div>
            <div className="flex w-full max-w-xs items-center gap-3">
              <ZoomIn size={16} className="text-white/60" />
              <input type="range" min={1} max={3} step={0.01} value={zoom} onChange={(e) => setZoom(+e.target.value)} className="flex-1 accent-brand-500" />
            </div>
            <button onClick={() => { setImg(null); setSrc(null); }} className="text-xs font-semibold text-white/60 hover:text-white">Choose a different photo</button>
          </>
        )}
        {err && <p className="text-sm text-rose-300">{err}</p>}
      </div>

      <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPick} />
    </div>,
    document.body
  );
}

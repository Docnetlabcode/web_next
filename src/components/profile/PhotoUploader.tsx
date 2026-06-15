"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, ImagePlus, Camera, ZoomIn, Check } from "lucide-react";
import { dok } from "@/lib/api";
import { cn } from "@/lib/utils";

// kind: "avatar" (1:1) | "cover" (3:1). Lets the user pick from gallery or camera,
// crop (drag + zoom) on a canvas, and upload the baked result to the backend.
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
  const fileRef = useRef(null);
  const camRef = useRef(null);
  const frameRef = useRef(null);

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

  return createPortal(
    <div className="fixed inset-0 z-[95] flex flex-col bg-ink-900/90 text-white backdrop-blur animate-fade-in">
      <div className="flex items-center justify-between px-4 py-3">
        <button onClick={onClose} className="press rounded-full p-2 hover:bg-white/10"><X size={22} /></button>
        <p className="font-display text-sm font-bold">{spec.title}</p>
        <button onClick={save} disabled={!img || busy} className="press flex items-center gap-1.5 rounded-full bg-brand-600 px-4 py-2 text-sm font-bold disabled:opacity-40"><Check size={16} /> {busy ? "Saving…" : "Save"}</button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-5 px-4">
        {!img ? (
          <div className="flex flex-col items-center gap-3">
            <p className="text-sm text-white/70">Choose a {kind === "avatar" ? "profile photo" : "cover banner"}</p>
            <div className="flex gap-3">
              <button onClick={() => fileRef.current?.click()} className="flex flex-col items-center gap-2 rounded-2xl border border-white/20 px-7 py-5 hover:bg-white/10"><ImagePlus size={26} /><span className="text-xs font-semibold">Gallery</span></button>
              <button onClick={() => camRef.current?.click()} className="flex flex-col items-center gap-2 rounded-2xl border border-white/20 px-7 py-5 hover:bg-white/10"><Camera size={26} /><span className="text-xs font-semibold">Camera</span></button>
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
      <input ref={camRef} type="file" accept="image/*" capture="user" hidden onChange={onPick} />
    </div>,
    document.body
  );
}

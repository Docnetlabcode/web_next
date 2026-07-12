"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";

/**
 * Full-screen viewer for a post's media. Handles images, videos (with controls),
 * and pdf/document (iframe + open-in-tab), with prev/next when there are several.
 * Close on backdrop, ✕, or Escape; arrow keys navigate.
 */
export default function PostMediaViewer({ media = [], index = 0, onClose }) {
  const list = media.filter((m) => m?.url);
  const [i, setI] = useState(Math.min(index, Math.max(0, list.length - 1)));

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") setI((n) => (n - 1 + list.length) % list.length);
      else if (e.key === "ArrowRight") setI((n) => (n + 1) % list.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [list.length, onClose]);

  if (!list.length) return null;
  const item = list[i];
  const isVideo = item.type === "video";
  const isDoc = item.type === "pdf" || item.type === "document";

  return createPortal(
    <div className="fixed inset-0 z-[96] flex flex-col bg-ink-950/95 backdrop-blur animate-fade-in" onClick={onClose}>
      <div className="flex items-center justify-between p-4 text-white">
        <span className="text-sm tabular-nums text-white/70">{list.length > 1 ? `${i + 1} / ${list.length}` : ""}</span>
        <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="press rounded-full p-2 hover:bg-white/10"><X size={24} /></button>
      </div>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden p-4" onClick={(e) => e.stopPropagation()}>
        {isVideo ? (
          <video src={item.url} controls autoPlay playsInline className="max-h-full max-w-full rounded-xl" />
        ) : isDoc ? (
          <div className="flex h-full w-full max-w-3xl flex-col">
            <iframe src={item.url} title={item.name || "Document"} className="h-full w-full rounded-xl bg-white" />
            <a href={item.url} target="_blank" rel="noreferrer" className="btn-outline mt-3 inline-flex items-center justify-center gap-2 border-white/30 text-white hover:bg-white/10"><ExternalLink size={16} /> Open in new tab</a>
          </div>
        ) : (
          <img src={item.url} alt="" className="max-h-full max-w-full rounded-xl object-contain" />
        )}

        {list.length > 1 && (
          <>
            <button onClick={(e) => { e.stopPropagation(); setI((n) => (n - 1 + list.length) % list.length); }} aria-label="Previous" className="press absolute left-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white backdrop-blur hover:bg-white/20"><ChevronLeft size={22} /></button>
            <button onClick={(e) => { e.stopPropagation(); setI((n) => (n + 1) % list.length); }} aria-label="Next" className="press absolute right-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white backdrop-blur hover:bg-white/20"><ChevronRight size={22} /></button>
          </>
        )}
      </div>

      {list.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 pb-5">
          {list.map((_, n) => (
            <span key={n} className={n === i ? "h-1.5 w-5 rounded-full bg-white" : "h-1.5 w-1.5 rounded-full bg-white/40"} />
          ))}
        </div>
      )}
    </div>,
    document.body
  );
}

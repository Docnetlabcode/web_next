"use client";
import { createPortal } from "react-dom";
import { X, ExternalLink } from "lucide-react";

// Fullscreen lightbox. kind: "image" | "pdf".
export default function MediaViewer({ src, kind = "image", onClose }) {
  return createPortal(
    <div className="fixed inset-0 z-[96] flex flex-col bg-ink-900/95 backdrop-blur animate-fade-in" onClick={onClose}>
      <div className="flex justify-end p-4">
        <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="press rounded-full p-2 text-white hover:bg-white/10"><X size={24} /></button>
      </div>
      <div className="flex flex-1 items-center justify-center overflow-auto p-4" onClick={(e) => e.stopPropagation()}>
        {kind === "pdf" ? (
          <div className="flex h-full w-full max-w-3xl flex-col">
            <iframe src={src} title="Document" className="h-full w-full rounded-xl bg-white" />
            <a href={src} target="_blank" rel="noreferrer" className="btn-outline mt-3 inline-flex items-center justify-center gap-2 border-white/30 text-white hover:bg-white/10"><ExternalLink size={16} /> Open in new tab</a>
          </div>
        ) : (
          <img src={src} alt="Preview" className="max-h-full max-w-full rounded-xl object-contain" />
        )}
      </div>
    </div>,
    document.body
  );
}

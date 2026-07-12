"use client";
import { useEffect, useRef, useState } from "react";
import { Upload, FileText, Eye, RefreshCw, Trash2 } from "lucide-react";
import MediaViewer from "./MediaViewer";

const urlKind = (url) => (/\.pdf($|\?)/i.test(url) ? "pdf" : "image");

// Reusable upload field. `value` is a Blob/File (local) OR a remote URL string OR null.
// Emits onChange(file | null). disabled hides remove/replace (read-only).
export default function FileUpload({ value, onChange, label, accept = "image/*,application/pdf", disabled }) {
  const ref = useRef(null);
  const [preview, setPreview] = useState(""); // object URL for Blob values
  const [viewer, setViewer] = useState(false);

  useEffect(() => {
    if (value instanceof Blob) {
      const url = URL.createObjectURL(value);
      setPreview(url);
      return () => URL.revokeObjectURL(url);
    }
    setPreview("");
  }, [value]);

  const has = value instanceof Blob || (typeof value === "string" && value);
  const src = value instanceof Blob ? preview : typeof value === "string" ? value : "";
  const kind = value instanceof Blob ? (value.type?.startsWith("image/") ? "image" : "pdf") : typeof value === "string" ? urlKind(value) : "image";
  const name = (value instanceof Blob && value.name) || (typeof value === "string" ? value.split("/").pop() : "") || "Uploaded file";

  const pick = (e) => { const f = e.target.files?.[0]; if (f) onChange(f); e.target.value = ""; };

  if (!has) {
    return (
      <>
        <button type="button" disabled={disabled} onClick={() => ref.current?.click()}
          className="flex w-full items-center gap-3 rounded-xl border-2 border-dashed border-ink-900/15 p-3 text-left transition hover:border-brand-300 disabled:opacity-50">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-ink-900/[.04] text-ink-500"><Upload size={18} /></span>
          <span className="flex-1">
            <span className="block text-sm font-semibold text-ink-900">{label || "Upload file"}</span>
            <span className="block text-xs text-ink-400">Tap to upload (image / PDF)</span>
          </span>
        </button>
        <input ref={ref} type="file" accept={accept} hidden onChange={pick} />
      </>
    );
  }

  return (
    <>
      <div className="flex items-center gap-3 rounded-xl border-2 border-emerald-300 bg-emerald-50 p-3">
        <button type="button" onClick={() => setViewer(true)} className="press grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-surface">
          {kind === "image" && src ? <img src={src} alt="" className="h-full w-full object-cover" /> : <FileText size={20} className="text-ink-500" />}
        </button>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-ink-900">{name}</span>
          <button type="button" onClick={() => setViewer(true)} className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700"><Eye size={12} /> View full screen</button>
        </span>
        {!disabled && (
          <div className="flex shrink-0 items-center gap-1">
            <button type="button" onClick={() => ref.current?.click()} title="Replace" className="press grid h-8 w-8 place-items-center rounded-lg text-ink-500 hover:bg-surface"><RefreshCw size={15} /></button>
            {value instanceof Blob && (
              <button type="button" onClick={() => onChange(null)} title="Remove" className="press grid h-8 w-8 place-items-center rounded-lg text-rose-500 hover:bg-surface"><Trash2 size={15} /></button>
            )}
          </div>
        )}
      </div>
      <input ref={ref} type="file" accept={accept} hidden onChange={pick} />
      {viewer && src && <MediaViewer src={src} kind={kind} onClose={() => setViewer(false)} />}
    </>
  );
}

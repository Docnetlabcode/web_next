"use client";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/** Centered modal with backdrop fade + content scale-in. */
export function Modal({ open, onClose, title, children, className }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 animate-fade-in bg-ink-950/45 backdrop-blur-sm" onClick={onClose} />
      <div className={cn("relative w-full max-w-lg animate-scale-in rounded-3xl bg-surface shadow-2xl", className)}>
        {title && (
          <div className="flex items-center justify-between border-b border-ink-900/[.06] px-5 py-4">
            <h3 className="font-display text-lg font-extrabold text-ink-900">{title}</h3>
            <button onClick={onClose} className="press rounded-full p-1.5 text-ink-400 hover:bg-ink-900/5"><X size={18} /></button>
          </div>
        )}
        {children}
      </div>
    </div>,
    document.body
  );
}

/** Bottom sheet that slides up (mobile-style action menu). */
export function BottomSheet({ open, onClose, title, subtitle, children }) {
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [open]);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 animate-fade-in bg-ink-950/45 backdrop-blur-sm" onClick={onClose} />
      <div className="anim-sheet-up relative w-full max-w-md rounded-t-3xl bg-surface pb-3 shadow-2xl sm:rounded-3xl">
        <div className="mx-auto mt-3 h-1.5 w-10 rounded-full bg-ink-900/15 sm:hidden" />
        {title && (
          <div className="px-5 pb-2 pt-4">
            <h3 className="font-display text-lg font-extrabold text-ink-900">{title}</h3>
            {subtitle && <p className="text-sm text-ink-500">{subtitle}</p>}
          </div>
        )}
        {children}
      </div>
    </div>,
    document.body
  );
}

export function SheetRow({ icon: Icon, title, desc, onClick, danger, disabled }) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={cn(
        "flex w-full items-center gap-4 px-5 py-3.5 text-left transition",
        disabled ? "cursor-not-allowed opacity-45" : "hover:bg-ink-900/[.03]",
        danger && "text-rose-600"
      )}
    >
      <Icon size={20} className={cn(!danger && "text-ink-700")} />
      <span className="flex-1">
        <span className="block text-[15px] font-semibold">{title}</span>
        {desc && <span className="block text-xs text-ink-500">{desc}</span>}
      </span>
    </button>
  );
}

const EMOJI = ["👍","🔥","❤️","🩺","🧠","⚗️","🎉","👏","😮","🙏","💯","✅","📌","💉","🦠","📊","😀","😂","🤔","😢","😍","🤝"];
export function EmojiPicker({ onPick }) {
  return (
    <div className="anim-pop grid w-64 grid-cols-7 gap-1 rounded-2xl border border-ink-900/[.08] bg-surface p-2 shadow-card">
      {EMOJI.map((e) => (
        <button key={e} onClick={() => onPick(e)} className="press rounded-lg p-1.5 text-xl transition hover:bg-brand-50">{e}</button>
      ))}
    </div>
  );
}

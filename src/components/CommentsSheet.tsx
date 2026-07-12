"use client";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X, MessageCircle } from "lucide-react";
import CommentThread from "@/components/comments/CommentThread";
import { compact } from "@/lib/utils";

/**
 * Slide-up, full-featured comment canvas (tap the comment icon on a feed card).
 * Taller than the generic BottomSheet so the thread + composer breathe;
 * centers as a modal on desktop.
 */
export default function CommentsSheet({ open, onClose, post, demo, onCountChange, kind = "post" }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open, onClose]);

  if (!open || !post) return null;

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 animate-fade-in bg-ink-950/45 backdrop-blur-sm" onClick={onClose} />
      <div className="anim-sheet-up relative flex h-[78vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-surface shadow-2xl sm:h-[min(40rem,85vh)] sm:rounded-3xl">
        <div className="mx-auto mt-3 h-1.5 w-10 shrink-0 rounded-full bg-ink-900/15 sm:hidden" />
        <div className="flex shrink-0 items-center gap-2 border-b border-ink-900/[.06] px-5 py-3.5">
          <MessageCircle size={18} className="text-brand-600" />
          <h3 className="font-display text-lg font-extrabold text-ink-900">Discussion</h3>
          {post.commentsCount > 0 && <span className="text-sm text-ink-400">{compact(post.commentsCount)}</span>}
          <button onClick={onClose} aria-label="Close comments" className="press ml-auto rounded-full p-1.5 text-ink-400 hover:bg-ink-900/5"><X size={18} /></button>
        </div>
        <CommentThread
          postId={post._id || post.id}
          postOwnerId={post.author?.id || post.author?._id}
          demo={demo}
          onCountChange={onCountChange}
          kind={kind}
          autoFocus
        />
      </div>
    </div>,
    document.body
  );
}

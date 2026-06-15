"use client";
import { useEffect, useState } from "react";
import { Loader2, PenLine, Clock } from "lucide-react";
import { Modal } from "@/components/ui/Overlays";
import { dok } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";

const EDIT_WINDOW_MS = 24 * 3600e3;
export const canEditPost = (post) => Date.now() - new Date(post?.createdAt).getTime() < EDIT_WINDOW_MS;

/**
 * Inline edit of a post's text body (or a reel's caption) — programmatically
 * active ≤24h after creation. Pass kind="reel" to edit a reel caption.
 */
export default function EditPostModal({ open, onClose, post, demo, onSaved, kind = "post" }) {
  const toast = useToast();
  const isReel = kind === "reel";
  const initial = post?.content ?? post?.caption ?? "";
  const [content, setContent] = useState(initial);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) setContent(post?.content ?? post?.caption ?? ""); }, [open, post]);

  const remaining = Math.max(0, EDIT_WINDOW_MS - (Date.now() - new Date(post?.createdAt).getTime()));
  const remainingH = Math.floor(remaining / 3600e3);
  const remainingM = Math.floor((remaining % 3600e3) / 60000);

  const save = async () => {
    const text = content.trim();
    if (!text || text === initial) { onClose(); return; }
    setSaving(true);
    try {
      if (!demo) {
        const id = post._id || post.id;
        if (isReel) await dok.reels.update(id, { caption: text });
        else await dok.posts.update(id, { content: text });
      }
      onSaved?.(text);
      toast?.success(isReel ? "Pulse updated" : "Post updated");
      onClose();
    } catch (e) {
      // 403 after the 24h window closes server-side
      toast?.error(e?.response?.status === 403 ? `Editing closed — ${isReel ? "Pulses" : "posts"} can only be edited within 24 hours` : "Couldn't save your changes");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={isReel ? "Edit Pulse" : "Edit post"} className="max-w-md">
      <div className="space-y-4 p-5">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={6}
          autoFocus
          className="input resize-none text-[15px] leading-relaxed"
        />
        <p className="flex items-center gap-1.5 text-xs text-ink-500">
          <Clock size={13} className="text-warning-500" />
          Edit window closes in {remainingH > 0 ? `${remainingH}h ${remainingM}m` : `${remainingM}m`}. Edits update the post for everyone.
        </p>
        <div className="flex gap-2">
          <button onClick={onClose} className="btn-outline flex-1 py-2.5 text-sm">Cancel</button>
          <button onClick={save} disabled={saving || !content.trim()} className={cn("btn-primary flex-1 py-2.5 text-sm", saving && "opacity-70")}>
            {saving ? <Loader2 size={15} className="animate-spin" /> : <PenLine size={15} />} Save changes
          </button>
        </div>
      </div>
    </Modal>
  );
}

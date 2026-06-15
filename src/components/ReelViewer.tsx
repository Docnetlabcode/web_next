"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "@/lib/router";
import {
  Heart, MessageCircle, Share2, Bookmark, MoreHorizontal, X, ChevronUp, ChevronDown,
  Volume2, VolumeX, Link2, PenLine, Trash2, EyeOff, UserX, AlertTriangle, Loader2,
} from "lucide-react";
import { Avatar, Verified } from "@/components/ui/Primitives";
import { BottomSheet, SheetRow, Modal } from "@/components/ui/Overlays";
import FollowButton from "@/components/ui/FollowButton";
import ShareSheet from "@/components/ShareSheet";
import LikesSheet from "@/components/LikesSheet";
import CommentsSheet from "@/components/CommentsSheet";
import EditPostModal, { canEditPost } from "@/components/EditPostModal";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/ui/Toast";
import { cn, compact, timeAgoLong } from "@/lib/utils";
import { dok } from "@/lib/api";

const rid = (r) => r?._id || r?.id;

/**
 * Full-screen Pulse (reel) viewer with the same interaction stack as the feed
 * card (docs/modules/reels.md): optimistic like + likers list, the network
 * FollowButton state machine, reel comments (@mentions / nested replies),
 * save, share, view/watched pings and the owner / third-party 3-dot menu.
 *
 * Per-reel engagement lives in a keyed override map so state survives
 * up/down navigation within the session.
 */
export default function ReelViewer({ reels, index, onClose, onRemoved }) {
  const { user: me, demo } = useAuth();
  const toast = useToast();
  const nav = useNavigate();

  const openAuthor = () => { if (authorId) { onClose?.(); nav(`/app/profile/${authorId}`); } };

  const [i, setI] = useState(index);
  const reel = reels[i];
  const id = rid(reel);
  const author = reel?.author || {};
  const authorId = author.id || author._id;
  const isOwn = Boolean(authorId && (me?._id === authorId || me?.id === authorId));

  // Per-reel optimistic overrides: { [reelId]: { liked, likesCount, saved, commentsCount } }
  const [over, setOver] = useState({});
  const cur = over[id] || {};
  const liked = cur.liked ?? Boolean(reel?.isLiked);
  const likesCount = cur.likesCount ?? (reel?.likesCount || 0);
  const saved = cur.saved ?? Boolean(reel?.isSaved);
  const commentsCount = cur.commentsCount ?? (reel?.commentsCount || 0);
  const patch = (p) => setOver((o) => ({ ...o, [id]: { ...o[id], ...p } }));

  const [muted, setMuted] = useState(true);
  const [fly, setFly] = useState(false);
  const [more, setMore] = useState(false);
  const [share, setShare] = useState(false);
  const [likesOpen, setLikesOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [caption, setCaption] = useState(reel?.caption);

  const go = (d) => setI((v) => Math.max(0, Math.min(reels.length - 1, v + d)));

  // keyboard nav
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
      else if (e.key === "ArrowUp") go(-1);
      else if (e.key === "ArrowDown") go(1);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // keep caption in sync when navigating between reels
  useEffect(() => { setCaption(reel?.caption); }, [reel?.caption]);

  // view + watched pings for the currently visible reel
  useEffect(() => {
    if (demo || !id) return;
    dok.reels.view(id).catch(() => {});
    const t = setTimeout(() => dok.reels.watched(id).catch(() => {}), 8000);
    return () => clearTimeout(t);
  }, [id, demo]);

  if (!reel) return null;

  /* ---- like engine: optimistic toggle + rollback ---- */
  const toggleLike = () => {
    const next = !liked;
    patch({ liked: next, likesCount: Math.max(0, likesCount + (next ? 1 : -1)) });
    if (demo) return;
    dok.reels.like(id)
      .then((d) => { if (typeof d?.likesCount === "number") patch({ likesCount: d.likesCount, liked: d.isLiked ?? next }); })
      .catch(() => { patch({ liked, likesCount }); toast?.error("Couldn't update your reaction"); });
  };

  const dblTap = () => {
    if (!liked) toggleLike();
    setFly(true);
    setTimeout(() => setFly(false), 900);
  };

  /* ---- save engine ---- */
  const toggleSave = () => {
    const next = !saved;
    patch({ saved: next });
    if (demo) return;
    dok.reels.save(id).catch(() => { patch({ saved }); toast?.error("Couldn't update saved items"); });
  };

  /* ---- 3-dot actions ---- */
  const copyLink = async () => {
    setMore(false);
    try {
      const url = `${typeof window !== "undefined" ? window.location.origin : "https://doklynk.app"}/reel/${id}`;
      await navigator.clipboard.writeText(url);
      toast?.success("Link copied — safe to share publicly");
    } catch { toast?.error("Couldn't copy the link"); }
  };

  const notInterested = () => {
    setMore(false);
    if (!demo) dok.reels.notInterested(id).catch(() => {});
    toast?.success("We'll show you fewer like this");
    onRemoved?.(id);
    reels.length > 1 ? go(i === reels.length - 1 ? -1 : 1) : onClose?.();
  };

  const muteAuthor = () => {
    setMore(false);
    if (!demo) dok.feed.mute(authorId).catch(() => {});
    toast?.success(`You won't see suggestions from ${author.fullName} anymore`);
  };

  const deleteReel = async () => {
    setDeleting(true);
    try {
      if (!demo) await dok.reels.remove(id);
      setConfirmDelete(false);
      onRemoved?.(id);
      toast?.success("Pulse deleted");
      reels.length > 1 ? go(i === reels.length - 1 ? -1 : 1) : onClose?.();
    } catch {
      toast?.error("Couldn't delete the Pulse — try again");
    } finally {
      setDeleting(false);
    }
  };

  const editable = canEditPost(reel);

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-ink-900/95 animate-fade-in">
      {/* header */}
      <div className="absolute left-0 right-0 top-0 z-20 flex items-center justify-between p-4 text-white">
        <button onClick={onClose} className="press rounded-full bg-white/10 p-2 backdrop-blur hover:bg-white/20"><X size={20} /></button>
        <p className="text-sm font-semibold">Pulse · <span className="text-white/70">For you</span></p>
        <span className="w-9" />
      </div>

      {/* up/down nav */}
      <div className="absolute right-4 top-1/2 z-20 hidden -translate-y-1/2 flex-col gap-3 lg:flex">
        <button onClick={() => go(-1)} disabled={i === 0} className="press grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white backdrop-blur hover:bg-white/20 disabled:opacity-30"><ChevronUp size={20} /></button>
        <button onClick={() => go(1)} disabled={i === reels.length - 1} className="press grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white backdrop-blur hover:bg-white/20 disabled:opacity-30"><ChevronDown size={20} /></button>
      </div>

      {/* phone frame */}
      <div key={id} className="relative h-[88vh] w-[min(94vw,420px)] overflow-hidden rounded-3xl bg-ink-900 shadow-2xl anim-pop">
        {reel.videoUrl ? (
          <video
            src={reel.videoUrl}
            poster={reel.thumbnailUrl}
            className="h-full w-full object-cover"
            autoPlay loop playsInline muted={muted}
            onDoubleClick={dblTap}
          />
        ) : (
          <img src={reel.thumbnailUrl} alt="" className="h-full w-full object-cover opacity-80" onDoubleClick={dblTap} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/30" />

        <button onClick={() => setMuted((m) => !m)} aria-label={muted ? "Unmute" : "Mute"} className="press absolute right-3 top-16 grid place-items-center rounded-full bg-white/10 p-2 text-white backdrop-blur hover:bg-white/20">
          {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>

        {/* right action rail */}
        <div className="absolute bottom-24 right-3 z-10 flex flex-col items-center gap-5 text-white">
          <Rail icon={Heart} label={compact(likesCount)} active={liked} fill={liked} onIcon={toggleLike} onLabel={() => setLikesOpen(true)} />
          <Rail icon={MessageCircle} label={compact(commentsCount)} onIcon={() => setCommentsOpen(true)} onLabel={() => setCommentsOpen(true)} />
          <Rail icon={Share2} label={compact(reel.sharesCount || 0)} onIcon={() => setShare(true)} onLabel={() => setShare(true)} />
          <Rail icon={Bookmark} label="Save" active={saved} fill={saved} onIcon={toggleSave} onLabel={toggleSave} />
          <button onClick={() => setMore(true)} aria-label="More options" className="press grid h-11 w-11 place-items-center rounded-full bg-white/10 backdrop-blur hover:bg-white/20"><MoreHorizontal size={20} /></button>
        </div>

        {/* caption + author */}
        <div className="absolute inset-x-0 bottom-0 z-10 p-4 pr-20 text-white">
          <div className="mb-2 flex items-center gap-2">
            <button onClick={openAuthor} className="press shrink-0">
              <Avatar user={author} size={36} className="ring-2 ring-white/70" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="truncate font-semibold">{author.fullName}</span>
                {author.isVerified && <Verified size={13} />}
              </div>
              <p className="truncate text-xs text-white/70">{author.professionalHeadline?.split("·")[0] || author.specialization || "Clinician"}</p>
            </div>
            {!isOwn && <FollowButton user={author} demo={demo} className="ml-1" />}
          </div>
          <p className="text-sm leading-snug text-white/90">{caption}</p>
        </div>

        {fly && <div className="pointer-events-none absolute inset-0 grid place-items-center"><Heart size={96} className="anim-heart-fly fill-white text-white drop-shadow-lg" /></div>}
      </div>

      {/* 3-dot context menu */}
      <BottomSheet open={more} onClose={() => setMore(false)} title={isOwn ? "Your Pulse" : `Pulse by ${author.fullName}`} subtitle={reel.createdAt ? timeAgoLong(reel.createdAt) : undefined}>
        {isOwn ? (
          <>
            <SheetRow icon={PenLine} title="Edit caption" desc={editable ? "Update the caption and tags" : "Editing closes 24 hours after posting"} onClick={editable ? () => { setMore(false); setEditOpen(true); } : undefined} disabled={!editable} />
            <SheetRow icon={Link2} title="Copy link" desc="Read-only public preview" onClick={copyLink} />
            <SheetRow icon={Share2} title="Share to message" desc="Send privately" onClick={() => { setMore(false); setShare(true); }} />
            <div className="my-1 h-px bg-ink-900/[.06]" />
            <SheetRow icon={Trash2} title="Delete forever" desc="Removes the Pulse permanently" danger onClick={() => { setMore(false); setConfirmDelete(true); }} />
          </>
        ) : (
          <>
            <SheetRow icon={Bookmark} title={saved ? "Remove from saved" : "Save Pulse"} desc={saved ? "In your private Saved tab" : "Add to your private Saved tab"} onClick={() => { toggleSave(); setMore(false); }} />
            <SheetRow icon={Share2} title="Share to message" desc="Send privately" onClick={() => { setMore(false); setShare(true); }} />
            <SheetRow icon={Link2} title="Copy link" desc="Read-only public preview" onClick={copyLink} />
            <div className="my-1 h-px bg-ink-900/[.06]" />
            <SheetRow icon={EyeOff} title="Not interested" desc="Hide this and show fewer like it" onClick={notInterested} />
            <SheetRow icon={UserX} title="Don't recommend" desc={`Stop suggesting Pulses from ${author.fullName}`} onClick={muteAuthor} />
          </>
        )}
      </BottomSheet>

      {/* destructive confirmation */}
      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} className="max-w-sm">
        <div className="grid place-items-center gap-3 p-6 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-danger-50 text-danger-500"><AlertTriangle size={26} /></span>
          <h3 className="font-display text-lg font-extrabold text-ink-900">Delete this Pulse forever?</h3>
          <p className="text-sm text-ink-500">It will be permanently removed for everyone, along with its reactions and replies. This can't be undone.</p>
          <div className="mt-2 flex w-full gap-2">
            <button onClick={() => setConfirmDelete(false)} className="btn-outline flex-1 py-2.5 text-sm">Keep Pulse</button>
            <button onClick={deleteReel} disabled={deleting} className="btn flex-1 bg-danger-500 py-2.5 text-sm text-white hover:bg-danger-700">
              {deleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />} Delete forever
            </button>
          </div>
        </div>
      </Modal>

      {/* overlays — reel-aware */}
      <ShareSheet open={share} onClose={() => setShare(false)} post={{ ...reel, content: caption }} demo={demo} kind="reel" />
      <LikesSheet open={likesOpen} onClose={() => setLikesOpen(false)} postId={id} count={likesCount} demo={demo} kind="reel" />
      <CommentsSheet open={commentsOpen} onClose={() => setCommentsOpen(false)} post={{ ...reel, commentsCount }} demo={demo} kind="reel" onCountChange={(d) => patch({ commentsCount: Math.max(0, commentsCount + d) })} />
      <EditPostModal open={editOpen} onClose={() => setEditOpen(false)} post={reel} demo={demo} kind="reel" onSaved={(text) => setCaption(text)} />
    </div>,
    document.body
  );
}

function Rail({ icon: Icon, label, active, fill, onIcon, onLabel }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <button onClick={onIcon} className="press grid h-11 w-11 place-items-center rounded-full backdrop-blur transition" style={{ background: active ? "var(--rail-active, rgba(255,255,255,.18))" : "rgba(255,255,255,.1)" }}>
        <Icon size={20} className={cn("text-white transition", fill && "fill-white")} />
      </button>
      <button onClick={onLabel} className="press text-xs font-semibold text-white">{label}</button>
    </div>
  );
}

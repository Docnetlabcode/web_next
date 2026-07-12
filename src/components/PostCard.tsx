"use client";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@/lib/router";
import {
  MessageCircle, Share2, Bookmark, MoreHorizontal, Heart, EyeOff, UserX,
  Send as SendIcon, Link2, Flag, PenLine, Trash2, AlertTriangle, Loader2, Undo2, Play,
} from "lucide-react";
import { Avatar, Verified, PostTypeBadge } from "@/components/ui/Primitives";
import { RichText } from "@/components/ui/RichText";
import ReactionButton, { REACTIONS } from "@/components/ui/ReactionButton";
import FollowButton from "@/components/ui/FollowButton";
import { BottomSheet, SheetRow, Modal } from "@/components/ui/Overlays";
import ShareSheet from "@/components/ShareSheet";
import LikesSheet from "@/components/LikesSheet";
import CommentsSheet from "@/components/CommentsSheet";
import ReportSheet from "@/components/ReportSheet";
import EditPostModal, { canEditPost } from "@/components/EditPostModal";
import PostMediaViewer from "@/components/PostMediaViewer";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/ui/Toast";
import { cn, timeAgo, timeAgoLong, compact, roleLabel } from "@/lib/utils";
import { dok } from "@/lib/api";

/**
 * Feed card with the immutable attribution hierarchy:
 * DP + name + verified badge + headline + timestamp + content-type tag,
 * the optimistic like/save engines, comments, share tray, and the
 * owner / third-party 3-dot context menus (docs/feed.md §1–§3).
 */
// Some endpoints (e.g. /feed/saved) return raw mediaUrls/mediaTypes instead of the
// built `media` array; normalize so the card renders media regardless of source.
const _toMediaType = (t) => (t === "video" ? "video" : t === "audio" ? "audio" : t === "pdf" ? "pdf" : "image");
const normalizeMedia = (post) => {
  if (Array.isArray(post.media) && post.media.length) return post.media;
  const items = (post.mediaUrls || []).map((url, i) => ({ url, type: _toMediaType(post.mediaTypes?.[i]) }));
  if (post.documentUrl) items.push({ url: post.documentUrl, type: "document", name: post.documentName });
  return items;
};

export default function PostCard({ post, demo, onRemoved, onSavedChange }) {
  const nav = useNavigate();
  const toast = useToast();
  const { user: me } = useAuth();
  const a = post.author || {};
  const authorId = a.id || a._id;
  const isOwn = Boolean(authorId && (me?._id === authorId || me?.id === authorId));
  const media = normalizeMedia(post);

  // --- engagement state (optimistic with rollback) ---
  const [reaction, setReaction] = useState(post.isLiked ? "helpful" : null);
  const [count, setCount] = useState(post.likesCount || 0);
  const [commentsCount, setCommentsCount] = useState(post.commentsCount || 0);
  const [saved, setSaved] = useState(Boolean(post.isSaved));
  const [content, setContent] = useState(post.content);
  const [edited, setEdited] = useState(Boolean(post.isEdited));

  // --- overlays ---
  const [moreOpen, setMoreOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [likesOpen, setLikesOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [viewer, setViewer] = useState(null); // full-screen media index, or null

  // --- removal pipeline: collapse animation → stub / drop ---
  const [collapsed, setCollapsed] = useState(false);
  const [gone, setGone] = useState(null); // "hidden" | "muted" | "deleted"
  const [fly, setFly] = useState(false);
  const collapseTimer = useRef(null);

  useEffect(() => () => clearTimeout(collapseTimer.current), []);

  const collapseInto = (kind) => {
    setMoreOpen(false);
    setCollapsed(true);
    collapseTimer.current = setTimeout(() => {
      setGone(kind);
      setCollapsed(false);
      if (kind === "deleted") onRemoved?.(post._id || post.id);
    }, 400);
  };

  /* ---- like engine: instant toggle, server-sync, rollback on failure ---- */
  const react = (key) => {
    const prevReaction = reaction;
    const prevCount = count;
    setCount((n) => n + ((key ? 1 : 0) - (prevReaction ? 1 : 0)));
    setReaction(key);
    // The backend like is a toggle — only call when crossing the on/off boundary
    // (switching between reaction flavors is client-side presentation).
    const crossed = Boolean(key) !== Boolean(prevReaction);
    if (demo || !crossed) return;
    dok.posts
      .like(post._id || post.id)
      .then((d) => { if (typeof d?.likesCount === "number") setCount(d.likesCount); })
      .catch(() => {
        setReaction(prevReaction);
        setCount(prevCount);
        toast?.error("Couldn't update your reaction");
      });
  };

  const dblTap = () => {
    if (reaction !== "heart") react("heart");
    setFly(true);
    setTimeout(() => setFly(false), 900);
  };

  /* ---- save engine ---- */
  const toggleSave = () => {
    const prev = saved;
    const next = !prev;
    setSaved(next);
    onSavedChange?.(post, next); // let the Saved screen drop/restore the card
    if (demo) return;
    dok.posts.save(post._id || post.id).catch(() => {
      setSaved(prev);
      onSavedChange?.(post, prev);
      toast?.error("Couldn't update saved items");
    });
  };

  /* ---- 3-dot actions ---- */
  const copyLink = async () => {
    setMoreOpen(false);
    try {
      const d = demo ? { webFallback: `https://orovion.app/post/${post._id}` } : await dok.posts.shareLink(post._id || post.id);
      await navigator.clipboard.writeText(d.webFallback || d.deepLink);
      toast?.success("Link copied — safe to share publicly");
    } catch {
      toast?.error("Couldn't copy the link");
    }
  };

  const notInterested = () => {
    collapseInto("hidden");
    if (!demo) dok.feed.notInterested(post._id || post.id).catch(() => {});
  };

  const muteAuthor = () => {
    collapseInto("muted");
    if (!demo) dok.feed.mute(authorId).catch(() => {});
  };

  const unmuteAuthor = () => {
    setGone(null);
    if (!demo) dok.feed.unmute(authorId).catch(() => {});
  };

  const deletePost = async () => {
    setDeleting(true);
    try {
      if (!demo) await dok.posts.remove(post._id || post.id);
      setConfirmDelete(false);
      collapseInto("deleted");
    } catch {
      toast?.error("Couldn't delete the post — try again");
    } finally {
      setDeleting(false);
    }
  };

  const openProfile = () => authorId && nav(isOwn ? "/app/profile" : `/app/profile/${authorId}`);

  /* ---- post-removal stubs ---- */
  if (gone === "deleted") return null;
  if (gone === "hidden") {
    return (
      <div className="anim-pop card flex items-center gap-3 p-4 text-sm text-ink-500">
        <EyeOff size={17} className="shrink-0 text-ink-400" />
        <span className="flex-1">Post hidden. We'll show you fewer like this.</span>
      </div>
    );
  }
  if (gone === "muted") {
    return (
      <div className="anim-pop card flex items-center gap-3 p-4 text-sm text-ink-500">
        <UserX size={17} className="shrink-0 text-ink-400" />
        <span className="flex-1">You won't see suggestions from <strong className="text-ink-700">{a.fullName}</strong> anymore.</span>
        <button onClick={unmuteAuthor} className="press flex shrink-0 items-center gap-1 rounded-full bg-ink-900/[.05] px-3 py-1.5 text-xs font-bold text-ink-700 hover:bg-ink-900/[.09]">
          <Undo2 size={12} /> Undo
        </button>
      </div>
    );
  }

  const editable = canEditPost(post);

  return (
    <div className={cn("collapse-row", collapsed && "collapsed")}>
      <div>
        <article className="card overflow-hidden animate-fade-up">
          {/* ---------- attribution header ---------- */}
          <div className="flex items-start gap-3 p-4">
            <button onClick={openProfile} className="press shrink-0" aria-label={`View ${a.fullName}'s profile`}>
              <Avatar user={a} size={44} />
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <button onClick={openProfile} className="truncate font-semibold text-ink-900 hover:underline">{a.fullName}</button>
                {a.isVerified && <Verified />}
                <PostTypeBadge type={post.postType} />
              </div>
              <p className="truncate text-[13px] text-ink-500">
                {a.professionalHeadline || a.specialization || roleLabel(a.role)}
                {" · "}
                <time
                  dateTime={post.createdAt}
                  title={new Date(post.createdAt).toLocaleString(undefined, { dateStyle: "long", timeStyle: "short" })}
                >
                  {timeAgo(post.createdAt)}
                </time>
                {edited && <span className="text-ink-400"> · Edited</span>}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              {!isOwn && <FollowButton user={a} demo={demo} simple />}
              <button onClick={() => setMoreOpen(true)} aria-label="Post options" className="press rounded-full p-1.5 text-ink-400 hover:bg-ink-900/5">
                <MoreHorizontal size={18} />
              </button>
            </div>
          </div>

          {/* ---------- body ---------- */}
          <div className="px-4 pb-3">
            <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-ink-900"><RichText text={content} /></p>
            {post.specialties?.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {post.specialties.map((s) => <span key={s} className="chip bg-brand-50 text-brand-700">{s}</span>)}
              </div>
            )}
          </div>

          {/* ---------- media (tap → full screen · double-tap → react) ---------- */}
          {media.length > 0 && media[0]?.url && (
            <div className="relative mx-1 mb-1 select-none overflow-hidden rounded-2xl">
              {media.length === 1 ? (
                <MediaTile m={media[0]} onOpen={() => setViewer(0)} onLike={dblTap} wrap="" media="max-h-[460px] w-full object-cover" />
              ) : (
                <div className="grid grid-cols-2 gap-0.5">
                  {media.slice(0, 4).map((m, i) => (
                    <MediaTile
                      key={i}
                      m={m}
                      onOpen={() => setViewer(i)}
                      onLike={dblTap}
                      wrap="aspect-square"
                      media="h-full w-full object-cover"
                      overlay={i === 3 && media.length > 4 ? `+${media.length - 4}` : null}
                    />
                  ))}
                </div>
              )}
              {fly && (
                <div className="pointer-events-none absolute inset-0 grid place-items-center">
                  <Heart size={96} className="anim-heart-fly fill-white text-white drop-shadow-lg" />
                </div>
              )}
            </div>
          )}

          {/* ---------- engagement summary (tap count → likes list) ---------- */}
          {(count > 0 || commentsCount > 0) && (
            <div className="flex items-center gap-2 px-4 pt-2 text-xs text-ink-500">
              {count > 0 && (
                <button onClick={() => setLikesOpen(true)} className="press flex items-center gap-2 hover:text-ink-900 hover:underline">
                  <span className="flex -space-x-1">
                    {REACTIONS.slice(0, 3).map((r) => (
                      <span key={r.key} className="grid h-5 w-5 place-items-center rounded-full bg-surface text-[11px] ring-1 ring-ink-900/[.06]">{r.emoji}</span>
                    ))}
                  </span>
                  {compact(count)} reactions
                </button>
              )}
              {commentsCount > 0 && (
                <button onClick={() => setCommentsOpen(true)} className="press hover:text-ink-900 hover:underline">
                  · {compact(commentsCount)} replies
                </button>
              )}
            </div>
          )}

          {/* ---------- action row ---------- */}
          <div className="mt-1 flex items-center gap-1 border-t border-ink-900/[.05] px-2 py-1.5 text-ink-500">
            <ReactionButton current={reaction} count={count} onReact={react} />
            <button onClick={() => setCommentsOpen(true)} aria-label="Comments" className="press flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition hover:bg-ink-900/5">
              <MessageCircle size={18} /> <span>{compact(commentsCount)}</span>
            </button>
            <button onClick={() => setShareOpen(true)} aria-label="Share" className="press flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition hover:bg-ink-900/5">
              <Share2 size={17} /> <span>{compact(post.sharesCount || 0)}</span>
            </button>
            <div className="flex-1" />
            <button onClick={toggleSave} aria-label={saved ? "Remove from saved" : "Save post"} aria-pressed={saved} className={cn("press rounded-full p-2 transition hover:bg-ink-900/5", saved && "text-brand-600")}>
              <Bookmark size={19} className={cn("transition", saved && "anim-burst fill-brand-600")} />
            </button>
          </div>

          {/* ---------- 3-dot context menu ---------- */}
          <BottomSheet
            open={moreOpen}
            onClose={() => setMoreOpen(false)}
            title={isOwn ? "Your post" : `Post by ${a.fullName}`}
            subtitle={`${timeAgoLong(post.createdAt)} · ${post.postType === "post" ? "Post" : (post.postType || "").replace("_", " ")}`}
          >
            {isOwn ? (
              <>
                <SheetRow
                  icon={PenLine}
                  title="Edit post"
                  desc={editable ? "Update the text and tags" : "Editing closes 24 hours after posting"}
                  onClick={editable ? () => { setMoreOpen(false); setEditOpen(true); } : undefined}
                  disabled={!editable}
                />
                <SheetRow icon={SendIcon} title="Share to message" desc="Send privately" onClick={() => { setMoreOpen(false); setShareOpen(true); }} />
                <SheetRow icon={Link2} title="Copy link" desc="Read-only public preview" onClick={copyLink} />
                <div className="my-1 h-px bg-ink-900/[.06]" />
                <SheetRow icon={Trash2} title="Delete forever" desc="Removes the post permanently" danger onClick={() => { setMoreOpen(false); setConfirmDelete(true); }} />
              </>
            ) : (
              <>
                <SheetRow icon={Bookmark} title={saved ? "Remove from saved" : "Save post"} desc={saved ? "In your private Saved tab" : "Add to your private Saved tab"} onClick={() => { toggleSave(); setMoreOpen(false); }} />
                <SheetRow icon={SendIcon} title="Share to message" desc="Send privately" onClick={() => { setMoreOpen(false); setShareOpen(true); }} />
                <SheetRow icon={Link2} title="Copy link" desc="Read-only public preview" onClick={copyLink} />
                <div className="my-1 h-px bg-ink-900/[.06]" />
                <SheetRow icon={EyeOff} title="Not interested" desc="Hide this and show fewer like it" onClick={notInterested} />
                <SheetRow icon={UserX} title="Don't recommend" desc={`Stop suggesting posts from ${a.fullName}`} onClick={muteAuthor} />
                <SheetRow icon={Flag} title="Report" desc="Flag for the moderation team" danger onClick={() => { setMoreOpen(false); setReportOpen(true); }} />
              </>
            )}
          </BottomSheet>

          {/* ---------- destructive confirmation ---------- */}
          <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} className="max-w-sm">
            <div className="grid place-items-center gap-3 p-6 text-center">
              <span className="grid h-14 w-14 place-items-center rounded-full bg-danger-50 text-danger-500"><AlertTriangle size={26} /></span>
              <h3 className="font-display text-lg font-extrabold text-ink-900">Delete this post forever?</h3>
              <p className="text-sm text-ink-500">It will be permanently removed for everyone, along with its reactions and replies. This can't be undone.</p>
              <div className="mt-2 flex w-full gap-2">
                <button onClick={() => setConfirmDelete(false)} className="btn-outline flex-1 py-2.5 text-sm">Keep post</button>
                <button onClick={deletePost} disabled={deleting} className="btn flex-1 bg-danger-500 py-2.5 text-sm text-white hover:bg-danger-700">
                  {deleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />} Delete forever
                </button>
              </div>
            </div>
          </Modal>

          {/* ---------- overlays ---------- */}
          <ShareSheet open={shareOpen} onClose={() => setShareOpen(false)} post={post} demo={demo} kind={post.postType === "post" ? "post" : (post.postType || "post").replace("_", " ")} />
          <LikesSheet open={likesOpen} onClose={() => setLikesOpen(false)} postId={post._id || post.id} count={count} demo={demo} />
          <CommentsSheet open={commentsOpen} onClose={() => setCommentsOpen(false)} post={{ ...post, commentsCount }} demo={demo} onCountChange={(d) => setCommentsCount((n) => Math.max(0, n + d))} />
          <ReportSheet open={reportOpen} onClose={() => setReportOpen(false)} postId={post._id || post.id} demo={demo} />
          <EditPostModal open={editOpen} onClose={() => setEditOpen(false)} post={{ ...post, content }} demo={demo} onSaved={(text) => { setContent(text); setEdited(true); }} />
          {viewer != null && <PostMediaViewer media={media} index={viewer} onClose={() => setViewer(null)} />}
        </article>
      </div>
    </div>
  );
}

/* A single image/video thumbnail in the card: tap → open full screen, double-tap → like. */
function MediaTile({ m, onOpen, onLike, wrap, media, overlay }) {
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  const click = () => { clearTimeout(timer.current); timer.current = setTimeout(onOpen, 200); };
  const dbl = () => { clearTimeout(timer.current); onLike?.(); };
  const isVideo = m.type === "video";
  return (
    <div className={cn("relative cursor-pointer", wrap)} onClick={click} onDoubleClick={dbl}>
      {isVideo
        ? <video src={m.url} muted playsInline preload="metadata" className={media} />
        : <img src={m.url} alt="" loading="lazy" className={media} />}
      {isVideo && (
        <span className="pointer-events-none absolute inset-0 grid place-items-center">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-black/50 text-white backdrop-blur"><Play size={20} className="ml-0.5 fill-white text-white" /></span>
        </span>
      )}
      {overlay && <span className="pointer-events-none absolute inset-0 grid place-items-center bg-ink-950/50 text-xl font-bold text-white">{overlay}</span>}
    </div>
  );
}


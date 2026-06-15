"use client";
import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "@/lib/router";
import { Bookmark, Share2, ThumbsUp } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Avatar, Verified, PostTypeBadge, Skeleton } from "@/components/ui/Primitives";
import CommentThread from "@/components/comments/CommentThread";
import ShareSheet from "@/components/ShareSheet";
import { useAuth } from "@/context/AuthContext";
import { dok } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { cn, timeAgo, compact, roleLabel } from "@/lib/utils";

/**
 * Discussion view: full post + the shared comment engine.
 * Mention notifications deep-link here as /app/post/:id?comment=<commentId>,
 * which auto-scrolls to and highlights the target comment.
 */
export default function PostDetail() {
  const { id } = useParams();
  const [sp] = useSearchParams();
  const highlightId = sp?.get("comment") || undefined;
  const { demo } = useAuth();
  const toast = useToast();

  const [post, setPost] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [share, setShare] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(0);
  const [saved, setSaved] = useState(false);
  const [commentsCount, setCommentsCount] = useState(0);

  useEffect(() => {
    let alive = true;
    const adopt = (p) => {
      if (!alive || !p) return;
      setPost(p);
      setLiked(Boolean(p.isLiked));
      setLikes(p.likesCount || 0);
      setSaved(Boolean(p.isSaved));
      setCommentsCount(p.commentsCount || 0);
    };
    dok.posts
      .get(id)
      .then((d) => adopt(d.post || d))
      .catch(() => { if (alive) setNotFound(true); });
    return () => { alive = false; };
  }, [id, demo]);

  const toggleLike = () => {
    const pl = liked, pc = likes;
    setLiked(!pl);
    setLikes((n) => n + (pl ? -1 : 1));
    if (demo) return;
    dok.posts
      .like(id)
      .then((d) => { if (typeof d?.likesCount === "number") setLikes(d.likesCount); })
      .catch(() => { setLiked(pl); setLikes(pc); toast?.error("Couldn't update your reaction"); });
  };

  const toggleSave = () => {
    const prev = saved;
    setSaved(!prev);
    if (demo) return;
    dok.posts.save(id).catch(() => { setSaved(prev); toast?.error("Couldn't update saved items"); });
  };

  if (notFound) return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Discussion" />
      <div className="card mt-4 grid place-items-center gap-2 py-20 text-center">
        <p className="text-lg font-semibold text-ink-900">Post not found</p>
        <p className="max-w-xs text-sm text-ink-500">This post may have been deleted or is no longer available.</p>
      </div>
    </div>
  );
  if (!post) return <DetailSkeleton />;
  const a = post.author || {};

  return (
    <div className="mx-auto flex h-[calc(100vh-7rem)] max-w-2xl flex-col">
      <PageHeader
        title="Discussion"
        right={
          <div className="flex items-center gap-1">
            <button onClick={toggleSave} aria-pressed={saved} aria-label={saved ? "Remove from saved" : "Save"} className={cn("press rounded-full p-2 hover:bg-ink-900/5", saved ? "text-brand-600" : "text-ink-500")}>
              <Bookmark size={18} className={cn(saved && "fill-brand-600")} />
            </button>
            <button onClick={() => setShare(true)} aria-label="Share" className="press rounded-full p-2 text-ink-500 hover:bg-ink-900/5"><Share2 size={18} /></button>
          </div>
        }
      />

      <div className="min-h-0 flex-1 overflow-y-auto pb-2">
        {/* root post */}
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <Avatar user={a} size={44} />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1 font-semibold">{a.fullName} {a.isVerified && <Verified size={13} />}</p>
              <p className="truncate text-xs text-ink-500">
                {a.professionalHeadline || roleLabel(a.role)} ·{" "}
                <time dateTime={post.createdAt} title={new Date(post.createdAt).toLocaleString(undefined, { dateStyle: "long", timeStyle: "short" })}>
                  {timeAgo(post.createdAt)}
                </time>
              </p>
            </div>
            <PostTypeBadge type={post.postType} />
          </div>
          {!post.media?.[0]?.url && post.postType !== "post" && (
            <h1 className="mt-3 font-display text-xl font-extrabold leading-snug text-ink-900" style={{ textWrap: "balance" }}>
              {post.content.split(".")[0]}.
            </h1>
          )}
          <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed text-ink-900">{post.content}</p>
          {post.media?.[0]?.url && <img src={post.media[0].url} alt="" className="mt-3 max-h-96 w-full rounded-2xl object-cover" />}
          <div className="mt-4 flex items-center justify-between border-t border-ink-900/[.05] pt-3 text-sm text-ink-500">
            <span>{compact(likes)} reactions · {compact(commentsCount)} replies</span>
            <button onClick={toggleLike} aria-pressed={liked} className={cn("btn px-4 py-1.5 text-sm", liked ? "bg-brand-600 text-white shadow-glow" : "btn-ghost")}>
              <ThumbsUp size={15} className={cn(liked && "anim-burst")} /> Helpful
            </button>
          </div>
        </div>

        {/* shared comment engine (composer included) */}
        <p className="mb-1 mt-6 px-1 text-xs font-bold uppercase tracking-wide text-ink-400">Replies</p>
        <div className="card overflow-hidden">
          <CommentThread
            postId={id}
            postOwnerId={a.id || a._id}
            demo={demo}
            highlightId={highlightId}
            onCountChange={(d) => setCommentsCount((n) => Math.max(0, n + d))}
          />
        </div>
      </div>

      <ShareSheet open={share} onClose={() => setShare(false)} post={post} demo={demo} kind={post.postType === "post" ? "post" : (post.postType || "post").replace("_", " ")} />
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="card space-y-3 p-5">
        <div className="flex items-center gap-3">
          <Skeleton className="h-11 w-11 rounded-full" />
          <div className="flex-1 space-y-2"><Skeleton className="h-3.5 w-44" /><Skeleton className="h-3 w-28" /></div>
        </div>
        <Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-5/6" /><Skeleton className="h-40 w-full rounded-2xl" />
      </div>
      <div className="card space-y-4 p-5">
        {[0, 1].map((i) => (
          <div key={i} className="flex gap-3"><Skeleton className="h-9 w-9 rounded-full" /><Skeleton className="h-16 flex-1 rounded-2xl" /></div>
        ))}
      </div>
    </div>
  );
}

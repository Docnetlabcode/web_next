"use client";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@/lib/router";
import { ThumbsUp } from "lucide-react";
import { BottomSheet } from "@/components/ui/Overlays";
import { Avatar, Verified, Skeleton } from "@/components/ui/Primitives";
import FollowButton from "@/components/ui/FollowButton";
import { dok } from "@/lib/api";
import { compact } from "@/lib/utils";

/**
 * Tapping the like-count text opens this slide-up list of everyone who reacted.
 * Each row: DP → profile, name + headline + verified badge, and the same
 * Follow → Connect → Message state machine as the feed-card header.
 */
export default function LikesSheet({ open, onClose, postId, count, demo, kind = "post" }) {
  const nav = useNavigate();
  const source = kind === "reel" ? dok.reels : dok.posts;
  const [users, setUsers] = useState(null);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinel = useRef(null);

  useEffect(() => {
    if (!open) return;
    setUsers(null);
    source
      .likes(postId, "?limit=20")
      .then((d) => {
        setUsers(d.users || []);
        setHasMore(Boolean(d.hasMore));
        setCursor(d.nextCursor || null);
      })
      .catch(() => setUsers([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, postId, demo, kind]);

  // Infinite scroll within the sheet
  useEffect(() => {
    if (!open || !hasMore || !sentinel.current) return;
    const io = new IntersectionObserver(async ([e]) => {
      if (!e.isIntersecting || loadingMore) return;
      setLoadingMore(true);
      try {
        const d = await source.likes(postId, `?limit=20&cursor=${cursor}`);
        setUsers((u) => [...(u || []), ...(d.users || [])]);
        setHasMore(Boolean(d.hasMore));
        setCursor(d.nextCursor || null);
      } catch {
        setHasMore(false);
      } finally {
        setLoadingMore(false);
      }
    });
    io.observe(sentinel.current);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, hasMore, cursor, loadingMore, postId, kind]);

  const openProfile = (u) => {
    onClose();
    nav(`/app/profile/${u.id || u._id}`);
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Reactions" subtitle={count ? `${compact(count)} people reacted` : undefined}>
      <div className="max-h-[55vh] overflow-y-auto overscroll-contain px-2 pb-2">
        {users === null ? (
          <RowSkeletons />
        ) : users.length === 0 ? (
          <div className="grid place-items-center gap-2 py-12 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-brand-50 text-brand-600"><ThumbsUp size={20} /></span>
            <p className="text-sm font-semibold text-ink-900">No reactions yet</p>
            <p className="text-xs text-ink-500">Be the first to find this helpful.</p>
          </div>
        ) : (
          users.map((u, i) => (
            <div key={u.id || u._id} className="anim-pop flex items-center gap-3 rounded-2xl px-3 py-2.5 transition hover:bg-ink-900/[.03]" style={{ animationDelay: `${Math.min(i, 8) * 28}ms` }}>
              <button onClick={() => openProfile(u)} className="press shrink-0"><Avatar user={u} size={44} /></button>
              <button onClick={() => openProfile(u)} className="min-w-0 flex-1 text-left">
                <p className="flex items-center gap-1 truncate text-sm font-semibold text-ink-900">
                  <span className="truncate">{u.fullName}</span>
                  {u.isVerified && <Verified size={13} className="shrink-0" />}
                </p>
                {u.professionalHeadline && <p className="truncate text-xs text-ink-500">{u.professionalHeadline}</p>}
              </button>
              <FollowButton user={u} demo={demo} />
            </div>
          ))
        )}
        {hasMore && <div ref={sentinel} className="py-2">{loadingMore && <RowSkeletons n={2} />}</div>}
      </div>
    </BottomSheet>
  );
}

function RowSkeletons({ n = 5 }) {
  return (
    <>
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-2.5">
          <Skeleton className="h-11 w-11 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-36" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-7 w-20 rounded-full" />
        </div>
      ))}
    </>
  );
}

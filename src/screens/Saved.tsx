"use client";
import { useEffect, useState } from "react";
import { useNavigate } from "@/lib/router";
import { Bookmark, Play } from "lucide-react";
import PostCard from "@/components/PostCard";
import { Skeleton } from "@/components/ui/Primitives";
import { useAuth } from "@/context/AuthContext";
import { dok } from "@/lib/api";
import { cn, compact } from "@/lib/utils";

/**
 * Private Saved repository (docs/feed.md §6) — visible only to the owner,
 * organized by content category via /feed/saved?tab=…
 */
const TABS = [
  { key: "all", label: "All" },
  { key: "post", label: "Posts" },
  { key: "case_study", label: "Case studies" },
  { key: "research", label: "Research" },
  { key: "thesis", label: "Theses" },
  { key: "reel", label: "Pulse" },
];

export default function Saved() {
  const { demo } = useAuth();
  const nav = useNavigate();
  const [tab, setTab] = useState("all");
  const [items, setItems] = useState(null);

  useEffect(() => {
    let alive = true;
    setItems(null);
    dok.feed
      .saved(`?tab=${tab}`)
      .then((d) => alive && setItems(d.feed || d.items || d.posts || []))
      .catch(() => alive && setItems([]));
    return () => { alive = false; };
  }, [tab]);

  const isReel = (x) => x.type === "reel" || x._feedType === "reel" || Boolean(x.videoUrl || x.thumbnailUrl);
  const reelPoster = (r) => r.thumbnailUrl || (r.videoUrl ? r.videoUrl.replace(/\.(mp4|mov|webm|m3u8)(\?.*)?$/i, ".jpg") : undefined);
  const reels = (items || []).filter(isReel);
  const posts = (items || []).filter((x) => !isReel(x));

  // Tapping the (already-saved) bookmark un-saves → drop the card; restore it if the call fails.
  const onSavedChange = (post, isSaved) => {
    const id = post._id || post.id;
    setItems((x) => {
      const list = x || [];
      if (isSaved) return list.some((y) => (y._id || y.id) === id) ? list : [post, ...list];
      return list.filter((y) => (y._id || y.id) !== id);
    });
  };

  return (
    <div className="mx-auto max-w-xl pb-24">
      <h1 className="flex items-center gap-2 font-display text-2xl font-extrabold text-ink-900">
        <Bookmark size={22} className="text-brand-600" /> Saved
      </h1>
      <p className="text-sm text-ink-500">Your private bookmarks — only you can see this.</p>

      <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "press whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-semibold transition",
              tab === t.key ? "bg-brand-600 text-white shadow-glow" : "bg-white text-ink-600 ring-1 ring-ink-900/[.06] hover:bg-brand-50"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {items === null ? (
        <div className="mt-5 space-y-5">
          <Skeleton className="h-44 w-full rounded-2xl" />
          <Skeleton className="h-44 w-full rounded-2xl" />
        </div>
      ) : items.length === 0 ? (
        <div className="card mt-5 grid place-items-center gap-2 py-14 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-brand-50 text-brand-600"><Bookmark size={20} /></span>
          <p className="font-semibold text-ink-900">Nothing saved here yet</p>
          <p className="max-w-xs text-sm text-ink-500">Tap the bookmark on any post, case, paper or Pulse to keep it for later.</p>
        </div>
      ) : (
        <div className="mt-5 space-y-5">
          {reels.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {reels.map((r) => (
                <button key={r._id || r.id} onClick={() => nav("/app/reels")} className="press group relative aspect-[3/4] overflow-hidden rounded-2xl bg-ink-900">
                  <img src={reelPoster(r)} alt="" onError={(e) => { e.currentTarget.style.visibility = "hidden"; }} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" loading="lazy" />
                  <span className="absolute inset-0 bg-gradient-to-t from-ink-900/60 via-transparent" />
                  <span className="absolute bottom-2 left-2 right-2 truncate text-left text-xs font-semibold text-white">{r.caption}</span>
                  <span className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-ink-900/40 text-white backdrop-blur"><Play size={13} /></span>
                </button>
              ))}
            </div>
          )}
          {posts.map((p) => (
            <PostCard
              key={p._id || p.id}
              post={{ ...p, isSaved: true }}
              demo={demo}
              onRemoved={(pid) => setItems((x) => x.filter((y) => (y._id || y.id) !== pid))}
              onSavedChange={onSavedChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}

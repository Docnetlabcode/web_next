"use client";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "@/lib/router";
import { Hash, ArrowLeft, Play, Loader2 } from "lucide-react";
import { Avatar, Skeleton } from "@/components/ui/Primitives";
import PostCard from "@/components/PostCard";
import { useAuth } from "@/context/AuthContext";
import { dok } from "@/lib/api";
import { cn, compact, reelPoster } from "@/lib/utils";

/**
 * Dedicated hashtag workspace (PRD §4B) — deep-linked from any #tag chip.
 * Header (# + cumulative post volume) + tabbed feed: All / Case Studies / Research / Reels.
 * Shows only assets whose metadata carries the tag token.
 */
const TABS = [
  { key: "all", label: "All" },
  { key: "case_study", label: "Case studies" },
  { key: "research", label: "Research" },
  { key: "reel", label: "Reels" },
];
const rid = (x) => x?._id || x?.id;
const isReel = (x) => x?.kind === "reel" || x?.postType === "REEL" || x?.type === "reel" || Boolean(x?.videoUrl);

export default function HashtagWorkspace() {
  const { demo } = useAuth();
  const nav = useNavigate();
  const params = useParams();
  const tag = decodeURIComponent(params?.tag || "");

  const [type, setType] = useState("all");
  const [items, setItems] = useState(null);
  const [count, setCount] = useState(null);

  useEffect(() => {
    if (!tag) return;
    let alive = true;
    setItems(null);
    dok.search.hashtag(tag, `?type=${type}`)
      .then((d) => {
        if (!alive) return;
        setItems(d.items || d.posts || d.results || (Array.isArray(d) ? d : []));
        setCount(d.totalCount ?? d.count ?? d.total ?? null);
      })
      .catch(() => alive && setItems([]));
    return () => { alive = false; };
  }, [tag, type]);

  const list = items || [];

  return (
    <div className="mx-auto max-w-2xl pb-24">
      {/* header */}
      <div className="mb-4 flex items-center gap-3">
        <button onClick={() => nav(-1)} aria-label="Back" className="press grid h-10 w-10 place-items-center rounded-full text-ink-700 transition hover:bg-ink-900/[.05]"><ArrowLeft size={20} /></button>
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-glow"><Hash size={22} /></span>
        <div className="min-w-0">
          <h1 className="truncate font-display text-2xl font-extrabold text-ink-900">#{tag}</h1>
          <p className="text-sm text-ink-500">{count != null ? `${compact(count)} posts` : "Hashtag feed"}</p>
        </div>
      </div>

      {/* sticky tabs */}
      <div className="no-scrollbar sticky top-16 z-20 -mx-1 flex gap-1 overflow-x-auto border-b border-ink-900/[.06] bg-ink-50/90 px-1 backdrop-blur">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setType(t.key)} className={cn("press relative shrink-0 px-4 py-3 text-sm font-semibold transition", type === t.key ? "text-brand-700" : "text-ink-400 hover:text-ink-700")}>
            {t.label}{type === t.key && <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-brand-600 anim-pop" />}
          </button>
        ))}
      </div>

      {/* feed */}
      <div className="mt-5">
        {items === null ? (
          <div className="space-y-5">
            {[0, 1].map((i) => (
              <div key={i} className="card space-y-3 p-4">
                <div className="flex items-center gap-3"><Skeleton className="h-11 w-11 rounded-full" /><div className="flex-1 space-y-2"><Skeleton className="h-3.5 w-40" /><Skeleton className="h-3 w-24" /></div></div>
                <Skeleton className="h-4 w-full" /><Skeleton className="h-40 w-full rounded-2xl" />
              </div>
            ))}
          </div>
        ) : list.length === 0 ? (
          <div className="card grid place-items-center gap-2 py-16 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-brand-50 text-brand-600"><Hash size={24} /></span>
            <p className="text-lg font-semibold text-ink-900">Nothing under #{tag} yet</p>
            <p className="max-w-xs text-sm text-ink-500">Be the first to tag a post with this hashtag.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {list.map((x) => isReel(x)
              ? <ReelRow key={rid(x)} reel={{ ...x, caption: x.caption ?? x.text }} onOpen={() => nav("/app/reels")} />
              : <PostCard key={rid(x)} post={{ ...x, content: x.content ?? x.text }} demo={demo} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ReelRow({ reel, onOpen }) {
  const poster = reelPoster(reel);
  return (
    <button onClick={onOpen} className="card lift flex w-full items-center gap-3 p-3 text-left">
      <span className="relative h-20 w-14 shrink-0 overflow-hidden rounded-xl bg-ink-950">
        {poster && <img src={poster} alt="" className="h-full w-full object-cover" onError={(e) => { e.currentTarget.style.visibility = "hidden"; }} />}
        <span className="absolute inset-0 grid place-items-center text-white"><Play size={18} className="fill-white" /></span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5"><Avatar user={reel.author} size={20} /><span className="truncate text-xs font-semibold text-ink-700">{reel.author?.fullName}</span></span>
        <span className="mt-1 block line-clamp-2 text-sm text-ink-700">{reel.caption}</span>
      </span>
    </button>
  );
}

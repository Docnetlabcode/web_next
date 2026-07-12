"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Play, Heart, Eye, Loader2 } from "lucide-react";
import { Avatar, Verified } from "@/components/ui/Primitives";
import { TileGridSkeleton } from "@/components/ui/Skeletons";
import ReelViewer from "@/components/ReelViewer";
import { useAuth } from "@/context/AuthContext";
import { dok } from "@/lib/api";
import { compact, reelPoster } from "@/lib/utils";
import { usePullToRefresh, useAutoRefresh } from "@/hooks/usePullToRefresh";
import PullToRefreshIndicator from "@/components/ui/PullToRefreshIndicator";

const rid = (r) => r?._id || r?.id;

export default function Reels() {
  const { demo } = useAuth();
  const [reels, setReels] = useState(null);
  const [open, setOpen] = useState(null); // index
  const [exhausted, setExhausted] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const sessionId = useRef(null); // discovery session — reused while scrolling, fresh per tab entry
  const sentinel = useRef(null);

  // One page of the discovery feed (docs/modules/reels.md). `fresh` starts a new session.
  const fetchPage = useCallback(async (fresh) => {
    const params = new URLSearchParams({ limit: "12" });
    if (!fresh && sessionId.current) params.set("sessionId", sessionId.current);
    const d = await dok.reels.feed(`?${params.toString()}`);
    sessionId.current = d.sessionId || sessionId.current;
    setExhausted(Boolean(d.exhausted));
    return d.reels || [];
  }, []);

  // fresh session on every entry into the tab
  useEffect(() => {
    let alive = true;
    sessionId.current = null;
    fetchPage(true).then((r) => alive && setReels(r)).catch(() => alive && setReels([]));
    return () => { alive = false; };
  }, [fetchPage]);

  const loadMore = useCallback(async () => {
    if (loadingMore || exhausted) return;
    setLoadingMore(true);
    try {
      const more = await fetchPage(false);
      setReels((rs) => {
        const seen = new Set((rs || []).map(rid));
        return [...(rs || []), ...more.filter((m) => !seen.has(rid(m)))];
      });
    } catch { /* keep what we have */ }
    finally { setLoadingMore(false); }
  }, [fetchPage, loadingMore, exhausted]);

  // Fresh discovery session (pull-to-refresh / auto-refresh on return).
  const reload = useCallback(async () => {
    sessionId.current = null;
    setExhausted(false);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
    try { setReels(await fetchPage(true)); } catch { setReels((x) => x || []); }
  }, [fetchPage]);

  const { pull, refreshing: pulling } = usePullToRefresh(reload, { disabled: open != null });
  useAutoRefresh(reload);

  // infinite scroll on the grid
  useEffect(() => {
    if (!sentinel.current || exhausted || reels === null) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) loadMore(); }, { rootMargin: "800px" });
    io.observe(sentinel.current);
    return () => io.disconnect();
  }, [loadMore, exhausted, reels]);

  const list = reels || [];
  const removeReel = (id) => setReels((rs) => (rs || []).filter((r) => rid(r) !== id));

  return (
    <div className="pb-24">
      <PullToRefreshIndicator pull={pull} refreshing={pulling} />
      <header className="mb-5">
        <h1 className="font-display text-2xl font-extrabold text-ink-900">Pulse</h1>
        <p className="text-sm text-ink-500">Short-form medical teaching from verified clinicians.</p>
      </header>
      {reels === null ? (
        <TileGridSkeleton count={8} className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" />
      ) : list.length === 0 ? (
        <div className="card grid place-items-center gap-2 py-20 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-brand-50 text-brand-600"><Play size={24} /></span>
          <p className="text-lg font-semibold text-ink-900">No Pulses yet</p>
          <p className="max-w-xs text-sm text-ink-500">Short clinical videos from people you follow will show up here.</p>
        </div>
      ) : (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {list.map((r, idx) => (
          <button key={r._id || r.id} onClick={() => setOpen(idx)} className="lift group relative block aspect-[9/16] overflow-hidden rounded-2xl bg-ink-950 text-left shadow-card">
            <img src={reelPoster(r)} alt="" onError={(e) => { e.currentTarget.style.visibility = "hidden"; }} className="h-full w-full object-cover opacity-90 transition duration-500 group-hover:scale-110 group-hover:opacity-100" loading="lazy" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/10" />
            <div className="absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-full bg-white/15 backdrop-blur transition group-hover:scale-110 group-hover:bg-brand-600"><Play size={15} className="fill-white text-white" /></div>
            <div className="absolute inset-x-0 bottom-0 p-3 text-white">
              <div className="mb-1.5 flex items-center gap-1.5">
                <Avatar user={r.author} size={22} className="ring-1 ring-white/60" />
                <span className="truncate text-xs font-semibold">{r.author?.fullName}</span>
                {r.author?.isVerified && <Verified size={11} />}
              </div>
              <p className="line-clamp-2 text-xs leading-snug text-white/90">{r.caption}</p>
              <div className="mt-1.5 flex items-center gap-3 text-[11px] text-white/80">
                <span className="flex items-center gap-1"><Heart size={12} /> {compact(r.likesCount)}</span>
                <span className="flex items-center gap-1"><Eye size={12} /> {compact(r.viewsCount)}</span>
              </div>
            </div>
          </button>
        ))}
      </div>
      )}

      {/* infinite-scroll sentinel + spinner */}
      {reels !== null && list.length > 0 && !exhausted && (
        <div ref={sentinel} className="grid place-items-center py-8">
          {loadingMore && <Loader2 size={22} className="animate-spin text-brand-600" />}
        </div>
      )}

      {open != null && (
        <ReelViewer
          reels={list}
          index={open}
          onClose={() => setOpen(null)}
          onRemoved={removeReel}
          onReachEnd={loadMore}
        />
      )}
    </div>
  );
}

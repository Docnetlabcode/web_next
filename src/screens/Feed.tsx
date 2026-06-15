"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "@/lib/router";
import { FileText, Stethoscope, Clapperboard, PenLine, ChevronLeft, ChevronRight, Loader2, Sparkles } from "lucide-react";
import PostCard from "@/components/PostCard";
import RightRail from "@/components/layout/RightRail";
import { Avatar, Skeleton } from "@/components/ui/Primitives";
import { useAuth } from "@/context/AuthContext";
import { dok } from "@/lib/api";
import { cn } from "@/lib/utils";

/**
 * Home feed with the global specialty filter bar (docs/feed.md §1).
 * "All" loads the unified multi-specialty feed; tapping a chip fires an
 * instant background payload request scoped to creators with that specialty.
 * Content-type chips (Research / Case studies / Theses) ride the same bar.
 */

const FALLBACK_SPECIALTIES = ["Cardiology", "Dermatology", "Neurology", "Oncology", "Pediatrics", "Homeopathy", "Orthopedics", "Psychiatry", "Radiology"];
const TYPE_CHIPS = [
  { key: "research", label: "Research" },
  { key: "case_study", label: "Case studies" },
  { key: "thesis", label: "Theses" },
];
const PAGE = "limit=12";

export default function Feed() {
  const { user, demo } = useAuth();
  const nav = useNavigate();

  const [specialties, setSpecialties] = useState(FALLBACK_SPECIALTIES);
  const [filter, setFilter] = useState({ kind: "all", key: "all", label: "All" });
  const [posts, setPosts] = useState(null);
  const [refreshing, setRefreshing] = useState(false); // chip switch (keeps layout, dims list)
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinel = useRef(null);
  const reqSeq = useRef(0);

  /* dynamic specialty chips from backend meta */
  useEffect(() => {
    if (demo) return;
    dok.auth
      .meta()
      .then((d) => {
        const list = (d.specializations || d || []).map((s) => s?.name || s).filter(Boolean);
        if (list.length) setSpecialties(list);
      })
      .catch(() => {});
  }, [demo]);

  const buildQuery = useCallback((f, cur) => {
    const parts = [PAGE];
    if (f.kind === "specialty") parts.push(`specialty=${encodeURIComponent(f.key)}`);
    if (f.kind === "type") parts.push(`type=${f.key}`);
    if (cur) parts.push(`cursor=${encodeURIComponent(cur)}`);
    return `?${parts.join("&")}`;
  }, []);

  /* feed loads — instant background request on every chip change */
  useEffect(() => {
    const seq = ++reqSeq.current;
    if (posts === null) {
      // first paint → skeleton
    } else {
      setRefreshing(true); // chip switch → keep the layout, dim the list
    }
    dok.feed
      .home(buildQuery(filter, null))
      .then((d) => {
        if (seq !== reqSeq.current) return; // a newer chip tap superseded this payload
        setPosts(d.feed || d.posts || []);
        setHasMore(Boolean(d.hasMore));
        setCursor(d.nextCursor || null);
      })
      .catch(() => {
        if (seq !== reqSeq.current) return;
        setPosts((p) => p ?? []);
        setHasMore(false);
      })
      .finally(() => seq === reqSeq.current && setRefreshing(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, demo]);

  /* cursor-paginated infinite scroll */
  useEffect(() => {
    if (!hasMore || !sentinel.current || demo) return;
    const io = new IntersectionObserver(async ([e]) => {
      if (!e.isIntersecting || loadingMore) return;
      setLoadingMore(true);
      const seq = reqSeq.current;
      try {
        const d = await dok.feed.home(buildQuery(filter, cursor));
        if (seq !== reqSeq.current) return;
        setPosts((p) => [...(p || []), ...(d.feed || d.posts || [])]);
        setHasMore(Boolean(d.hasMore));
        setCursor(d.nextCursor || null);
      } catch {
        setHasMore(false);
      } finally {
        setLoadingMore(false);
      }
    }, { rootMargin: "600px" });
    io.observe(sentinel.current);
    return () => io.disconnect();
  }, [hasMore, cursor, loadingMore, filter, demo, buildQuery]);

  const removePost = (id) => setPosts((p) => (p || []).filter((x) => (x._id || x.id) !== id));

  return (
    <div className="flex gap-6">
      <div className="mx-auto w-full max-w-xl space-y-5 pb-24">
        {/* Composer */}
        <div className="card flex items-center gap-3 p-4">
          <Avatar user={user} size={42} />
          <button onClick={() => nav("/app/create")} className="flex-1 rounded-full bg-ink-900/[.04] px-4 py-3 text-left text-sm text-ink-400 transition hover:bg-ink-900/[.07]">
            Share a case, paper or update…
          </button>
        </div>
        <div className="card flex items-center justify-around p-1.5">
          {[[PenLine, "Post"], [Stethoscope, "Case"], [FileText, "Research"], [Clapperboard, "Pulse"]].map(([Icon, label]) => (
            <button key={label} onClick={() => nav("/app/create")} className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium text-ink-600 transition hover:bg-brand-50 hover:text-brand-700">
              <Icon size={18} /> <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {/* Global specialty filter bar */}
        <FilterBar specialties={specialties} active={filter} onPick={setFilter} />

        {/* Posts */}
        {posts === null ? (
          <FeedSkeleton />
        ) : posts.length === 0 ? (
          <Empty filter={filter} onReset={() => setFilter({ kind: "all", key: "all", label: "All" })} />
        ) : (
          <div className={cn("space-y-5 transition-opacity duration-200", refreshing && "pointer-events-none opacity-50")}>
            {posts.map((p) => (
              <PostCard key={p._id || p.id} post={p} demo={demo} onRemoved={removePost} />
            ))}
            {hasMore && (
              <div ref={sentinel} className="grid place-items-center py-6">
                {loadingMore && <Loader2 size={22} className="animate-spin text-brand-600" />}
              </div>
            )}
          </div>
        )}
      </div>
      <RightRail />
    </div>
  );
}

/* ---------------- filter bar: sticky, scrollable, edge-faded ---------------- */

function FilterBar({ specialties, active, onPick }) {
  const scroller = useRef(null);
  const [canL, setCanL] = useState(false);
  const [canR, setCanR] = useState(false);

  const updateArrows = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    setCanL(el.scrollLeft > 8);
    setCanR(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  }, []);

  useEffect(() => {
    updateArrows();
    const el = scroller.current;
    el?.addEventListener("scroll", updateArrows, { passive: true });
    window.addEventListener("resize", updateArrows);
    return () => { el?.removeEventListener("scroll", updateArrows); window.removeEventListener("resize", updateArrows); };
  }, [updateArrows, specialties]);

  const nudge = (dir) => scroller.current?.scrollBy({ left: dir * 260, behavior: "smooth" });

  const chips = [
    { kind: "all", key: "all", label: "All" },
    ...specialties.map((s) => ({ kind: "specialty", key: s, label: s })),
    ...TYPE_CHIPS.map((t) => ({ kind: "type", key: t.key, label: t.label })),
  ];

  return (
    <div className="glass sticky top-16 z-30 -mx-1 rounded-2xl px-1 py-2">
      <div className="relative">
        {canL && (
          <button onClick={() => nudge(-1)} aria-label="Scroll filters left" className="absolute -left-1 top-1/2 z-10 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full border border-ink-900/[.06] bg-white text-ink-600 shadow-2 transition hover:text-brand-700">
            <ChevronLeft size={16} />
          </button>
        )}
        <div
          ref={scroller}
          role="tablist"
          aria-label="Filter feed by specialty"
          className="no-scrollbar flex gap-2 overflow-x-auto scroll-smooth px-1"
          style={{
            maskImage: "linear-gradient(90deg, transparent 0, #000 16px, #000 calc(100% - 16px), transparent 100%)",
            WebkitMaskImage: "linear-gradient(90deg, transparent 0, #000 16px, #000 calc(100% - 16px), transparent 100%)",
          }}
        >
          {chips.map((c, i) => {
            const isActive = active.kind === c.kind && active.key === c.key;
            const isTypeBoundary = c.kind === "type" && chips[i - 1]?.kind !== "type";
            return (
              <span key={`${c.kind}-${c.key}`} className="flex items-center gap-2">
                {isTypeBoundary && <span className="h-5 w-px shrink-0 bg-ink-900/10" aria-hidden />}
                <button
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => onPick(c)}
                  className={cn(
                    "press whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200",
                    isActive
                      ? "scale-[1.03] bg-brand-600 text-white shadow-glow"
                      : "bg-white text-ink-600 ring-1 ring-ink-900/[.06] hover:bg-brand-50 hover:text-brand-700"
                  )}
                >
                  {c.label}
                </button>
              </span>
            );
          })}
        </div>
        {canR && (
          <button onClick={() => nudge(1)} aria-label="Scroll filters right" className="absolute -right-1 top-1/2 z-10 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full border border-ink-900/[.06] bg-white text-ink-600 shadow-2 transition hover:text-brand-700">
            <ChevronRight size={16} />
          </button>
        )}
      </div>
    </div>
  );
}

function FeedSkeleton() {
  return (
    <div className="space-y-5">
      {[0, 1, 2].map((i) => (
        <div key={i} className="card space-y-3 p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-11 w-11 rounded-full" />
            <div className="flex-1 space-y-2"><Skeleton className="h-3.5 w-40" /><Skeleton className="h-3 w-24" /></div>
          </div>
          <Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-3/4" /><Skeleton className="h-52 w-full rounded-2xl" />
        </div>
      ))}
    </div>
  );
}

function Empty({ filter, onReset }) {
  return (
    <div className="card grid place-items-center gap-3 py-16 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-full bg-brand-50 text-brand-600"><Sparkles size={24} /></span>
      <p className="text-lg font-semibold text-ink-900">
        {filter.kind === "all" ? "Nothing here yet" : `No ${filter.label} posts yet`}
      </p>
      <p className="max-w-xs text-sm text-ink-500">
        {filter.kind === "all"
          ? "Follow clinicians to fill your feed with cases, research and updates."
          : "Be the first to publish here, or check another specialty."}
      </p>
      {filter.kind !== "all" && (
        <button onClick={onReset} className="btn-ghost px-5 py-2 text-sm">Back to All</button>
      )}
    </div>
  );
}

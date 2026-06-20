"use client";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "@/lib/router";
import { FileText, Stethoscope, Clapperboard, PenLine, Loader2, Sparkles, RefreshCw, Search as SearchIcon } from "lucide-react";
import PostCard from "@/components/PostCard";
import RightRail from "@/components/layout/RightRail";
import { Avatar, Skeleton } from "@/components/ui/Primitives";
import { useAuth } from "@/context/AuthContext";
import { dok } from "@/lib/api";
import { cn, roleLabel } from "@/lib/utils";
import { usePullToRefresh, useAutoRefresh } from "@/hooks/usePullToRefresh";
import PullToRefreshIndicator from "@/components/ui/PullToRefreshIndicator";

/**
 * Home feed (docs/feed.md §1) — loads the unified multi-specialty feed.
 */

const PAGE = "limit=12";

export default function Feed() {
  const { user, demo } = useAuth();
  const nav = useNavigate();

  const [filter, setFilter] = useState({ kind: "all", key: "all", label: "All" });
  const [posts, setPosts] = useState(null);
  const [refreshing, setRefreshing] = useState(false); // chip switch (keeps layout, dims list)
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0); // bumped to re-pull the feed from page 1
  const sentinel = useRef(null);
  const reqSeq = useRef(0);

  const pendingRefresh = useRef(null);
  const refresh = useCallback(() => {
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
    return new Promise((resolve) => {
      pendingRefresh.current?.(); // settle any prior awaiter
      pendingRefresh.current = resolve;
      setRefreshKey((k) => k + 1);
    });
  }, []);

  // Pull-to-refresh (mobile) + auto-refresh when returning to the tab.
  const { pull, refreshing: pulling } = usePullToRefresh(refresh);
  useAutoRefresh(refresh);

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
      .finally(() => {
        if (seq === reqSeq.current) setRefreshing(false);
        if (pendingRefresh.current) { pendingRefresh.current(); pendingRefresh.current = null; }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, demo, refreshKey]);

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
      <PullToRefreshIndicator pull={pull} refreshing={pulling} />
      <div className="mx-auto w-full max-w-xl space-y-5 pb-24">
        {/* mobile search entry — the top-bar search is desktop-only */}
        <button onClick={() => nav("/app/search")} className="press flex w-full items-center gap-2 rounded-full border border-ink-900/10 bg-white px-4 py-3 text-sm text-ink-400 transition hover:border-brand-300 sm:hidden">
          <SearchIcon size={18} /> Search people, papers, #tags…
        </button>
        {/* Health-professional stats strip (app parity, mobile only) */}
        {user?.role === "doctor" && <DoctorStatsStrip />}

        {/* Composer */}
        <div className="card flex items-center gap-3 p-4">
          <Avatar user={user} size={42} />
          <button onClick={() => nav("/app/create")} className="flex-1 rounded-full bg-ink-900/[.04] px-4 py-3 text-left text-sm text-ink-400 transition hover:bg-ink-900/[.07]">
            Share a case, paper or update…
          </button>
          <button onClick={refresh} disabled={refreshing} aria-label="Refresh feed" title="Refresh feed" className="press grid h-10 w-10 shrink-0 place-items-center rounded-full text-ink-500 transition hover:bg-brand-50 hover:text-brand-700 disabled:opacity-50">
            <RefreshCw size={18} className={cn(refreshing && "animate-spin")} />
          </button>
        </div>
        <div className="card flex items-center justify-around p-1.5">
          {[[PenLine, "Post"], [Stethoscope, "Case"], [FileText, "Research"], [Clapperboard, "Pulse"]].map(([Icon, label]) => (
            <button key={label} onClick={() => nav("/app/create")} className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium text-ink-600 transition hover:bg-brand-50 hover:text-brand-700">
              <Icon size={18} /> <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {/* Posts */}
        {posts === null ? (
          <FeedSkeleton />
        ) : posts.length === 0 ? (
          <Empty filter={filter} onReset={() => setFilter({ kind: "all", key: "all", label: "All" })} />
        ) : (
          <div className={cn("space-y-5 transition-opacity duration-200", refreshing && "pointer-events-none opacity-50")}>
            {posts.map((p, i) => (
              <Fragment key={p._id || p.id}>
                <PostCard post={p} demo={demo} onRemoved={removePost} />
                {i === 1 && <PeopleYouMayKnow />}
              </Fragment>
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

/* ---------------- doctor stats strip (app parity, mobile only) ----------------
   "Unread" is live (notifications). Priority / Paid Priority have no backend yet,
   so they show a neutral placeholder — never a fake number (see CLAUDE.md). */

function DoctorStatsStrip() {
  const nav = useNavigate();
  const [unread, setUnread] = useState(null);
  const [soon, setSoon] = useState(false);

  useEffect(() => {
    dok.notifications
      .unread()
      .then((d) => setUnread(typeof d === "number" ? d : d?.count ?? d?.unread ?? 0))
      .catch(() => setUnread(null));
  }, []);

  const cards = [
    { key: "unread", label: "Unread", value: unread ?? "—", tint: "brand", onClick: () => nav("/app/notifications") },
    { key: "priority", label: "Priority", value: "—", tint: "ink", onClick: () => setSoon(true) },
    { key: "paid", label: "Paid Priority", value: "—", tint: "rose", onClick: () => setSoon(true) },
  ];

  return (
    <div>
      <div className="grid grid-cols-3 gap-3">
        {cards.map((c) => (
          <button
            key={c.key}
            onClick={c.onClick}
            className={cn(
              "card press flex flex-col items-start gap-1 p-3 text-left",
              c.tint === "rose" && "bg-rose-50 ring-1 ring-rose-100"
            )}
          >
            <span
              className={cn(
                "font-display text-2xl font-extrabold leading-none",
                c.tint === "rose" ? "text-rose-600" : c.tint === "brand" ? "text-brand-700" : "text-ink-900"
              )}
            >
              {c.value}
            </span>
            <span className="text-xs font-medium text-ink-500">{c.label}</span>
          </button>
        ))}
      </div>
      {soon && (
        <p className="mt-2 px-1 text-xs text-ink-400">Priority &amp; paid queues arrive with consultations.</p>
      )}
    </div>
  );
}

/* ---------------- people you may know (app parity, mobile only) ---------------- */

function PeopleYouMayKnow() {
  const nav = useNavigate();
  const { demo } = useAuth();
  const [people, setPeople] = useState(null);

  useEffect(() => {
    dok.follows
      .suggestions()
      .then((d) => setPeople(d.suggestions || []))
      .catch(() => setPeople([]));
  }, []);

  if (!people || people.length === 0) return null;

  return (
    <div className="card p-4 lg:hidden">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold text-ink-900">People you may know</h3>
        <button onClick={() => nav("/app/network")} className="text-xs font-semibold text-brand-700">See all</button>
      </div>
      <div className="no-scrollbar -mx-1 flex gap-3 overflow-x-auto px-1">
        {people.map((u) => (
          <SuggestionCard key={u._id || u.id} user={u} demo={demo} />
        ))}
      </div>
    </div>
  );
}

function SuggestionCard({ user, demo }) {
  const [done, setDone] = useState(false);
  const connect = async () => {
    setDone(true);
    if (!demo) {
      try { await dok.network.request(user._id || user.id); } catch {}
    }
  };
  return (
    <div className="w-36 shrink-0 rounded-2xl border border-ink-900/[.06] p-3 text-center">
      <Avatar user={user} size={56} className="mx-auto" />
      <p className="mt-2 truncate text-sm font-semibold text-ink-900">{user.fullName}</p>
      <p className="truncate text-xs text-ink-500">{user.professionalHeadline || roleLabel(user.role)}</p>
      <button
        onClick={connect}
        disabled={done}
        className={cn("mt-2 w-full rounded-full py-1.5 text-xs font-semibold transition", done ? "btn-outline" : "bg-brand-600 text-white hover:bg-brand-700")}
      >
        {done ? "Requested" : "+ Connect"}
      </button>
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

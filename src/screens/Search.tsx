"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "@/lib/router";
import { Search as SearchIcon, TrendingUp, SlidersHorizontal, X, Hash, Loader2, Clock, Users, Flame } from "lucide-react";
import { Avatar, Verified, Skeleton } from "@/components/ui/Primitives";
import PostCard from "@/components/PostCard";
import FollowButton from "@/components/ui/FollowButton";
import SearchFilters, { EMPTY_PROFILE, EMPTY_POST } from "@/components/search/SearchFilters";
import { useAuth } from "@/context/AuthContext";
import { dok } from "@/lib/api";
import { cn, compact, roleLabel } from "@/lib/utils";

const TABS = ["People", "Posts"];
const RECENT_KEY = "dl_recent_search";
const rid = (x) => x?._id || x?.id;
const tagOf = (t) => String((typeof t === "string" ? t : t?.tag) || "").replace(/^#+/, ""); // backend tags carry a leading '#'

const buildQs = (f) =>
  Object.entries(f).filter(([, v]) => v).map(([k, v]) => `&${k}=${encodeURIComponent(v)}`).join("");
const countActive = (f) => Object.values(f).filter(Boolean).length;

const readLocal = () => { try { return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"); } catch { return []; } };
const writeLocal = (arr) => { try { localStorage.setItem(RECENT_KEY, JSON.stringify(arr.slice(0, 12))); } catch { /* private mode */ } };

export default function Search() {
  const { demo } = useAuth();
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const q = params.get("q") || "";

  const [input, setInput] = useState(q);
  const [focused, setFocused] = useState(false);
  const [suggest, setSuggest] = useState(null); // { users, hashtags } | null
  const [tab, setTab] = useState("People");

  const [people, setPeople] = useState(null);
  const [posts, setPosts] = useState(null);
  const [recovery, setRecovery] = useState(null); // backup suggestions when the API gives no fallback
  const [fallback, setFallback] = useState(null); // { message, users } from the /users response (PRD §5A)

  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [post, setPost] = useState(EMPTY_POST);
  const [drawer, setDrawer] = useState(false);

  const [trending, setTrending] = useState(null);
  const [recent, setRecent] = useState([]); // [{ id, label }]
  const [popular, setPopular] = useState([]);
  const debounce = useRef(null);

  const profileQs = useMemo(() => buildQs(profile), [profile]);
  const postQs = useMemo(() => buildQs(post), [post]);
  const activeFilters = tab === "People" ? countActive(profile) : countActive(post);

  // recent searches: server history (logged-in) with a localStorage fallback; + popular terms
  useEffect(() => {
    dok.search.history()
      .then((d) => {
        const items = (d.items || []).map((it) => ({ id: it.id || it._id, label: it.queryRaw || it.query })).filter((x) => x.label);
        setRecent(items.length ? items : readLocal().map((s) => ({ id: null, label: s })));
      })
      .catch(() => setRecent(readLocal().map((s) => ({ id: null, label: s }))));
    dok.search.popular().then((d) => setPopular(d.terms || [])).catch(() => setPopular([]));
  }, []);

  /* trending hashtags (PRD §4) — falls back to the posts trending endpoint */
  useEffect(() => {
    (dok.search.trending?.() || Promise.reject())
      .catch(() => dok.posts.trendingTags?.() || Promise.resolve([]))
      .then((d) => setTrending(d.hashtags || d.tags || d.trending || (Array.isArray(d) ? d : [])))
      .catch(() => setTrending([]));
  }, []);

  /* keep the box in sync if q arrives via the URL (e.g. from the top bar) */
  useEffect(() => { setInput(q); }, [q]);

  /* predictive typeahead: ≥3 chars hits the API (200ms debounce); else show recents (PRD §1) */
  useEffect(() => {
    clearTimeout(debounce.current);
    const t = input.trim().replace(/^#/, "");
    if (t.length < 3) { setSuggest(null); return; }
    debounce.current = setTimeout(() => {
      dok.search.suggest(t)
        .then((d) => setSuggest({ users: d.users || [], hashtags: d.hashtags || [] }))
        .catch(() => setSuggest({ users: [], hashtags: [] }));
    }, 200);
    return () => clearTimeout(debounce.current);
  }, [input]);

  /* committed search → fetch the active tab with applied filters */
  useEffect(() => {
    if (!q) { setPeople(null); setPosts(null); setRecovery(null); setFallback(null); return; }
    let alive = true;
    setRecovery(null); setFallback(null);
    if (tab === "People") {
      setPeople(null);
      dok.search.users(q.replace(/^#/, ""), profileQs)
        .then((d) => { if (!alive) return; setPeople(d.users || d.results || []); setFallback(d.fallback || null); })
        .catch(() => alive && setPeople([]));
    } else {
      setPosts(null);
      dok.search.posts(q.replace(/^#/, ""), postQs)
        .then((d) => alive && setPosts(d.posts || d.results || []))
        .catch(() => alive && setPosts([]));
    }
    return () => { alive = false; };
  }, [q, tab, profileQs, postQs]);

  /* zero-result recovery (PRD §5A): the API returns a `fallback` block; this is only a backup */
  useEffect(() => {
    if (tab === "People" && q && people && people.length === 0 && !(fallback?.users?.length) && recovery === null) {
      dok.follows.suggestions()
        .then((d) => setRecovery(d.suggestions || d.users || []))
        .catch(() => setRecovery([]));
    }
  }, [tab, q, people, fallback, recovery]);

  // explicit recording (committed search / result tap) — never on typeahead (per backend spec)
  const record = (payload) => { if (!demo) dok.search.recordSearch(payload).catch(() => {}); };
  const pushRecent = (text) => {
    setRecent((rs) => [{ id: null, label: text }, ...rs.filter((r) => r.label.toLowerCase() !== text.toLowerCase())].slice(0, 12));
    writeLocal([text, ...readLocal().filter((s) => s.toLowerCase() !== text.toLowerCase())]);
  };

  // Record + cache EVERY committed query (q in the URL) — covers the top-bar search,
  // the mobile entry, and in-screen submit alike. Backend dedupes; localStorage is the fallback.
  useEffect(() => {
    if (!q) return;
    pushRecent(q);
    record({ q, type: "all" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const runSearch = (raw) => {
    const text = (raw ?? input).trim();
    if (!text) return;
    if (text.startsWith("#")) { openTag(text.slice(1)); return; }
    setParams({ q: text });
    setFocused(false);
    setSuggest(null);
  };

  const openTag = (tag) => {
    setFocused(false);
    record({ q: `#${tag}`, type: "hashtag", entityId: tag, entityType: "hashtag" });
    nav(`/app/tag/${encodeURIComponent(tag)}`);
  };
  const openProfile = (u) => {
    setFocused(false);
    const term = (q || input).trim();
    record({ q: term || u.fullName || "", type: "users", entityId: rid(u), entityType: "user" });
    nav(`/app/profile/${rid(u)}`);
  };
  const clearRecent = () => { setRecent([]); writeLocal([]); if (!demo) dok.search.clearHistory().catch(() => {}); };
  const deleteRecent = (item) => {
    setRecent((rs) => rs.filter((r) => r !== item));
    writeLocal(readLocal().filter((s) => s.toLowerCase() !== item.label.toLowerCase()));
    if (item.id && !demo) dok.search.deleteHistory(item.id).catch(() => {});
  };

  const showTypeahead = focused && (suggest || (input.trim().length < 3 && recent.length > 0));

  return (
    <div className="mx-auto max-w-2xl pb-24">
      {/* search box + typeahead */}
      <div className="relative">
        <form onSubmit={(e) => { e.preventDefault(); runSearch(); }} className="relative">
          <SearchIcon size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 150)}
            placeholder="Search people, specialties, papers, #tags…"
            className="w-full rounded-full border border-ink-900/10 py-3.5 pl-12 pr-11 text-sm outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
          />
          {input && (
            <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { setInput(""); setSuggest(null); }} aria-label="Clear" className="press absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-ink-400 hover:bg-ink-900/5">
              <X size={16} />
            </button>
          )}
        </form>

        {showTypeahead && (
          <div className="anim-pop absolute inset-x-0 top-full z-30 mt-2 max-h-[60vh] overflow-y-auto rounded-2xl border border-ink-900/[.08] bg-surface shadow-card">
            {input.trim().length < 3 ? (
              <RecentList recent={recent} onPick={runSearch} onDelete={deleteRecent} onClear={clearRecent} />
            ) : suggest === null ? (
              <div className="grid place-items-center py-6"><Loader2 size={18} className="animate-spin text-ink-400" /></div>
            ) : (suggest.users.length === 0 && suggest.hashtags.length === 0) ? (
              <p className="px-4 py-5 text-center text-sm text-ink-400">No quick matches — press Enter to search.</p>
            ) : (
              <>
                {suggest.users.length > 0 && (
                  <div className="py-1">
                    <SuggestLabel>People</SuggestLabel>
                    {suggest.users.map((u) => (
                      <button key={rid(u)} onMouseDown={(e) => e.preventDefault()} onClick={() => openProfile(u)} className="flex w-full items-center gap-3 px-3 py-2 text-left transition hover:bg-brand-50">
                        <Avatar user={u} size={36} />
                        <span className="min-w-0">
                          <span className="flex items-center gap-1 truncate text-sm font-semibold text-ink-900">{u.fullName} {u.isVerified && <Verified size={12} />}</span>
                          <span className="block truncate text-xs text-ink-500">{u.uniqueUsername ? `@${u.uniqueUsername}` : (u.professionalHeadline || roleLabel(u.role))}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                {suggest.hashtags.length > 0 && (
                  <div className="border-t border-ink-900/[.05] py-1">
                    <SuggestLabel>Hashtags</SuggestLabel>
                    {suggest.hashtags.map((t) => {
                      const tag = tagOf(t);
                      return (
                        <button key={tag} onMouseDown={(e) => e.preventDefault()} onClick={() => openTag(tag)} className="flex w-full items-center gap-3 px-3 py-2 text-left transition hover:bg-brand-50">
                          <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-50 text-brand-600"><Hash size={16} /></span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-brand-700">#{tag}</span>
                            <span className="block text-xs text-ink-400">{compact(t.count ?? t.score ?? 0)} posts</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* ---------------- no query: trending + recents ---------------- */}
      {!q ? (
        <div className="mt-6 space-y-6">
          <section>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-ink-700"><TrendingUp size={16} className="text-brand-600" /> Trending in medicine</h3>
            {trending === null ? (
              <div className="card divide-y divide-ink-900/[.05]">{[0, 1, 2, 3].map((i) => <div key={i} className="px-4 py-3.5"><Skeleton className="h-4 w-32" /></div>)}</div>
            ) : trending.length === 0 ? (
              <p className="card px-4 py-6 text-center text-sm text-ink-400">No trending hashtags yet.</p>
            ) : (
              <div className="card divide-y divide-ink-900/[.05]">
                {trending.map((t, i) => {
                  const tag = tagOf(t);
                  return (
                    <button key={tag} onClick={() => openTag(tag)} className="flex w-full items-center justify-between px-4 py-3 text-left transition hover:bg-ink-900/[.03]">
                      <div><p className="text-sm font-bold text-brand-700">#{tag}</p><p className="text-xs text-ink-400">{compact(t.count ?? t.score ?? 0)} discussions</p></div>
                      <span className="text-xs font-bold text-ink-300">{i + 1}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
          {popular.length > 0 && (
            <section>
              <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-ink-700"><Flame size={16} className="text-brand-600" /> Popular searches</h3>
              <div className="flex flex-wrap gap-2">
                {popular.map((t) => (
                  <button key={t.query} onClick={() => runSearch(t.query)} className="press rounded-full bg-brand-50 px-3.5 py-1.5 text-sm font-medium text-brand-700 hover:bg-brand-100">{t.query}</button>
                ))}
              </div>
            </section>
          )}
          {recent.length > 0 && (
            <section>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-bold text-ink-700"><Clock size={16} className="text-ink-400" /> Recent</h3>
                <button onClick={clearRecent} className="text-xs font-semibold text-ink-400 hover:text-danger-500">Clear</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {recent.map((r) => (
                  <button key={r.id || r.label} onClick={() => runSearch(r.label)} className="press rounded-full bg-surface px-3.5 py-1.5 text-sm text-ink-600 ring-1 ring-ink-900/[.08] hover:bg-brand-50 hover:text-brand-700">{r.label}</button>
                ))}
              </div>
            </section>
          )}
        </div>
      ) : (
        /* ---------------- results ---------------- */
        <>
          <div className="mt-5 flex items-center gap-2 border-b border-ink-900/[.06]">
            {TABS.map((t) => (
              <button key={t} onClick={() => setTab(t)} className={cn("relative px-3 py-3 text-sm font-semibold transition", tab === t ? "text-brand-700" : "text-ink-400 hover:text-ink-700")}>
                {t}{tab === t && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand-600" />}
              </button>
            ))}
            <button onClick={() => setDrawer(true)} className={cn("press ml-auto flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition", activeFilters ? "bg-brand-600 text-white ring-brand-600" : "text-ink-600 ring-ink-900/[.1] hover:bg-brand-50")}>
              <SlidersHorizontal size={14} /> Filters{activeFilters ? ` · ${activeFilters}` : ""}
            </button>
          </div>

          <div className="mt-5">
            {tab === "People" ? (
              people === null ? <PeopleSkeleton /> :
              people.length === 0 ? <Recovery message={fallback?.message} list={fallback?.users?.length ? fallback.users : recovery} demo={demo} onOpen={openProfile} /> :
              <div className="card divide-y divide-ink-900/[.05]">
                {people.map((u) => (
                  <div key={rid(u)} className="flex items-center gap-3 p-4">
                    <button onClick={() => openProfile(u)} className="press shrink-0"><Avatar user={u} size={46} /></button>
                    <button onClick={() => openProfile(u)} className="min-w-0 flex-1 text-left">
                      <p className="flex items-center gap-1 truncate font-semibold text-ink-900">{u.fullName} {u.isVerified && <Verified size={13} />}</p>
                      <p className="truncate text-xs text-ink-500">{u.professionalHeadline || u.specialization || roleLabel(u.role)}</p>
                    </button>
                    <FollowButton user={u} demo={demo} simple />
                  </div>
                ))}
              </div>
            ) : (
              posts === null ? <PostsSkeleton /> :
              posts.length === 0 ? <NoResults /> :
              <div className="space-y-5">{posts.map((p) => <PostCard key={rid(p)} post={p} demo={demo} />)}</div>
            )}
          </div>
        </>
      )}

      <SearchFilters
        open={drawer}
        onClose={() => setDrawer(false)}
        tab={tab}
        profile={profile}
        post={post}
        onApply={(patch) => { if (patch.profile) setProfile(patch.profile); if (patch.post) setPost(patch.post); }}
        onClear={() => { setProfile(EMPTY_PROFILE); setPost(EMPTY_POST); }}
      />
    </div>
  );
}

function SuggestLabel({ children }) {
  return <p className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wide text-ink-400">{children}</p>;
}

function RecentList({ recent, onPick, onDelete, onClear }) {
  return (
    <div className="py-1">
      <div className="flex items-center justify-between px-3 pb-1 pt-2">
        <p className="text-[11px] font-bold uppercase tracking-wide text-ink-400">Recent</p>
        <button onMouseDown={(e) => e.preventDefault()} onClick={onClear} className="text-[11px] font-semibold text-ink-400 hover:text-danger-500">Clear</button>
      </div>
      {recent.map((r) => (
        <div key={r.id || r.label} className="flex items-center gap-3 px-3 py-2 transition hover:bg-ink-900/[.03]">
          <button onMouseDown={(e) => e.preventDefault()} onClick={() => onPick(r.label)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
            <Clock size={16} className="shrink-0 text-ink-400" /> <span className="truncate text-sm text-ink-700">{r.label}</span>
          </button>
          <button onMouseDown={(e) => e.preventDefault()} onClick={() => onDelete(r)} aria-label="Remove from history" className="press rounded-full p-1 text-ink-300 hover:text-danger-500"><X size={14} /></button>
        </div>
      ))}
    </div>
  );
}

/* zero-result recovery (PRD §5A) */
function NoResults() {
  return (
    <div className="card grid place-items-center gap-2 py-16 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-full bg-brand-50 text-brand-600"><SearchIcon size={22} /></span>
      <p className="text-lg font-semibold text-ink-900">No posts found</p>
      <p className="max-w-xs text-sm text-ink-500">Try a different term or adjust your filters.</p>
    </div>
  );
}

function Recovery({ message, list, demo, onOpen }) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-brand-50 px-4 py-3 text-sm text-brand-800">
        {message || "No exact matches found. Here are some professionals you may know:"}
      </div>
      {list === null ? (
        <PeopleSkeleton />
      ) : list.length === 0 ? (
        <div className="card grid place-items-center gap-2 py-12 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-brand-50 text-brand-600"><Users size={22} /></span>
          <p className="text-sm text-ink-500">Nothing to show yet.</p>
        </div>
      ) : (
        <div className="card divide-y divide-ink-900/[.05]">
          {list.map((u) => (
            <div key={rid(u)} className="flex items-center gap-3 p-4">
              <button onClick={() => onOpen(u)} className="press shrink-0"><Avatar user={u} size={46} /></button>
              <button onClick={() => onOpen(u)} className="min-w-0 flex-1 text-left">
                <p className="flex items-center gap-1 truncate font-semibold text-ink-900">{u.fullName} {u.isVerified && <Verified size={13} />}</p>
                <p className="truncate text-xs text-ink-500">{u.professionalHeadline || roleLabel(u.role)}</p>
              </button>
              <FollowButton user={u} demo={demo} simple />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PeopleSkeleton() {
  return (
    <div className="card divide-y divide-ink-900/[.05]">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3 p-4">
          <Skeleton className="h-11 w-11 rounded-full" />
          <div className="flex-1 space-y-2"><Skeleton className="h-3.5 w-40" /><Skeleton className="h-3 w-24" /></div>
          <Skeleton className="h-8 w-20 rounded-full" />
        </div>
      ))}
    </div>
  );
}
function PostsSkeleton() {
  return (
    <div className="space-y-5">
      {[0, 1].map((i) => (
        <div key={i} className="card space-y-3 p-4">
          <div className="flex items-center gap-3"><Skeleton className="h-11 w-11 rounded-full" /><div className="flex-1 space-y-2"><Skeleton className="h-3.5 w-40" /><Skeleton className="h-3 w-24" /></div></div>
          <Skeleton className="h-4 w-full" /><Skeleton className="h-40 w-full rounded-2xl" />
        </div>
      ))}
    </div>
  );
}

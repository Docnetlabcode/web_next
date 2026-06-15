"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "@/lib/router";
import { Search as SearchIcon, TrendingUp } from "lucide-react";
import { Avatar, Verified } from "@/components/ui/Primitives";
import PostCard from "@/components/PostCard";
import { useAuth } from "@/context/AuthContext";
import { dok } from "@/lib/api";
import { cn, compact, roleLabel } from "@/lib/utils";

const TABS = ["Top", "People", "Posts", "Hashtags"];
export default function Search() {
  const { demo } = useAuth();
  const [params, setParams] = useSearchParams();
  const q = params.get("q") || "";
  const [tab, setTab] = useState("Top");
  const [res, setRes] = useState(null);
  const [trending, setTrending] = useState([]);

  useEffect(() => {
    dok.posts.trendingTags().then((d) => setTrending(d.hashtags || d.tags || d || [])).catch(() => setTrending([]));
  }, []);

  useEffect(() => {
    if (!q) { setRes(null); return; }
    dok.search.all(q).then(setRes).catch(() => setRes({ users: [], posts: [], hashtags: [] }));
  }, [q]);

  return (
    <div className="mx-auto max-w-2xl pb-24">
      <form onSubmit={(e) => { e.preventDefault(); setParams({ q: e.target.q.value }); }} className="relative">
        <SearchIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-400" />
        <input name="q" defaultValue={q} placeholder="Search people, specialties, papers…" className="w-full rounded-full border border-ink-900/10 py-3.5 pl-12 pr-4 text-sm outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100" />
      </form>

      {!q ? (
        <div className="mt-6">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-ink-700"><TrendingUp size={16} className="text-brand-600" /> Trending in medicine</h3>
          {trending.length === 0 ? (
            <p className="card px-4 py-6 text-center text-sm text-ink-400">No trending hashtags yet.</p>
          ) : (
            <div className="card divide-y divide-ink-900/[.05]">
              {trending.map((t, i) => (
                <button key={t.tag} onClick={() => setParams({ q: "#" + t.tag })} className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-ink-900/[.03]">
                  <div><p className="text-sm font-bold text-brand-700">#{t.tag}</p><p className="text-xs text-ink-400">{compact(t.count ?? t.score ?? 0)} discussions</p></div>
                  <span className="text-xs font-bold text-ink-400">{i + 1}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="mt-5 flex gap-2 border-b border-ink-900/[.06]">
            {TABS.map((t) => (
              <button key={t} onClick={() => setTab(t)} className={cn("relative px-3 py-3 text-sm font-semibold", tab === t ? "text-brand-700" : "text-ink-400")}>{t}{tab === t && <span className="absolute inset-x-2 -bottom-px h-0.5 bg-brand-600" />}</button>
            ))}
          </div>
          <div className="mt-5 space-y-5">
            {(tab === "Top" || tab === "People") && (
              <div className="card divide-y divide-ink-900/[.05]">
                {(res?.users || []).map((u) => (
                  <div key={u._id} className="flex items-center gap-3 p-4">
                    <Avatar user={u} size={44} />
                    <div className="min-w-0 flex-1"><p className="flex items-center gap-1 truncate font-semibold">{u.fullName} {u.isVerified && <Verified size={13} />}</p><p className="truncate text-xs text-ink-500">{u.professionalHeadline || roleLabel(u.role)}</p></div>
                    <button className="btn-ghost px-4 py-1.5 text-xs">+ Connect</button>
                  </div>
                ))}
              </div>
            )}
            {(tab === "Top" || tab === "Posts") && (res?.posts || []).map((p) => <PostCard key={p._id} post={p} demo={demo} />)}
            {tab === "Hashtags" && (
              <div className="card divide-y divide-ink-900/[.05]">
                {(res?.hashtags || []).map((t) => <div key={t.tag} className="flex items-center justify-between p-4"><p className="font-bold text-brand-700">#{t.tag}</p><p className="text-xs text-ink-400">{compact(t.score || t.count)} posts</p></div>)}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

"use client";
import { useEffect, useState } from "react";
import { TrendingUp, Sparkles } from "lucide-react";
import { useNavigate } from "@/lib/router";
import UserCard from "@/components/UserCard";
import { dok } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { compact } from "@/lib/utils";

export default function RightRail() {
  const { demo } = useAuth();
  const nav = useNavigate();
  const [people, setPeople] = useState([]);
  const [tags, setTags] = useState([]);

  useEffect(() => {
    dok.follows.suggestions().then((d) => setPeople(d.suggestions || [])).catch(() => setPeople([]));
    dok.posts.trendingTags().then((d) => setTags(d.hashtags || [])).catch(() => setTags([]));
  }, []);

  return (
    <aside className="no-scrollbar sticky top-[5.5rem] hidden max-h-[calc(100vh-7rem)] w-80 shrink-0 space-y-5 overflow-y-auto overscroll-contain xl:block">
      <div className="card p-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-ink-900"><Sparkles size={16} className="text-brand-600" /> Suggested clinicians</h3>
        <div className="no-scrollbar max-h-[18rem] space-y-3.5 overflow-y-auto overscroll-contain pr-1">
          {people.length === 0
            ? <p className="text-xs text-ink-400">No suggestions yet.</p>
            : people.map((u) => <UserCard key={u._id || u.id} user={u} demo={demo} />)}
        </div>
      </div>

      <div className="card p-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-ink-900"><TrendingUp size={16} className="text-brand-600" /> Trending in medicine</h3>
        <div className="no-scrollbar max-h-[18rem] space-y-1 overflow-y-auto overscroll-contain">
          {tags.length === 0 && <p className="px-2 text-xs text-ink-400">No trending tags yet.</p>}
          {tags.map((t, i) => {
            const tag = String(t.tag ?? "").replace(/^#+/, ""); // backend stores hashtags as "#tag" — show a single #
            return (
              <button
                key={tag || i}
                type="button"
                onClick={() => nav(`/app/tag/${encodeURIComponent(tag)}`)}
                className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left transition hover:bg-ink-900/[.03]"
              >
                <div>
                  <p className="text-sm font-semibold text-brand-700">#{tag}</p>
                  <p className="text-xs text-ink-400">{compact(t.score || t.count || 0)} posts</p>
                </div>
                <span className="text-xs font-bold text-ink-400">{i + 1}</span>
              </button>
            );
          })}
        </div>
      </div>

      <p className="px-2 text-xs leading-relaxed text-ink-400">
        DokLynk · A trusted network for clinicians, students & patients. © 2026
      </p>
    </aside>
  );
}

"use client";
import { useEffect, useState } from "react";
import { TrendingUp, Sparkles } from "lucide-react";
import UserCard from "@/components/UserCard";
import { dok } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { compact } from "@/lib/utils";

export default function RightRail() {
  const { demo } = useAuth();
  const [people, setPeople] = useState([]);
  const [tags, setTags] = useState([]);

  useEffect(() => {
    dok.follows.suggestions().then((d) => setPeople(d.suggestions || [])).catch(() => setPeople([]));
    dok.posts.trendingTags().then((d) => setTags(d.hashtags || [])).catch(() => setTags([]));
  }, []);

  return (
    <aside className="sticky top-[5.5rem] hidden h-fit w-80 shrink-0 space-y-5 xl:block">
      <div className="card p-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-ink-900"><Sparkles size={16} className="text-brand-600" /> Suggested clinicians</h3>
        <div className="space-y-3.5">
          {people.length === 0
            ? <p className="text-xs text-ink-400">No suggestions yet.</p>
            : people.map((u) => <UserCard key={u._id || u.id} user={u} demo={demo} />)}
        </div>
      </div>

      <div className="card p-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-ink-900"><TrendingUp size={16} className="text-brand-600" /> Trending in medicine</h3>
        <div className="space-y-1">
          {tags.length === 0 && <p className="px-2 text-xs text-ink-400">No trending tags yet.</p>}
          {tags.map((t, i) => (
            <div key={t.tag} className="flex items-center justify-between rounded-lg px-2 py-2 hover:bg-ink-900/[.03]">
              <div>
                <p className="text-sm font-semibold text-brand-700">#{t.tag}</p>
                <p className="text-xs text-ink-400">{compact(t.score || t.count || 0)} posts</p>
              </div>
              <span className="text-xs font-bold text-ink-400">{i + 1}</span>
            </div>
          ))}
        </div>
      </div>

      <p className="px-2 text-xs leading-relaxed text-ink-400">
        DokLynk · A trusted network for clinicians, students & patients. © 2026
      </p>
    </aside>
  );
}

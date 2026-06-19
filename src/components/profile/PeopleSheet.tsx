"use client";
import { useEffect, useState } from "react";
import { useNavigate } from "@/lib/router";
import { Users, ChevronRight } from "lucide-react";
import { Modal } from "@/components/ui/Overlays";
import { Avatar, Verified, Skeleton } from "@/components/ui/Primitives";
import { dok } from "@/lib/api";
import { cn, compact, roleLabel } from "@/lib/utils";

const TABS = [
  { key: "followers", label: "Followers" },
  { key: "following", label: "Following" },
  { key: "connections", label: "Connections" },
];

/**
 * In-place relationship lists (followers / following / connections) shown over the
 * profile instead of navigating away. Each row opens that person's profile.
 * Data shapes mirror the Connections screen:
 *   followers   → GET /follows/:id/followers
 *   following   → GET /follows/:id/following
 *   connections → GET /network/connections (self only)
 */
export default function PeopleSheet({ open, onClose, userId, tab = "followers", counts = {} }) {
  const nav = useNavigate();
  const [active, setActive] = useState(tab);
  const [people, setPeople] = useState(null); // null = loading

  // Jump to the metric the user tapped each time the sheet opens.
  useEffect(() => { if (open) setActive(tab); }, [open, tab]);

  useEffect(() => {
    if (!open || !userId) return;
    let alive = true;
    setPeople(null);
    const load =
      active === "followers"
        ? dok.follows.followers(userId, "?limit=50").then((d) => d.followers || d.users || [])
        : active === "following"
        ? dok.follows.following(userId, "?limit=50").then((d) => d.following || d.users || [])
        : dok.network.connections("?limit=50").then((d) => (d.connections || d.users || []).map((c) => c.user || c));
    load.then((list) => alive && setPeople(list)).catch(() => alive && setPeople([]));
    return () => { alive = false; };
  }, [open, active, userId]);

  const go = (id) => { if (!id) return; onClose?.(); nav(`/app/profile/${id}`); };
  const list = people || [];

  return (
    <Modal open={open} onClose={onClose} title="Network" className="max-w-md">
      {/* tabs */}
      <div className="flex gap-1 border-b border-ink-900/[.06] px-3">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setActive(t.key)}
            className={cn("press relative px-3 py-3 text-sm font-semibold transition", active === t.key ? "text-brand-700" : "text-ink-400 hover:text-ink-700")}>
            {t.label}{counts[t.key] != null && <span className="ml-1.5 text-xs font-bold text-ink-400">{compact(counts[t.key])}</span>}
            {active === t.key && <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-brand-600 anim-pop" />}
          </button>
        ))}
      </div>

      {/* list */}
      <div className="max-h-[60vh] min-h-[8rem] overflow-y-auto p-3">
        {people === null ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 rounded-2xl p-2">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2"><Skeleton className="h-3.5 w-40" /><Skeleton className="h-3 w-24" /></div>
              </div>
            ))}
          </div>
        ) : list.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-brand-50 text-brand-600"><Users size={24} /></span>
            <p className="text-sm font-semibold text-ink-900">
              {active === "followers" ? "No followers yet" : active === "following" ? "Not following anyone yet" : "No connections yet"}
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {list.map((u) => {
              const id = u.id || u._id;
              return (
                <button key={id} onClick={() => go(id)}
                  className="press flex w-full items-center gap-3 rounded-2xl p-2 text-left transition hover:bg-ink-900/[.03]">
                  <Avatar user={u} size={48} />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1 truncate text-sm font-semibold text-ink-900">{u.fullName} {u.isVerified && <Verified size={13} />}</p>
                    <p className="truncate text-xs text-ink-500">{u.professionalHeadline || u.specialization || roleLabel(u.role)}</p>
                  </div>
                  <ChevronRight size={18} className="shrink-0 text-ink-300" />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}

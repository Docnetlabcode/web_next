"use client";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "@/lib/router";
import { ArrowLeft, Users } from "lucide-react";
import { Avatar, Verified, Skeleton } from "@/components/ui/Primitives";
import FollowButton from "@/components/ui/FollowButton";
import { useAuth } from "@/context/AuthContext";
import { dok } from "@/lib/api";
import { cn, compact, roleLabel } from "@/lib/utils";

const ALL_TABS = [
  { key: "followers", label: "Followers" },
  { key: "following", label: "Following" },
  { key: "connections", label: "Connections" },
];

/**
 * Relationship directories (docs/API.md follows + network):
 *   followers   → GET /follows/:id/followers   (any user)
 *   following   → GET /follows/:id/following    (any user)
 *   connections → GET /network/connections      (self only — no third-party endpoint)
 *
 * `?user=<id>` views another profile's lists (the Connections tab is hidden for
 * others since the backend has no endpoint for it). `?name=` titles the header,
 * `?tab=` selects the initial tab. Each row routes to that user's profile.
 */
export default function Connections() {
  const nav = useNavigate();
  const [sp] = useSearchParams(); // shim returns [URLSearchParams, setter]
  const { user, demo } = useAuth();
  const myId = user?._id || user?.id;

  const targetParam = sp?.get("user");
  const targetId = targetParam || myId;
  const isSelf = !targetParam || targetParam === myId;
  const targetName = sp?.get("name");

  const tabs = isSelf ? ALL_TABS : ALL_TABS.filter((t) => t.key !== "connections");
  const initial = sp?.get("tab");
  const [tab, setTab] = useState(tabs.some((t) => t.key === initial) ? initial : "followers");
  const [people, setPeople] = useState(null);

  useEffect(() => {
    if (!targetId) return;
    let alive = true;
    setPeople(null);
    const load =
      tab === "followers"
        ? dok.follows.followers(targetId, "?limit=50").then((d) => d.followers || d.users || [])
        : tab === "following"
        ? dok.follows.following(targetId, "?limit=50").then((d) => {
            const arr = d.following || d.users || [];
            // Only the SELF's following list is known to be followed-by-me.
            return isSelf ? arr.map((u) => ({ ...u, isFollowing: true })) : arr;
          })
        : dok.network.connections("?limit=50").then((d) => (d.connections || d.users || []).map((c) => ({ ...(c.user || c), isFollowing: true, connectionStatus: "connected" })));
    load.then((list) => alive && setPeople(list)).catch(() => alive && setPeople([]));
    return () => { alive = false; };
  }, [tab, targetId, isSelf]);

  const counts = isSelf
    ? { followers: user?.followersCount, following: user?.followingCount, connections: user?.connectionsCount }
    : {};
  const list = people || [];

  return (
    <div className="mx-auto max-w-2xl pb-24">
      <div className="mb-4 flex items-center gap-3">
        <button onClick={() => nav(-1)} aria-label="Back" className="press grid h-10 w-10 place-items-center rounded-full text-ink-700 transition hover:bg-ink-900/[.05]"><ArrowLeft size={20} /></button>
        <h1 className="truncate font-display text-2xl font-extrabold text-ink-900">{isSelf ? "Network" : targetName || "Network"}</h1>
      </div>

      {/* tabs */}
      <div className="sticky top-16 z-20 mb-5 flex gap-1 border-b border-ink-900/[.06] bg-ink-50/90 backdrop-blur">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={cn("press relative px-4 py-3 text-sm font-semibold transition", tab === t.key ? "text-brand-700" : "text-ink-400 hover:text-ink-700")}>
            {t.label}{counts[t.key] != null && <span className="ml-1.5 text-xs font-bold text-ink-400">{compact(counts[t.key])}</span>}
            {tab === t.key && <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-brand-600 anim-pop" />}
          </button>
        ))}
      </div>

      {people === null ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-2xl border border-ink-900/[.06] bg-surface p-3">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1 space-y-2"><Skeleton className="h-3.5 w-40" /><Skeleton className="h-3 w-24" /></div>
              <Skeleton className="h-8 w-20 rounded-full" />
            </div>
          ))}
        </div>
      ) : list.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 py-16 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-brand-50 text-brand-600"><Users size={24} /></span>
          <p className="text-lg font-semibold text-ink-900">
            {tab === "followers" ? "No followers yet" : tab === "following" ? "Not following anyone yet" : "No connections yet"}
          </p>
          <p className="max-w-xs text-sm text-ink-500">
            {isSelf
              ? tab === "connections" ? "Send connection requests to clinicians you know." : "Discover people from your feed, search, and suggestions."
              : "Nothing to show here yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((u) => <PersonRow key={u.id || u._id} user={u} demo={demo} />)}
        </div>
      )}
    </div>
  );
}

function PersonRow({ user, demo }) {
  const nav = useNavigate();
  const id = user.id || user._id;
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-ink-900/[.06] bg-surface p-3 transition hover:border-brand-200">
      <button onClick={() => nav(`/app/profile/${id}`)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <Avatar user={user} size={48} />
        <div className="min-w-0">
          <p className="flex items-center gap-1 truncate text-sm font-semibold text-ink-900">{user.fullName} {user.isVerified && <Verified size={13} />}</p>
          <p className="truncate text-xs text-ink-500">{user.professionalHeadline || user.specialization || roleLabel(user.role)}</p>
        </div>
      </button>
      <FollowButton user={user} demo={demo} />
    </div>
  );
}

"use client";
import { useEffect, useState } from "react";
import { useParams, useNavigate, Navigate } from "@/lib/router";
import { ArrowLeft, MapPin, Share2, Lock } from "lucide-react";
import { Avatar, Verified, RoleBadge, Skeleton } from "@/components/ui/Primitives";
import FollowButton from "@/components/ui/FollowButton";
import PostCard from "@/components/PostCard";
import ShareSheet from "@/components/ShareSheet";
import { useAuth } from "@/context/AuthContext";
import { dok } from "@/lib/api";
import { compact, roleLabel } from "@/lib/utils";

/**
 * Another user's profile — the routing target for every DP / display-name tap
 * across feed cards, like lists, and comment rows.
 */
export default function UserProfile() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user: me, demo } = useAuth();
  const [data, setData] = useState(null);
  const [posts, setPosts] = useState(null);
  const [share, setShare] = useState(false);
  const [failed, setFailed] = useState(false);

  const isMe = me && (me._id === id || me.id === id);

  useEffect(() => {
    if (isMe) return;
    let alive = true;
    Promise.allSettled([dok.profile.byId(id), dok.follows.check(id)])
      .then(([p, f]) => {
        if (!alive) return;
        if (p.status !== "fulfilled") { setFailed(true); return; }
        const profile = p.value || {};
        const u = profile.user || profile;
        const rel = f.status === "fulfilled" ? f.value : {};
        setData({
          ...profile,
          user: {
            ...u,
            isFollowing: rel.isFollowing ?? u.isFollowing,
            isRequested: rel.isRequested ?? u.isRequested,
            connectionStatus: u.connectionStatus ?? rel.connectionStatus,
          },
        });
      });
    dok.posts
      .byUser(id, "?limit=20")
      .then((d) => alive && setPosts(d.posts || d.feed || []))
      .catch(() => alive && setPosts([]));
    return () => { alive = false; };
  }, [id, demo, isMe]);

  if (isMe) return <Navigate to="/app/profile" replace />;
  if (failed) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="card grid place-items-center gap-3 py-16 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-ink-900/[.05] text-ink-400"><Lock size={24} /></span>
          <p className="text-lg font-semibold text-ink-900">Profile unavailable</p>
          <p className="text-sm text-ink-500">This account may be private, deactivated, or removed.</p>
          <button onClick={() => nav(-1)} className="btn-ghost px-5 py-2 text-sm">Go back</button>
        </div>
      </div>
    );
  }
  if (!data) return <ProfileSkeleton />;

  const u = data.user;
  const rp = data.roleProfile || {};
  const headline = u.professionalHeadline || u.headline || rp.mainSpecialization || rp.course || roleLabel(u.role);
  const place = [rp.hospitals?.[0]?.name || rp.institution, u.city].filter(Boolean).join(" · ");

  return (
    <div className="mx-auto max-w-2xl pb-24">
      <div className="card overflow-hidden">
        <div className="relative h-40 bg-gradient-to-br from-brand-500 via-brand-600 to-brand-900">
          {u.coverPhoto && <img src={u.coverPhoto} alt="" className="absolute inset-0 h-full w-full object-cover" />}
          <div className="grid-bg absolute inset-0 opacity-30" />
          <button onClick={() => nav(-1)} aria-label="Back" className="press absolute left-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/15 text-white backdrop-blur hover:bg-white/25"><ArrowLeft size={18} /></button>
          <button onClick={() => setShare(true)} aria-label="Share profile" className="press absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/15 text-white backdrop-blur hover:bg-white/25"><Share2 size={17} /></button>
        </div>
        <div className="px-5 pb-5">
          <div className="-mt-14 flex items-end justify-between">
            <span className="rounded-full ring-4 ring-white"><Avatar user={u} size={104} /></span>
            <FollowButton user={u} demo={demo} className="px-5 py-2 text-sm" />
          </div>
          <div className="mt-3">
            <h1 className="flex items-center gap-1.5 font-display text-xl font-extrabold text-ink-900">
              {u.fullName} {u.isVerified && <Verified size={17} />}
            </h1>
            {u.uniqueUsername && <p className="text-sm text-ink-400">@{u.uniqueUsername}</p>}
            <p className="mt-1 text-[15px] text-ink-700">{headline}</p>
            {place && <p className="mt-0.5 flex items-center gap-1 text-sm text-ink-500"><MapPin size={13} /> {place}</p>}
            <div className="mt-2"><RoleBadge role={u.role} /></div>
            {u.bio && <p className="mt-3 text-sm leading-relaxed text-ink-700">{u.bio}</p>}
          </div>
          <div className="mt-4 flex gap-6 border-t border-ink-900/[.06] pt-4 text-sm">
            <Stat n={u.postsCount} label="Posts" />
            <Stat n={u.followersCount} label="Followers" />
            <Stat n={u.followingCount} label="Following" />
            <Stat n={u.connectionsCount} label="Connections" />
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-5">
        {posts === null ? (
          <Skeleton className="h-48 w-full rounded-2xl" />
        ) : posts.length === 0 ? (
          <div className="card py-12 text-center">
            <p className="font-semibold text-ink-900">No posts yet</p>
            <p className="mt-1 text-sm text-ink-500">{u.fullName?.split(" ")[0]} hasn't shared anything public.</p>
          </div>
        ) : (
          posts.map((p) => <PostCard key={p._id || p.id} post={p} demo={demo} onRemoved={(pid) => setPosts((x) => x.filter((y) => (y._id || y.id) !== pid))} />)
        )}
      </div>

      <ShareSheet open={share} onClose={() => setShare(false)} kind="profile" demo={demo} />
    </div>
  );
}

function Stat({ n, label }) {
  if (n == null) return null;
  return (
    <span className="flex items-baseline gap-1">
      <strong className="font-display text-ink-900">{compact(n)}</strong>
      <span className="text-ink-500">{label}</span>
    </span>
  );
}

function ProfileSkeleton() {
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="card overflow-hidden">
        <Skeleton className="h-40 w-full rounded-none" />
        <div className="space-y-3 px-5 pb-5">
          <div className="-mt-14"><Skeleton className="h-[104px] w-[104px] rounded-full ring-4 ring-white" /></div>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>
      <Skeleton className="h-48 w-full rounded-2xl" />
    </div>
  );
}

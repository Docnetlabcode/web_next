"use client";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@/lib/router";
import { Avatar, Verified } from "@/components/ui/Primitives";
import { useToast } from "@/components/ui/Toast";
import { compact, roleLabel } from "@/lib/utils";
import { dok } from "@/lib/api";
import { reconcileFollowState } from "@/lib/relationships";
import { broadcastFollow, onFollowChange } from "@/lib/followBus";

// Single morphing action button used on suggestion cards (vs. the two distinct
// buttons on a full profile). Tap the avatar/name to open the profile; tap the
// button to follow/unfollow (or request/withdraw on private accounts).
export default function UserCard({ user, action = "follow", demo, onAction }) {
  const nav = useNavigate();
  const toast = useToast();
  const id = user._id || user.id;

  const initState =
    action === "connect"
      ? (user.isRequested ? "requested" : "connect")
      : (user.isFollowing ? "following" : user.isRequested ? "requested" : "follow");

  const [state, setState] = useState(initState);
  const [busy, setBusy] = useState(false);
  const src = useRef(Math.random().toString(36).slice(2)); // ignore our own broadcast echo
  const stateRef = useRef(state);
  stateRef.current = state;

  // Re-sync if the suggestion list reloads with fresh relationship flags.
  useEffect(() => { setState(initState); /* eslint-disable-next-line */ }, [id, user.isFollowing, user.isRequested]);

  // Resync when the same user is followed/unfollowed on another surface (connect cards opt out).
  useEffect(() => {
    if (action === "connect") return undefined;
    return onFollowChange((d) => {
      if (d.source === src.current || String(d.id) !== String(id)) return;
      const next = reconcileFollowState(stateRef.current, d, true);
      if (next !== stateRef.current) setState(next);
    });
  }, [id, action]); // eslint-disable-line react-hooks/exhaustive-deps

  const openProfile = () => { if (id) nav(`/app/profile/${id}`); };

  const handle = async () => {
    if (!id || busy) return;
    const prev = state;
    onAction?.(user, state);

    // Optimistic next state, then reconcile with the backend.
    if (action === "connect") {
      setState("requested");
      if (demo) return;
      setBusy(true);
      try { await dok.network.request(id); }
      catch (e) { setState(prev); toast?.error(e?.response?.data?.message || "Couldn't send the request"); }
      finally { setBusy(false); }
      return;
    }

    // follow action — toggle between follow / following / requested
    if (prev === "follow") {
      setState("following");
      broadcastFollow(id, true, { source: src.current });
      if (demo) return;
      setBusy(true);
      try { const d = await dok.follows.follow(id); if (d?.status === "requested") { setState("requested"); broadcastFollow(id, false, { requested: true, source: src.current }); } }
      catch { setState("follow"); broadcastFollow(id, false, { source: src.current }); toast?.error("Couldn't follow — try again"); }
      finally { setBusy(false); }
    } else if (prev === "following") {
      setState("follow");
      broadcastFollow(id, false, { source: src.current });
      if (demo) return;
      setBusy(true);
      try { await dok.follows.unfollow(id); }
      catch { setState("following"); broadcastFollow(id, true, { source: src.current }); toast?.error("Couldn't unfollow — try again"); }
      finally { setBusy(false); }
    } else if (prev === "requested") {
      setState("follow");
      broadcastFollow(id, false, { source: src.current });
      if (demo) return;
      setBusy(true);
      try { await dok.follows.withdraw(id); }
      catch { setState("requested"); broadcastFollow(id, false, { requested: true, source: src.current }); toast?.error("Couldn't withdraw the request"); }
      finally { setBusy(false); }
    }
  };

  const labels = {
    follow: "Follow",
    following: "Following",
    requested: "Requested",
    connect: "+ Connect",
  };
  const isActive = state === "following" || state === "requested";

  return (
    <div className="flex items-center gap-3">
      <button type="button" onClick={openProfile} className="press shrink-0" aria-label={`View ${user.fullName}'s profile`}>
        <Avatar user={user} size={44} />
      </button>
      <button type="button" onClick={openProfile} className="min-w-0 flex-1 text-left">
        <span className="flex items-center gap-1">
          <span className="truncate text-sm font-semibold hover:underline">{user.fullName}</span>
          {user.isVerified && <Verified size={13} />}
        </span>
        <span className="block truncate text-xs text-ink-500">
          {user.professionalHeadline || roleLabel(user.role)}
          {user.followersCount ? ` · ${compact(user.followersCount)} followers` : ""}
        </span>
      </button>
      <button
        type="button"
        onClick={handle}
        disabled={busy}
        className={`${isActive ? "btn-outline" : "btn-ghost"} px-4 py-1.5 text-xs disabled:opacity-60`}
      >
        {labels[state]}
      </button>
    </div>
  );
}

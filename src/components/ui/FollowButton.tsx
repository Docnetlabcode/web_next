"use client";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@/lib/router";
import { UserPlus, UserCheck, Clock, MessageSquare, Loader2, Link2 } from "lucide-react";
import { dok } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import { deriveState, reconcileFollowState } from "@/lib/relationships";
import { broadcastFollow, onFollowChange } from "@/lib/followBus";

/**
 * The centralized network state machine (docs/feed.md §5).
 * Renders identically in feed-card headers, like-details rows, and profiles.
 *
 *   State A (not following):  Follow → Following (public) | Requested (private, tap = withdraw)
 *   State B (following):      Connect → Connecting → Message (connected)
 *                             pending_incoming → Accept
 *
 * All transitions are optimistic; failures roll back with an error toast.
 *
 * `user`: { _id|id, isFollowing, isRequested?, connectionStatus?, connectionRequestId?, isSelf?, fullName? }
 * `variant`: "solid" (pill buttons, like-list rows) | "ghost" (inline text, card headers)
 */

export default function FollowButton({ user, demo, variant = "solid", className, onStateChange, simple = false }) {
  const nav = useNavigate();
  const toast = useToast();
  const id = user?.id || user?._id;
  // `simple` (posts & reels): a plain Follow/Following toggle — collapse the
  // connection sub-states (connect/connecting/accept/message) down to "following".
  const [state, setState] = useState(() => {
    const s = deriveState(user);
    return simple && s !== "follow" && s !== "requested" && s !== "self" ? "following" : s;
  });
  const [busy, setBusy] = useState(false);
  const morphTimer = useRef(null);
  const src = useRef(Math.random().toString(36).slice(2)); // ignore our own broadcast echo
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => () => clearTimeout(morphTimer.current), []);

  const commit = (next) => {
    setState(next);
    onStateChange?.(next);
  };

  // Resync when the same user is followed/unfollowed on another surface.
  useEffect(() => {
    return onFollowChange((d) => {
      if (d.source === src.current || String(d.id) !== String(id)) return;
      const next = reconcileFollowState(stateRef.current, d, simple);
      if (next !== stateRef.current) { clearTimeout(morphTimer.current); commit(next); }
    });
  }, [id, simple]); // eslint-disable-line react-hooks/exhaustive-deps

  // Public follow lands as a transient "Following ✓", then morphs into Connect (State B).
  const settleAsFollowing = () => {
    commit("following");
    morphTimer.current = setTimeout(() => commit("connect"), 1400);
  };

  const follow = async () => {
    if (simple) commit("following"); // simple toggle: stay on Following (no Connect morph)
    else settleAsFollowing(); // optimistic — instant morph per spec
    broadcastFollow(id, true, { source: src.current });
    if (demo) return;
    try {
      const d = await dok.follows.follow(id);
      if (d?.status === "requested") {
        clearTimeout(morphTimer.current);
        commit("requested"); // private account → Requested
        broadcastFollow(id, false, { requested: true, source: src.current });
      }
    } catch {
      clearTimeout(morphTimer.current);
      commit("follow");
      broadcastFollow(id, false, { source: src.current });
      toast?.error("Couldn't follow — try again");
    }
  };

  // simple mode only: tap "Following" to unfollow.
  const unfollow = async () => {
    commit("follow");
    broadcastFollow(id, false, { source: src.current });
    if (demo) return;
    try { await dok.follows.unfollow(id); }
    catch { commit("following"); broadcastFollow(id, true, { source: src.current }); toast?.error("Couldn't unfollow — try again"); }
  };

  const withdraw = async () => {
    commit("follow"); // silent revocation: row simply vanishes on the target's side
    broadcastFollow(id, false, { source: src.current });
    if (demo) return;
    try { await dok.follows.withdraw(id); }
    catch { commit("requested"); broadcastFollow(id, false, { requested: true, source: src.current }); toast?.error("Couldn't withdraw the request"); }
  };

  const connect = async () => {
    commit("connecting"); // optimistic handshake
    if (demo) return;
    try { await dok.network.request(id); }
    catch (e) {
      commit("connect");
      toast?.error(e?.response?.data?.message || "Couldn't send the connection request");
    }
  };

  const accept = async () => {
    commit("message");
    if (demo) return;
    try { await dok.network.accept(user.connectionRequestId || id); }
    catch { commit("accept"); toast?.error("Couldn't accept the request"); }
  };

  const message = async () => {
    if (demo) { nav("/app/messages"); return; }
    setBusy(true);
    try {
      const d = await dok.chat.start({ recipientId: id });
      const cid = d?.conversation?.id || d?.conversation?._id || d?.conversationId;
      nav(cid ? `/app/messages?c=${cid}` : "/app/messages");
    } catch {
      toast?.error("Couldn't open the conversation");
    } finally {
      setBusy(false);
    }
  };

  if (state === "self" || !id) return null;

  const CONFIG = {
    follow:     { label: "Follow",      icon: UserPlus,      onClick: follow,
                  solid: "bg-brand-600 text-white hover:bg-brand-700 shadow-glow",
                  ghost: "text-brand-600 hover:bg-brand-50" },
    following:  { label: "Following",   icon: UserCheck,     onClick: simple ? unfollow : undefined, title: simple ? "Tap to unfollow" : undefined,
                  solid: simple ? "bg-brand-50 text-brand-700 hover:bg-danger-50 hover:text-danger-500" : "bg-brand-50 text-brand-700",
                  ghost: simple ? "text-brand-700 hover:text-danger-500" : "text-brand-700" },
    requested:  { label: "Requested",   icon: Clock,         onClick: withdraw, title: "Tap to withdraw",
                  solid: "border border-ink-900/[.12] bg-surface text-ink-500 hover:border-danger-500/40 hover:text-danger-500",
                  ghost: "text-ink-400 hover:text-danger-500" },
    connect:    { label: "Connect",     icon: Link2,         onClick: connect,
                  solid: "border border-brand-300 bg-surface text-brand-700 hover:bg-brand-50",
                  ghost: "text-brand-600 hover:bg-brand-50" },
    connecting: { label: "Connecting",  icon: Loader2,       onClick: undefined, spin: true,
                  solid: "border border-ink-900/[.10] bg-ink-900/[.03] text-ink-400",
                  ghost: "text-ink-400" },
    accept:     { label: "Accept",      icon: UserCheck,     onClick: accept,
                  solid: "bg-brand-600 text-white hover:bg-brand-700 shadow-glow",
                  ghost: "text-brand-600 hover:bg-brand-50" },
    message:    { label: "Message",     icon: MessageSquare, onClick: message,
                  solid: "bg-brand-50 text-brand-700 hover:bg-brand-100",
                  ghost: "text-brand-600 hover:bg-brand-50" },
  };

  const c = CONFIG[state];
  const Icon = c.icon;
  const interactive = Boolean(c.onClick) && !busy;

  return (
    <button
      key={state} // re-mount on state change → anim-pop entrance
      onClick={interactive ? c.onClick : undefined}
      disabled={!interactive}
      title={c.title}
      aria-label={`${c.label}${user?.fullName ? ` ${user.fullName}` : ""}`}
      className={cn(
        "press anim-pop inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full font-bold transition-all",
        variant === "solid" ? "px-4 py-1.5 text-xs" : "px-2 py-0.5 text-xs",
        c[variant],
        !interactive && "cursor-default",
        className
      )}
    >
      {busy ? <Loader2 size={13} className="animate-spin" /> : <Icon size={13} className={cn(c.spin && "animate-spin")} />}
      {c.label}
    </button>
  );
}

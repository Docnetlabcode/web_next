/**
 * Pure network-relationship state machine (docs/feed.md §5), shared by the
 * FollowButton. Kept framework-free so it can be unit-tested in isolation.
 *
 * States: self | follow | requested | connect | connecting | accept | message
 *
 *   not following          → follow      (or "requested" for a pending private follow)
 *   following + none       → connect
 *   following + pending_outgoing → connecting
 *   following + pending_incoming → accept
 *   following + connected  → message
 */
export function deriveState(u) {
  if (!u || u.isSelf) return "self";
  if (!u.isFollowing) return u.isRequested || u.followStatus === "requested" ? "requested" : "follow";
  switch (u.connectionStatus) {
    case "connected": return "message";
    case "pending_outgoing": return "connecting";
    case "pending_incoming": return "accept";
    default: return "connect";
  }
}

/**
 * Reconcile a follow broadcast (see lib/followBus) into a button's local state so
 * follow/unfollow on one surface mirrors on every other mounted button.
 *
 * `simple` collapses the connection sub-states to a plain "following" (post/reel
 * cards, suggestion cards, the profile's Follow toggle). In full mode an existing
 * connection sub-state (connecting/accept/message) is preserved once following —
 * only follow↔unfollow flips it; a fresh follow settles at the resting "connect".
 */
export function reconcileFollowState(current, { following, requested } = {}, simple = false) {
  if (current === "self") return "self";
  if (requested) return "requested";
  if (!following) return "follow";
  if (simple) return "following";
  return current === "follow" || current === "requested" ? "connect" : current;
}

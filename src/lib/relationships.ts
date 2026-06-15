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

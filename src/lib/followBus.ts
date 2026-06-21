"use client";
/**
 * App-wide follow broadcast. Mirrors the `dl:auth-expired` window-event idiom so
 * every mounted follow button for a user resyncs the instant the viewer follows
 * or unfollows them on ANY surface — post card, reel, profile, suggestion card.
 *
 * The server stays the source of truth on the next fetch; this only keeps the
 * already-mounted buttons consistent within a session. `source` lets the button
 * that initiated the change ignore its own echo (so it can keep its own
 * animation / connection sub-state).
 */
export const FOLLOW_EVENT = "dl:follow-changed";

export function broadcastFollow(
  id,
  following,
  { requested = false, source }: { requested?: boolean; source?: string } = {}
) {
  if (typeof window === "undefined" || !id) return;
  window.dispatchEvent(
    new CustomEvent(FOLLOW_EVENT, {
      detail: { id: String(id), following: !!following, requested: !!requested, source },
    })
  );
}

// Subscribe to follow changes; returns an unsubscribe fn. Handler gets { id, following, requested, source }.
export function onFollowChange(handler) {
  if (typeof window === "undefined") return () => {};
  const fn = (e) => handler(e.detail || {});
  window.addEventListener(FOLLOW_EVENT, fn);
  return () => window.removeEventListener(FOLLOW_EVENT, fn);
}

/**
 * Pure deep-link routing for notifications (docs/modules/notifications.md).
 * Given a notification, returns the in-app path to open on tap, or null.
 * Framework-free so it can be unit-tested without the React tree.
 */
const uid = (u) => u?.id || u?._id;

export function routeFor(n) {
  if (!n) return null;
  const m = n.meta || {};
  const senderId = uid(n.sender);
  switch (n.type) {
    case "mention_comment": case "post_comment": case "comment_reply": case "comment_like":
      if (m.postId) return `/app/post/${m.postId}${m.commentId ? `?comment=${m.commentId}` : ""}`;
      break;
    case "post_like": case "mention_post":
      if (m.postId) return `/app/post/${m.postId}`;
      break;
    case "reel_like": case "reel_comment": case "mention_reel":
      return "/app/reels";
    case "follow": case "follow_request_accepted": case "connection_accepted":
      if (senderId) return `/app/profile/${senderId}`;
      break;
    case "connection_request":
      return "/app/network";
    case "message":
      return "/app/messages";
    case "verification_approved": case "verification_rejected":
      return "/app/profile/edit";
    default: break;
  }
  if (m.postId) return `/app/post/${m.postId}`;
  if (senderId) return `/app/profile/${senderId}`;
  return null;
}

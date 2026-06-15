# Notifications — `/api/notifications`

In-app activity feed + unread count + per-category push/in-app preferences. Delivery
is also via **FCM push** (register the device token through
`PUT /api/profile/me/basic` → `fcmToken`). All routes require auth. See [index.md](index.md).

## Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/` | Paginated notifications (+ `unreadCount`) |
| GET | `/unread-count` | Unread badge count |
| GET | `/preferences` | Per-category channel prefs |
| PUT | `/preferences` | Update prefs |
| PUT | `/read-all` | Mark all read |
| PUT | `/:id/read` | Mark one read |
| DELETE | `/:id` | Remove a notification |

## Notification types

| Type | Category | Example title |
|---|---|---|
| `post_like` · `reel_like` · `comment_like` | contentActivity | "Liked your post" |
| `post_comment` · `reel_comment` · `comment_reply` | contentActivity | "Commented on your post" |
| `mention_post` · `mention_reel` · `mention_comment` | contentActivity | "[user] tagged you in a comment" |
| `follow` · `follow_request` · `follow_request_accepted` | connections | "requested to follow you" |
| `connection_request` · `connection_accepted` | connections | "Connection request" |
| `message` | messages | "New message" |
| `verification_approved` · `verification_rejected` | securityAlerts | "Verification approved" |

`meta` carries deep-link ids, e.g. `{ postId, commentId }` (comments), `{ requesterId }`
(follow request) — route the user accordingly on tap.

## JSON

```jsonc
// GET / ?cursor=&limit=20
// → data: { notifications: [ { id, type, title, body, meta, isRead, createdAt,
//             sender: { id, fullName, profilePhoto, role } | null } ], hasMore, nextCursor, unreadCount }

// GET /unread-count → data: { count: 3 }

// PUT /preferences   (master switch + per-category { push, inApp })
{ "allMuted": false,                              // master "Turn Off All Notifications" → suppresses ALL push
  "connections":    { "push": true,  "inApp": true },
  "messages":       { "push": true,  "inApp": true },
  "securityAlerts": { "push": true,  "inApp": true },
  "productUpdates": { "push": false, "inApp": true },
  "contentActivity":{ "push": true,  "inApp": false } }
```

## Frontend

```js
const { notifications, unreadCount } = await api.get("/notifications?limit=20");
await api.put(`/notifications/${id}/read`);
await api.put("/notifications/read-all");

// deep-link on tap
function open(n) {
  if (n.type === "mention_comment") router.push(`/post/${n.meta.postId}?comment=${n.meta.commentId}`);
  else if (n.type === "follow_request") router.push(`/follow-requests`);
  else if (n.meta?.postId) router.push(`/post/${n.meta.postId}`);
}
```

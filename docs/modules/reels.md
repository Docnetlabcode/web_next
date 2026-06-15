# Reels — `/api/reels`

Short videos with async HLS transcoding (handled by media-service). Like/comment
mirror posts. See [index.md](index.md).

## Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/feed` | 🔓 | Discovery feed (true-random, 48h watch lockout) → [recommendation.md](recommendation.md) |
| POST | `/:id/watched` | 🔒 | Mark watched (>50% / >10s) → 48h lockout + exhaustion priority |
| GET | `/saved` · `/user/:userId` | mixed | Lists |
| POST | `/` | 🔒 | Upload `multipart: video` → transcoding |
| GET | `/:id` | 🔓 | Reel detail (author has `isFollowing`) |
| PUT | `/:id` | 🔒 | Edit caption/tags/visibility (403 after 24 h) |
| DELETE | `/:id` | 🔒 | Delete |
| POST | `/:id/view` | 🔓 | Increment view (debounced) |
| POST | `/:id/analytics` | 🔓 | Batch playback metrics |
| POST | `/:id/like` | 🔒 | Toggle like |
| GET | `/:id/likes` | 🔓 | Likers list (rows carry `isFollowing`/`isSelf`) |
| POST | `/:id/save` · `/:id/not-interested` | 🔒 | Toggle save / suppress |
| POST | `/:id/comments` · GET `/:id/comments` · `.../replies` | mixed | Comments (`@username` → notify) |
| DELETE | `/:id/comments/:commentId` · POST `.../like` | 🔒 | Comment ops (delete by author **or reel owner**) |
| PUT | `/:id/cover` | 🔒 | Replace thumbnail `multipart: cover` |

## JSON

```jsonc
// POST /   (multipart "video" ≤500MB + JSON fields)
{ "caption": "Radial access technique demo",
  "visibility": "public",
  "specialties": ["Interventional Cardiology"],   // drives the specialty filter
  "hashtags": ["IntervCard"],                      // DEDICATED field (not parsed); stored as #intervcard
  "mentions": ["@drbob"] }                         // DEDICATED field: @username / ids → resolved + notified ("mentioned you in a reel")
// 201 → data: { reel: { id, caption, hashtags, mentions, processingStatus: "PENDING", hlsUrl: null, ... } }

// PUT /:id   (≤24h) — caption/visibility/specialties/hashtags/mentions editable; the VIDEO is locked.
//   403 after 24h → data: { code: "MODIFICATION_LEASE_EXPIRED" }

// GET /:id → data: { reel: { id, caption, hlsUrl, thumbnailUrl, processingStatus,
//   likesCount, commentsCount, viewsCount, isLiked, isSaved,
//   author: { id, fullName, uniqueUsername, profilePhoto, isVerified, role,
//             specialization, isFollowing, connectionStatus } } }
// processingStatus: PENDING → PROCESSING → COMPLETED | FAILED   (use hlsUrl once COMPLETED)
//   Card-header button (State A/B): !isFollowing → Follow ; isFollowing + connectionStatus
//   none → Connect ; pending_outgoing → Connecting ; pending_incoming → Accept ; connected → Message

// PUT /:id   (within 24 h of creation)
{ "caption": "Updated caption #cardio", "specialties": ["Cardiology"], "visibility": "public" }
// → data: { reel: { ... } }   (hashtags re-extracted from caption)

// GET /:id/likes?limit=20  (who liked — same shape as posts)
// → data: { users: [ { id, fullName, uniqueUsername, professionalHeadline, profilePhoto,
//                      isVerified, isFollowing, isSelf } ], hasMore, nextCursor }

// POST /:id/comments  — { content, parentId? }; @uniqueusername → mention_comment
//   notification with meta { reelId, commentId } for deep-link.

// POST /:id/analytics
{ "watchDuration": 12.4, "watchPercent": 78, "didReplay": false, "didMute": true }
```

## Frontend

```js
// upload, then poll for HLS
const fd = new FormData(); fd.append("video", file); fd.append("caption", caption);
const { reel } = await api.upload("/reels", fd);
const poll = setInterval(async () => {
  const { reel: r } = await api.get(`/reels/${reel.id}`);
  if (r.processingStatus === "COMPLETED") { clearInterval(poll); play(r.hlsUrl); }
  if (r.processingStatus === "FAILED")    { clearInterval(poll); toast("Transcode failed"); }
}, 4000);

// discovery feed: fresh session each tab entry, then reuse sessionId while scrolling
let reelSession;
async function loadReels() {
  const d = await api.get(`/reels/feed?limit=10${reelSession ? `&sessionId=${reelSession}` : ""}`);
  reelSession = d.sessionId;          // d.exhausted → "replaying top reels"
  return d;
}
function enterReelTab() { reelSession = undefined; return loadReels(); }   // always fresh
await api.post(`/reels/${id}/view`);                       // view ping
await api.post(`/reels/${id}/watched`);                    // when watched >50% or >10s
```

> **Recommendation model** (true-random, 48h watch lockout, exhaustion loop) →
> [recommendation.md](recommendation.md). Redis holds a per-session "served" set
> (`reels:served:…`); everything falls back to the DB if Redis is down.

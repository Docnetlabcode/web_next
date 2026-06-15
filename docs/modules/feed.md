# Feed — `/api/feed`

Home / explore / saved feeds with the specialty filter bar, plus the "not interested"
and "mute / don't recommend" controls. See [index.md](index.md), the full UX guide
[../feed.md](../feed.md), and the **[recommendation engine](recommendation.md)** for the
session / seen / exhaustion model.

## Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/home` | 🔒 | Session-based, weighted-random home feed → [recommendation.md](recommendation.md) |
| POST | `/seen` | 🔒 | Log viewed post ids (>1.5s) for session de-dup |
| GET | `/explore` | 🔓 | Trending / discovery feed |
| GET | `/guest` | — | Public guest feed |
| GET | `/saved` | 🔒 | Saved content (by category tab) |
| GET | `/mute` | 🔒 | Muted users list |
| POST | `/not-interested/:postId` | 🔒 | Hide post + downrank |
| POST·DELETE | `/mute/:userId` | 🔒 | Mute / unmute author from feed ("don't recommend") |

## JSON

```jsonc
// GET /home?sessionId=&specialty=Cardiology&type=research&page=0&limit=20
//   omit sessionId on first load / pull-to-refresh → server returns a new one (reuse it)
//   specialty omitted or "all" → unified feed (the All tab) ; page is 0-based (not a cursor)
// → data: {
//     sessionId, page, hasMore, nextPage, exhausted, caughtUp,
//     posts: [ { id, content, postType, createdAt, isLiked, isSaved,
//                author: { id, fullName, uniqueUsername, profilePhoto, isVerified,
//                          role, specialization, isFollowing, connectionStatus },
//                likesCount, commentsCount } ] }
//   exhausted/caughtUp = true → "Explore Past Discussions" (re-shuffled seen posts).
//   Card-header button (State A/B): !isFollowing → Follow ; isFollowing + connectionStatus:
//     none → Connect ; pending_outgoing → Connecting ; pending_incoming → Accept ;
//     connected → Message. (Full recommendation model: recommendation.md)

// POST /seen   { sessionId, postIds: ["clxA","clxB"] }   → data: { recorded: 2 }
// GET /saved?tab=case_study     tab ∈ all | post | research | thesis | case_study | reel
// POST /not-interested/:postId  → 200 (no body)
// POST /mute/:userId            → 200 (no body)
```

## Frontend

```js
let sessionId;
async function loadFeed(page = 0, specialty) {
  const qs = new URLSearchParams({ page, limit: 20 });
  if (sessionId) qs.set("sessionId", sessionId);
  if (specialty && specialty !== "all") qs.set("specialty", specialty);
  const d = await api.get(`/feed/home?${qs}`);
  sessionId = d.sessionId;                 // reuse for the rest of the session
  if (d.exhausted) showCaughtUpBanner();
  return d;                                 // page with d.nextPage until hasMore === false
}
function refresh() { sessionId = undefined; return loadFeed(0); }   // pull-to-refresh = new session

// report cards seen >1.5s (batched) so they're de-duplicated this session
api.post("/feed/seen", { sessionId, postIds: seenBatch });

// 3-dot menu
await api.post(`/feed/not-interested/${postId}`);    // Not interested
await api.post(`/feed/mute/${authorId}`);            // Don't recommend (mute author)
```

> **Redis:** the session order list (`feed:order:{userId}:{sessionId}:…`), seen set
> (`feed:seen:…`), and fallback list are stored in Redis (~6h). The reel feed uses a
> per-session "served" set (`reels:served:…`). All reads fall back to the DB if Redis
> is down. Full model → [recommendation.md](recommendation.md).

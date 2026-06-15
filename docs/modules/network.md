# Network — `/api/network`

Professional **connections** (mutual, LinkedIn-style) — distinct from follows. All
routes require auth. See [index.md](index.md).

The hub has three segments: **Suggestions**, **Requests**, **Connections**. Every
row card carries `mutualConnectionsCount`; tap it to load the mutual list.

## Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/suggestions` (alias `/discover`) | Smart suggestions (cached weighted ranking, 15/page) |
| POST | `/suggestions/seen` | Log ids that scrolled into view (>3s) → pushed down on refresh |
| POST | `/suggestions/:userId/ignore` | Dismiss a suggestion permanently |
| GET | `/connections` | My accepted connections |
| GET | `/requests` | Incoming connection requests (with note) |
| GET | `/mutual/:userId` | Mutual connections between me and `:userId` (dropdown) |
| GET | `/chats` | Conversation list (connections you chat with) |
| POST | `/request/:targetUserId` | Send a request `{ note? }` |
| POST·PUT | `/request/:requestId/accept` | Accept (→ connection **+ mutual follow**) |
| POST·PUT | `/request/:requestId/reject` | Reject (silent) |

A user **card** = `{ id, fullName, uniqueUsername, profilePhoto, role, isVerified,
specialization, professionalHeadline, connectionsCount, followersCount, mutualConnectionsCount }`.

## JSON

```jsonc
// GET /suggestions?page=0&limit=15  (limit capped at 15/page)
// → data: { users: [ { ...card, mutualConnectionsCount: 4 } ], page, hasMore, nextPage, source }
//   source: "cache" (pre-computed pool) | "live" (fallback).
//   Omit page/sessionId — paginate with `page`. Prefetch next page when the client
//   hits ~row 10. `?specialty=` forces a live, specialty-filtered query (bypasses cache).

// POST /suggestions/seen   { "ids": ["clxA","clxB"] }   // ids seen >3s in viewport
// → data: { recorded: 2 }   (on next refresh these sink to the bottom of the order)

// POST /suggestions/:userId/ignore → 200   (won't be suggested again)

// POST /request/:targetUserId   { "note": "We met at the cardiology conf" }   // note optional
// → 201 { connectionId, status: "pending_outgoing" }
//   notifies target: "[uniqueusername] wants to connect with you"

// GET /requests
// → data: { requests: [ { requestId, user: { ...card }, note: "..."|null, createdAt } ], hasMore, nextCursor }

// POST /request/:requestId/accept → 200 { status: "connected" }
//   +connection counts for both, ESTABLISHES MUTUAL FOLLOW (both follow each other,
//   +follower/following counts), notifies sender "[uniqueusername] is connected with you now"
// POST /request/:requestId/reject → 200  (silent; sender not notified)

// GET /connections?cursor=&limit=  → data: { connections: [ { ...card } ], hasMore, nextCursor }
// GET /mutual/:userId?cursor=&limit= → data: { users: [ { ...card } ], hasMore, nextCursor }
```

## Frontend

```js
// Suggestions segment
const { users } = await api.get("/network/suggestions?limit=20");
await api.post(`/network/suggestions/${userId}/ignore`);              // Ignore
await api.post(`/network/request/${userId}`, { note });               // Connect (with/without note)
// mutual dropdown (any segment):
const { users: mutuals } = await api.get(`/network/mutual/${userId}`);

// Requests segment
const { requests } = await api.get("/network/requests");             // req.note shows the reason box
await api.post(`/network/request/${requestId}/accept`);              // → connected + mutual follow
await api.post(`/network/request/${requestId}/reject`);

// Connections segment → Message button opens chat (mutual connection unlocks DM)
const { connections } = await api.get("/network/connections?limit=20");
```

## Smart Suggestion engine (how it works)

Two layers keep heavy graph math off the request path:

- **Offline worker** ([suggestion.worker.js](../../src/modules/network/suggestion.worker.js)) —
  a Redis-guarded scheduler recomputes each active user's ranked suggestion list
  every **~12h** (`SUGGESTION_REFRESH_HOURS`, default 12) into
  `cache:user_suggestions:{userId}` (24h TTL). Candidates are scored by a weighted
  model ([suggestion.ranking.js](../../src/modules/network/suggestion.ranking.js), unit-tested):
  **specialty 40% · mutual connections 35% · role hybrid 15% · geo 10%**.
- **Real-time delivery** (`GET /suggestions`) — reads the cache, filters live
  (connected / pending / **ignored** / **session-seen**), pushes seen ids to the
  bottom, and paginates 15/page. On a cache miss it serves a **live fallback
  hierarchy**: mutual-ranked → same-specialty → geographic → global verified seed
  (never an empty list), and warms the cache in the background.

> **Follows vs connections:** Follow is one-way (see [follows.md](follows.md));
> a connection is a mutual relationship established via accept.
>
> **Feed-card State B:** once a viewer *follows* an author, the card-header button is
> driven by the connection state — **Connect** (send a request here) when not yet
> connected, **Message** once connected. Feed cards and like-list rows expose
> `connectionStatus` (`none | pending_outgoing | pending_incoming | connected`)
> alongside `isFollowing`. See [feed.md](feed.md) §5.

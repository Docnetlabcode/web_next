# Likes — `/api/likes`

Universal like engine for **any** likeable entity. One set of endpoints handles
posts, comments, reels, and reel-comments — keyed by `targetType` + `targetId`.
See [index.md](index.md) for setup.

> Posts and reels also expose their own `POST /:id/like` toggles ([posts.md](posts.md),
> [reels.md](reels.md)) — those are thin aliases over this same engine and write the
> same `likes` table. Use whichever fits the screen; the result shape is compatible.

`targetType` (case-insensitive in the URL, normalised to upper-case server-side):

| targetType | Likeable entity |
|---|---|
| `POST` | A post |
| `COMMENT` | A post comment |
| `REEL` | A reel |
| `REEL_COMMENT` | A reel comment |

An unknown `targetType` returns **400**. Liking notifies the entity author
(`post_like` / `comment_like` / `reel_like`) unless they liked their own content.

## Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/:targetType/:targetId` | 🔒 | Toggle like (like ⇄ unlike) |
| GET | `/:targetType/:targetId/count` | — | Current like count |
| GET | `/:targetType/:targetId/status` | 🔓 | Whether the caller has liked it |
| GET | `/:targetType/:targetId/likers` | 🔓 | Paginated likers list |

## JSON

```jsonc
// POST /:targetType/:targetId   — no body; toggles
// → data: { liked: true, isLiked: true, likeCount: 42, likesCount: 42 }
//   (`liked`/`isLiked` and `likeCount`/`likesCount` are aliases for client compat)

// GET /:targetType/:targetId/count
// → data: { likeCount: 42, likesCount: 42 }

// GET /:targetType/:targetId/status   (optionalAuth — false when not logged in)
// → data: { liked: true, isLiked: true }

// GET /:targetType/:targetId/likers?cursor=&limit=20   (max limit 50)
// → data: { users: [ { id, fullName, uniqueUsername, professionalHeadline,
//                      profilePhoto, role, isVerified, publicProfileSlug,
//                      isFollowing, connectionStatus, isSelf } ],
//           hasMore, nextCursor }
//   isFollowing / connectionStatus are only populated for an authenticated viewer.
//   connectionStatus ∈ none | pending_outgoing | pending_incoming | connected
```

## Frontend

```js
// optimistic toggle on any entity
async function toggleLike(type, id, wasLiked, count, setLiked, setCount) {
  setLiked(!wasLiked); setCount(c => c + (wasLiked ? -1 : 1));
  try { const d = await api.post(`/likes/${type}/${id}`); setCount(d.likeCount); }
  catch { setLiked(wasLiked); setCount(count); toast("Couldn't update like"); }
}
toggleLike("REEL_COMMENT", commentId, liked, count, setLiked, setCount);

// who liked (tap the count)
const { users, nextCursor, hasMore } = await api.get(`/likes/POST/${postId}/likers?limit=20`);

// hydrate like state for a guest-visible widget
const { liked } = await api.get(`/likes/REEL/${reelId}/status`);
```

# Search — `/api/search`

Cross-entity search. Users are matched by name, specialization, slug, **and unique
username**. Optional auth (logged-in callers get `isFollowing` on user rows). See [index.md](index.md).

## Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/?q=` | Global (users + posts) |
| GET | `/users?q=` | User search (`&role=`, cursor) |
| GET | `/posts?q=` | Post search (`&postType=`, cursor) |
| GET | `/hashtags?q=` | Hashtag suggestions |

## JSON

```jsonc
// GET /users?q=dranya&limit=10&role=doctor
// → data: { users: [ { id, fullName, uniqueUsername, profilePhoto, role,
//                      specialization, isVerified, publicProfileSlug, followersCount,
//                      isFollowing } ], hasMore, nextCursor }

// GET /?q=cardio&limit=5
// → data: { users: [ { ...card } ], posts: [ { id, content, postType, author:{...} } ] }

// GET /hashtags?q=cardio → data: { hashtags: [ { tag: "#cardiology", count: 128 } ] }

// GET /posts?q=SCAD&postType=research
// → data: { posts: [ { id, content, postType, author:{...} } ], hasMore, nextCursor }
```

## Frontend

```js
// debounced multi-tab search
const all   = await api.get(`/search?q=${encodeURIComponent(term)}`);
const users = await api.get(`/search/users?q=${encodeURIComponent(term)}&limit=10`);
const tags  = await api.get(`/search/hashtags?q=${encodeURIComponent(term)}`);
// users can be found by typing their @username (without the @) or display name
```

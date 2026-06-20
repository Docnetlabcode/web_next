# Search — `/api/search`

The **Global Search Discovery Engine**: fault-tolerant fuzzy search across profiles
and content (posts + clinical cases + reels), predictive typeahead, trending hashtags,
and a dedicated hashtag workspace. Optional auth (logged-in callers get `isFollowing`
on user rows + regional zero-results fallback). See [index.md](index.md).

> **Fuzzy matching** uses PostgreSQL `pg_trgm` (trigram similarity) + `fuzzystrmatch`
> (`levenshtein`, `metaphone`). Typos are tolerant (`cardo`→`cardio`, `dermatologyy`→
> `dermatology`), and phonetic spellings fall back via metaphone (`kardiology`→
> `cardiology`). If those extensions aren't installed the engine degrades to `ILIKE`
> automatically — results still return, just less typo-tolerant.

> **Client responsibilities** (not the API): the 200ms debounce, the 3-char trigger,
> on-device search history, verified-badge rendering, and result fade/toast animations.
> The API enforces a server-side `length ≥ 3` guard on `/suggest` and returns the data.

## Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/suggest?q=` | 🔓 | Typeahead — dual-category users + hashtags (≥3 chars) |
| GET | `/?q=` | 🔓 | Global home preview (users + posts + hashtags) |
| GET | `/users?q=` | 🔓 | Profiles tab (fuzzy + filters + zero-results fallback) |
| GET | `/posts?q=` | 🔓 | Posts-only search (fuzzy + filters) |
| GET | `/content?q=` | 🔓 | **Unified** content: posts + cases + reels |
| GET | `/hashtags?q=` | 🔓 | Hashtag suggestions |
| GET | `/trending` | — | Trending hashtags (48h velocity) |
| GET | `/hashtag/:tag` | 🔓 | Hashtag workspace feed (tabbed) |
| POST | `/history` | 🔒 | Record a committed search (client calls on commit/tap) |
| GET | `/history` | 🔒 | My recent searches (deduped, ≤50) |
| DELETE | `/history/:id` | 🔒 | Remove one history entry |
| DELETE | `/history` | 🔒 | Clear my search history |
| GET | `/popular` | — | Popular search **terms** (7d) — distinct from `/trending` (#hashtags) |

## Filters

**Profiles (`/users`):** `role` (doctor·student·general_user), `city`, `state`,
`country`, `headline`, `education` (college/university name), `workplace` (hospital/
clinic name).

**Content (`/posts`, `/content`):** `type` (post·research·thesis·case_study·case·reel·all),
`time` (`24h`·`week`·`month`), `sort` (`recent` default · `trending`), `specialty`,
`affiliation` (author's current/past workplace or education institution).

## JSON

```jsonc
// GET /suggest?q=pawa&limit=6   (returns {} empty when q.length < 3)
// → data: { users:    [ { id, fullName, uniqueUsername, profilePhoto, role, isVerified, publicProfileSlug } ],
//           hashtags: [ { tag: "#pediatrics", count: 128 } ] }

// GET /users?q=cardo&role=doctor&city=Mumbai&limit=10&cursor=<lastId>
// → data: { users: [ { id, fullName, uniqueUsername, profilePhoto, role, specialization,
//                      professionalHeadline, city, state, country, publicProfileSlug,
//                      followersCount, isFollowing } ],
//           hasMore, nextCursor, usedPhonetic }
// Zero matches (page 1) → also includes a fallback block:
//   fallback: { reason:"no_matches",
//               message:"No exact matches found. Here are some professionals you may know in your region:",
//               users: [ { ...card } ] }

// GET /posts?q=SCAD&type=research&time=week&sort=trending&specialty=cardiology
// → data: { posts: [ { id, content, postType, specialties, hashtags, likesCount,
//                      commentsCount, author:{...} } ], hasMore, nextCursor }
//   (sort=trending returns a bounded top set: hasMore=false, nextCursor=null)

// GET /content?q=carditis&type=all&time=month&sort=recent&cursor=<token>
// → data: { items: [ { kind:"post"|"case"|"reel", subType:"research"|"case_study"|"reel"|...,
//                      id, authorId, text, specialties, hashtags, likesCount, commentsCount,
//                      savesCount, thumbnailUrl, createdAt, author:{...} } ],
//           hasMore, nextCursor }
//   nextCursor is an OPAQUE token (createdAt+id keyset) — pass it back verbatim as ?cursor=.

// GET /hashtags?q=cardio → data: { hashtags: [ { tag:"#cardiology", count: 128 } ] }

// GET /trending?limit=10
// → data: { hashtags: [ { tag:"#cardiology", count: 42, score: 318 } ] }   // ordered by 48h velocity

// GET /hashtag/cardiology?type=all&cursor=<token>&limit=12
//   type ∈ all | case_study | research | reel
// → data: { tag:"#cardiology", tab:"all", totalCount: 540,
//           items: [ { kind, subType, id, text, hashtags, author:{...}, createdAt } ],
//           hasMore, nextCursor }

// GET /?q=cardio&limit=5   (home preview)
// → data: { users:[...], posts:[...], hashtags:[...], fallback? }

// ── Search history (logged-in only) ─────────────────────────────────────────
// POST /history   (🔒) — call when the user COMMITS a search (enter / open results /
//                 tap a result), NOT on typeahead. Deduped per query; keeps last 50.
{ "q": "cardiology", "type": "users", "entityId": "clxUser1", "entityType": "user" }
//   type ∈ all|users|posts|content|hashtag   entityType ∈ user|post|reel|case|hashtag (optional)
// → data: { recorded: { query, queryRaw, searchType, entityId, entityType } }

// GET /history?limit=20   (🔒)
// → data: { items: [ { id, query, queryRaw, searchType, entityId, entityType, createdAt, updatedAt } ] }

// DELETE /history/:id   (🔒) → removes one (404 if not yours)
// DELETE /history       (🔒) → data: { cleared: <count> }

// GET /popular?limit=20   (—) — most-searched TERMS in the last 7 days
// → data: { terms: [ { query: "cardiology", queryRaw: "Cardiology", count: 37 } ] }
```

## Frontend

```js
// typeahead — debounce 200ms and only call at length >= 3 (client-side guards)
let t;
input.oninput = (e) => {
  clearTimeout(t);
  const q = e.target.value.trim();
  if (q.length < 3) return showLocalHistory();          // on-device cache
  t = setTimeout(async () => {
    const { users, hashtags } = await api.get(`/search/suggest?q=${encodeURIComponent(q)}`);
    renderSuggestions(users, hashtags);                 // split user / hashtag panes
  }, 200);
};

// Profiles tab with filters + zero-results recovery
const r = await api.get(`/search/users?q=${q}&role=doctor&city=Mumbai`);
if (!r.users.length && r.fallback) renderSuggested(r.fallback.message, r.fallback.users);

// Unified content tab (opaque cursor — store & replay)
let cursor = null;
async function loadContent(reset) {
  const url = `/search/content?q=${q}&type=all&sort=recent${cursor && !reset ? `&cursor=${cursor}` : ''}`;
  const { items, nextCursor } = await api.get(url);
  cursor = nextCursor;                                   // null = end
  return items;                                          // each item.kind: post | case | reel
}

// Trending grid → tap a tag → workspace
const { hashtags } = await api.get(`/search/trending`);
const ws = await api.get(`/search/hashtag/cardiology?type=case_study`);
// ws.totalCount for the header; ws.items for the tabbed feed

// Search history: record on commit (not typeahead), show recents, clear
await api.post(`/search/history`, { q: term, type: "users" });          // on enter/result tap
const { items } = await api.get(`/search/history`);                      // "Recent searches" list
await api.del(`/search/history/${items[0].id}`);                        // remove one
await api.del(`/search/history`);                                        // clear all
const { terms } = await api.get(`/search/popular`);                      // "Popular searches" chips

// Deleted-content race (client): on card tap, fetch detail; a 404 → fade out + toast
//   "This content has been removed by the creator." (search already excludes deleted rows)
```

# Posts — `/api/posts`

Create/edit posts, like, comment (nested + `@mentions`), save, report, share. See
[index.md](index.md) for setup and [../feed.md](../feed.md) for the full feed UX guide.

`postType`: `post | research | thesis | case_study`.

## Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/` | 🔒 | Create post `multipart: media (×10)` |
| GET | `/:id` | 🔓 | Post detail |
| PUT | `/:id` | 🔒 | Edit (403 after 24 h) |
| DELETE | `/:id` | 🔒 | Delete own post |
| POST | `/:id/like` | 🔒 | Toggle like |
| GET | `/:id/likes` | 🔓 | Likers (rows carry `isFollowing`) |
| POST | `/:id/comments` | 🔒 | Add comment / reply (`@username` → notify) |
| GET | `/:id/comments` · `/:id/comments/:commentId/replies` | — | Comments / replies |
| DELETE | `/:id/comments/:commentId` | 🔒 | Delete own comment **or any on your post** |
| POST | `/:id/comments/:commentId/like` | 🔒 | Toggle comment like |
| POST | `/:id/save` | 🔒 | Toggle save |
| POST | `/:id/report` | 🔒 | Report `{ category, reason? }` |
| POST | `/:id/share/inapp` | 🔒 | Share into DMs |
| GET | `/:id/share/link` | — | Public copy-link |
| GET | `/saved` · `/user/:userId` · `/hashtag/:tag` · `/trending/hashtags` | mixed | Lists |

## JSON

```jsonc
// POST /   (JSON fields alongside multipart "media" ≤500MB/file, or JSON only)
{ "content": "New findings on SCAD",
  "postType": "research",                 // post | research | thesis | case_study
  "visibility": "public",                 // public | followers | only_me
  "specialties": ["Cardiology"],          // ≤10, drives the specialty chip filter
  "hashtags": ["SCAD", "Cardiology"],     // DEDICATED field (not parsed from caption); stored as #scad
  "mentions": ["@drbob", "clxUserId"] }   // DEDICATED field: @username (case-insensitive) and/or ids → resolved + notified
// 201 → data: { post: { id, content, postType, hashtags, mentions, author:{...}, ... } }
// Mentions trigger "mentioned you in a post"; hashtags index the post for search.

// PUT /:id   (≤24h) — caption/visibility/specialties/hashtags/mentions editable; MEDIA is locked.
//   403 after 24h → data: { code: "MODIFICATION_LEASE_EXPIRED" }

// POST /:id/like → data: { isLiked: true, likesCount: 42 }
// GET  /:id/likes → data: { users:[ { id, fullName, uniqueUsername, professionalHeadline,
//                                     profilePhoto, isVerified, isFollowing, isSelf } ], hasMore, nextCursor }

// POST /:id/comments
{ "content": "Great work @drbob", "parentId": "clxCommentId" }   // parentId omitted = root
// 201 → data: { comment: { id, content, author:{ uniqueUsername, professionalHeadline, isVerified, ... }, createdAt } }

// POST /:id/report
{ "category": "misinformation", "reason": "Cites a retracted study" }
// categories: spam, harassment, misinformation, hate_speech, nudity, violence,
//             self_harm, intellectual_property, impersonation, other

// POST /:id/share/inapp → { "recipientIds": ["clxUser1","clxUser2"] }
// GET  /:id/share/link  → data: { deepLink, webFallback }
```

## Frontend

```js
// create
const fd = new FormData();
fd.append("content", text); fd.append("postType", "research");
files.forEach(f => fd.append("media", f));
const { post } = await api.upload("/posts", fd);

// optimistic like
setLiked(true); setCount(c => c + 1);
try { const d = await api.post(`/posts/${id}/like`); setCount(d.likesCount); }
catch { setLiked(false); setCount(c => c - 1); toast("Couldn't like"); }

// like list (tap the count)
const { users } = await api.get(`/posts/${id}/likes?limit=20`);

// comment with mention
await api.post(`/posts/${id}/comments`, { content: "see fig 3 @drbob" });

// report
await api.post(`/posts/${id}/report`, { category: "spam" });
```

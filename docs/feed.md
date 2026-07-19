# Home Feed, Engagement & Social Graph — API Reference

Covers the Home Feed header filter, feed-card actions (3-dot menu, like, comment,
save, share), and the follow state machine. Run `npm run migrate` first
(adds `post_reports` + `follow_requests`).

All 🔒 requests need `Authorization: Bearer <accessToken>`. Responses use the
`{ statusCode, success, data, message }` envelope; `data` shapes shown below.

---

## 1. Specialty filter bar

The feed is filtered by the creator's specialty.

```bash
GET /api/feed/home?specialty=Cardiology&type=research&limit=20&cursor=<lastId>   🔒
GET /api/feed/explore?specialty=Cardiology                                       🔓
```
- `specialty` omitted (or `all`) → unified multi-specialty feed (the **All** tab).
- `type` ∈ `post | research | thesis | case_study` (optional content-type filter).
- Cursor-paginated: response carries `hasMore` + `nextCursor`.

Each feed card returns the author block (`id`, `fullName`, `uniqueUsername`,
`profilePhoto`, `isVerified`, `role`, `specialization`, **`isFollowing`**), `postType`
(the `[Thesis]`/`[Case Study]` tag), timestamps, and the viewer's `isLiked`/`isSaved`.
`author.isFollowing` drives the card-header button (see §5 State B).

---

## 2. Feed-card 3-dot menu

| Action | Endpoint |
|---|---|
| Edit (own post, ≤24 h) | `PUT /api/posts/:id` 🔒 — 403 after 24 h |
| Delete forever (own post) | `DELETE /api/posts/:id` 🔒 |
| **Report** (others' post) | `POST /api/posts/:id/report` 🔒 |
| Not interested (hide + downrank) | `POST /api/feed/not-interested/:postId` 🔒 |
| Don't recommend (block author from feed) | `POST /api/feed/mute/:userId` 🔒 (undo: `DELETE`) |

```bash
# Report a post — category required, reason optional
curl -X POST "$BASE/api/posts/$POST_ID/report" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{ "category": "misinformation", "reason": "Cites a retracted study" }'
# 200 "Report submitted. Our team will review it."
# categories: spam, harassment, misinformation, hate_speech, nudity,
#             violence, self_harm, intellectual_property, impersonation, other
```

**Admin moderation** (internal): `GET /api/admin/reports?status=pending` lists
reported posts (report + post + reporter + author); `DELETE /api/admin/posts/:postId`
removes any post network-wide; `POST /api/admin/reports/:reportId/dismiss` clears a
false report.

---

## 3. Likes + like-details list

```bash
curl -X POST "$BASE/api/posts/$POST_ID/like" -H "Authorization: Bearer $TOKEN"
# data: { "isLiked": true, "likesCount": 42 }   (toggle; re-call to unlike)

# Tap the like count → who liked it (rows include the follow/message state)
curl "$BASE/api/posts/$POST_ID/likes?limit=20" -H "Authorization: Bearer $TOKEN"
# data: { users: [ { id, fullName, uniqueUsername, professionalHeadline,
#                    profilePhoto, isVerified, isFollowing, isSelf } ], hasMore, nextCursor }
```
The client increments optimistically and rolls back to `likesCount` from the
response if the call fails.

**Per-row button (same State A/B rule as the feed card header — see §5):** each row
carries `isFollowing` + `connectionStatus` + `isSelf`:

```js
likers.forEach(u => {
  if (u.isSelf)                renderNothing();
  else if (!u.isFollowing)     renderFollow(u.id);                  // State A
  else if (u.connectionStatus === 'connected')        renderMessage(u.id);   // B Case 2
  else if (u.connectionStatus === 'pending_outgoing') renderConnecting();
  else if (u.connectionStatus === 'pending_incoming') renderAccept(u.id);
  else                         renderConnect(u.id);                 // B Case 1
});
```

So the same Follow → Connect → Message progression renders in *both* places — the
feed-card header and this like-details list.

---

## 4. Comments (nested, mentions, likes)

```bash
# Root comment
curl -X POST "$BASE/api/posts/$POST_ID/comments" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{ "content": "Great work @drbob — see fig 3" }'
# 201 data: { comment: { id, content, author: { uniqueUsername, professionalHeadline, isVerified, ... }, createdAt } }

# Reply (anchor to a comment)
curl -X POST "$BASE/api/posts/$POST_ID/comments" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{ "content": "Agreed", "parentId": "clxCommentId" }'

curl "$BASE/api/posts/$POST_ID/comments?limit=20"                       # root comments
curl "$BASE/api/posts/$POST_ID/comments/clxCommentId/replies"           # replies
curl -X POST "$BASE/api/posts/$POST_ID/comments/clxCommentId/like" -H "Authorization: Bearer $TOKEN"
curl -X DELETE "$BASE/api/posts/$POST_ID/comments/clxCommentId" -H "Authorization: Bearer $TOKEN"
```
- **@mentions:** `@uniqueusername` in a comment dispatches a `mention_comment`
  notification — *"[username] tagged you in a comment"* — with `meta.postId` +
  `meta.commentId` for deep-link auto-scroll. (Emails like `a@b.com` are ignored.)
- **Delete permission:** the comment **author** OR the **post owner** can delete any
  comment/reply under that post.

---

## 5. The follow state machine

```bash
# Follow (public → instant; private → request)
curl -X POST "$BASE/api/follows/$TARGET_ID" -H "Authorization: Bearer $TOKEN"
# public  → data: { "status": "following" }   (+counts, "started following you")
# private → data: { "status": "requested" }   (target gets "requested to follow you" + Confirm)

# Drive the button label
curl "$BASE/api/follows/check/$TARGET_ID" -H "Authorization: Bearer $TOKEN"
# data: { status: "not_following"|"requested"|"following", isFollowing, isFollowedBy, isRequested }
#   not_following → "Follow"   requested → "Requested"   following → "Following"
#   isFollowedBy === true (and not following) → render "Follow Back"

# Withdraw a pending request (silent)
curl -X DELETE "$BASE/api/follows/requests/$TARGET_ID" -H "Authorization: Bearer $TOKEN"

# Unfollow
curl -X DELETE "$BASE/api/follows/$TARGET_ID" -H "Authorization: Bearer $TOKEN"
```

**Private target's side** — manage incoming requests:

```bash
curl "$BASE/api/follows/requests" -H "Authorization: Bearer $TOKEN"
# data: { requests: [ { id, requestedAt, user: { id, fullName, uniqueUsername,
#                       professionalHeadline, profilePhoto, isVerified } } ], hasMore, nextCursor }

curl -X POST "$BASE/api/follows/requests/$REQUESTER_ID/accept" -H "Authorization: Bearer $TOKEN"
# Confirm → follow established (+counts); requester notified "accepted your follow request".

curl -X POST "$BASE/api/follows/requests/$REQUESTER_ID/reject" -H "Authorization: Bearer $TOKEN"
# Ignore → request removed silently (no notification).
```

Notifications dispatched: `follow` ("started following you"), `follow_request`
("requested to follow you"), `follow_request_accepted` ("accepted your follow
request") — all in-app + FCM push, category `connections`.

### State B — viewer already follows the target

Once `isFollowing === true`, the card header (and like-list row) is driven by the
**professional connection** state, exposed as `author.connectionStatus`:

| `connectionStatus` | Button | Action |
|---|---|---|
| `none` | **Connect** (Case 1) | `POST /api/network/request/:targetUserId` |
| `pending_outgoing` | **Connecting / Requested** | (await target) · cancel = reject on target side |
| `pending_incoming` | **Accept** | `POST /api/network/request/:requestId/accept` |
| `connected` | **Message** (Case 2) | `POST /api/chat/start` → opens the DM thread |

Both feed cards (`/api/feed/home`, `/api/reels/feed`) and like-list rows
(`/api/posts/:id/likes`, `/api/reels/:id/likes`) carry `isFollowing` + `connectionStatus`.

**Connect (Case 1)** sends a professional connection request → target sees it in
`GET /api/network/requests` (Network → Requests) and gets a
`connection_request` notification *"[uniqueusername] sent you a connection request"*
(deep-links to their Network requests). On **Accept**, both connection counters +1
and the row upgrades to **Message** (Case 2).

```js
// feed-card / like-row button (full State A + B)
if (a.id === me)              renderOwnerMenu();                 // own content
else if (!a.isFollowing)      renderFollow(a.id);                // State A → POST /follows/:id
else if (a.connectionStatus === 'connected') renderMessage(a.id); // B Case 2 → POST /chat/start
else if (a.connectionStatus === 'pending_outgoing') renderConnecting();
else if (a.connectionStatus === 'pending_incoming') renderAccept(a.id);
else                          renderConnect(a.id);               // B Case 1 → POST /network/request/:id
```

**Unfollow** (tapping a "Following" indicator elsewhere) still uses
`DELETE /api/follows/:targetId` — removes the mapping and decrements both counts by 1.

---

## 6. Save (bookmarks)

```bash
curl -X POST "$BASE/api/posts/$POST_ID/save" -H "Authorization: Bearer $TOKEN"   # toggle
curl "$BASE/api/feed/saved?tab=case_study" -H "Authorization: Bearer $TOKEN"      # private Saved tab by category
```
The Saved tab is private to the owner; `tab` ∈ `all | post | research | thesis |
case_study | reel`.

---

## 7. Share

```bash
# 1) In-app DM share (drops a post reference into chat threads)
curl -X POST "$BASE/api/posts/$POST_ID/share/inapp" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{ "recipientIds": ["clxUser1","clxUser2"] }'

# 2) Public copy-link (read-only web preview; no tokens/session leaked)
curl "$BASE/api/posts/$POST_ID/share/link"
# data: { "deepLink": "orovion://post/...", "webFallback": "https://orovion.app/post/..." }
```
WhatsApp / Instagram / Telegram are **client-side** deep-links built from the
copy-link URL — no API needed.

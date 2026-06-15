# Follows — `/api/follows`

The follow state machine: instant follow for public accounts, request/confirm flow
for private accounts. See [index.md](index.md) and [../feed.md](../feed.md) §5.

## Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/:userId` | 🔒 | Follow (public = instant, private = request) |
| DELETE | `/:userId` | 🔒 | Unfollow |
| GET | `/check/:userId` | 🔒 | Relationship state (drives the button) |
| GET | `/requests` | 🔒 | Incoming follow requests (private account) |
| POST | `/requests/:requesterId/accept` | 🔒 | Confirm a request |
| POST | `/requests/:requesterId/reject` | 🔒 | Ignore a request (silent) |
| DELETE | `/requests/:targetId` | 🔒 | Withdraw your pending request (silent) |
| DELETE | `/followers/:userId` | 🔒 | Remove a follower |
| GET | `/:userId/followers` · `/:userId/following` | 🔓 | Lists |
| GET | `/suggestions` | 🔒 | Suggested users |

## JSON

```jsonc
// POST /:userId
// public  → data: { status: "following" }   (+counts, "started following you")
// private → data: { status: "requested" }   (target notified "requested to follow you")

// GET /check/:userId
// → data: { status: "not_following"|"requested"|"following", isFollowing, isFollowedBy, isRequested }
//   button: not_following→Follow · requested→Requested · following→Following
//   isFollowedBy && !isFollowing → "Follow Back"

// GET /requests
// → data: { requests: [ { id, requestedAt,
//             user: { id, fullName, uniqueUsername, professionalHeadline, profilePhoto, isVerified } } ],
//           hasMore, nextCursor }

// POST /requests/:requesterId/accept → data: { status: "following" }   (requester notified)
// POST /requests/:requesterId/reject → 200 (silent)
// DELETE /requests/:targetId         → data: { status: "not_following" }
```

## Frontend

```js
// Tap Follow
const { status } = await api.post(`/follows/${targetId}`);
setLabel(status === "requested" ? "Requested" : "Following");

// Tap while Requested → withdraw
await api.del(`/follows/requests/${targetId}`);  setLabel("Follow");

// Button hydration
const s = await api.get(`/follows/check/${targetId}`);
setLabel(s.status === "following" ? "Following" : s.status === "requested" ? "Requested"
        : s.isFollowedBy ? "Follow Back" : "Follow");

// State B (already following): show a Message button instead of Follow.
// Feed cards carry author.isFollowing; like-list rows carry isFollowing.
if (s.status === "following") {
  const { conversation } = await api.post("/chat/start", { recipientId: targetId });
  // navigate to conversation.id
}
// Unfollow (tap a "Following" indicator) → counts -1, mapping removed:
await api.del(`/follows/${targetId}`);

// Private account: requests inbox
const { requests } = await api.get("/follows/requests");
await api.post(`/follows/requests/${requesterId}/accept`);   // Confirm
await api.post(`/follows/requests/${requesterId}/reject`);   // Ignore
```

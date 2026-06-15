# Chat — `/api/chat`

A thin gateway in front of the **chat-service**. The decorated routes below enrich
responses with user-profile data; everything else under `/api/chat/*` is reverse-
proxied straight through. All routes require auth. See [index.md](index.md).

> **Real-time:** messages arrive over a **direct Socket.IO connection to
> chat-service** (port 5001), not this REST gateway. Use these endpoints for
> history/sending; use the socket for live delivery, typing, and presence.

## Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/conversations` | Conversation list (enriched with profiles) |
| POST | `/start` | Start / get a 1:1 conversation |
| GET | `/:conversationId/messages` | Message history (cursor) |
| POST | `/:conversationId/messages` | Send a message |
| (any) | `/...` | Proxied to chat-service |

## JSON

```jsonc
// POST /start
{ "recipientId": "clxUser456" }
// → data: { conversation: { id, participants: [ { id, fullName, uniqueUsername, profilePhoto } ], ... } }

// GET /:conversationId/messages?cursor=&limit=30
// → data: { messages: [ { id, senderId, content, messageType, createdAt } ], hasMore, nextCursor }

// POST /:conversationId/messages
{ "content": "Hi Dr. Sharma, thanks for connecting!", "messageType": "text" }
```

Post/reel/profile **shares** also land here as embedded reference messages (sent via
`POST /api/posts/:id/share/inapp` etc.).

## Frontend

```js
const { conversation } = await api.post("/chat/start", { recipientId });
const { messages, nextCursor } = await api.get(`/chat/${conversation.id}/messages?limit=30`);
await api.post(`/chat/${conversation.id}/messages`, { content: text, messageType: "text" });

// live updates: open a Socket.IO connection to chat-service (5001) with the access token,
// and listen for new-message / typing / presence events there.
```

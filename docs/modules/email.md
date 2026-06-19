# Email preferences — `/api/email`

Per-category **email** opt-ins (separate from in-app/push notification prefs in
[notifications.md](notifications.md)). All routes require auth. See [index.md](index.md).

> Same data as `GET·PUT /api/account/email-preferences` ([account.md](account.md)) —
> both read/write the one `email_preferences` row per user with the four categories
> below. Either endpoint works; this module is the standalone alias.

## Categories

| Key | Meaning | Default |
|---|---|---|
| `accountSecurity` | Login alerts, password/security emails | `true` |
| `messagesConnections` | New messages & connection activity | `true` |
| `consultationUpdates` | Consultation booking/status emails | `false` |
| `productUpdates` | Product news & announcements | `true` |

A row is created lazily on first read. Only `boolean` fields in the PUT body are
applied; anything else is ignored (partial update — send just what changed).

## Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/preferences` | 🔒 | Fetch the caller's email opt-ins |
| PUT | `/preferences` | 🔒 | Update one or more opt-ins (partial) |

## JSON

```jsonc
// GET /preferences
// → data: { preferences: { accountSecurity: true, messagesConnections: true,
//                          consultationUpdates: false, productUpdates: true } }

// PUT /preferences   — send only the toggles you want to change (must be booleans)
{ "productUpdates": false, "consultationUpdates": true }
// → data: { preferences: { accountSecurity, messagesConnections,
//                          consultationUpdates, productUpdates } }
```

## Frontend

```js
const { preferences } = await api.get("/email/preferences");
await api.put("/email/preferences", { productUpdates: false });
```

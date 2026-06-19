# Account — `/api/account`

Settings, privacy, email prefs, feedback/support, and account lifecycle. All routes
require auth. See [index.md](index.md).

## Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/settings-menu` | 🔒 | Settings menu structure |
| GET | `/personal-details` | 🔒 | Editable personal details |
| GET·PUT | `/privacy` | 🔒 | Profile visibility (public/private) |
| GET·PUT | `/email-preferences` | 🔒 | Email opt-ins |
| GET | `/legal` | 🔒 | Legal links |
| POST | `/feedback` | 🔒 | Submit feedback (`multipart: images ≤5`) |
| POST | `/support` | 🔒 | Support ticket |
| POST | `/deactivate` · `/delete` · `/restore` | 🔒 | Account lifecycle |
| GET·PUT | `/call-settings` | 🔒 doctor | Consult availability |

## JSON

```jsonc
// PUT /privacy        → controls whether your profile is public or PRIVATE
{ "profileVisibility": "private" }         // public | private
// (PRIVATE makes new followers go through the request flow — see follows.md)

// GET /email-preferences
// → data: { preferences: { accountSecurity, messagesConnections,
//                          consultationUpdates, productUpdates } }   // all booleans
// PUT /email-preferences   (partial; same data as /api/email — see email.md)
{ "productUpdates": false }

// POST /feedback      { "category": "bug", "message": "Reels feed stutters." }
// POST /support       { "subject": "Cannot upload license", "description": "...", "category": "verification" }

// PUT /call-settings  (doctor)
{ "inboundWhitelist": ["connections"],
  "availabilityWindows": [{ "day": "Mon", "start": "18:00", "end": "20:00" }],
  "requirePreCallNote": true, "silentDuringForeground": false }

// POST /deactivate · /delete · /restore   → no body
```

Lifecycle: `delete` → `accountStatus: pending_deletion`; `deactivate` →
`deactivated`. Logging back in auto-restores both to `active`. `suspended` is always
rejected.

## Frontend

```js
await api.put("/account/privacy", { profileVisibility: "private" });
await api.post("/account/feedback", { category: "bug", message: text });
await api.post("/account/deactivate");
```

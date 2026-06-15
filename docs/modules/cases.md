# Cases — `/api/cases`

Clinical case-study posts: CRUD, comments, "helpful" reaction, save, follow. See [index.md](index.md).

## Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/feed` | 🔓 | Case feed |
| POST | `/` | 🔒 | Create `multipart: attachments (≤10 image/pdf)` |
| GET | `/:id` | 🔓 | Case detail |
| PUT | `/:id` | 🔒 | Update own case |
| DELETE | `/:id` | 🔒 | Delete own case |
| POST | `/:id/comments` | 🔒 | Add comment |
| POST | `/:id/helpful` | 🔒 | Toggle "helpful" |
| POST | `/:id/save` | 🔒 | Toggle save |
| POST | `/:id/follow` | 🔒 | Follow case for updates |
| POST | `/:id/attachment` | 🔒 | Add an attachment |

## JSON

```jsonc
// POST /   (multipart "attachments" + JSON fields)
{ "title": "55M with atypical chest pain and normal ECG",
  "description": "Patient presented with...", "specialty": "Cardiology",
  "hipaaCompliant": true, "visibility": "public", "tags": ["chestpain","ecg"] }
// 201 → data: { case: { id, title, description, specialty, hipaaCompliant, visibility,
//                       tags, attachments, likesCount, commentsCount, savesCount,
//                       author:{ id, fullName, uniqueUsername, isVerified, ... }, createdAt } }

// POST /:id/helpful → data: { isHelpful: true, helpfulCount }   (toggle)
// POST /:id/comments → { "content": "Consider a stress echo." }
```

## Frontend

```js
const fd = new FormData();
fd.append("title", title); fd.append("description", desc); fd.append("specialty", "Cardiology");
files.forEach(f => fd.append("attachments", f));
const { case: c } = await api.upload("/cases", fd);

await api.post(`/cases/${c.id}/helpful`);
await api.post(`/cases/${c.id}/save`);
await api.post(`/cases/${c.id}/follow`);
```

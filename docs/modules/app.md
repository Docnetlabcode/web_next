# App — `/api/app`

App version check + Android APK distribution (served via Backblaze B2). Public reads;
writes are admin-only. See [index.md](index.md).

## Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/version` | — | Latest version + update policy |
| GET | `/download/apk` | — | Download/redirect to the current APK |
| PUT | `/version` | admin | Upsert version metadata |
| POST | `/upload-apk` | admin | Upload a new APK `multipart: apk` |
| POST | `/notify-update` | admin | Broadcast an update notification |

## JSON

```jsonc
// GET /version
// → data: { latestVersion: "1.4.0", minSupportedVersion: "1.2.0",
//           forceUpdate: false, downloadUrl: "https://.../doklynk.apk", releaseNotes: "..." }

// PUT /version (admin)
{ "latestVersion": "1.4.0", "minSupportedVersion": "1.2.0",
  "forceUpdate": false, "releaseNotes": "Bug fixes" }
```

## Frontend

```js
// on app boot — gate the user if their build is too old
const v = await api.get("/app/version");
if (compare(currentBuild, v.minSupportedVersion) < 0 || v.forceUpdate) {
  showUpdateGate(v.downloadUrl, v.releaseNotes);
}
```

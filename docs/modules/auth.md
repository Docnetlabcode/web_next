# Auth — `/api/auth`

Login (phone OTP + Google), token refresh, and session management. See
[index.md](index.md) for the base URL, envelope, and client setup.

> **Phone OTP is sent by Firebase on the client**, not by this API. `/send-otp` only
> registers intent (role + 60s cooldown); the client gets a Firebase ID token and
> exchanges it at `/verify-otp`.

## Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/meta/specializations` | — | Doctor metadata (specializations, degrees, councils) |
| GET | `/meta/courses` | — | Student metadata (courses, years) |
| POST | `/send-otp` | — | Register a login attempt (rate-limited) |
| POST | `/verify-otp` | — | Exchange Firebase phone token → app tokens |
| POST | `/google` | — | Google sign-in via Firebase token |
| POST | `/refresh-token` | — | Rotate access token |
| POST | `/logout` | 🔒 | Log out current session |
| POST | `/logout-all` | 🔒 | Log out all sessions |
| GET | `/sessions` | 🔒 | List active sessions |
| DELETE | `/sessions/:sessionId` | 🔒 | Revoke one session |

## JSON

```jsonc
// POST /send-otp
{ "phoneNumber": "9876543210", "countryCode": "+91", "role": "doctor" }
// → data: { "cooldownSeconds": 60 }

// POST /verify-otp   (firebaseIdToken from firebase user.getIdToken())
{ "firebaseIdToken": "eyJhbGciOi..." }
// → data: { accessToken, refreshToken?|csrfToken?, isNewUser, user }

// POST /google
{ "firebaseIdToken": "eyJhbGciOi...", "role": "general_user" }
// → data: { accessToken, refreshToken?|csrfToken?, isNewUser, user }

// user object:
{ "id": "clx...", "fullName": "Dr. Anya", "uniqueUsername": "dranya",
  "role": "doctor", "gender": "female", "profilePhoto": null,
  "isProfileComplete": false, "isVerified": false, "publicProfileSlug": "..." }

// POST /refresh-token   (mobile sends body; web uses cookie + X-CSRF-Token)
{ "refreshToken": "eyJ..." }              // mobile only
// → data: { accessToken, refreshToken?|csrfToken? }

// GET /sessions → data: { sessions: [ { sessionId, platform, deviceName, ipAddress, lastActiveAt } ], total }
```

`isNewUser: true` → send the user through onboarding ([users.md](users.md)).

## Frontend

```js
import { api, setAccessToken } from "./api";
import { getAuth, signInWithPhoneNumber, RecaptchaVerifier } from "firebase/auth";

// 1) register intent + 60s cooldown
await api.post("/auth/send-otp", { phoneNumber: "9876543210", countryCode: "+91", role: "doctor" });
// 2) Firebase sends the SMS (client)
const verifier = new RecaptchaVerifier(getAuth(), "recaptcha", { size: "invisible" });
const confirmation = await signInWithPhoneNumber(getAuth(), "+919876543210", verifier);
// 3) user types code → Firebase confirms
const cred = await confirmation.confirm("123456");
const firebaseIdToken = await cred.user.getIdToken();
// 4) exchange for app tokens
const { accessToken, user, isNewUser } = await api.post("/auth/verify-otp", { firebaseIdToken });
setAccessToken(accessToken);                       // refresh token is an httpOnly cookie (web)
if (isNewUser) location.assign("/onboarding");

// Restore session on reload (no re-login if the refresh cookie is valid):
await api.refresh();
```

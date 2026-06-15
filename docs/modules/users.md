# Users — `/api/users`

Onboarding (post-OTP quick setup), role-specific onboarding steps, public profile
by slug, and user search. See [index.md](index.md) for setup.

## Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/onboard` | 🔒 | Complete basic profile after first login |
| POST | `/onboard/firebase` | 🔥 Firebase | Onboarding via Firebase session |
| GET | `/session/firebase` | 🔥 Firebase | Check Firebase profile completeness |
| PUT | `/onboard/professional` | 🔒 doctor | Doctor professional details |
| PUT | `/onboard/verification` | 🔒 doctor | Doctor verification (onboarding) |
| PUT | `/onboard/student` | 🔒 student | Student academic details |
| GET | `/profile/me` | 🔒 | Own user object |
| PUT | `/profile/me` | 🔒 | Update own profile |
| GET | `/profile/:slug` | 🔓 | Public profile by slug |
| GET | `/search?q=` | 🔓 | User search |

## JSON

```jsonc
// POST /onboard   — the quick-setup page sends the role-specific field:
//   doctor → specialization · student → degree · general_user → age
{
  "fullName": "Dr. Anya Sharma",
  "role": "doctor",                  // doctor | student | general_user
  "gender": "female",                // male | female | other | prefer_not_to_say
  "dateOfBirth": "1990-04-12",       // ISO, not future
  "specialization": "Cardiology",    // doctor
  "degree": "MBBS",                  // student
  "age": 22,                         // general_user (1–150)
  "bio": "Interventional cardiologist.",
  "location": "Mumbai, India"
}
// → data: { user: { id, fullName, uniqueUsername, role, gender, isProfileComplete: true, ... } }
// A unique default username is auto-assigned here; change it via /api/profile/me/username.

// GET /search?q=anya&limit=10
// → data: { users: [ { id, fullName, uniqueUsername, profilePhoto, role,
//                      specialization, isVerified, publicProfileSlug } ], hasMore, nextCursor }
```

## Frontend

```js
// after verify-otp returns isNewUser:true
await api.post("/users/onboard", {
  fullName: "Dr. Anya Sharma", role: "doctor", gender: "female", specialization: "Cardiology",
});

// user search (debounced)
const { users } = await api.get(`/users/search?q=${encodeURIComponent(term)}&limit=10`);
```

> For viewing/editing the rich profile (sections, lists, username, verification,
> photos), use the **Profile** module → [profile.md](profile.md).

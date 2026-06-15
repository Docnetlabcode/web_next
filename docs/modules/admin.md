# Admin — `/api/admin`

Internal ops console: verification queue + **reported-content moderation**. All
routes require **admin** auth (`admin.middleware`), not a normal user token. See [index.md](index.md).

## Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/verifications?status=SUBMITTED` | Doctor verification queue |
| GET | `/verifications/stats` | Funnel counts |
| GET | `/verifications/:userId` | Detail (profile + structured submission) |
| POST | `/verifications/:userId/in-review` | Mark in review |
| POST | `/verifications/:userId/approve` | Approve (sets badge, **notifies user**) |
| POST | `/verifications/:userId/reject` | Reject `{ reason }` (notifies user) |
| POST | `/verifications/:userId/reset` | Reset to NOT_SUBMITTED |
| GET | `/student-verifications` | Student queue |
| POST | `/student-verifications/:userId/approve` · `/reject` | Decide (notifies user) |
| GET | `/reports?status=pending` | Reported-posts queue |
| POST | `/reports/:reportId/dismiss` | Dismiss a false report |
| DELETE | `/posts/:postId` | **Master delete** any post network-wide |
| GET | `/feedback` · `/deletions` | Feedback list · deletion queue |

## JSON

```jsonc
// GET /reports?status=pending&limit=20
// → data: { reports: [ {
//     id, category, reason, status, createdAt,
//     post:     { id, content, postType, mediaUrls, isDeleted, likesCount, commentsCount },
//     reporter: { id, fullName, uniqueUsername },
//     author:   { id, fullName, uniqueUsername, isVerified, role }
//   } ], hasMore, nextCursor }

// DELETE /posts/:postId            → "Post removed by admin."  (soft-delete + reports → reviewed)
// POST   /reports/:reportId/dismiss → "Report dismissed."

// GET /verifications/:userId
// → data: { profile: { ...doctor_profiles, kycStatus, user:{...} },
//           verification: { pathType, ...PathA/PathB fields, submittedAt } | null }
// POST /verifications/:userId/reject  → { "reason": "Document unclear" }
```

## Frontend (admin dashboard)

```js
// reports moderation
const { reports } = await api.get("/admin/reports?status=pending");
await api.del(`/admin/posts/${postId}`);                 // remove violating post
await api.post(`/admin/reports/${reportId}/dismiss`);    // false report

// verification queue
const { verifications } = await api.get("/admin/verifications?status=SUBMITTED");
const detail = await api.get(`/admin/verifications/${userId}`);
await api.post(`/admin/verifications/${userId}/approve`);
await api.post(`/admin/verifications/${userId}/reject`, { reason: "ID unclear" });
```

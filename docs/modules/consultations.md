# Consultations — `/api/consultations`

Video-consult booking between a user and a doctor: book → pay → doctor
approve/decline → optional refund. All routes require auth. See [index.md](index.md).

## Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/` | 🔒 | Book a slot |
| GET | `/` | 🔒 | My consultations |
| GET | `/:id` | 🔒 | Consultation detail |
| POST | `/:id/pay` | 🔒 | Submit payment result |
| POST | `/:id/approve` | 🔒 doctor | Approve booking |
| POST | `/:id/decline` | 🔒 doctor | Decline booking |
| POST | `/:id/refund` | 🔒 | Refund |

## JSON

```jsonc
// POST /
{ "doctorId": "clxdoctor789", "sessionLength": 15, "fee": 500,
  "reason": "Follow-up on angiography", "scheduledAt": "2026-06-15T10:30:00.000Z" }
// 201 → data: { consultation: { id, status: "pending_payment", doctorId, scheduledAt, fee, ... } }

// POST /:id/pay
{ "status": "success", "gateway": "UPI", "transactionId": "TXN1234567890" }

// POST /:id/decline → { "declineReason": "Unavailable that day" }
// POST /:id/refund  → { "reason": "Doctor declined" }
```

## Frontend

```js
const { consultation } = await api.post("/consultations", {
  doctorId, sessionLength: 15, fee: 500, reason, scheduledAt: iso,
});
await api.post(`/consultations/${consultation.id}/pay`, { status: "success", gateway: "UPI", transactionId });
const { consultations } = await api.get("/consultations");
// doctor side:
await api.post(`/consultations/${id}/approve`);
await api.post(`/consultations/${id}/decline`, { declineReason: "Unavailable" });
```

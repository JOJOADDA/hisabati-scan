# Hisabati Scanner — submit-receipt API Contract

Hisabati Core is the system of record. Scanner only captures an image and shows the result.

## Endpoint

```
POST https://phspovgryirskfyydtzs.supabase.co/functions/v1/submit-receipt
Authorization: Bearer <supabase user access_token>
apikey: <publishable key>
Content-Type: application/json
```

Auth uses `supabase.auth.signInWithPassword` against the same project.
Never embed a service-role key in Scanner.

## Request

```json
{
  "organization_id": "uuid",
  "branch_id": "uuid",
  "client_document_id": "uuid",
  "image_base64": "data:image/jpeg;base64,...",
  "note": "optional, max 500 chars",
  "captured_at": "2026-08-10T09:00:00Z"
}
```

- `organization_id` / `branch_id` are untrusted and verified server-side.
- `client_document_id` is generated ONCE per capture and reused on every retry.
- Image: JPEG / PNG / WEBP, max 5 MB decoded. Downscale to ~1600px, JPEG q≈0.7.

Pickers come from two RLS-protected reads: `user_roles` (organization_id, role, branch_id)
and `branches` (id, name where organization_id = selected org, is_deleted = false, is_active = true).

## Success (200)

```json
{
  "success": true,
  "status": "created",
  "transfer_id": "uuid",
  "client_document_id": "uuid",
  "needs_review": false,
  "duplicate": { "is_duplicate": false, "reason": null, "existing_transfer_id": null },
  "fraud": { "score": 15, "flags": [] },
  "data": {
    "amount": 250000,
    "transfer_date": "2026-08-10",
    "sender_name": "...",
    "transaction_id": "...",
    "receiver_account": "...",
    "sender_account": "...",
    "bank_comment": "...",
    "reference_number": "...",
    "confidence": 88
  },
  "error": null
}
```

A retry of an already-processed capture returns 200 with `"status": "duplicate_retry"` and the original `transfer_id`.

## Errors

```json
{ "success": false, "status": "...", "error": { "code": "...", "message": "رسالة عربية" } }
```

| HTTP | code | Meaning |
|---|---|---|
| 401 | unauthorized | missing / invalid / expired JWT |
| 403 | org_forbidden | user is not a member of the organization |
| 403 | branch_forbidden | branch not in org, inactive, or outside the user's branch scope |
| 400 | invalid_request | malformed body or ids |
| 413 | image_too_large | decoded image > 5 MB |
| 415 | unsupported_media_type | not JPEG/PNG/WEBP |
| 422 | not_a_receipt | not a receipt, confidence < 50, or amount <= 0 |
| 409 | duplicate_image | same image already recorded in this organization |
| 409 | duplicate_transaction | same transaction_id already recorded |
| 429 | rate_limited | 20 requests/minute/user, `Retry-After: 60` |
| 500 | ai_failed / storage_failed / internal_error | processing failure, safe to retry |

409 responses include `duplicate.existing_transfer_id`.

## Rate limit

20 requests per minute per user, separate bucket from the web app's extraction endpoint.

## Retry & idempotency

- Queue captures locally with their `client_document_id`; never regenerate it.
- Retry only on network errors, 429, and 5xx (exponential backoff). Never retry other 4xx.
- Response lost after success → the retry returns `duplicate_retry` with the original transfer.
- Guarantee: one captured receipt = one Hisabati transfer.

## What Scanner must NOT do

No OCR, no AI, no duplicate or fraud logic, no direct writes to `transfers`, no accounting
or ledger logic, no public receipt URLs. To display a past receipt image, call the existing
`secure-image` function with `{ "transferId": "..." }`.

export type QueueStatus = "pending" | "uploading" | "failed";

export interface QueueItem {
  /** Generated ONCE per capture. Never regenerated on retry — this is the idempotency key. */
  client_document_id: string;
  organization_id: string;
  branch_id: string;
  image_base64: string;
  note?: string | undefined;
  captured_at: string;
  status: QueueStatus;
  attempts: number;
  next_attempt_at: number;
  last_error?: string | undefined;
}

export interface ReceiptData {
  amount?: number | undefined;
  transfer_date?: string | undefined;
  sender_name?: string | undefined;
  transaction_id?: string | undefined;
  receiver_account?: string | undefined;
  sender_account?: string | undefined;
  bank_comment?: string | undefined;
  reference_number?: string | undefined;
  confidence?: number | undefined;
}

export interface SubmitSuccess {
  kind: "success";
  status: string; // "created" | "duplicate_retry" | ...
  transfer_id?: string | undefined;
  client_document_id?: string | undefined;
  needs_review?: boolean | undefined;
  data?: ReceiptData | undefined;
}

export interface SubmitDuplicate {
  kind: "duplicate";
  code: "duplicate_image" | "duplicate_transaction" | string;
  message: string;
}

export interface SubmitFailure {
  kind: "error";
  /** Whether the caller may retry later with the SAME client_document_id. */
  retryable: boolean;
  status?: number | undefined;
  code?: string | undefined;
  message: string;
  retryAfterMs?: number | undefined;
  authExpired?: boolean | undefined;
}

export type SubmitResult = SubmitSuccess | SubmitDuplicate | SubmitFailure;

export interface Organization {
  id: string;
  name: string;
}

export interface Branch {
  id: string;
  name: string;
}

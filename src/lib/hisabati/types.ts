export type QueueStatus = "pending" | "uploading" | "failed";

export interface QueueItem {
  /** Generated ONCE per capture. Never regenerated on retry — this is the idempotency key. */
  client_document_id: string;
  organization_id: string;
  branch_id: string;
  image_base64: string;
  note?: string;
  captured_at: string;
  status: QueueStatus;
  attempts: number;
  next_attempt_at: number;
  last_error?: string;
}

export interface ReceiptData {
  amount?: number;
  transfer_date?: string;
  sender_name?: string;
  transaction_id?: string;
  receiver_account?: string;
  sender_account?: string;
  bank_comment?: string;
  reference_number?: string;
  confidence?: number;
}

export interface SubmitSuccess {
  kind: "success";
  status: string; // "created" | "duplicate_retry" | ...
  transfer_id?: string;
  client_document_id?: string;
  needs_review?: boolean;
  data?: ReceiptData;
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
  status?: number;
  code?: string;
  message: string;
  retryAfterMs?: number;
  authExpired?: boolean;
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

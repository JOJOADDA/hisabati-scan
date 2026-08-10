import { getAccessToken, getSupabase, refreshAccessToken } from "./client";
import { getHisabatiKey, getHisabatiUrl, SUBMIT_RECEIPT_PATH } from "./config";
import type { QueueItem, ReceiptData, SubmitResult } from "./types";

const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504]);

export interface SubmitPayload {
  organization_id: string;
  branch_id: string;
  client_document_id: string;
  image_base64: string;
  note?: string;
  captured_at: string;
}

export function payloadFromQueueItem(item: QueueItem): SubmitPayload {
  return {
    organization_id: item.organization_id,
    branch_id: item.branch_id,
    client_document_id: item.client_document_id,
    image_base64: item.image_base64,
    ...(item.note ? { note: item.note } : {}),
    captured_at: item.captured_at,
  };
}

/**
 * Calls the EXISTING Hisabati edge function. Scanner adds no business logic.
 * Retries the request once after a token refresh on 401.
 */
export async function submitReceipt(payload: SubmitPayload): Promise<SubmitResult> {
  const url = getHisabatiUrl();
  const key = getHisabatiKey();
  if (!url || !key) {
    return { kind: "error", retryable: false, message: "Hisabati connection is not configured." };
  }
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return { kind: "error", retryable: true, message: "No internet connection." };
  }

  let token = await getAccessToken();
  if (!token) {
    return { kind: "error", retryable: false, authExpired: true, message: "Your session has expired. Please sign in again." };
  }

  let res: Response;
  try {
    res = await doRequest(url, key, token, payload);
  } catch {
    return { kind: "error", retryable: true, message: "Network error." };
  }

  if (res.status === 401) {
    const fresh = await refreshAccessToken();
    if (!fresh) {
      return { kind: "error", retryable: false, authExpired: true, message: "Your session has expired. Please sign in again." };
    }
    token = fresh;
    try {
      res = await doRequest(url, key, token, payload);
    } catch {
      return { kind: "error", retryable: true, message: "Network error." };
    }
    if (res.status === 401) {
      return { kind: "error", retryable: false, authExpired: true, message: "Your session has expired. Please sign in again." };
    }
  }

  const body = await safeJson(res);

  if (res.ok) {
    return {
      kind: "success",
      status: (body?.["status"] as string) ?? "created",
      transfer_id: body?.["transfer_id"] as string | undefined,
      client_document_id: body?.["client_document_id"] as string | undefined,
      needs_review: Boolean(body?.["needs_review"]),
      data: (body?.["data"] as ReceiptData | undefined) ?? undefined,
    };
  }


  const code = (body?.["error"] ?? body?.["code"] ?? "") as string;
  const message = (body?.["message"] as string) || (body?.["error"] as string) || `Request failed (${res.status})`;

  if (res.status === 409) {
    return { kind: "duplicate", code: code || "duplicate_image", message };
  }

  if (res.status === 429) {
    const retryAfter = Number(res.headers.get("Retry-After"));
    return {
      kind: "error",
      retryable: true,
      status: 429,
      code: "rate_limited",
      message: "Rate limit reached. The receipt stays queued.",
      retryAfterMs: Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 60_000,
    };
  }

  return {
    kind: "error",
    retryable: RETRYABLE_STATUS.has(res.status),
    status: res.status,
    code,
    message,
  };
}

async function doRequest(url: string, key: string, token: string, payload: SubmitPayload) {
  return fetch(`${url}${SUBMIT_RECEIPT_PATH}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: key,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
}

async function safeJson(res: Response): Promise<Record<string, unknown> | null> {
  try {
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Organizations the signed-in user is allowed to use (via user_roles). RLS is the source of truth. */
export async function fetchOrganizations() {
  const sb = getSupabase();
  if (!sb) return [];
  const { data: userData } = await sb.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return [];

  const { data: roles, error } = await sb.from("user_roles").select("organization_id").eq("user_id", uid);
  if (error) throw error;

  const ids = Array.from(new Set((roles ?? []).map((r) => (r as Record<string, string>)["organization_id"]).filter(Boolean)));
  if (ids.length === 0) return [];

  const { data: orgs, error: orgErr } = await sb.from("organizations").select("id, name").in("id", ids);
  if (orgErr) throw orgErr;
  return (orgs ?? []) as { id: string; name: string }[];
}

/** Branches the user may submit to inside an organization. */
export async function fetchBranches(organizationId: string) {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from("branches")
    .select("id, name")
    .eq("organization_id", organizationId)
    .order("name");
  if (error) throw error;
  return (data ?? []) as { id: string; name: string }[];
}

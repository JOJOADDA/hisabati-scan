import { payloadFromQueueItem, submitReceipt } from "./api";
import { emitQueueChange, listQueue, putItem, removeItem } from "./queue";
import type { QueueItem, SubmitResult } from "./types";

const MAX_ATTEMPTS = 8;
let running = false;
let timer: ReturnType<typeof setInterval> | null = null;

function backoffMs(attempts: number) {
  return Math.min(5 * 60_000, 2000 * Math.pow(2, Math.max(0, attempts - 1)));
}

export type QueueOutcome = { item: QueueItem; result: SubmitResult };

const outcomeListeners = new Set<(o: QueueOutcome) => void>();
export function onQueueOutcome(fn: (o: QueueOutcome) => void) {
  outcomeListeners.add(fn);
  return () => outcomeListeners.delete(fn);
}

/** Attempts one queued item. Always reuses the stored client_document_id (idempotency). */
export async function processItem(item: QueueItem): Promise<SubmitResult> {
  await putItem({ ...item, status: "uploading" });
  emitQueueChange();

  const result = await submitReceipt(payloadFromQueueItem(item));

  if (result.kind === "success" || result.kind === "duplicate") {
    await removeItem(item.client_document_id);
  } else if (!result.retryable || item.attempts + 1 >= MAX_ATTEMPTS) {
    await putItem({
      ...item,
      status: "failed",
      attempts: item.attempts + 1,
      last_error: result.message,
    });
  } else {
    const wait = result.retryAfterMs ?? backoffMs(item.attempts + 1);
    await putItem({
      ...item,
      status: "pending",
      attempts: item.attempts + 1,
      next_attempt_at: Date.now() + wait,
      last_error: result.message,
    });
  }

  emitQueueChange();
  outcomeListeners.forEach((fn) => fn({ item, result }));
  return result;
}

export async function drainQueue() {
  if (running) return;
  if (typeof navigator !== "undefined" && navigator.onLine === false) return;
  running = true;
  try {
    const items = await listQueue();
    for (const item of items) {
      if (item.status === "failed") continue;
      if (item.next_attempt_at > Date.now()) continue;
      const result = await processItem(item);
      if (result.kind === "error" && result.authExpired) break;
      if (result.kind === "error" && result.code === "rate_limited") break;
    }
  } finally {
    running = false;
  }
}

export function startQueueProcessor() {
  if (typeof window === "undefined" || timer) return () => {};
  const kick = () => void drainQueue();
  timer = setInterval(kick, 15_000);
  window.addEventListener("online", kick);
  kick();
  return () => {
    if (timer) clearInterval(timer);
    timer = null;
    window.removeEventListener("online", kick);
  };
}

/** Retry a specific failed item immediately, keeping the same client_document_id. */
export async function retryItem(item: QueueItem) {
  return processItem({ ...item, status: "pending", next_attempt_at: 0 });
}

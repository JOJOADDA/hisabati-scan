import type { QueueItem } from "./types";

const DB_NAME = "hisabati-scanner";
const STORE = "queue";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "client_document_id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    req.onsuccess = () => resolve(req.result as T);
    req.onerror = () => reject(req.error);
    t.oncomplete = () => db.close();
  });
}

export async function listQueue(): Promise<QueueItem[]> {
  if (typeof indexedDB === "undefined") return [];
  const items = await tx<QueueItem[]>("readonly", (s) => s.getAll());
  return items.sort((a, b) => a.captured_at.localeCompare(b.captured_at));
}

export async function putItem(item: QueueItem): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  await tx("readwrite", (s) => s.put(item));
}

export async function removeItem(id: string): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  await tx("readwrite", (s) => s.delete(id));
}

export async function getItem(id: string): Promise<QueueItem | undefined> {
  if (typeof indexedDB === "undefined") return undefined;
  return tx<QueueItem | undefined>("readonly", (s) => s.get(id));
}

const listeners = new Set<() => void>();
export function onQueueChange(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
export function emitQueueChange() {
  listeners.forEach((fn) => fn());
}

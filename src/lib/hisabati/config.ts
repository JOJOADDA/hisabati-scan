/**
 * Hisabati Scanner configuration.
 *
 * Scanner is a thin API client. It only ever needs:
 *  - the Hisabati Supabase project URL
 *  - the Supabase publishable / anon key (public by design)
 *
 * NEVER put a service role key or any other secret here.
 */

const DEFAULT_URL = "https://phspovgryirskfyydtzs.supabase.co";
/** Publishable (anon) key — public by design, safe in client code. */
const DEFAULT_KEY = "sb_publishable_KTfC458y9aRijl62B7NQkA_S2JnontZ";

const ENV_URL = (import.meta.env["VITE_HISABATI_SUPABASE_URL"] as string | undefined) ?? "";
const ENV_KEY =
  (import.meta.env["VITE_HISABATI_SUPABASE_PUBLISHABLE_KEY"] as string | undefined) ?? "";

const LS_URL = "hisabati.url";
const LS_KEY = "hisabati.key";

export const SUBMIT_RECEIPT_PATH = "/functions/v1/submit-receipt";

function ls(key: string): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

export function getHisabatiUrl(): string {
  return (ls(LS_URL) || ENV_URL || DEFAULT_URL).replace(/\/+$/, "");
}

export function getHisabatiKey(): string {
  return ls(LS_KEY) || ENV_KEY || DEFAULT_KEY;
}

export function setHisabatiConfig(url: string, key: string) {
  try {
    window.localStorage.setItem(LS_URL, url.trim().replace(/\/+$/, ""));
    window.localStorage.setItem(LS_KEY, key.trim());
  } catch {
    /* ignore */
  }
}

export function isConfigured(): boolean {
  return Boolean(getHisabatiUrl() && getHisabatiKey());
}

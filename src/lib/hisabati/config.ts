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

export const SUBMIT_RECEIPT_PATH = "/functions/v1/submit-receipt";

/**
 * Connection values are build-time only and are never editable or visible in the UI.
 */
export function getHisabatiUrl(): string {
  return (ENV_URL || DEFAULT_URL).replace(/\/+$/, "");
}

export function getHisabatiKey(): string {
  return ENV_KEY || DEFAULT_KEY;
}

export function isConfigured(): boolean {
  return Boolean(getHisabatiUrl() && getHisabatiKey());
}

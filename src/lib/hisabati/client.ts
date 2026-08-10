import { createClient, type SupabaseClient, type Session } from "@supabase/supabase-js";
import { getHisabatiKey, getHisabatiUrl } from "./config";

let client: SupabaseClient | null = null;
let signature = "";

/** Browser-only Supabase client for the Hisabati project (publishable key, RLS applies). */
export function getSupabase(): SupabaseClient | null {
  if (typeof window === "undefined") return null;
  const url = getHisabatiUrl();
  const key = getHisabatiKey();
  if (!url || !key) return null;
  const sig = `${url}::${key}`;
  if (!client || signature !== sig) {
    client = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        storageKey: "hisabati-scanner-auth",
      },
    });
    signature = sig;
  }
  return client;
}

export async function getAccessToken(): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function refreshAccessToken(): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.auth.refreshSession();
  if (error) return null;
  return data.session?.access_token ?? null;
}

export type { Session };

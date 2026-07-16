// Server-only Supabase client. Never import this from a client component.
// Uses SUPABASE_SECRET_KEY (full privilege, server-side) — same discipline as CAS.
import { createClient } from "@supabase/supabase-js";

let _client: ReturnType<typeof createClient> | null = null;

export function getSupabase() {
  if (_client) return _client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error(
      "SUPABASE_URL / SUPABASE_SECRET_KEY are not set. Check .env.local (dev) or Vercel project env vars (prod)."
    );
  }
  _client = createClient(url, key, { auth: { persistSession: false } });
  return _client;
}

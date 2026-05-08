import { createClient } from "@supabase/supabase-js";

const url        = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey    = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Returns a Supabase client.
 * - On the server (where SUPABASE_SERVICE_ROLE_KEY is available), uses the service role
 *   to bypass RLS. API routes are already auth-protected by middleware.
 * - On the browser, falls back to the anon key (RLS will gate access).
 * Returns null when Supabase env vars are not configured.
 */
export function getSupabase() {
  if (!url) return null;
  // Server-side: use service role (bypasses RLS, but routes are protected by auth middleware)
  if (typeof window === "undefined" && serviceKey) {
    return createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  // Browser-side: anon key (RLS-protected)
  if (!anonKey) return null;
  return createClient(url, anonKey);
}

export type DBCalendarEvent = {
  id: string;
  slug: string;
  titulo: string;
  data: string;          // "YYYY-MM-DD"
  tipo: string;
  status: string;
  scheduled_at: string | null;
  legenda: string | null;
  copy: string | null;           // roteiro/script
  hashtags: string | null;       // comma-separated hashtags (without #)
  creatives_urls: string | null; // comma-separated image URLs
  alteracoes: string | null;     // change requests from William
  created_at?: string;
};

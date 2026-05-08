import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Returns null when Supabase env vars are not configured — caller falls back to localStorage */
export function getSupabase() {
  if (!url || !key) return null;
  return createClient(url, key);
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
  created_at?: string;
};

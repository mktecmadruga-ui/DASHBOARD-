-- ════════════════════════════════════════════════════════════════════════════
-- RLS Policies — Madruga Dashboard
-- ════════════════════════════════════════════════════════════════════════════
-- Run this in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/cqulveozetwjmfsdrwyp/sql/new
--
-- Strategy:
--   • Server-side API routes use SUPABASE_SERVICE_ROLE_KEY → bypass RLS (safe,
--     routes are auth-protected by Next.js middleware).
--   • The anon key (exposed in browser) is locked down: it can only do what
--     these policies allow.
--   • Authenticated users can read their org's data.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── Enable RLS on all tables ────────────────────────────────────────────────
alter table calendar_events     enable row level security;
alter table leads               enable row level security;
alter table notifications_log   enable row level security;
alter table telegram_sessions   enable row level security;

-- ─── Drop any existing permissive policies (safe re-run) ────────────────────
drop policy if exists "anon_all_calendar"     on calendar_events;
drop policy if exists "anon_all_leads"        on leads;
drop policy if exists "anon_all_notif"        on notifications_log;
drop policy if exists "anon_all_sessions"     on telegram_sessions;
drop policy if exists "auth_read_calendar"    on calendar_events;
drop policy if exists "auth_write_calendar"   on calendar_events;
drop policy if exists "auth_read_leads"       on leads;
drop policy if exists "auth_write_leads"      on leads;

-- ─── Authenticated users have full access ────────────────────────────────────
-- (anonymous users get nothing — service role bypasses RLS)

create policy "authenticated_full_access_calendar"
  on calendar_events for all
  to authenticated
  using (true) with check (true);

create policy "authenticated_full_access_leads"
  on leads for all
  to authenticated
  using (true) with check (true);

create policy "authenticated_full_access_notif"
  on notifications_log for all
  to authenticated
  using (true) with check (true);

create policy "authenticated_full_access_sessions"
  on telegram_sessions for all
  to authenticated
  using (true) with check (true);

-- ════════════════════════════════════════════════════════════════════════════
-- Storage RLS — keep "creatives" bucket public for reads (Instagram needs it)
-- but only allow authenticated/service-role uploads.
-- ════════════════════════════════════════════════════════════════════════════

-- Drop the old wide-open policies we created earlier
drop policy if exists "Public upload creatives" on storage.objects;
drop policy if exists "Public read creatives"   on storage.objects;

-- Public READ (Instagram, browsers viewing creatives, etc.)
create policy "Anyone can read creatives"
  on storage.objects for select
  to public
  using (bucket_id = 'creatives');

-- Authenticated users can upload (uploads go through /api/upload which is auth-protected)
create policy "Authenticated can upload creatives"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'creatives');

create policy "Authenticated can update creatives"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'creatives');

create policy "Authenticated can delete creatives"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'creatives');

-- Run this in Supabase SQL editor
-- https://supabase.com/dashboard/project/cqulveozetwjmfsdrwyp/sql

-- Tracks which Telegram notifications were already sent to avoid duplicates
create table if not exists notifications_log (
  id          uuid primary key default gen_random_uuid(),
  type        text not null,            -- 'creative_review' | 'competitor_insight' | 'lead_quente' | 'token_expiring'
  reference_id text not null,            -- event id, lead id, etc.
  chat_id     text not null,
  payload     jsonb,
  sent_at     timestamptz default now()
);

alter table notifications_log enable row level security;
create policy "allow_all_notifications" on notifications_log for all using (true) with check (true);

create unique index if not exists notifications_log_unique
  on notifications_log(type, reference_id, chat_id);

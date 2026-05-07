-- Run this in Supabase SQL editor
-- https://supabase.com/dashboard/project/cqulveozetwjmfsdrwyp/sql

create table if not exists leads (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null default 'madruga',
  ig_user_id      text default '',
  ig_username     text not null,
  last_message    text default '',
  classification  text not null default 'novo',   -- 'lead_quente' | 'duvida' | 'parceria' | 'spam' | 'novo'
  status          text not null default 'novo',   -- 'novo' | 'em_conversa' | 'qualificado' | 'cliente' | 'perdido'
  notes           text default '',
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- RLS: allow all (same pattern as calendar_events)
alter table leads enable row level security;
create policy "allow_all_leads" on leads for all using (true) with check (true);

-- Index for fast lookups
create index if not exists leads_slug_idx on leads(slug);
create index if not exists leads_status_idx on leads(status);

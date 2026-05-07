-- Run this in Supabase SQL editor
-- Stores Telegram bot conversation state per chat

create table if not exists telegram_sessions (
  chat_id     text primary key,
  state       text not null default 'idle',
  data        jsonb not null default '{}',
  updated_at  timestamptz default now()
);

alter table telegram_sessions enable row level security;
create policy "allow_all_sessions" on telegram_sessions for all using (true) with check (true);

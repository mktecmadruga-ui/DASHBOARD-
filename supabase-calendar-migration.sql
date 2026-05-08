-- Run this in Supabase SQL editor
-- https://supabase.com/dashboard/project/cqulveozetwjmfsdrwyp/sql

-- Add copy, hashtags and creatives_urls columns
alter table calendar_events
  add column if not exists copy            text,
  add column if not exists hashtags        text,
  add column if not exists creatives_urls  text;

-- Add alteracoes column (change requests from William via Telegram)
alter table calendar_events
  add column if not exists alteracoes      text;

-- Run this in Supabase SQL editor
-- https://supabase.com/dashboard/project/cqulveozetwjmfsdrwyp/sql

-- Add copy and hashtags columns (hashtags stored as comma-separated text)
alter table calendar_events
  add column if not exists copy     text,
  add column if not exists hashtags text;

-- If you already ran the previous migration with text[] type, convert it:
-- alter table calendar_events alter column hashtags type text using array_to_string(hashtags, ',');

-- Run this in Supabase SQL editor to add copy and hashtags columns to calendar_events
-- https://supabase.com/dashboard/project/cqulveozetwjmfsdrwyp/sql

alter table calendar_events
  add column if not exists copy     text,
  add column if not exists hashtags text[];

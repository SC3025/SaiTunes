-- Sai Tunes database schema
-- Run this once in Supabase: Dashboard → SQL Editor → New query → paste → Run.

create extension if not exists pg_trgm;

-- A collection is an album, a year's worth of songs, or a special release.
create table if not exists public.collections (
  id           uuid primary key default gen_random_uuid(),
  slug         text unique not null,
  title        text not null,
  year         int,
  kind         text not null default 'album' check (kind in ('album', 'year', 'special')),
  description  text,
  cover_key    text,                       -- path of the cover image in R2
  is_featured  boolean not null default false, -- shows in "New & Special Releases"
  created_at   timestamptz not null default now()
);

create table if not exists public.songs (
  id                uuid primary key default gen_random_uuid(),
  collection_id     uuid not null references public.collections(id) on delete cascade,
  title             text not null,
  artist            text,
  track_number      int,
  duration_seconds  int,
  file_key          text not null,          -- path of the audio file in R2
  file_size         bigint,
  mime_type         text,
  original_filename text,                   -- used by the bulk importer to skip duplicates
  created_at        timestamptz not null default now()
);

create index if not exists songs_collection_idx on public.songs (collection_id, track_number);
create index if not exists songs_title_trgm on public.songs using gin (title gin_trgm_ops);
create index if not exists songs_artist_trgm on public.songs using gin (artist gin_trgm_ops);
create index if not exists collections_year_idx on public.collections (year desc);

-- People allowed into /admin.
create table if not exists public.admins (
  user_id   uuid primary key references auth.users(id) on delete cascade,
  email     text not null,
  added_at  timestamptz not null default now()
);

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- Row level security: everyone can read music, only admins can change it.
alter table public.collections enable row level security;
alter table public.songs       enable row level security;
alter table public.admins      enable row level security;

drop policy if exists "public read collections" on public.collections;
create policy "public read collections" on public.collections for select using (true);
drop policy if exists "admins write collections" on public.collections;
create policy "admins write collections" on public.collections for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "public read songs" on public.songs;
create policy "public read songs" on public.songs for select using (true);
drop policy if exists "admins write songs" on public.songs;
create policy "admins write songs" on public.songs for all
  using (public.is_admin()) with check (public.is_admin());

-- Admins can see who the other admins are; adding/removing goes through the server.
drop policy if exists "admins read admins" on public.admins;
create policy "admins read admins" on public.admins for select using (public.is_admin());

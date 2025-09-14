-- Supabase PostgreSQL schema for K-Dle
-- Create tables
create extension if not exists pgcrypto;

create table if not exists public.songs (
  id uuid primary key default gen_random_uuid(),
  spotify_id text not null unique,
  title text not null,
  artist text not null,
  preview_url text,
  difficulty_tag text,
  release_year int,
  album_image text,
  created_at timestamptz not null default now()
);

create table if not exists public.daily_song (
  date date primary key,
  song_id uuid not null references public.songs(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.user_stats (
  user_id uuid primary key references auth.users(id) on delete cascade,
  streak int not null default 0,
  longest_streak int not null default 0,
  total_games int not null default 0,
  total_wins int not null default 0,
  updated_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_songs_spotify_id on public.songs(spotify_id);
create index if not exists idx_daily_song_date on public.daily_song(date);

-- RLS
alter table public.songs enable row level security;
alter table public.daily_song enable row level security;
alter table public.user_stats enable row level security;

-- Policies
-- songs: readable by anyone, writeable by admins only
drop policy if exists songs_read_all on public.songs;
create policy songs_read_all on public.songs for select using (true);
-- Define an is_admin() helper via JWT claim `role = 'admin'` or use a specific user list
create or replace function public.is_admin() returns boolean language sql stable as $$
  select coalesce(
    current_setting('request.jwt.claims', true)::jsonb ->> 'role' = 'admin',
    false
  );
$$;
drop policy if exists songs_admin_write on public.songs;
create policy songs_admin_write on public.songs for all using (public.is_admin()) with check (public.is_admin());

-- daily_song: readable by anyone, writeable by admins only
drop policy if exists daily_song_read_all on public.daily_song;
create policy daily_song_read_all on public.daily_song for select using (true);
drop policy if exists daily_song_admin_write on public.daily_song;
create policy daily_song_admin_write on public.daily_song for all using (public.is_admin()) with check (public.is_admin());

-- user_stats: each user can see/update their own row
drop policy if exists user_stats_owner_read on public.user_stats;
create policy user_stats_owner_read on public.user_stats for select using (auth.uid() = user_id);
drop policy if exists user_stats_owner_write on public.user_stats;
create policy user_stats_owner_write on public.user_stats for insert with check (auth.uid() = user_id);
drop policy if exists user_stats_owner_update on public.user_stats;
create policy user_stats_owner_update on public.user_stats for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Back 9 Early Birds — initial schema
-- Run this in the Supabase dashboard → SQL Editor (or via `supabase db push`).
-- Every table is scoped to the signed-in user via Row Level Security.

-- ---------------------------------------------------------------------------
-- profiles: one row per authenticated user (their display name on leaderboards)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  initials     text not null,
  created_at   timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: read own"
  on public.profiles for select using (auth.uid() = id);
create policy "profiles: insert own"
  on public.profiles for insert with check (auth.uid() = id);
create policy "profiles: update own"
  on public.profiles for update using (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- players: the roster of golfers a user tracks (themselves + friends/guests)
-- ---------------------------------------------------------------------------
create table if not exists public.players (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name       text not null,
  initials   text not null,
  is_self    boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists players_user_id_idx on public.players (user_id);
alter table public.players enable row level security;

create policy "players: all own"
  on public.players for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- rounds: one logged back-nine round
-- ---------------------------------------------------------------------------
create table if not exists public.rounds (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  played_on  date not null default current_date,
  course     text not null default 'Mission Trails',
  is_final   boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists rounds_user_id_idx on public.rounds (user_id, played_on desc);
alter table public.rounds enable row level security;

create policy "rounds: all own"
  on public.rounds for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- round_players: which players took part in a round
-- ---------------------------------------------------------------------------
create table if not exists public.round_players (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null default auth.uid() references auth.users (id) on delete cascade,
  round_id  uuid not null references public.rounds (id) on delete cascade,
  player_id uuid not null references public.players (id) on delete cascade,
  unique (round_id, player_id)
);

create index if not exists round_players_round_idx on public.round_players (round_id);
alter table public.round_players enable row level security;

create policy "round_players: all own"
  on public.round_players for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- hole_scores: per-player, per-hole strokes for a round (holes 10–18)
-- ---------------------------------------------------------------------------
create table if not exists public.hole_scores (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null default auth.uid() references auth.users (id) on delete cascade,
  round_id  uuid not null references public.rounds (id) on delete cascade,
  player_id uuid not null references public.players (id) on delete cascade,
  hole      smallint not null check (hole between 10 and 18),
  par       smallint not null check (par between 3 and 5),
  strokes   smallint not null check (strokes between 1 and 12),
  gir       boolean not null default false,
  unique (round_id, player_id, hole)
);

create index if not exists hole_scores_round_idx on public.hole_scores (round_id);
alter table public.hole_scores enable row level security;

create policy "hole_scores: all own"
  on public.hole_scores for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

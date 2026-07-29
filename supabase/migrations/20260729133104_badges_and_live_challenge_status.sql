-- Earned badges (achievements). Some one-time (milestones), some repeatable.
create table if not exists public.badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  label text not null,
  detail text,
  value int,
  round_id uuid references public.rounds(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists badges_user_idx on public.badges (user_id, created_at desc);
-- one-time milestone badges are unique per user+kind
create unique index if not exists badges_milestone_unique
  on public.badges (user_id, kind) where kind like 'rounds_%';
alter table public.badges enable row level security;
drop policy if exists "badges: read own" on public.badges;
create policy "badges: read own" on public.badges for select using (auth.uid() = user_id);

-- Allow the "in_round" state for a live challenge round.
alter table public.challenges drop constraint if exists challenges_status_check;
alter table public.challenges add constraint challenges_status_check
  check (status in ('pending','accepted','in_round','declined','settled','canceled'));

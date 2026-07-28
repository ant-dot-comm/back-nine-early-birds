-- Directory of signed-up members (display info only), readable by any member.
create or replace view public.members as
  select id, display_name, initials from public.profiles;
grant select on public.members to authenticated;

-- Link a roster player to a real member account (null = manual/non-member).
alter table public.players
  add column if not exists member_user_id uuid references auth.users (id) on delete set null;

-- A score pushed from one member to another, awaiting acceptance.
create table if not exists public.score_shares (
  id                uuid primary key default gen_random_uuid(),
  from_user         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  to_user           uuid not null references auth.users (id) on delete cascade,
  from_display      text,
  round_id          uuid references public.rounds (id) on delete set null,
  played_on         date not null default current_date,
  course            text not null default 'Mission Trails',
  mode              text not null default 'back9',
  scores            jsonb not null default '[]'::jsonb,
  status            text not null default 'pending',  -- pending | accepted | dismissed
  accepted_round_id uuid references public.rounds (id) on delete set null,
  created_at        timestamptz not null default now()
);

create index if not exists score_shares_to_idx on public.score_shares (to_user, status);
alter table public.score_shares enable row level security;

create policy "score_shares: insert own-from" on public.score_shares
  for insert with check (from_user = auth.uid());
create policy "score_shares: read party" on public.score_shares
  for select using (auth.uid() = from_user or auth.uid() = to_user);
create policy "score_shares: recipient updates" on public.score_shares
  for update using (auth.uid() = to_user) with check (auth.uid() = to_user);
create policy "score_shares: party deletes" on public.score_shares
  for delete using (auth.uid() = to_user or auth.uid() = from_user);

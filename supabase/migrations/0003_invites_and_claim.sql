-- Score-share invites: owner snapshots a player's card, recipient claims it
-- into their own account on signup.
create table if not exists public.invites (
  id              uuid primary key default gen_random_uuid(),
  token           uuid not null unique default gen_random_uuid(),
  owner           uuid not null default auth.uid() references auth.users (id) on delete cascade,
  round_id        uuid references public.rounds (id) on delete set null,
  player_id       uuid references public.players (id) on delete set null,
  recipient_email text,
  inviter_display text,
  player_name     text not null,
  prefill_first   text,
  prefill_last    text,
  mode            text not null default 'back9',
  played_on       date not null default current_date,
  course          text not null default 'Mission Trails',
  scores          jsonb not null default '[]'::jsonb,  -- [{hole,par,strokes,gir}]
  claimed_by      uuid references auth.users (id) on delete set null,
  claimed_at      timestamptz,
  created_at      timestamptz not null default now()
);

create index if not exists invites_owner_idx on public.invites (owner);
alter table public.invites enable row level security;

create policy "invites: all own" on public.invites for all
  using (auth.uid() = owner) with check (auth.uid() = owner);

-- Claim an invite by token: copy the snapshotted card into the caller's account
-- as a finished round, and mark the invite claimed. Returns the new round id.
create or replace function public.claim_invite(p_token uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  v_inv   public.invites;
  v_self  uuid;
  v_round uuid;
  v_row   jsonb;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;

  select * into v_inv from public.invites where token = p_token;
  if v_inv.id is null then raise exception 'Invite not found'; end if;
  if v_inv.claimed_at is not null then raise exception 'Invite already claimed'; end if;

  select id into v_self from public.players where user_id = v_uid and is_self = true limit 1;
  if v_self is null then raise exception 'No profile yet'; end if;

  insert into public.rounds (user_id, played_on, course, mode, is_final)
  values (v_uid, v_inv.played_on, v_inv.course, v_inv.mode, true)
  returning id into v_round;

  insert into public.round_players (user_id, round_id, player_id)
  values (v_uid, v_round, v_self);

  for v_row in select * from jsonb_array_elements(v_inv.scores) loop
    insert into public.hole_scores (user_id, round_id, player_id, hole, par, strokes, gir)
    values (
      v_uid, v_round, v_self,
      (v_row->>'hole')::int, (v_row->>'par')::int,
      (v_row->>'strokes')::int, coalesce((v_row->>'gir')::boolean, false)
    );
  end loop;

  update public.invites set claimed_by = v_uid, claimed_at = now() where id = v_inv.id;
  return v_round;
end;
$$;

grant execute on function public.claim_invite(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Tournaments: a named event where each participant plays N rounds at leisure;
-- settles (winner + badge) once everyone has completed their rounds.
-- ---------------------------------------------------------------------------
create table if not exists public.tournaments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_by uuid not null references auth.users(id) on delete cascade,
  mode text not null default 'back9' check (mode in ('back9','full18')),
  rounds_required int not null default 3 check (rounds_required between 1 and 20),
  scoring text not null default 'total_strokes' check (scoring in ('total_strokes','average','single_best')),
  status text not null default 'active' check (status in ('active','completed','canceled')),
  starts_on date not null default current_date,
  ends_on date,
  winner uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  settled_at timestamptz
);
alter table public.tournaments enable row level security;
drop policy if exists "tournaments: read all" on public.tournaments;
create policy "tournaments: read all" on public.tournaments for select using (auth.uid() is not null);

create table if not exists public.tournament_players (
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (tournament_id, user_id)
);
alter table public.tournament_players enable row level security;
drop policy if exists "tournament_players: read all" on public.tournament_players;
create policy "tournament_players: read all" on public.tournament_players for select using (auth.uid() is not null);

-- Tag a round to a tournament (still counts toward career stats).
alter table public.rounds add column if not exists tournament_id uuid references public.tournaments(id) on delete set null;
create index if not exists rounds_tournament_idx on public.rounds (tournament_id) where tournament_id is not null;

-- ---- standings ------------------------------------------------------------
-- Provisional/final standings for a tournament, honoring its scoring mode.
create or replace function public.tournament_standings(p_tournament uuid)
returns table (
  user_id uuid, display_name text, initials text, first_name text, last_name text,
  rounds_done int, counted_score numeric, best_single int, total_pars int, is_complete boolean
)
language sql security definer set search_path = public stable as $$
  with t as (select rounds_required as n, scoring from public.tournaments where id = p_tournament),
  rt as (
    select r.user_id, r.id rid, sum(hs.strokes)::int total,
           count(*) filter (where hs.strokes = hs.par)::int pars
    from public.rounds r
    join public.players pl on pl.user_id = r.user_id and pl.is_self
    join public.hole_scores hs on hs.round_id = r.id and hs.player_id = pl.id
    where r.tournament_id = p_tournament and r.is_final
    group by r.user_id, r.id
  ),
  ranked as (
    select rt.user_id, rt.rid, rt.total, rt.pars,
           row_number() over (partition by rt.user_id order by rt.total asc, rt.rid) rn
    from rt
  ),
  agg as (
    select tp.user_id,
      count(rk.rid)::int rounds_done,
      min(rk.total)::int best_single,
      coalesce(sum(rk.pars), 0)::int total_pars,
      t.n,
      case t.scoring
        when 'total_strokes' then sum(rk.total) filter (where rk.rn <= t.n)
        when 'average' then round(avg(rk.total), 1)
        when 'single_best' then min(rk.total)
      end::numeric counted_score
    from public.tournament_players tp
    cross join t
    left join ranked rk on rk.user_id = tp.user_id
    where tp.tournament_id = p_tournament
    group by tp.user_id, t.n, t.scoring
  )
  select a.user_id, pr.display_name, pr.initials, pr.first_name, pr.last_name,
    a.rounds_done, a.counted_score, a.best_single, a.total_pars,
    (a.rounds_done >= a.n) is_complete
  from agg a join public.profiles pr on pr.id = a.user_id
  order by (a.rounds_done < a.n), (a.counted_score is null), a.counted_score asc,
           a.best_single asc nulls last, a.total_pars desc;
$$;
grant execute on function public.tournament_standings(uuid) to authenticated;

-- ---- settlement -----------------------------------------------------------
create or replace function public.settle_tournament(p_tournament uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_t public.tournaments; v_field int; v_incomplete int; v_winner uuid; v_others int;
begin
  select * into v_t from public.tournaments where id = p_tournament;
  if v_t.id is null or v_t.status <> 'active' then return; end if;
  select count(*) into v_field from public.tournament_players where tournament_id = p_tournament;
  if v_field < 2 then return; end if;
  select count(*) into v_incomplete from public.tournament_standings(p_tournament) where not is_complete;
  if v_incomplete > 0 then return; end if;

  select user_id into v_winner from public.tournament_standings(p_tournament) limit 1;
  v_others := v_field - 1;
  update public.tournaments set status='completed', winner=v_winner, settled_at=now() where id = p_tournament;
  insert into public.badges(user_id, kind, label, detail)
  values (v_winner, 'tourney_winner', 'Tournament Champ',
    'won ' || v_t.name || ' · beat ' || v_others || case when v_others = 1 then ' other' else ' others' end);
end;
$$;

-- ---- create / manage RPCs -------------------------------------------------
create or replace function public.create_tournament(
  p_name text, p_description text, p_mode text, p_rounds_required int, p_scoring text, p_players uuid[]
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_id uuid; v_p uuid;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if btrim(coalesce(p_name,'')) = '' then raise exception 'Name required'; end if;
  insert into public.tournaments(name, description, created_by, mode, rounds_required, scoring)
  values (btrim(p_name), nullif(btrim(coalesce(p_description,'')), ''), v_uid,
          coalesce(p_mode,'back9'), coalesce(p_rounds_required, 3), coalesce(p_scoring,'total_strokes'))
  returning id into v_id;
  insert into public.tournament_players(tournament_id, user_id) values (v_id, v_uid) on conflict do nothing;
  foreach v_p in array coalesce(p_players, array[]::uuid[]) loop
    if v_p <> v_uid then
      insert into public.tournament_players(tournament_id, user_id) values (v_id, v_p) on conflict do nothing;
    end if;
  end loop;
  return v_id;
end;
$$;
grant execute on function public.create_tournament(text, text, text, int, text, uuid[]) to authenticated;

create or replace function public.add_tournament_player(p_tournament uuid, p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if not exists (select 1 from public.tournaments where id=p_tournament and created_by=v_uid and status='active') then
    raise exception 'Not allowed'; end if;
  insert into public.tournament_players(tournament_id, user_id) values (p_tournament, p_user) on conflict do nothing;
end;
$$;
grant execute on function public.add_tournament_player(uuid, uuid) to authenticated;

create or replace function public.remove_tournament_player(p_tournament uuid, p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if not exists (select 1 from public.tournaments where id=p_tournament and created_by=v_uid and status='active') then
    raise exception 'Not allowed'; end if;
  if p_user = (select created_by from public.tournaments where id=p_tournament) then
    raise exception 'The organizer can''t be removed'; end if;
  delete from public.tournament_players where tournament_id=p_tournament and user_id=p_user;
end;
$$;
grant execute on function public.remove_tournament_player(uuid, uuid) to authenticated;

-- tiny helper (creator check) used by leave_tournament
create or replace function public.p_uid_is_creator(p_tournament uuid, p_uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.tournaments where id=p_tournament and created_by=p_uid);
$$;

create or replace function public.leave_tournament(p_tournament uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if public.p_uid_is_creator(p_tournament, v_uid) then raise exception 'The organizer can''t leave; cancel instead'; end if;
  delete from public.tournament_players where tournament_id=p_tournament and user_id=v_uid;
end;
$$;
grant execute on function public.leave_tournament(uuid) to authenticated;

create or replace function public.cancel_tournament(p_tournament uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  update public.tournaments set status='canceled'
  where id=p_tournament and created_by=v_uid and status='active';
  if not found then raise exception 'Not allowed'; end if;
end;
$$;
grant execute on function public.cancel_tournament(uuid) to authenticated;

-- ---- listing --------------------------------------------------------------
create or replace function public.list_tournaments()
returns table (
  id uuid, name text, description text, created_by uuid, mode text, rounds_required int, scoring text,
  status text, created_at timestamptz, settled_at timestamptz,
  participant_count int, am_in boolean, my_rounds_done int, winner uuid, winner_display text
)
language sql security definer set search_path = public stable as $$
  select t.id, t.name, t.description, t.created_by, t.mode, t.rounds_required, t.scoring,
    t.status, t.created_at, t.settled_at,
    (select count(*) from public.tournament_players tp where tp.tournament_id = t.id)::int,
    exists (select 1 from public.tournament_players tp where tp.tournament_id = t.id and tp.user_id = auth.uid()),
    (select count(*) from public.rounds r where r.tournament_id = t.id and r.user_id = auth.uid() and r.is_final)::int,
    t.winner,
    (select display_name from public.profiles p where p.id = t.winner)
  from public.tournaments t
  order by (t.status <> 'active'), t.created_at desc;
$$;
grant execute on function public.list_tournaments() to authenticated;

-- ---- finalize trigger: also settle tournaments ----------------------------
create or replace function public.tg_settle_challenges() returns trigger
language plpgsql security definer set search_path to 'public' as $$
begin
  if new.is_final and not coalesce(old.is_final, false) then
    perform public.settle_round_challenges(new.id);
    perform public.award_round_badges(new.id);
    if new.tournament_id is not null then
      perform public.settle_tournament(new.tournament_id);
    end if;
  end if;
  return new;
end;
$$;

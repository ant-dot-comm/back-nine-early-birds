-- Freeze final standings at settlement so a completed tournament's scorecard
-- is immune to later round edits/deletes.
create table if not exists public.tournament_results (
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  user_id uuid not null,
  rank int not null,
  display_name text, initials text, first_name text, last_name text,
  rounds_done int, counted_score numeric, best_single int, total_pars int,
  primary key (tournament_id, user_id)
);
alter table public.tournament_results enable row level security;
drop policy if exists "tournament_results: read all" on public.tournament_results;
create policy "tournament_results: read all" on public.tournament_results for select using (auth.uid() is not null);

-- Settle: snapshot the standings, then lock the tournament and award the badge.
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

  -- Snapshot the final standings (frozen historical record).
  insert into public.tournament_results(tournament_id, user_id, rank, display_name, initials, first_name, last_name, rounds_done, counted_score, best_single, total_pars)
  select p_tournament, s.user_id,
    row_number() over (order by s.counted_score asc nulls last, s.best_single asc nulls last, s.total_pars desc),
    s.display_name, s.initials, s.first_name, s.last_name, s.rounds_done, s.counted_score, s.best_single, s.total_pars
  from public.tournament_standings(p_tournament) s
  on conflict (tournament_id, user_id) do nothing;

  select user_id into v_winner from public.tournament_results where tournament_id = p_tournament order by rank limit 1;
  v_others := v_field - 1;
  update public.tournaments set status='completed', winner=v_winner, settled_at=now() where id = p_tournament;
  insert into public.badges(user_id, kind, label, detail)
  values (v_winner, 'tourney_winner', 'Tournament Champ',
    'won ' || v_t.name || ' · beat ' || v_others || case when v_others = 1 then ' other' else ' others' end);
end;
$$;

-- Board = frozen snapshot for completed tournaments, else live standings.
create or replace function public.tournament_board(p_tournament uuid)
returns table (
  user_id uuid, display_name text, initials text, first_name text, last_name text,
  rounds_done int, counted_score numeric, best_single int, total_pars int, is_complete boolean
)
language plpgsql security definer set search_path = public stable as $$
begin
  if exists (select 1 from public.tournament_results r where r.tournament_id = p_tournament) then
    return query
      select r.user_id, r.display_name, r.initials, r.first_name, r.last_name,
             r.rounds_done, r.counted_score, r.best_single, r.total_pars, true
      from public.tournament_results r where r.tournament_id = p_tournament order by r.rank;
  else
    return query select * from public.tournament_standings(p_tournament);
  end if;
end;
$$;
grant execute on function public.tournament_board(uuid) to authenticated;

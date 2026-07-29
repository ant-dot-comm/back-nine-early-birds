-- Expose first/last name in the members view so the UI can show "First L."
create or replace view public.members as
  select id, display_name, initials, first_name, last_name from public.profiles;

-- Season leaderboard: per-member aggregate stats (no individual rounds exposed).
create or replace function public.member_leaderboard()
returns table (
  user_id uuid, display_name text, first_name text, last_name text, initials text,
  rounds int, avg_score numeric, birdies int, best_to_par int
)
language sql security definer set search_path = public stable
as $$
  with self_players as (
    select p.user_id, p.id as player_id from public.players p where p.is_self
  ),
  round_totals as (
    select r.user_id, r.id as round_id, sum(hs.strokes) as total, sum(hs.par) as par
    from public.rounds r
    join self_players sp on sp.user_id = r.user_id
    join public.hole_scores hs on hs.round_id = r.id and hs.player_id = sp.player_id
    where r.is_final and r.played_on >= date_trunc('year', current_date)
    group by r.user_id, r.id
  ),
  birdie_counts as (
    select r.user_id, count(*) as birdies
    from public.rounds r
    join self_players sp on sp.user_id = r.user_id
    join public.hole_scores hs on hs.round_id = r.id and hs.player_id = sp.player_id
    where r.is_final and r.played_on >= date_trunc('year', current_date)
      and hs.strokes = hs.par - 1
    group by r.user_id
  )
  select pr.id, pr.display_name, pr.first_name, pr.last_name, pr.initials,
         count(rt.round_id)::int as rounds,
         round(avg(rt.total), 1) as avg_score,
         coalesce(max(bc.birdies), 0)::int as birdies,
         min(rt.total - rt.par)::int as best_to_par
  from public.profiles pr
  left join round_totals rt on rt.user_id = pr.id
  left join birdie_counts bc on bc.user_id = pr.id
  group by pr.id, pr.display_name, pr.first_name, pr.last_name, pr.initials
  order by (count(rt.round_id) = 0), avg(rt.total) asc nulls last;
$$;

grant execute on function public.member_leaderboard() to authenticated;

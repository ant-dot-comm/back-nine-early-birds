drop function if exists public.member_leaderboard();
create function public.member_leaderboard()
returns table (
  user_id uuid, display_name text, first_name text, last_name text, initials text,
  rounds int, avg_score numeric, birdies int, eagles int, pars int, gir_pct int
)
language sql security definer set search_path = public stable
as $$
  with self_players as (
    select user_id, id as player_id from public.players where is_self
  ),
  szn as (
    select r.user_id, r.id as round_id, hs.par, hs.strokes, hs.gir
    from public.rounds r
    join self_players sp on sp.user_id = r.user_id
    join public.hole_scores hs on hs.round_id = r.id and hs.player_id = sp.player_id
    where r.is_final and r.played_on >= date_trunc('year', current_date)
  ),
  round_totals as (
    select user_id, round_id, sum(strokes) as total from szn group by user_id, round_id
  ),
  hole_agg as (
    select user_id,
      count(*) filter (where strokes = par - 1) as birdies,
      count(*) filter (where strokes <= par - 2) as eagles,
      count(*) filter (where strokes = par) as pars,
      count(*) filter (where gir) as gir_hit,
      count(*) as total_holes
    from szn group by user_id
  )
  select pr.id, pr.display_name, pr.first_name, pr.last_name, pr.initials,
    coalesce((select count(*) from round_totals rt where rt.user_id = pr.id), 0)::int as rounds,
    (select round(avg(total), 1) from round_totals rt where rt.user_id = pr.id) as avg_score,
    coalesce(ha.birdies, 0)::int as birdies,
    coalesce(ha.eagles, 0)::int as eagles,
    coalesce(ha.pars, 0)::int as pars,
    case when ha.total_holes > 0 then round(ha.gir_hit * 100.0 / ha.total_holes)::int else null end as gir_pct
  from public.profiles pr
  left join hole_agg ha on ha.user_id = pr.id
  order by (coalesce((select count(*) from round_totals rt where rt.user_id = pr.id), 0) = 0),
           (select avg(total) from round_totals rt where rt.user_id = pr.id) asc nulls last;
$$;
grant execute on function public.member_leaderboard() to authenticated;

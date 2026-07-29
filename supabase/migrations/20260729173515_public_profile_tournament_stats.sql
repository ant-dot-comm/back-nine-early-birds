drop function if exists public.public_profile(uuid);
create or replace function public.public_profile(p_user uuid)
returns table (
  user_id uuid, display_name text, initials text, first_name text, last_name text,
  is_secret boolean, member_since timestamptz,
  rounds int, avg9 numeric, avg18 numeric, birdies int, eagles int, pars int, gir_pct int,
  challenges_won int, challenges_played int, held_name text,
  tournaments_won int, tournaments_played int
)
language sql security definer set search_path = public stable as $$
  with szn as (
    select r.id rid, r.mode, hs.par, hs.strokes, hs.gir
    from public.rounds r join public.players pl on pl.user_id=r.user_id and pl.is_self
    join public.hole_scores hs on hs.round_id=r.id and hs.player_id=pl.id
    where r.user_id=p_user and r.is_final
  ),
  rt as (select rid, mode, sum(strokes) total from szn group by rid, mode)
  select pr.id, pr.display_name, pr.initials, pr.first_name, pr.last_name,
    (pr.display_name_type='secret'), pr.created_at,
    (select count(*) from rt)::int,
    (select round(avg(total),1) from rt where mode='back9'),
    (select round(avg(total),1) from rt where mode='full18'),
    (select count(*) from szn where strokes=par-1)::int,
    (select count(*) from szn where strokes<=par-2)::int,
    (select count(*) from szn where strokes=par)::int,
    (select case when count(*)>0 then round(count(*) filter (where gir)*100.0/count(*))::int else null end from szn),
    pr.challenges_won, pr.challenges_played,
    (case when pr.display_name_type='secret' then pr.secret_name else null end),
    (select count(*) from public.tournaments t where t.winner = p_user and t.status='completed')::int,
    (select count(*) from public.tournament_players tp where tp.user_id = p_user)::int
  from public.profiles pr where pr.id=p_user;
$$;
grant execute on function public.public_profile(uuid) to authenticated;

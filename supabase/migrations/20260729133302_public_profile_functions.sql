create or replace function public.public_profile(p_user uuid)
returns table (
  user_id uuid, display_name text, initials text, first_name text, last_name text,
  is_secret boolean, member_since timestamptz,
  rounds int, avg9 numeric, avg18 numeric, birdies int, eagles int, pars int, gir_pct int,
  challenges_won int, challenges_played int, held_name text
)
language sql security definer set search_path = public stable as $$
  with szn as (
    select r.id rid, r.mode, hs.par, hs.strokes, hs.gir
    from public.rounds r join public.players pl on pl.user_id=r.user_id and pl.is_self
    join public.hole_scores hs on hs.round_id=r.id and hs.player_id=pl.id
    where r.user_id=p_user and r.is_final and r.played_on >= date_trunc('year', current_date)
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
    (case when pr.display_name_type='secret' then pr.secret_name else null end)
  from public.profiles pr where pr.id=p_user;
$$;
grant execute on function public.public_profile(uuid) to authenticated;

create or replace function public.public_badges(p_user uuid)
returns table (kind text, label text, detail text, value int, created_at timestamptz)
language sql security definer set search_path = public stable as $$
  select kind, label, detail, value, created_at from public.badges where user_id=p_user order by created_at desc;
$$;
grant execute on function public.public_badges(uuid) to authenticated;

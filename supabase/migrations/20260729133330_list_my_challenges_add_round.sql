-- Extend list_my_challenges with the linked round + scorekeeper so the Home UI
-- can render the "start round" / "in progress" states. Return-type change needs a drop.
drop function if exists public.list_my_challenges();
create or replace function public.list_my_challenges()
returns table (
  id uuid, challenger uuid, defender uuid, secret_name text, status text,
  challenger_display text, defender_display text,
  challenger_score int, defender_score int, winner uuid, created_at timestamptz,
  round_id uuid, scorekeeper uuid
)
language sql security definer set search_path to 'public' stable as $$
  select c.id, c.challenger, c.defender, c.secret_name, c.status,
         cp.display_name, dp.display_name, c.challenger_score, c.defender_score, c.winner, c.created_at,
         c.round_id, r.user_id
  from public.challenges c
  join public.profiles cp on cp.id = c.challenger
  join public.profiles dp on dp.id = c.defender
  left join public.rounds r on r.id = c.round_id
  where auth.uid() in (c.challenger, c.defender)
    and c.status in ('pending','accepted','in_round','settled')
  order by c.created_at desc;
$$;
grant execute on function public.list_my_challenges() to authenticated;

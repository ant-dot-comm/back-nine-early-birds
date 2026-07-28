-- claim_invite now reconciles the inviter's guest player into a member link,
-- so a guest who signs up stops appearing under "your people" and shows as a
-- member instead. Also backfills already-claimed invites.
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
    insert into public.hole_scores (user_id, round_id, player_id, hole, par, strokes, gir, saved)
    values (
      v_uid, v_round, v_self,
      (v_row->>'hole')::int, (v_row->>'par')::int,
      (v_row->>'strokes')::int, coalesce((v_row->>'gir')::boolean, false), true
    );
  end loop;

  if v_inv.player_id is not null then
    update public.players
      set member_user_id = v_uid,
          name = coalesce((select display_name from public.profiles where id = v_uid), name),
          initials = coalesce((select initials from public.profiles where id = v_uid), initials)
      where id = v_inv.player_id and member_user_id is null;
  end if;

  update public.invites set claimed_by = v_uid, claimed_at = now() where id = v_inv.id;
  return v_round;
end;
$$;

grant execute on function public.claim_invite(uuid) to authenticated;

update public.players p set member_user_id = i.claimed_by
from public.invites i
where i.player_id = p.id and i.claimed_by is not null and p.member_user_id is null;

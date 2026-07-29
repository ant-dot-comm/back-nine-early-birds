-- Challenge a holder for a name you've unlocked.
create or replace function public.create_challenge(p_defender uuid, p_secret text)
returns uuid language plpgsql security definer set search_path to 'public' as $$
declare v_uid uuid := auth.uid(); v_id uuid;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if p_defender = v_uid then raise exception 'You can''t challenge yourself'; end if;
  if not exists (select 1 from public.profiles where id=p_defender and secret_name=p_secret and display_name_type='secret') then
    raise exception 'They no longer hold that name'; end if;
  if not (p_secret = any (public.unlocked_secret_names())) then
    raise exception 'You haven''t unlocked that name yet'; end if;
  if exists (select 1 from public.challenges where challenger=v_uid and defender=p_defender and secret_name=p_secret and status in ('pending','accepted')) then
    raise exception 'You already have an active challenge for that name'; end if;
  insert into public.challenges (challenger, defender, secret_name) values (v_uid, p_defender, p_secret) returning id into v_id;
  return v_id;
end;
$$;
grant execute on function public.create_challenge(uuid, text) to authenticated;

-- Defender accepts or declines.
create or replace function public.respond_challenge(p_id uuid, p_accept boolean)
returns void language plpgsql security definer set search_path to 'public' as $$
declare v_uid uuid := auth.uid();
begin
  update public.challenges set status = case when p_accept then 'accepted' else 'declined' end
  where id=p_id and defender=v_uid and status='pending';
  if not found then raise exception 'Challenge not found'; end if;
end;
$$;
grant execute on function public.respond_challenge(uuid, boolean) to authenticated;

-- Challenger cancels their own pending/accepted challenge.
create or replace function public.cancel_challenge(p_id uuid)
returns void language plpgsql security definer set search_path to 'public' as $$
declare v_uid uuid := auth.uid();
begin
  update public.challenges set status='canceled'
  where id=p_id and challenger=v_uid and status in ('pending','accepted');
  if not found then raise exception 'Challenge not found'; end if;
end;
$$;
grant execute on function public.cancel_challenge(uuid) to authenticated;

-- Settlement: when a shared round is finalized, resolve accepted challenges
-- between its players (lower single-round score wins; tie -> holder keeps).
create or replace function public.settle_round_challenges(p_round uuid)
returns void language plpgsql security definer set search_path to 'public' as $$
declare
  v_owner uuid; v_owner_score int; m record; c record;
  v_ch int; v_def int; v_winner uuid; v_fallback text; v_init text;
begin
  select user_id into v_owner from public.rounds where id = p_round;
  if v_owner is null then return; end if;

  select coalesce(sum(hs.strokes),0) into v_owner_score
  from public.hole_scores hs join public.players pl on pl.id = hs.player_id
  where hs.round_id = p_round and pl.user_id = v_owner and pl.is_self;

  for m in
    select pl.member_user_id as uid, coalesce(sum(hs.strokes),0) as score
    from public.round_players rp
    join public.players pl on pl.id = rp.player_id
    join public.hole_scores hs on hs.round_id = rp.round_id and hs.player_id = pl.id
    where rp.round_id = p_round and pl.member_user_id is not null
    group by pl.member_user_id
  loop
    select ch.* into c from public.challenges ch
    where ch.status='accepted'
      and ((ch.challenger=v_owner and ch.defender=m.uid) or (ch.challenger=m.uid and ch.defender=v_owner))
      and exists (select 1 from public.profiles p where p.id=ch.defender and p.secret_name=ch.secret_name and p.display_name_type='secret')
    order by ch.created_at asc limit 1;
    if c.id is null then continue; end if;

    if c.challenger = v_owner then v_ch := v_owner_score; v_def := m.score;
    else v_ch := m.score; v_def := v_owner_score; end if;

    if v_ch < v_def then v_winner := c.challenger; else v_winner := c.defender; end if;

    if v_winner = c.challenger then
      -- defender loses the name, reverts to their real-name fallback
      select nullif(btrim(coalesce(first_name,'') || case when coalesce(last_name,'')<>'' then ' '||left(last_name,1)||'.' else '' end),''),
             coalesce(nullif(upper(left(coalesce(first_name,''),1)||left(coalesce(last_name,''),1)),''),'?')
        into v_fallback, v_init from public.profiles where id = c.defender;
      v_fallback := coalesce(v_fallback, 'Golfer');
      update public.profiles set secret_name=null, display_name=v_fallback, display_name_type='custom', initials=v_init where id=c.defender;
      update public.players set name=v_fallback, initials=v_init where user_id=c.defender and is_self;
      -- challenger takes the name
      update public.profiles set secret_name=c.secret_name, display_name=c.secret_name, display_name_type='secret' where id=c.challenger;
      update public.players set name=c.secret_name where user_id=c.challenger and is_self;
    end if;

    update public.challenges set status='settled', round_id=p_round,
      challenger_score=v_ch, defender_score=v_def, winner=v_winner, settled_at=now()
    where id=c.id;
    update public.profiles set challenges_played = challenges_played + 1 where id in (c.challenger, c.defender);
    update public.profiles set challenges_won = challenges_won + 1 where id = v_winner;
  end loop;
end;
$$;

create or replace function public.tg_settle_challenges() returns trigger
language plpgsql security definer set search_path to 'public' as $$
begin
  if new.is_final and not coalesce(old.is_final, false) then
    perform public.settle_round_challenges(new.id);
  end if;
  return new;
end;
$$;
drop trigger if exists settle_challenges on public.rounds;
create trigger settle_challenges after update on public.rounds
  for each row execute function public.tg_settle_challenges();

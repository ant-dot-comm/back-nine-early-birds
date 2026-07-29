-- Start a live challenge round for an accepted challenge (caller = scorekeeper).
create or replace function public.start_challenge_round(p_challenge uuid, p_mode text default 'back9')
returns uuid language plpgsql security definer set search_path to 'public' as $$
declare v_uid uuid := auth.uid(); c public.challenges; v_other uuid; v_self uuid; v_otherp uuid; v_round uuid;
  pars int[] := array[5,4,3,4,4,5,3,4,3,3,4,5,4,5,4,4,3,4];
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  select * into c from public.challenges where id=p_challenge and status='accepted' and (challenger=v_uid or defender=v_uid);
  if c.id is null then raise exception 'Challenge not ready'; end if;
  v_other := case when c.challenger=v_uid then c.defender else c.challenger end;
  select id into v_self from public.players where user_id=v_uid and is_self limit 1;
  if v_self is null then raise exception 'Set up your profile first'; end if;
  select id into v_otherp from public.players where user_id=v_uid and member_user_id=v_other limit 1;
  if v_otherp is null then
    insert into public.players(user_id, name, initials, is_self, member_user_id)
    select v_uid, p.display_name, p.initials, false, v_other from public.profiles p where p.id=v_other
    returning id into v_otherp;
  end if;
  insert into public.rounds(user_id, played_on, mode, is_final) values(v_uid, current_date, p_mode, false) returning id into v_round;
  insert into public.round_players(user_id, round_id, player_id) values(v_uid, v_round, v_self),(v_uid, v_round, v_otherp);
  insert into public.hole_scores(user_id, round_id, player_id, hole, par, strokes, gir, saved)
  select v_uid, v_round, pl.pid, h, pars[h], pars[h], false, false
  from (values (v_self),(v_otherp)) as pl(pid),
       generate_series(case when p_mode='full18' then 1 else 10 end, 18) as h;
  update public.challenges set round_id=v_round, status='in_round' where id=c.id;
  return v_round;
end;
$$;
grant execute on function public.start_challenge_round(uuid, text) to authenticated;

-- Settle the challenge linked to a round when it's finalized.
create or replace function public.settle_round_challenges(p_round uuid)
returns void language plpgsql security definer set search_path to 'public' as $$
declare c public.challenges; v_owner uuid; v_owner_score int; v_other uuid; v_other_score int;
  v_ch int; v_def int; v_winner uuid; v_fallback text; v_init text;
begin
  select * into c from public.challenges where round_id=p_round and status='in_round';
  if c.id is null then return; end if;
  select user_id into v_owner from public.rounds where id=p_round;
  v_other := case when c.challenger=v_owner then c.defender else c.challenger end;

  select coalesce(sum(hs.strokes),0) into v_owner_score
  from public.hole_scores hs join public.players pl on pl.id=hs.player_id
  where hs.round_id=p_round and pl.user_id=v_owner and pl.is_self;
  select coalesce(sum(hs.strokes),0) into v_other_score
  from public.hole_scores hs join public.players pl on pl.id=hs.player_id
  where hs.round_id=p_round and pl.member_user_id=v_other;

  if c.challenger=v_owner then v_ch:=v_owner_score; v_def:=v_other_score; else v_ch:=v_other_score; v_def:=v_owner_score; end if;
  if v_ch < v_def then v_winner:=c.challenger; else v_winner:=c.defender; end if;

  if v_winner = c.challenger then
    select nullif(btrim(coalesce(first_name,'') || case when coalesce(last_name,'')<>'' then ' '||left(last_name,1)||'.' else '' end),''),
           coalesce(nullif(upper(left(coalesce(first_name,''),1)||left(coalesce(last_name,''),1)),''),'?')
      into v_fallback, v_init from public.profiles where id=c.defender;
    v_fallback := coalesce(v_fallback,'Golfer');
    update public.profiles set secret_name=null, display_name=v_fallback, display_name_type='custom', initials=v_init where id=c.defender;
    update public.players set name=v_fallback, initials=v_init where user_id=c.defender and is_self;
    update public.profiles set secret_name=c.secret_name, display_name=c.secret_name, display_name_type='secret' where id=c.challenger;
    update public.players set name=c.secret_name where user_id=c.challenger and is_self;
  end if;

  update public.challenges set status='settled', challenger_score=v_ch, defender_score=v_def, winner=v_winner, settled_at=now() where id=c.id;
  update public.profiles set challenges_played=challenges_played+1 where id in (c.challenger, c.defender);
  update public.profiles set challenges_won=challenges_won+1 where id=v_winner;
  insert into public.badges(user_id, kind, label, detail, round_id)
  values(v_winner, 'won_duel', 'Name Thief',
    'won ' || c.secret_name || ' from ' || (select display_name from public.profiles where id = (case when v_winner=c.challenger then c.defender else c.challenger end)),
    p_round);
end;
$$;

-- Award milestone / bogey-free / side-game badges on finalize.
create or replace function public.award_round_badges(p_round uuid)
returns void language plpgsql security definer set search_path to 'public' as $$
declare v_owner uuid; v_count int; t int; v_bogeys int; v_holes int; g text; rec record; v_wuid uuid; v_others text;
begin
  select user_id into v_owner from public.rounds where id=p_round;
  if v_owner is null then return; end if;

  select count(*) into v_count from public.rounds where user_id=v_owner and is_final;
  foreach t in array array[5,10,20] loop
    if v_count >= t and not exists (select 1 from public.badges where user_id=v_owner and kind='rounds_'||t) then
      insert into public.badges(user_id, kind, label, value)
      values(v_owner, 'rounds_'||t, case t when 5 then 'Cart Warmer' when 10 then 'Halfway Hooligan' else 'Certified Range Rat' end, t);
    end if;
  end loop;

  select count(*) filter (where hs.strokes > hs.par), count(*) into v_bogeys, v_holes
  from public.hole_scores hs join public.players pl on pl.id=hs.player_id
  where hs.round_id=p_round and pl.user_id=v_owner and pl.is_self;
  if v_holes > 0 and v_bogeys = 0 and not exists (select 1 from public.badges where user_id=v_owner and kind='bogey_free' and round_id=p_round) then
    insert into public.badges(user_id, kind, label, round_id) values(v_owner, 'bogey_free', 'Bogey-Free Bandit', p_round);
  end if;

  for g in select unnest(side_games) from public.rounds where id=p_round loop
    for rec in
      with vals as (
        select pl.id pid, pl.is_self, pl.member_user_id, pl.name,
          (case g
            when 'low_score' then sum(hs.strokes)
            when 'most_birdies' then count(*) filter (where hs.strokes = hs.par-1)
            when 'fewest_bogeys' then count(*) filter (where hs.strokes = hs.par+1)
            when 'best_gir' then count(*) filter (where hs.gir)
          end) v
        from public.round_players rp join public.players pl on pl.id=rp.player_id
        join public.hole_scores hs on hs.round_id=rp.round_id and hs.player_id=pl.id
        where rp.round_id=p_round group by pl.id, pl.is_self, pl.member_user_id, pl.name
      )
      select pid, is_self, member_user_id from vals
      where v = (select case when g in ('low_score','fewest_bogeys') then min(v) else max(v) end from vals)
    loop
      v_wuid := case when rec.is_self then v_owner else rec.member_user_id end;
      if v_wuid is not null and not exists (select 1 from public.badges where user_id=v_wuid and kind='won_'||g and round_id=p_round) then
        select string_agg(pl.name, ', ') into v_others
        from public.round_players rp join public.players pl on pl.id=rp.player_id
        where rp.round_id=p_round and pl.id <> rec.pid;
        insert into public.badges(user_id, kind, label, detail, round_id)
        values(v_wuid, 'won_'||g,
          case g when 'low_score' then 'Card Sharp' when 'most_birdies' then 'Birdie Bully' when 'fewest_bogeys' then 'Mistake Minimalist' else 'Green Machine' end,
          'beat ' || coalesce(v_others, 'the field'), p_round);
      end if;
    end loop;
  end loop;
end;
$$;

-- One trigger runs both on finalize.
create or replace function public.tg_settle_challenges() returns trigger
language plpgsql security definer set search_path to 'public' as $$
begin
  if new.is_final and not coalesce(old.is_final, false) then
    perform public.settle_round_challenges(new.id);
    perform public.award_round_badges(new.id);
  end if;
  return new;
end;
$$;

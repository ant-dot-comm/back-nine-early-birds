-- Scarcity: at most one holder per rare name; challenge stats on profiles.
alter table public.profiles
  add column if not exists challenges_won int not null default 0,
  add column if not exists challenges_played int not null default 0;

create unique index if not exists profiles_secret_name_unique
  on public.profiles (secret_name) where secret_name is not null;

-- Challenges: contest a held rare name, settled on a shared round.
create table if not exists public.challenges (
  id uuid primary key default gen_random_uuid(),
  challenger uuid not null references auth.users(id) on delete cascade,
  defender   uuid not null references auth.users(id) on delete cascade,
  secret_name text not null,
  status text not null default 'pending' check (status in ('pending','accepted','declined','settled','canceled')),
  round_id uuid references public.rounds(id) on delete set null,
  challenger_score int, defender_score int, winner uuid,
  created_at timestamptz not null default now(), settled_at timestamptz
);
create index if not exists challenges_parties_idx on public.challenges (challenger, defender, status);
alter table public.challenges enable row level security;
drop policy if exists "challenges: participants read" on public.challenges;
create policy "challenges: participants read" on public.challenges for select
  using (auth.uid() = challenger or auth.uid() = defender);

-- Who holds each rare name (null holder = unclaimed). Readable by any member.
create or replace function public.secret_roster()
returns table (name text, holder uuid, holder_display text, holder_first text, holder_last text, holder_initials text)
language sql security definer set search_path = public stable as $$
  select n, p.id, p.display_name, p.first_name, p.last_name, p.initials
  from unnest(public.secret_names()) as n
  left join public.profiles p on p.secret_name = n and p.display_name_type = 'secret'
  order by array_position(public.secret_names(), n);
$$;
grant execute on function public.secret_roster() to authenticated;

-- Rework profile save so a name held by someone else can't be taken directly.
create or replace function public.save_profile(p_first text, p_last text, p_display text, p_type text default 'custom', p_parts jsonb default null, p_secret text default null)
returns void language plpgsql security definer set search_path to 'public' as $$
declare v_uid uuid := auth.uid(); v_display text; v_initials text; v_type text; v_secret text := null;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  v_display := btrim(regexp_replace(p_display, '\s+', ' ', 'g'));
  if length(v_display) < 1 then raise exception 'Display name required'; end if;

  if p_type = 'secret' and p_secret is not null then
    if p_secret = (select secret_name from public.profiles where id = v_uid) then
      v_type := 'secret'; v_secret := p_secret; v_display := p_secret;
    elsif exists (select 1 from public.profiles where secret_name = p_secret and id <> v_uid and display_name_type='secret') then
      raise exception 'TAKEN: that name is already held';
    elsif exists (select 1 from public.secret_grants g where g.user_id=v_uid and g.secret_name=p_secret and g.claimed_at is null) then
      update public.secret_grants set claimed_at=now() where user_id=v_uid and secret_name=p_secret and claimed_at is null;
      v_type:='secret'; v_secret:=p_secret; v_display:=p_secret;
    elsif p_secret = any (public.unlocked_secret_names()) then
      v_type:='secret'; v_secret:=p_secret; v_display:=p_secret;
    else
      v_type:='custom';
    end if;
  elsif p_type='generated' then v_type:='generated';
  else v_type:='custom'; end if;

  v_initials := upper(left(btrim(p_first),1)) || upper(left(btrim(p_last),1));
  if v_initials='' then v_initials := upper(left(regexp_replace(v_display,'[^A-Za-z]','','g'),2)); end if;
  if v_initials='' then v_initials:='?'; end if;

  insert into public.profiles (id, first_name, last_name, display_name, initials, display_name_type, display_name_parts, secret_name)
  values (v_uid, btrim(p_first), btrim(p_last), v_display, v_initials, v_type, p_parts, v_secret)
  on conflict (id) do update set
    first_name=excluded.first_name, last_name=excluded.last_name, display_name=excluded.display_name,
    initials=excluded.initials, display_name_type=excluded.display_name_type,
    display_name_parts=excluded.display_name_parts, secret_name=excluded.secret_name;

  if exists (select 1 from public.players where user_id=v_uid and is_self) then
    update public.players set name=v_display, initials=v_initials where user_id=v_uid and is_self;
  else
    insert into public.players (user_id, name, initials, is_self) values (v_uid, v_display, v_initials, true);
  end if;
end;
$$;

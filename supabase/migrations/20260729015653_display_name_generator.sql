-- Profile fields for the name generator
alter table public.profiles
  add column if not exists display_name_type text not null default 'custom',
  add column if not exists display_name_parts jsonb,
  add column if not exists secret_name text;
alter table public.profiles drop constraint if exists profiles_dn_type_check;
alter table public.profiles add constraint profiles_dn_type_check
  check (display_name_type in ('custom', 'generated', 'secret'));

-- Signup secret-name grants (server-issued; claimed when the profile saves)
create table if not exists public.secret_grants (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  secret_name text not null,
  created_at  timestamptz not null default now(),
  claimed_at  timestamptz
);
alter table public.secret_grants enable row level security;
create policy "secret_grants: read own" on public.secret_grants for select using (auth.uid() = user_id);

-- Ordered secret list (must match src/lib/golfNames.ts SECRET_NAMES)
create or replace function public.secret_names()
returns text[] language sql immutable set search_path = public as $$
  select array[
    'The Chosen One','Golf Jesus','Lord of the Links','Putter Whisperer','The Beverage Cart',
    'Patron Saint of Mulligans','King of Pace of Play','The Sandman','Mr. Fore Right','The Breakfast Ball',
    'Course Record Holder','Grip Reaper','Cart Mafia','Putt Daddy Supreme','Birdie Factory',
    'Bogey Collector','Captain Lip Out','CEO of Three Putts','Greenside Goblin','The Beverage Bandit',
    'Lord Bogey','Shank Commander','Commissioner of Chaos'
  ];
$$;

-- 1-in-N secret roll (signup only). On a hit, records a grant and returns the name.
create or replace function public.roll_secret_name()
returns text language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_names text[]; v_name text; odds int := 200;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if random() >= 1.0 / odds then return null; end if;
  v_names := public.secret_names();
  v_name := v_names[1 + floor(random() * array_length(v_names, 1))::int];
  insert into public.secret_grants (user_id, secret_name) values (v_uid, v_name);
  return v_name;
end;
$$;
grant execute on function public.roll_secret_name() to authenticated;

-- Achievement unlocks: 15 rounds -> first 2 secrets, then +2 every 5 rounds after.
create or replace function public.unlocked_secret_names()
returns text[] language plpgsql security definer set search_path = public stable as $$
declare v_uid uuid := auth.uid(); v_rounds int; v_n int; v_names text[];
begin
  if v_uid is null then return array[]::text[]; end if;
  select count(*) into v_rounds from public.rounds where user_id = v_uid and is_final;
  if v_rounds < 15 then return array[]::text[]; end if;
  v_names := public.secret_names();
  v_n := least(2 + (floor((v_rounds - 15) / 5.0) * 2)::int, array_length(v_names, 1));
  return v_names[1:v_n];
end;
$$;
grant execute on function public.unlocked_secret_names() to authenticated;

-- Validated profile save (secret names verified server-side).
create or replace function public.save_profile(
  p_first text, p_last text, p_display text,
  p_type text default 'custom', p_parts jsonb default null, p_secret text default null
) returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_display text; v_initials text; v_type text; v_secret text := null;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  v_display := btrim(regexp_replace(p_display, '\s+', ' ', 'g'));
  if length(v_display) < 1 then raise exception 'Display name required'; end if;

  if p_type = 'secret' and p_secret is not null then
    if exists (select 1 from public.secret_grants g where g.user_id = v_uid and g.secret_name = p_secret and g.claimed_at is null) then
      update public.secret_grants set claimed_at = now()
        where user_id = v_uid and secret_name = p_secret and claimed_at is null;
      v_type := 'secret'; v_secret := p_secret; v_display := p_secret;
    elsif p_secret = any (public.unlocked_secret_names()) then
      v_type := 'secret'; v_secret := p_secret; v_display := p_secret;
    else
      v_type := 'custom';  -- not entitled: no rare status
    end if;
  elsif p_type = 'generated' then
    v_type := 'generated';
  else
    v_type := 'custom';
  end if;

  v_initials := upper(left(btrim(p_first), 1)) || upper(left(btrim(p_last), 1));
  if v_initials = '' then v_initials := upper(left(regexp_replace(v_display, '[^A-Za-z]', '', 'g'), 2)); end if;
  if v_initials = '' then v_initials := '?'; end if;

  insert into public.profiles (id, first_name, last_name, display_name, initials, display_name_type, display_name_parts, secret_name)
  values (v_uid, btrim(p_first), btrim(p_last), v_display, v_initials, v_type, p_parts, v_secret)
  on conflict (id) do update set
    first_name = excluded.first_name, last_name = excluded.last_name,
    display_name = excluded.display_name, initials = excluded.initials,
    display_name_type = excluded.display_name_type, display_name_parts = excluded.display_name_parts,
    secret_name = excluded.secret_name;

  if exists (select 1 from public.players where user_id = v_uid and is_self) then
    update public.players set name = v_display, initials = v_initials where user_id = v_uid and is_self;
  else
    insert into public.players (user_id, name, initials, is_self) values (v_uid, v_display, v_initials, true);
  end if;
end;
$$;
grant execute on function public.save_profile(text, text, text, text, jsonb, text) to authenticated;

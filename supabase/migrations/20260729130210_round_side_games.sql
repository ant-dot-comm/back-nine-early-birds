alter table public.rounds add column if not exists side_games text[] not null default '{}';

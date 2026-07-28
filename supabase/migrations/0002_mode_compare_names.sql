-- Round hole-set (back 9 vs full 18) + optional comparison round,
-- and real first/last name on profiles (display_name stays the "golf name").

alter table public.rounds
  add column if not exists mode text not null default 'back9',
  add column if not exists compare_round_id uuid references public.rounds (id) on delete set null;

alter table public.rounds drop constraint if exists rounds_mode_check;
alter table public.rounds
  add constraint rounds_mode_check check (mode in ('back9', 'full18'));

alter table public.profiles
  add column if not exists first_name text,
  add column if not exists last_name text;

-- Full-18 rounds need holes 1–18 (0001 restricted this to the back nine).
alter table public.hole_scores drop constraint if exists hole_scores_hole_check;
alter table public.hole_scores add constraint hole_scores_hole_check check (hole between 1 and 18);

-- Per-hole save state: a hole is "unsaved" until the user confirms it.
alter table public.hole_scores
  add column if not exists saved boolean not null default false;

-- Existing scores were entered under the old always-persisted model: treat as saved.
update public.hole_scores set saved = true where saved = false;

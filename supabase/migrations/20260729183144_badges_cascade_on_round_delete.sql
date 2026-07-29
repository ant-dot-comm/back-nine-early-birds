-- Deleting a round should remove the badges/awards earned from it
-- (bogey-free, duel wins, side-game wins). Milestone badges have a null
-- round_id and are unaffected.
alter table public.badges drop constraint if exists badges_round_id_fkey;
alter table public.badges add constraint badges_round_id_fkey
  foreign key (round_id) references public.rounds(id) on delete cascade;

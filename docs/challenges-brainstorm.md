# Rare-name challenges — design brainstorm

Status: **design only, not implemented.** Captures the direction so we don't lose it.

## Decisions locked in
- **Ownership model: Option A — unique holder.** Each ultra-rare name has **at most one holder** across the whole club. Names are scarce trophies.
- **Settle mechanism: the shared round.** A challenge is decided by a **single round both players log together** in the app (they're both players on the same `rounds` row). Lower score over the agreed holes wins. No trust needed — scores are already recorded per player.

## What has to change from today
Today rare names are **not** scarce: the achievement system lets *any* member with enough rounds pick *any* unlocked secret, so duplicates are possible. Going unique means the achievement unlock changes meaning:

- Reaching a round milestone no longer grants a *free copy* of a name.
- Instead it grants the **right to claim an unclaimed name**, or to **challenge the current holder** of a held name.
- Migration note: if duplicates already exist when we build this, we'll need a one-time reconciliation (e.g. first-claimed keeps it, or everyone re-competes). TBD.

## Ownership / eligibility
- A mapping of `secret_name → holder_user_id` (nullable = unclaimed).
- Eligibility to claim/challenge a given name is still gated by the **rounds-played achievement tiers** (15 → first couple, +2 every 5, etc.) so newcomers can't chase every name immediately.
- Unclaimed + eligible → claim outright (no duel needed).
- Held + eligible → must challenge the holder.

## Challenge lifecycle
1. **Browse** the rare-name "trophy case." Each name shows its holder (or "unclaimed").
2. **Challenge** `{holder}` for a name you're eligible for → holder gets an invite.
3. Holder **accepts** (or declines / it expires). On accept the name is **staked**.
4. The next **round both players log together** and finalize becomes the settling round.
   - Compare the two players' scores over the round's holes.
   - **Lower score wins the name.** Winner becomes the new holder; the transfer + both scores are written to a challenge record.
5. History + stats update.

## Open questions (to decide before building)
- **Format:** must both agree Back 9 vs Full 18 for the settling round? (Probably the challenge stores a format and only a matching round settles it.)
- **Ties:** holder keeps it (defender's advantage) — recommended — or replay?
- **Expiry:** challenge voids if not settled within N days / after the accept?
- **One stake per round:** if two challenges could both settle on the same round, how to resolve? (Likely: a round settles at most one challenge, oldest accepted first.)
- **Declining / cooldown:** can a holder refuse forever? Maybe a cooldown so they can't dodge indefinitely.

## Data model sketch
- `secret_holdings` — `secret_name` (pk), `holder_user_id`, `since`.
- `challenges` — id, challenger, defender, secret_name, format, status
  (`pending | accepted | settled | declined | expired`), settling `round_id`,
  `challenger_score`, `defender_score`, `winner_user_id`, `created_at`, `settled_at`.
- `profiles` add: `challenges_won`, `challenges_played` (or derive from `challenges`).
- Settlement runs server-side (security-definer function) when a qualifying round finalizes, so a client can't fake a win.

## Profile stats
- "Rare-name challenges won / played" on the profile/account.
- A small trophy list of names currently held.

## The bigger picture (bullet 4 — later)
The `challenges` table generalizes to **preset challenge types** with the same
invite → accept → shared round → auto-settle loop; only the **metric** changes:

- `low_score`, `most_birdies`, `fewest_bogeys`, `best_par3s`, `best_back_nine`,
  `most_gir`, `longest_streak`, …
- Only `rare_name` challenges carry a name as the **stake**; the rest are bragging
  rights + a "challenges won" breakdown by type.
- Build the recorded-round challenge **engine once**; each new type is a metric
  function + copy. This is the natural expansion path, not a separate system.

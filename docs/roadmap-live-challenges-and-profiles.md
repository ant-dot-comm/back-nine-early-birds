# Roadmap: live challenge rounds + public player profiles

Design notes — **not implemented yet.** Builds on the shipped rare-name challenge
system and the round side-games.

## 1. Live challenge round (initiate from the rare-names list)

Today a challenge settles implicitly on the *next* shared round the two players
finalize. The idea here makes it explicit and live, kicked off from the collection.

### Proposed flow
1. On the rare-names list, a **held** name shows **Challenge**. Tap it →
   challenge created (`pending`), as now.
2. The holder (defender) sees it on their dashboard and **Accepts**.
3. Now either player taps **"Start the challenge round."** That:
   - creates a round with **both players** on it (owner = whoever started it =
     the **scorekeeper**),
   - **links the challenge to that specific round** (`challenges.round_id` set now,
     status → `in_round`), so only *that* round settles it (not any shared round),
   - picks a format (back 9 / full 18) — the starter chooses; both see it.
4. Both dashboards show: **"Challenge round in progress — {scorekeeper} is keeping
   score · {name} on the line."**
5. Scorekeeper enters scores and finalizes → existing settlement runs, tied to the
   linked round → name transfers, stats update.

### Changes from current model
- Add `status = 'in_round'` and set `round_id` at **start** (not just at settle).
- Settlement trigger keys off the **linked** round rather than "any shared round."
- New RPC `start_challenge_round(challenge_id, mode)` → creates the round + players,
  returns round id; only a participant of an `accepted` challenge may call it.

### Open questions
- Who may start the round — either participant, or only the challenger? (Lean: either.)
- Can it be canceled mid-round? (Lean: yes, either party, before finalize.)
- Scorekeeping trust: the scorekeeper enters both scores (like a paper card). A
  future "both confirm the card" step would harden it — out of scope for v1.
- Does the challenge round also count as a normal logged round for stats? (Yes.)
- Expiry if the round is started but never finalized?

## 2. Public player profile

A page any member can open to see another member's stats, record, and (later) badges.

### What it shows
- **Identity:** avatar, display name (+ ultra-rare badge if held), "First L.",
  member-since.
- **Season stats:** rounds, 9-hole avg, 18-hole avg, birdies, eagles, pars, GIR%
  (reuse the leaderboard aggregation, scoped to one user).
- **Challenge record:** duels won / played, the rare name they currently hold.
- **Badges / achievements (future):** rounds milestones (15/25/50…), rare names
  ever held, challenge wins, side-game wins.

### Shape
- Route `/player/:userId`.
- A security-definer `public_profile(p_user)` function returning **aggregates only**
  (no email, no individual rounds) — safe to expose to all members. Excludes test users.
- Link to it from: "Everyone" leaderboard rows, round-summary player rows, the
  add-player sheet, and challenge cards.

### Open questions
- Season only, or also all-time totals / a small "recent rounds" list (scores are
  otherwise private — showing them is a choice)?
- Badge catalog: which achievements, and their thresholds/art?
- Do we surface **side-game wins** here? (Requires persisting side-game results per
  round — currently they're computed on the summary but not stored. If yes, add a
  `round_side_game_results` table written on finalize.)

### Dependency note
Side-game **wins as a stat** need persistence. Right now side-games are stored on
the round and winners are computed live on the summary. To count them on a profile,
persist results at finalize (small table or a jsonb column), then aggregate.

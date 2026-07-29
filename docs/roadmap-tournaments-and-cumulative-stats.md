# Roadmap: cumulative stats + tournaments

Status: **Phase 1 shipped.** Career stats are cumulative and tournaments (create / join / tag rounds /
settle with all three scoring modes + winner badge) are live. Phases 2–3 below remain planned.

## Background — what "season" means today

Every stat surface filters to the **current calendar year**:
- Dashboard "2026 season" tiles — `getSeasonStats()` uses `${year}-01-01` as the floor (`src/lib/db.ts`).
- `member_leaderboard()`, `public_profile()` — `played_on >= date_trunc('year', current_date)`.

So stats **auto-reset every Jan 1**, and "season" is not configurable — it's just the year. There is no
tournament/event concept anywhere yet.

---

## Part 1 — Make the baseline cumulative (all-time)

**Decision:** lifetime cumulative becomes the default everywhere; the calendar-year filter is removed.
Tournaments (Part 2) provide the "fresh competition / reset" that the yearly season was accidentally doing.

Changes:
- `getSeasonStats()` → drop the `.gte("played_on", yearStart)` filter. Rename to career stats.
- `member_leaderboard()` / `public_profile()` → drop the `played_on >=` clause.
- Copy: "2026 season" → "Career" (or "All-time"). Profile "This season" → "Career".
- **Optional later:** a scope toggle (Career / This year / a specific tournament) rather than hard-removing
  the year view. Recommend shipping cumulative-only first; add the toggle only if someone misses the yearly view.

Nothing else changes — badges, rounds, challenges are already cumulative.

---

## Part 2 — Tournaments

### The idea (from the ask)
Someone starts an event. Everyone plays a set number of rounds **at their own leisure**. Once all
participants have finished their rounds, scores are tallied and a **winner badge** is awarded. Tournament
rounds are still normal rounds — they also count toward career stats and earn the usual per-round badges.

### Data model
- **`tournaments`**: `id, name, description, created_by, mode (back9|full18), rounds_required (e.g. 3),
  scoring (default 'total_strokes'), status (open|active|completed|canceled), starts_on, ends_on (nullable
  deadline), created_at, settled_at`.
- **`tournament_players`**: `tournament_id, user_id, joined_at`. (Who's competing.)
- **`rounds.tournament_id`** (nullable FK): tags a round to a tournament. A round belongs to at most one.
  The round still counts toward career stats.
- Optional **`tournament_standings`** snapshot written at settle (so historical results are frozen even if
  rounds are later edited/deleted).

### Lifecycle
1. **Create** — organizer sets name, format, `rounds_required`, optional deadline → status `open`.
2. **Join** — members join (or organizer adds them). Organizer taps Start → `active`.
3. **Play** — when logging a round, if you're in an active tournament that still needs rounds from you, a
   toggle "Count toward {tournament}" tags `rounds.tournament_id`. The tournament screen also has a
   "Log tournament round" shortcut that pre-tags it and locks the format to the tournament's mode.
4. **Track** — tournament detail shows each player's progress (X of N rounds done) and a **provisional**
   live standing.
5. **Settle** — when every participant has `rounds_required` final tournament rounds (**or** the deadline
   passes), standings lock, status → `completed`, badges awarded.

### Scoring — organizer chooses per tournament (locked decision)
The creator picks the scoring method when setting up the tournament. `tournaments.scoring` stores it:
- **`total_strokes`** — sum of strokes across the counted rounds, lowest wins. Best N if a player logs extra.
- **`average`** — mean round score, lowest wins. Fairer when players end up with different round counts.
- **`single_best`** — only each player's lowest round counts.

Common to all: format is fixed per tournament (all Back 9 **or** all Full 18) so totals compare; tie-break
is lowest single round → most pars → shared (co-winners). Later options: net/handicap, Stableford points.

### Handling incomplete players
- Wait-for-all (no deadline): tournament stays `active` until the last person finishes their N.
- With a deadline: at `ends_on`, anyone who didn't finish is ranked **DNF** below all finishers; the rest
  settle normally.

### Badges
- **`tourney_winner`** — e.g. "Tournament Champ", detail "won {tournament} · beat {N} others". Unique per
  tournament (`unique (user_id, kind, detail)` or key on tournament id).
- Optional podium: 2nd/3rd badges, or a "Podium Finish" badge.
- Optional "Entered the Arena" participation badge.
- The existing per-round badges (bogey-free, milestones, side-games) still fire on tournament rounds.

### UI surfaces
- **Tournaments area** — a home-screen section or nav entry listing active + past tournaments.
- **Tournament detail** — rules, participant list with progress bars, provisional/final standings, the
  log-round shortcut, and a winner banner once completed.
- **Public profile** — a "Tournaments" line (wins / played) alongside the existing duels + badges.

### Locked decisions
1. **Cumulative rollout:** career/all-time only. Drop the calendar-year filter; no year toggle for now.
2. **Scoring:** organizer picks per tournament — `total_strokes` (best N), `average`, or `single_best`.
3. **Settlement:** wait for everyone to finish their N rounds (no deadline in v1).
4. **Who can create:** any member can create a tournament and add/invite others.

### Still to confirm
- **Tagging rounds:** new rounds only, or also allow tagging a recently-played round? (Recommend new-only.)
- **Podium/participation badges:** just a winner badge in v1, or 2nd/3rd too? (Recommend winner-only first.)

### Suggested phasing
- **Phase 1:** cumulative-stats switch + create/join/tag/settle with all three scoring modes + winner badge.
- **Phase 2:** provisional live standings polish, optional deadlines + DNF, podium badges.
- **Phase 3:** long-running "seasons" (date-bounded, average/best-N ladder), net/handicap scoring.

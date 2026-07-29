# Testing: preview accounts & URL flags

Ways to see specific UI states without grinding rounds or getting a lucky roll.

## Preview accounts

Well-named test users live in Supabase. They:

- **Can log in** on the real site with email + password (below).
- Are **isolated by Row Level Security** — they can't see or touch real users' data.
- Are **hidden from real users**: the `profiles.is_test` flag excludes them from the
  members list, the "Everyone" leaderboard, and the add-player picker. Real users
  will never see them.

**Password for all of them:** `back9preview`

| Email | What it shows |
| --- | --- |
| `preview-newuser@back9.local` | No profile yet → lands on the **signup name generator** (`/welcome`). Add `?rare=1` to preview the ultra-rare reveal. |
| `preview-newbie@back9.local` | A normal member with a few scored rounds — a standard dashboard. |
| `preview-secret@back9.local` | Display name is an **ultra-rare secret** ("Golf Jesus") → Account shows the **Ultra-rare** badge. |
| `preview-15@back9.local` | 17 rounds → Account shows **2 unlocked secret names** to pick from. |
| `preview-25@back9.local` | 25 rounds → Account shows **6 unlocked secret names**. |

**How to use:** open the site (live or `localhost:5173`), sign in with the email above
and `back9preview`. Sign out (Account → Sign out) to switch back to your own account.
These are fake `@back9.local` emails — **password login works, but magic links /
password resets won't** (no mailbox exists).

## URL flags

| Flag | Effect |
| --- | --- |
| `/welcome?rare=1` | Forces the signup generator into the **ultra-rare reveal** state so you can see the celebration UI without a lucky roll. Preview only — saving it does **not** grant a real secret (the server won't validate it). Use while signed in as `preview-newuser`. |

## Secret-name odds & achievement unlocks

- Signup reroll secret odds: **1 in 50** (constant `odds` in the `roll_secret_name()` DB function).
- Account achievement unlocks (rounds played → secret names available):

  | Rounds | Unlocked |
  | --- | --- |
  | < 15 | 0 |
  | 15 | 2 |
  | 20 | 4 |
  | 25 | 6 |
  | 30 | 8 |
  | … +5 rounds | +2 each, capped at 23 |

## Cleaning up

Remove every preview account (cascades their data) when you're done:

```sql
delete from auth.users where email like 'preview-%';
```

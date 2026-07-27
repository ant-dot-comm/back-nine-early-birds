# Back 9 Early Birds ⛳

A mobile-first **PWA** for logging the back nine (holes 10–18) at Mission Trails
with the Saturday early-birds group. Magic-link sign in, live per-hole score
entry with running to-par, multi-player rounds, summaries, and season stats.

Built from the [design system](design/) mockups — warm, restrained, readable in
full sun (Lora + IBM Plex Sans, deep green with brass reserved for birdies).

## Stack

- **Vite + React + TypeScript**
- **Supabase** — magic-link auth + Postgres (Row Level Security)
- **vite-plugin-pwa** — installable, offline-capable
- Deployed on **Vercel**

## Local development

```bash
npm install
cp .env.example .env      # then fill in your Supabase URL + anon/publishable key
npm run icons             # generate PWA PNG icons from public/icon.svg (one-time)
npm run dev
```

Open http://localhost:5173.

### Environment variables

| Variable                 | Where to find it                                    |
| ------------------------ | --------------------------------------------------- |
| `VITE_SUPABASE_URL`      | Supabase → Project Settings → API → Project URL     |
| `VITE_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → publishable key |

Both are safe to expose to the browser — every table is protected by Row Level
Security so a user only ever sees their own data.

## Database setup

Run [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) in
the Supabase dashboard → **SQL Editor**. It creates `profiles`, `players`,
`rounds`, `round_players`, and `hole_scores`, each with RLS scoped to the
signed-in user.

### Auth redirect URLs

In Supabase → **Authentication → URL Configuration**, add your deployed origin
(and `http://localhost:5173` for local) to **Site URL** / **Redirect URLs** so
magic links land back in the app.

## Screens

Sign in → check email → set display name → home → new round → live score entry →
round summary → season stats.

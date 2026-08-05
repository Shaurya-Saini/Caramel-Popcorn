# 🍿 Caramel Popcorn — Build Progress

> Living status board. **Read at the start of every session; update at the end.**
> Conventions and architecture live in [`CLAUDE.md`](./CLAUDE.md); product spec in [`Content.md`](./Content.md).

**Last updated:** 2026-08-06 (session 2)

---

## Current phase

**MVP build order (`Content.md` §6) — step 0 (scaffolding/setup) COMPLETE.**
Next up: step 1, Auth (Google OAuth) + user profile + taste tags. Blocked on user provisioning Supabase + Google OAuth credentials before real auth/DB work can run end-to-end.

---

## Done

- Project spec (`Content.md`), `CLAUDE.md`, `PROGRESS.md`.
- **Backend skeleton (Express 5, ESM):**
  - `index.js` (boot) + `src/app.js` (`createApp()` factory).
  - `src/config/index.js` — env loading + validated `config` object; `isSupabaseConfigured` flag.
  - `src/config/supabase.js` — service-role Supabase client (null until configured; `requireSupabase()` guard).
  - `src/routes/index.js` — mounted under `/api`, with `GET /api/health`.
  - `src/middleware/error.js` — `notFound` + central `errorHandler`.
  - Deps added: `cors`, `dotenv`, `@supabase/supabase-js`. Scripts: `dev` (nodemon), `start`.
  - `.env.example` (server, Supabase, Google OAuth keys) + `.gitignore`.
  - **Verified:** server boots; `/`, `/api/health`, and 404 all return correct JSON.
- **Frontend setup (React 19 + Vite 8 + TS):**
  - Tailwind **v4** installed + wired via `@tailwindcss/vite` (no config file; tokens in `src/index.css` `@theme`).
  - Popcorn palette defined: `popcorn` (yellow), `butter` (brown neutral), `berry` (red) color scales.
  - Default Vite template stripped (removed `App.css`, `react.svg`, `vite.svg`); themed landing page in `App.tsx`.
  - `src/lib/api.ts` — fetch client reading `VITE_API_URL`, with a live `/health` check shown on the landing page.
  - `react-router-dom` v7 installed (not yet used).
  - `.env.example` (`VITE_API_URL`); `index.html` title updated.
  - **Verified:** `npm run build` passes (tsc + vite); custom `popcorn/butter/berry` utilities confirmed present in generated CSS.

## In progress

- _Nothing actively in progress._

## Next steps (immediate)

1. **User action — provision services** (blocks step 1 end-to-end):
   - Create a Supabase project → copy `SUPABASE_URL` + service-role key into `backend/.env`.
   - Create Google OAuth 2.0 credentials (Google Cloud Console) → client id/secret into `backend/.env`.
   - Copy both `.env.example` files to `.env`.
2. **Database schema** — write the initial Supabase SQL migration for the `Content.md` §5 tables (`User`, `Restaurant`, `Review`, `FavouriteItem`, `Report`), including the two independent visibility flags. Store migrations in a new `backend/db/` (or `supabase/`) folder.
3. **Auth (step 1)** — Google OAuth flow (backend routes + session/JWT), `GET /api/auth/me`, protected-route middleware; frontend login button + auth context.
4. **User profile + taste tags** — profile read/update, predefined taste-tag multi-select, manual-location fallback field.

---

## MVP checklist (from `Content.md` §6)

- [x] 0. Scaffolding: backend skeleton, Tailwind, env config, Supabase client wiring
- [ ] 1. Auth (Google OAuth) + user profile + taste tags
- [ ] 2. Restaurant CRUD + fuzzy-match dedup logic
- [ ] 3. Review CRUD (generic ratings + text) with public/private toggle
- [ ] 4. Favourite items sub-feature + photo upload (Supabase Storage)
- [ ] 5. Static map snippet + Google Maps deep link
- [ ] 6. Geolocation + distance calculation + filter/sort
- [ ] 7. Popcorn click animation (desktop, then mobile-lite)
- [ ] 8. Reporting / moderation queue
- [ ] 9. Responsive polish + full theme pass

---

## Decisions log

| Date       | Decision | Why |
|------------|----------|-----|
| 2026-08-06 | Keep frontend/backend as separate apps in one repo, run independently. | Matches existing scaffold; clean deploy split (Cloudflare Pages + Render/GCP). |
| 2026-08-06 | Backend uses ES modules (`"type": "module"`). | Modern syntax; matches Supabase-js and frontend ESM; cleaner imports. |
| 2026-08-06 | App split into `index.js` (listen) + `src/app.js` (`createApp` factory). | Keeps the app importable for future tests without opening a port. |
| 2026-08-06 | Tailwind **v4** via `@tailwindcss/vite`, tokens in CSS `@theme` (no `tailwind.config.js`). | v4's current recommended setup; less config, faster builds. |
| 2026-08-06 | Palette named `popcorn`/`butter`/`berry` (yellow/neutral/red). | Themed, memorable utility names mapping to spec palette. |
| 2026-08-06 | Supabase client is nullable + boots without creds. | Lets the API run for local dev/health before services are provisioned. |
| 2026-08-06 | Kept `react-router-dom` v7 despite a high-sev advisory (RSC-mode CSRF). | Advisory only affects RSC mode, which we don't use; the fix is a breaking downgrade. Revisit if we adopt RSC. |

## Open questions / blockers

- **Blocker for step 1:** Supabase project + Google OAuth app not yet created (needs user credentials/setup).
- Backend hosting choice (Render vs GCP) not finalised — not blocking local dev.
- Session strategy for auth (JWT vs. cookie session) — to decide at start of step 1.
- Migration tooling: raw SQL files vs. Supabase CLI — to decide when writing the schema.

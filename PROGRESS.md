# 🍿 Caramel Popcorn — Build Progress

> Living status board. **Read at the start of every session; update at the end.**
> Conventions and architecture live in [`CLAUDE.md`](./CLAUDE.md); product spec in [`Content.md`](./Content.md).

**Last updated:** 2026-08-07 (session 4)

**Session 4 summary:** User manually tested Google login + features (all good except adding restaurants, deferred). Fixed the popcorn-rain navigation bug; reworked the effect twice per user feedback: (a) sprites from the two `.glb` models, then (b) **replaced the custom rain with a Matter.js physics world** (real gravity, collisions, bouncing, + an invisible mouse body that shoves the pile) and **recoloured the popcorn to light plain-popcorn pale-yellow/white** (not caramel). Verified end-to-end with screenshots. Design is intentionally basic for now; user will supply components/ideas for a design pass later. **User plans to continue in a NEW session next time** — this file + CLAUDE.md + Content.md are the handoff.

---

## Current phase

**MVP build order (`Content.md` §6) — steps 0,1,2,3,4,7 DONE & verified. Ready for the user's first manual run.**
Chosen architecture: **custom Express backend** runs Google OAuth and enforces privacy with the Supabase secret key (RLS enabled, no policies → tables locked to the backend).

Both migrations applied (`0001`, `0002`) and the private Storage bucket `favourite-photos` is created. All backend e2e scripts pass. Remaining for a fuller product: step 5 (static-map thumbnail — deep link already done), step 6 (geolocation + distance + filter/sort UI), step 8 (reporting/moderation), step 9 (responsive/theme polish).

### How to run it (the user asked)
Two terminals:
- `cd backend; npm run dev`   → API on http://localhost:4000
- `cd frontend; npm run dev`  → app on http://localhost:5173

Then open http://localhost:5173 and: sign in with Google → browse/add a restaurant (try a near-duplicate name to see "Did you mean?") → open a place → post a review with ratings + privacy toggles → add a favourite item with a photo → click anywhere to rain popcorn 🍿.

---

## Done

- **Step 0 — scaffolding** (session 2): backend Express skeleton, Tailwind v4, env config, Supabase client wiring. (See git / earlier entries.)
- **Env fully provisioned** (session 3): `backend/.env` has Supabase URL + **secret** key, Google OAuth client id/secret/callback, generated `SESSION_SECRET`. `frontend/.env` has `VITE_API_URL` + Supabase publishable key. Supabase connection verified with the secret key.
- **DB schema written** — `backend/db/migrations/0001_init.sql` (+ `backend/db/README.md`): `users`, `restaurants`, `reviews`, `favourite_items`, `reports`; `pgcrypto` + `pg_trgm`; trigram index on `restaurants.name` (for step-2 dedup); `updated_at` trigger; RLS enabled with no policies. **NOT yet applied to the DB (user runs it).**
- **Backend auth (step 1)** — verified via curl:
  - `google-auth-library` OAuth flow: `GET /api/auth/google` (302 → Google, CSRF `state` cookie) + `GET /api/auth/google/callback` (code exchange, id_token verify, user upsert, sets httpOnly JWT cookie, redirects to `/profile`).
  - `GET /api/auth/me` (JWT cookie → user or 401), `POST /api/auth/logout`.
  - `PATCH /api/users/me` (update taste tags + manual location, tags validated server-side).
  - `GET /api/meta/taste-tags` (predefined list).
  - Health now reports `supabase` + `google` config status.
  - New modules: `config` (google/jwt), `config/supabase`, `services/userService`, `lib/token`, `middleware/auth`, `constants/tasteTags`, route files.
- **Frontend auth (step 1)** — `npm run build` passes:
  - `react-router-dom` routes: `/` (Landing), `/login` (Login), `/profile` (protected).
  - `AuthContext` (fetches `/auth/me`, login redirect, logout), `ProtectedRoute` guard.
  - `Profile` page: avatar/name/email, taste-tag multi-select (from `/meta/taste-tags`), manual-location field, save (`PATCH /users/me`), sign out.
  - `api.ts` sends `credentials: 'include'`; typed `User`/`Health` responses + `apiGet/apiPatch/apiPost`.

## In progress

- _Nothing mid-flight._ Handing off for the user's first manual run; next coding target is step 6 (geolocation + distance + filter/sort) or step 5 (static-map thumbnail).

## Done (step 3 — Reviews, verified)

- `services/reviewService.js` + `routes/reviews.routes.js` + nested reads on the restaurants router.
- CRUD: `POST /api/reviews` (one per user/restaurant → 409 on dup), `PATCH/DELETE /api/reviews/:id` (ownership enforced), `GET /api/restaurants/:id/reviews` (privacy-filtered list + rating summary), `GET /api/restaurants/:id/my-review`.
- **Server-enforced privacy** (both flags): generic part shown only if `is_public_generic` OR owner; items part only if `is_public_items` OR owner AND non-empty; reviews with no visible part are omitted for non-owners. `attachUser` optional-auth middleware added.
- Frontend: star ratings (`StarRating`), `ReviewForm` (create/edit/delete + both privacy toggles), review list + summary on `RestaurantDetail`.
- **Verified:** `scripts/reviews-e2e.mjs` — 13/13 (incl. cross-user private hidden, ownership 403, rating validation). Caught + fixed a real leak (empty favourites list was keeping a private review visible).

## Done (step 4 — Favourite items + photos, verified)

- Private Storage bucket `favourite-photos` (via `scripts/setup-storage.mjs`).
- `lib/storage.js`: **sharp** compression (resize ≤1280px, WebP q80) + signed URLs (1 h TTL) + upload/delete. `middleware/upload.js`: multer memory, image-only, 15 MB hard cap.
- `services/favouriteItemService.js` + routes: `GET/POST /api/reviews/:id/items` (owner; POST multipart, photo optional), `DELETE /api/items/:id`. `listForRestaurant` signs photos only for visible items.
- Frontend: `FavouriteItems` (list/add-with-photo/delete) inside `ReviewForm`; `apiUpload` handles multipart.
- **Verified:** `scripts/items-e2e.mjs` — 11/11. Proved compression (2000×2000 JPEG → 1280×1280 WebP, 23.7 KB → 3 KB), signed URLs, per-part privacy, non-image rejection, storage+row cleanup on delete.

## Done (step 7 — Popcorn click animation) — reworked twice in session 4

**Final implementation: Matter.js physics + light-popcorn sprites.**
- `components/PopcornRain.tsx` — a **Matter.js** world on a `pointer-events:none` canvas. Each click adds a circular popcorn body (`restitution 0.45` → bounce, friction, small spin) that falls under gravity, collides/bounces, and stacks. Static floor + side walls (rebuilt on resize). An invisible static `mouse` body follows the cursor (`mousemove` → `Body.setPosition`) and shoves the pile — no dragging. `Runner` + `Events.on(engine,'afterUpdate', draw)` renders sprites at each body's position/angle. Body cap: 60 mobile / 170 desktop (oldest removed past cap).
- **Sprites from the two `.glb` models** (not live 3D — 9.8 MB/132k-tri + 31.6 MB/553k-tri). `frontend/models/*.glb` (moved out of `public/` so they never ship) → `scripts/render-sprites.mjs`: system **Chrome** via Playwright + three.js renders 5 small-angle views/model; the harness **overrides materials to a light plain-popcorn colour** (`0xfdf3cf`, bright lighting); sharp trims/resizes → `src/assets/popcorn/*.webp` (~4–6 KB each, 10 total). Re-run: `npm run render:sprites`. (Playwright's Chromium download is blocked here, hence `channel: 'chrome'`.)
- **Colour:** user wanted light/plain popcorn, not caramel — achieved by overriding the models' (dark/olive) textures with a uniform pale-yellow material at render time.
- **Nav bug (fixed earlier this session):** effect died after navigation because the pile-reset emptied the heightmap; the old canvas approach is now gone entirely (Matter.js reset just removes the popcorn bodies, keeping walls+mouse). Clarified with user: *pile* resets on nav/refresh, effect keeps working everywhere.
- **Verified:** `scripts/verify-popcorn.mjs` drives the app with Chrome — popcorn renders + stacks on the landing page (31k non-transparent px) AND after navigating to `/restaurants` (30k px). Build ships sprites only (no `.glb`); `three`/`playwright`/`sharp` are dev-only; `matter-js` (~85 KB) is the only new runtime dep. Screenshots shared with the user.

## Done (step 2 — Restaurant CRUD + fuzzy dedup)

- **DB:** `0002_restaurant_matches.sql` — `find_restaurant_matches(name, lat, lng, limit)` RPC (trigram similarity + Haversine distance).
- **Backend:** `services/restaurantService.js` (findMatches, create, getById, list w/ cuisine filter + recent/name sort, tag normalisation); `routes/restaurants.routes.js`:
  - `GET /api/restaurants` (public list; `?cuisine=&sort=recent|name`)
  - `GET /api/restaurants/:id` (public detail; 404 if missing)
  - `POST /api/restaurants/duplicate-check` (auth; "Did you mean …?" candidates)
  - `POST /api/restaurants` (auth; runs dedup → 409 + candidates unless `confirmCreate:true`)
- **Frontend:** `/restaurants` (list), `/restaurants/new` (protected add form with duplicate-confirmation flow), `/restaurants/:id` (detail + Google Maps deep link). `api.ts` gains `Restaurant`/`RestaurantMatch` types, `googleMapsUrl()`, and `ApiError.body` (to read 409 candidates). `.input` component class added to `index.css`.
- **Verified:** frontend build passes; route wiring smoke-tested (public list returns `[]`, unauth create → 401).

## Next steps (immediate)

1. **USER: first manual run** — see "How to run it" above. Confirm the Google login round-trip works in the browser (the one flow no script can cover).
2. **Step 6 — geolocation + distance + filter/sort**: request browser geolocation on load (manual-location fallback already on the profile), compute distance to each restaurant, add cuisine/rating/distance filters + sort to the list UI (backend list already supports cuisine + recent/name; add rating once reviews aggregate, distance client-side).
3. **Step 5 — static-map thumbnail** on restaurant cards/detail (deep link already done).
4. **Step 8 — reporting/moderation** (`reports` table exists): report button on reviews/restaurants + a basic admin queue.
5. **Step 9 — responsive/theme polish pass.**

---

## MVP checklist (from `Content.md` §6)

- [x] 0. Scaffolding: backend skeleton, Tailwind, env config, Supabase client wiring
- [x] 1. Auth (Google OAuth) + user profile + taste tags — verified (auth-e2e); browser login optional-manual
- [x] 2. Restaurant CRUD + fuzzy-match dedup logic — verified (restaurants-e2e 10/10)
- [x] 3. Review CRUD (generic ratings + text) with public/private toggle — verified (reviews-e2e 13/13)
- [x] 4. Favourite items sub-feature + photo upload (Supabase Storage) — verified (items-e2e 11/11)
- [~] 5. Static map snippet + Google Maps deep link — deep link DONE; static thumbnail pending
- [ ] 6. Geolocation + distance calculation + filter/sort
- [x] 7. Popcorn click animation (desktop, then mobile-lite)
- [ ] 8. Reporting / moderation queue
- [ ] 9. Responsive polish + full theme pass

---

## Decisions log

| Date       | Decision | Why |
|------------|----------|-----|
| 2026-08-06 | Frontend/backend separate apps in one repo. | Clean deploy split (Cloudflare Pages + Render/GCP). |
| 2026-08-06 | Backend ES modules; `index.js` (listen) + `src/app.js` (`createApp`). | App importable for tests without opening a port. |
| 2026-08-06 | Tailwind v4 via `@tailwindcss/vite`, tokens in CSS `@theme`. | v4's recommended setup; palette `popcorn`/`butter`/`berry`. |
| 2026-08-06 | Kept `react-router-dom` v7 despite RSC-mode CSRF advisory. | We don't use RSC; fix is a breaking downgrade. |
| 2026-08-07 | **Auth = custom Express backend** (not Supabase Auth / not hybrid). | Matches spec's server-enforced privacy; uses the Google client the user created. Needs the Supabase **secret** key. |
| 2026-08-07 | OAuth via `google-auth-library` + own JWT (no Passport). | Lighter, stateless, no session store. |
| 2026-08-07 | Session = JWT in **httpOnly cookie**, `SameSite=Lax`, `Secure` in prod. | Simple + safe for same-site dev. **Prod caveat:** deploy frontend+backend under one registrable domain (subdomains) or switch to `Authorization: Bearer`. |
| 2026-08-07 | Both visibility flags (`is_public_generic`, `is_public_items`) live on the **`reviews`** row; `favourite_items` has no per-item flag. | Honours the "two independent parts, one toggle each" rule; avoids denormalising a list-level flag. Deviates from Content.md §5's literal placement — reversible. |
| 2026-08-07 | **One review per user per restaurant** (unique constraint), editable. | Matches "edit/delete your review" language; can relax to multi-visit later. |
| 2026-08-07 | RLS enabled on all tables with **no policies**. | Locks data to the backend secret key; defense-in-depth if the publishable key reaches the browser. |
| 2026-08-07 | Manual SQL migrations via Supabase SQL editor (no CLI/ORM yet). | We have the API key, not the DB connection string; keeps DDL transparent. |
| 2026-08-07 | Fuzzy dedup via a Postgres RPC (`pg_trgm` similarity > 0.3 OR exact name, + Haversine distance). | Uses the trigram index; DB-side scales better than fetching all rows into Node. |
| 2026-08-07 | Any dedup candidate triggers a confirm prompt; override via `confirmCreate:true` (409 otherwise). | Matches Content.md §2.2 ("Did you mean …?", incl. same-name/different-location). |
| 2026-08-07 | Cuisine tags: free-form strings, normalised (trim/lowercase/dedupe); no fixed list yet. | Keeps step 2 moving; a curated list can come with filter UI later. |
| 2026-08-07 | GET restaurants public (no auth); create requires auth. | Restaurants are a shared public DB; only members contribute. |
| 2026-08-07 | A review with no viewer-visible part is omitted from lists (empty favourites doesn't keep a private review visible). | Correct per-part privacy; fixed a real leak found by reviews-e2e. |
| 2026-08-07 | Rating summary averages each review's own mean across its set ratings, over visible-generic reviews only. | Simple, respects privacy; refine weighting later if needed. |
| 2026-08-07 | Favourite-item photos: **private** bucket + server-signed URLs (1 h), not a public bucket. | Keeps private items' photos non-public, matching the API privacy model. |
| 2026-08-07 | Compress photos server-side (sharp: ≤1280px, WebP q80) + 15 MB hard cap; store object path in `photo_url`, sign on read. | Protects the 1 GB free tier (user constraint); WebP is small; signed URLs expire. |
| 2026-08-07 | Popcorn pile resets on route change (SPA nav), not just full refresh. | Matches Content.md "resets on refresh or page navigation"; keeps it in-memory/non-persistent. |
| 2026-08-07 (s4) | Popcorn kernels = 2D sprites pre-rendered from the `.glb`, not live 3D. | Models are 43 MB / up to 553k tris — unusable live without lag. Sprites are ~5 KB, look like the models, zero runtime 3D cost. |
| 2026-08-07 (s4) | `.glb` models moved to `frontend/models/` (out of `public/`); sprites baked via Playwright+three (`npm run render:sprites`) using **installed Chrome** (`channel: 'chrome'`). | `public/` ships to prod (would bundle 43 MB). Playwright's Chromium download is blocked here, but Chrome/Edge are installed. |
| 2026-08-07 (s4) | Popcorn physics: spin while falling + roll down the pile (angle-of-repose). | User wants realistic tumbling, not drop-and-stick. Cheap 2D math. |
| 2026-08-07 (s4) | ~~Warm caramel tint~~ → material override in the render harness; colour tuned to **butter-popcorn yellow (`0xffe27d`)** per user (was `0xfdf3cf` plain). Popcorn bodies sized ~1.5×; cursor collision radius 42. | User wants butter (not plain/pale, not caramel) popcorn, slightly bigger, with more clearance around the cursor. Overriding the models' dark textures keeps both models consistent. |
| 2026-08-07 (s4) | **Popcorn effect uses Matter.js** (real gravity/collisions/bouncing) instead of the hand-rolled canvas sim; cursor is an invisible physics body that shoves the pile (no drag). | User request — wanted true physics & bouncing. `matter-js` (~85 KB) is worth it for the signature interaction; kept strictly scoped to `PopcornRain`. |

## Open questions / blockers

- **Blocker for step-2 e2e:** migration `0002_restaurant_matches.sql` not yet applied (user action).
- Distance/rating **sort** for the list deferred: rating needs reviews (step 3), distance needs geolocation (step 6). Currently recent/name only.
- Production cookie/domain strategy — revisit at deploy time.
- Backend hosting (Render vs GCP) — not finalised; not blocking.
- Supabase Storage bucket for favourite-item photos — DONE (`favourite-photos`, private).
- **`frontend/models/*.glb` are 43 MB total** — committing them will bloat the repo. Decide: track them (needed to re-render sprites on other machines) vs. gitignore + store elsewhere. The generated `src/assets/popcorn/*.webp` (~50 KB) are what actually ship and should be committed either way. _Awaiting user preference._
- **Design pass pending:** user will provide components + ideas; current UI is functional-but-basic by mutual agreement.

## Ops notes

- Local dev leaves orphan `node` servers on port 4000 (Git-bash `kill` doesn't reap the Windows process). To clear: PowerShell `Get-NetTCPConnection -LocalPort 4000 -State Listen | %{ Stop-Process -Id $_.OwningProcess -Force }`.
- Handy test scripts (server must be running): `node scripts/auth-e2e.mjs`, `node scripts/restaurants-e2e.mjs` — both create + clean up their own test rows.

# 🍿 Caramel Popcorn — Build Progress

> Living status board. **Read at the start of every session; update at the end.**
> Conventions and architecture live in [`CLAUDE.md`](./CLAUDE.md); product spec in [`Content.md`](./Content.md).

**Last updated:** 2026-08-07 (session 7)

**Session 7 summary:** **Step 9 — full design/theme pass** (no functionality changed). Added a shadcn-style component layer themed to the popcorn brand: installed `class-variance-authority`/`clsx`/`tailwind-merge`/`lucide-react` + self-hosted **DynaPuff** (display/brand) & **Manrope** (body/UI) via `@fontsource-variable`, an `@/` alias (vite + tsconfig), `lib/utils.ts` `cn()`, and semantic design tokens in `index.css` (warm cream background, buttery-yellow primary, cinema-red accent, caramel neutrals, consistent radii). New primitives under `components/ui/` (Button with one primary + supporting variants, Card, Input, Textarea, Label, Badge, Container) plus a global sticky **Navbar** and restyled `StarRating` (lucide stars). Every page rebuilt for a premium, full-width-on-desktop responsive layout: gradient **hero** Landing, 3-col **Restaurants** grid with map/gradient card thumbnails, two-column **RestaurantDetail** (sticky map/actions sidebar), and comfortable centered form cards for Login/Profile/AddRestaurant/AdminReports. Verified: `npm run build` passes; screenshotted all pages at desktop (1440) + mobile (390) — cohesive, responsive, brand-consistent.

**Session 7 follow-ups (user feedback):** (a) UI tweaks — removed the hero background popcorn emoji + the 🍿 from the Navbar/Login wordmark; collapsed the two redundant hero CTAs to one ("Explore places"); removed the sort dropdown on Places (kept cuisine/rating/distance). (b) Native `<select>` filters replaced with a **themed Radix `Select`** (`components/ui/select.tsx`, `@radix-ui/react-select`) — rounded menu, popcorn hover/selected, no blue. (c) **Location-search root cause fixed:** the picker only returned one branch (or none) because **OSM/Nominatim POI coverage is sparse** (it simply lacks Indian branch data). Added **Google Places API (New) Text Search** as the forward-search provider when `GOOGLE_MAPS_API_KEY` is set (full coverage incl. every branch, like Google Maps), with a location bias toward the searcher; falls back to Nominatim when no key. Reverse geocode stays on free Nominatim. **User must add `GOOGLE_MAPS_API_KEY`** (enable "Places API (New)") to activate it. Remaining: step 10 (deploy/ops).

**Session 6 summary:** Built **Step 8 — reporting / moderation queue**. Backend: env-based admin allowlist (`ADMIN_EMAILS` → `config.admin` + `isAdminEmail()`), `isAdmin` now surfaced on the user object, `requireAdmin` middleware; `reportService` (create with target-existence check + open-report dedupe, admin list enriched with reporter + target label, status update) and `reports.routes` (`POST /api/reports` auth; `GET`/`PATCH /api/reports` admin-only). Frontend: `ReportButton` (reason dialog) on review cards + restaurant detail; `/admin/reports` admin-only queue with status filter + Mark reviewed/actioned/dismissed actions; "⚑ Moderation" link on Profile shown only to admins; `User.isAdmin` + `Report` types added. Verified: `reports-e2e` 16/16 (auth, dedupe, bad target 404, invalid type/status 400, non-admin 403, admin list/enrichment/filter/patch, unknown 404); frontend build passes; **screenshotted** the queue + report dialog via Chrome (admin cookie injected). `ADMIN_EMAILS` added to local `.env` (your Google email + a test admin) and to `.env.example`. Then, in the same session, fixed **three user-reported issues** before step 9 (see "Done (session 6 fixes)" below): exact-place picker on add (geocoding), favourite items alongside the review, and coordless-restaurant backfill. Remaining: steps 9, 10. **User will manually test the site next, then start step 9.**

**Session 5 summary:** Built **Step 6** (geolocation + distance + filter/sort) and **Step 5** (static-map thumbnail). Step 6 — backend enriches restaurant list rows with `avgRating`+`reviewCount` (batch aggregate over *public* generic reviews, new `getRatingSummaries()`), list gained `sort=rating`; frontend `LocationProvider` requests geolocation on load (skips prompt if already denied), `lib/geo.ts` Haversine distance, Places list got cuisine/min-rating/max-distance filters + Newest/Name/Top-rated/Nearest sort with per-card rating badge + distance chip; Profile "Use my current location" button saves `lat/lng` (makes the denied-geolocation fallback real). Step 5 — `lib/maps.ts` computes a keyless OSM tile URL (env-overridable `VITE_STATIC_MAP_TILE_URL`), `components/StaticMap.tsx` renders a cover-cropped tile + centred pin + attribution that opens Google Maps (deep link already existed); shown on restaurant detail (banner) and list cards (compact, non-link variant). Verified: frontend build passes; restaurants-e2e 14/14; reviews-e2e 13/13; rating enrichment spot-check (`avgRating=4`); OSM tile math + reachability confirmed; **and both pages screenshotted via Chrome** — real map tiles + pins render on list + detail (shared with user). Also housekeeping: `.glb` models confirmed gitignored; added **Step 10** (deploy/ops). Remaining: steps 8, 9, 10.

**Session 4 summary:** User manually tested Google login + features (all good except adding restaurants, deferred). Fixed the popcorn-rain navigation bug; reworked the effect twice per user feedback: (a) sprites from the two `.glb` models, then (b) **replaced the custom rain with a Matter.js physics world** (real gravity, collisions, bouncing, + an invisible mouse body that shoves the pile) and **recoloured the popcorn to light plain-popcorn pale-yellow/white** (not caramel). Verified end-to-end with screenshots. Design is intentionally basic for now; user will supply components/ideas for a design pass later. **User plans to continue in a NEW session next time** — this file + CLAUDE.md + Content.md are the handoff.

---

## Current phase

**MVP build order (`Content.md` §6) — steps 0–9 DONE & verified. Remaining: 10 (deploy/ops).**
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

- _Nothing mid-flight._ Steps 5–9 + session-6 fixes done & verified. MVP steps 0–9 complete. Only **step 10 (deploy/ops)** remains.

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

## Done (step 9 — Design system + full theme pass, verified)

**Approach:** shadcn-style component layer, personalized to the popcorn brand (not stock shadcn). No functionality changed — presentation only.

- **Fonts:** self-hosted **DynaPuff Variable** (display/brand/headings) + **Manrope Variable** (body/UI) via `@fontsource-variable`, imported in `main.tsx`. Global `h1–h3` use DynaPuff; body/labels Manrope.
- **Tokens (`src/index.css` `@theme`):** refined popcorn/butter/berry scales + semantic tokens (`background` warm cream `#fbf6ea`, `card`, `primary`=popcorn, `accent`=berry, `border`, `input`, `ring`, `muted`) so utilities like `bg-primary`/`border-border` work. Consistent radii (buttons pill, inputs `rounded-xl`, cards `rounded-2xl`). Subtle top radial glow on the body.
- **Setup:** `@/` path alias (`vite.config.ts` + `tsconfig.app.json`), `lib/utils.ts` `cn()` (clsx + tailwind-merge), deps `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`.
- **Primitives (`components/ui/`):** `Button` (+ `buttonVariants` for `<Link>`s — one primary buttery pill + secondary/accent/outline/ghost/link), `Card`, `Input`, `Textarea`, `Label`, `Badge`, `Container` (max-w-7xl / narrow / wide). `StarRating` now uses lucide stars.
- **Layout:** global sticky **Navbar** (brand + Places + admin Moderation + Add place/avatar or Sign in), mounted via a `SiteLayout` route wrapper (Login excluded). Per-page `🍿` headers removed.
- **Pages rebuilt** (full-width on desktop, responsive to mobile): **Landing** (full-bleed gradient hero, feature band, dark CTA), **Restaurants** (3-col card grid with map/gradient thumbnails, rating badge, distance, tags, skeletons), **RestaurantDetail** (2-col: review area + sticky map/actions sidebar), **Login/Profile/AddRestaurant/AdminReports** (comfortable centered form cards). Review sub-components (`ReviewForm`, `FavouriteItems`, `ReviewCard`, `ReportButton`, `LocationPicker`) moved to the primitives.
- **Verified:** `npm run build` passes; screenshotted every page at 1440px + 390px — cohesive typography/spacing/colour, full desktop width used, clean mobile stacking.
- **shadcn scope note:** used shadcn's cva/`cn` patterns + component structure themed to our tokens; kept native `<select>` (filters) and the custom report modal (styled consistently) rather than pulling in Radix Select/Dialog — deliberate, to avoid over-scoping. Easy to swap to Radix later.

## Done (session 6 fixes — 3 user-reported issues, verified)

Root cause of the first two: **the old add-restaurant form never captured coordinates**, so every UI-added place had `lat/lng = null` → the Google Maps deep link fell back to a text search (a list), and the distance filter dropped the place entirely.

1. **Exact-place picker on Add Restaurant** (fixes duplication + wrong Maps result).
   - Backend: `services/geocodeService.js` (`searchPlaces` + `reverseGeocode`) proxies **OSM Nominatim** server-side with the required descriptive User-Agent (keyless, consistent with our OSM tiles; swappable via `GEOCODE_BASE_URL`). `routes/geo.routes.js`: `GET /api/geo/search?q=` and `GET /api/geo/reverse?lat=&lng=` (auth). Config `geocode.{baseUrl,userAgent}`.
   - Frontend: `components/LocationPicker.tsx` — debounced **search** a place OR **"Use my current location"** (reverse-geocoded), then confirm on a `StaticMap` preview; captures precise `lat/lng` + address. `AddRestaurant` now **requires a location** and sends coords (so dedup is distance-aware — two Domino's are disambiguated by the "Did you mean? (500 m away)" prompt). `googleMapsUrl` already prefers `lat,lng`, so the deep link now opens the exact spot.
   - Note: Nominatim POI coverage is patchy in India (Vellore), so the "use my current location" path is the reliable way to pin a specific branch — that's why both methods are offered.
2. **Distance filter fix** — a direct consequence of (1): places now have coordinates, so they get a distance + thumbnail and pass the max-distance filter. **Backfill for existing coordless entries:** `PATCH /api/restaurants/:id/location` (auth; 409 if already located — can't move a placed pin without moderation) + a "📍 This place has no map location yet" panel on the detail page (reuses `LocationPicker`). Lets users fix pre-existing rows (their Dominos etc.).
3. **Favourite items alongside the review** (removed "save review first").
   - `FavouriteItems` is now a controlled component (persisted items + unsaved **drafts**); `ReviewForm` owns both and commits everything on one Save: create/patch the review → upload each staged item. Drafts show an "unsaved" badge; button reads "Post review + N items". Editing still loads/removes persisted items via API.
- **Verified:** frontend build passes; `restaurants-e2e` **16/16** (added location-backfill: coordless create, set→200, re-set→409, no-auth→401); geocode search+reverse tested live (Vellore); **full UI flow screenshotted** via Chrome — picker→map preview→create (DB confirms coords saved `12.9676,79.1746`), review+item in one save (DB confirms item persisted), list shows the new place with a "7.3 km" chip while old coordless rows show none, and the backfill panel renders on a coordless place. Seed/temp scripts cleaned up.

## Done (step 8 — Reporting / moderation, verified)

- **Admin capability = env allowlist.** `ADMIN_EMAILS` (comma-separated) → `config.admin.emails` + `isAdminEmail()`; `userService.toUser` now sets `isAdmin`, so it rides along on `/auth/me`. `middleware/auth.js` gains `requireAdmin` (chain after `requireAuth`). No roles table / migration — matches "basic v1 admin" (Content.md §2.5).
- **`services/reportService.js`** — `createReport` verifies the target exists (404 otherwise) and **dedupes an existing open report** from the same reporter/target (returns it instead of inserting); `listReports({status})` returns newest-first, each enriched with `reporter` (name/email) + a `targetLabel`; `updateReportStatus` validates against `open|reviewed|dismissed|actioned`.
- **`routes/reports.routes.js`** — `POST /api/reports` (auth), `GET /api/reports?status=` (admin), `PATCH /api/reports/:id` (admin). Mounted under `/api`.
- **Frontend** — `ReportButton` (modal: preset reasons Spam/Inappropriate/Incorrect info/Other + optional note) on each non-owner review card and on restaurant detail ("Report place"). `/admin/reports` page (admin-gated in-component; route behind `ProtectedRoute`): status-filter tabs + Mark reviewed/actioned/dismissed. "⚑ Moderation" link on Profile for admins only. `User.isAdmin`, `Report`, `REPORT_REASONS` added to `api.ts`.
- **Verified:** `scripts/reports-e2e.mjs` **16/16** (auth 401, dedupe, review+restaurant targets, unknown target 404, bad type/status 400, non-admin GET/PATCH 403, admin list + reporter/label enrichment, `?status` filter, status patch, unknown id 404). Frontend build passes. Screenshotted the queue (two seeded reports, action buttons) and the report dialog via Chrome with an injected admin cookie (seed + temp scripts cleaned up).

## Done (step 5 — Static map thumbnail, verified)

- **`frontend/src/lib/maps.ts`** — `staticMapTile(place, zoom=15)`: Web-Mercator tile math → a single raster tile URL (or null when the place has no coords). Keyless **OpenStreetMap** by default, overridable via `VITE_STATIC_MAP_TILE_URL` (a `{z}/{x}/{y}` template) for a keyed/self-hosted provider in prod. (OSM tile policy discourages heavy hotlinking — swap for prod.)
- **`frontend/src/components/StaticMap.tsx`** — cover-cropped, centred tile + a centre pin + "© OpenStreetMap" attribution; wrapped in the Google Maps deep link (`interactive` default). `interactive={false}` renders a non-link variant (no nested `<a>`) for use inside list-card links.
- **Wired in:** `RestaurantDetail` (full-width banner above the "Open in Google Maps" button) and `Restaurants` list cards (compact 64px thumbnail, non-link). Address-only places (no coords) simply render no thumbnail and keep the deep link.
- **Chosen approach:** single center tile, cover-cropped, pin at centre (accurate to ±one z15 tile) — always fills any container with no edge gaps, vs. a fractional-offset single tile that leaves blank corners. Tap-to-open-Maps handles precise navigation.
- **Verified:** `npm run build` passes; tile math + OSM reachability checked (land tile ≈26 KB, offshore tile blank as expected); **screenshotted** the list + detail via Chrome/Playwright with a seeded Manhattan restaurant — real streets + pin render on both (seed + temp scripts cleaned up afterwards).

## Done (step 6 — Geolocation + distance + filter/sort, verified)

- **Backend:** `reviewService.getRatingSummaries(ids)` — one batched query over **public** generic reviews → `Map<id,{avgRating,reviewCount}>` (same per-review-mean rule as `listForRestaurant`). `restaurantService.listRestaurants` now enriches every row with `avgRating`+`reviewCount` and supports `sort=rating` (rating desc, unrated last). `PATCH /users/me` now validates `lat`/`lng` range (allows null to clear).
- **Frontend:** `context/LocationContext.tsx` (`LocationProvider` mounted in `main.tsx`) requests browser geolocation on load, but checks `navigator.permissions` first so it won't re-prompt after a denial; exposes `{coords,status,request}`. `lib/geo.ts` (`haversineKm`, `distanceKm`, `formatDistance`). `Restaurants.tsx` rewritten: cuisine / min-rating / max-distance filters + Newest/Name/Top-rated/Nearest sort (all client-side via `useMemo`), rating badge + distance chip per card, and a location banner (live vs profile vs "use my location"/profile link). Viewer origin = live coords, else profile `lat/lng`.
- **Profile:** "📍 Use my current location" button captures browser coords and PATCHes `lat/lng` (shows saved coords) — makes the denied-geolocation fallback actually produce distances.
- `Restaurant` type gained optional `avgRating`/`reviewCount` (list-only).
- **Verified:** `npm run build` passes; `restaurants-e2e` 14/14 (added: list row carries avgRating/reviewCount; `?sort=rating` → 200); `reviews-e2e` 13/13 (reviewService intact); throwaway check: public review with ratings {4,5,3,4} → list `avgRating=4, reviewCount=1`.

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

1. **USER: manual run** — see "How to run it" above. Confirm Google login + Places filters/sort + map thumbnails + reporting. **New in session 6 to test:** (a) **Add a restaurant** — search a place or tap "use my current location", confirm the map preview, save; the deep link now opens the exact spot and it shows a distance chip. (b) **Existing coordless places** (your Dominos etc.) now show a "set location" panel on their detail page — set it to restore distances/thumbnail. (c) **Reviews** — add favourite items (with photos) in the same form and hit Post once. To see the **moderation queue**, sign in with an email in `ADMIN_EMAILS` (your Google email is already added) → Profile → "⚑ Moderation", or `/admin/reports`.
2. **Step 10 — deploy/ops** (last MVP item; see checklist): Supabase uptime ping (cron/GitHub Actions) + production cookie/domain strategy + deploy (Cloudflare Pages + Render/GCP). Set prod env: `GEOCODE_USER_AGENT` (contact), `ADMIN_EMAILS`, a keyed/self-hosted tile + geocode provider if traffic grows.
3. **USER: add `GOOGLE_MAPS_API_KEY`** to `backend/.env` (enable "Places API (New)" in Google Cloud Console; restrict the key to it) so place search returns all branches like Google Maps. Without it, search falls back to OSM (sparse). Free tier ≈ 5,000 Text Search calls/month.
4. _Design polish is done (step 9)._ Further visual tweaks are incremental; the system lives in `src/index.css` (`@theme`) + `components/ui/`.

---

## MVP checklist (from `Content.md` §6)

- [x] 0. Scaffolding: backend skeleton, Tailwind, env config, Supabase client wiring
- [x] 1. Auth (Google OAuth) + user profile + taste tags — verified (auth-e2e); browser login optional-manual
- [x] 2. Restaurant CRUD + fuzzy-match dedup logic — verified (restaurants-e2e 10/10)
- [x] 3. Review CRUD (generic ratings + text) with public/private toggle — verified (reviews-e2e 13/13)
- [x] 4. Favourite items sub-feature + photo upload (Supabase Storage) — verified (items-e2e 11/11)
- [x] 5. Static map snippet + Google Maps deep link — thumbnail (OSM tile) on detail + list cards, verified via screenshots
- [x] 6. Geolocation + distance calculation + filter/sort — verified (restaurants-e2e 14/14; distance sort/filter client-side)
- [x] 7. Popcorn click animation (desktop, then mobile-lite)
- [x] 8. Reporting / moderation queue — verified (reports-e2e 16/16; queue + dialog screenshotted)
- [x] 9. Responsive polish + full theme pass — shadcn-style primitives + DynaPuff/Manrope + full-width responsive layouts, verified via desktop+mobile screenshots
- [ ] 10. Deploy/ops (not in Content.md §6; added s5): Supabase uptime ping (cron/GitHub Actions, avoids 7-day auto-pause) + production cookie/domain strategy (single registrable domain for the httpOnly cookie, or switch to `Authorization: Bearer`).

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
| 2026-08-07 (s7) | Design = **shadcn-style primitives themed to popcorn** (cva + `cn`), not stock shadcn; custom modal kept (styled). | Delivers shadcn's consistency win personalized to the brand without a CLI rewrite of our Tailwind-v4 `@theme`. Reversible. |
| 2026-08-07 (s7) | **Place search → Google Places API (New)** when `GOOGLE_MAPS_API_KEY` set (else Nominatim); reverse stays Nominatim. | Root cause of "missing branches": OSM lacks the POI data. Google matches Google Maps coverage. Kept reverse (address label) on free Nominatim to spare quota; request only name/address/location (cheapest Text Search "Pro" tier, ~5k free/mo). Provider auto-selects by key presence, so no-key dev still works. |
| 2026-08-07 (s7) | Filter dropdowns → **Radix `Select`** (added `@radix-ui/react-select`); removed the sort control. | Native `<select>` popups can't be themed (blue OS highlight, square corners) — Radix gives the rounded, popcorn-highlight menu the user asked for. Sort removed per user; filters cover the need. |
| 2026-08-07 (s7) | Fonts **self-hosted** (`@fontsource-variable` DynaPuff + Manrope), not a CDN. | Offline/robust, no external request at runtime; matches the "no external font CDN" hygiene of the rest of the app. |
| 2026-08-07 (s7) | Full-width on desktop for **hero/lists/detail**; **forms** stay in centered `narrow` cards. | Fixes the "tiny centered column" complaint where it matters (browse/detail) while keeping forms readable — 1280px-wide inputs are bad UX (Airbnb/Notion do the same). |
| 2026-08-07 (s6) | Exact-place picker uses **keyless OSM Nominatim** (backend proxy, descriptive User-Agent, swappable via `GEOCODE_BASE_URL`); adding a restaurant now **requires** a picked location. | Content.md §4 avoids billable map APIs; Nominatim matches our OSM-tile choice. Requiring coords fixes duplication, distance filtering, and the Maps deep link in one stroke. |
| 2026-08-07 (s6) | Offer **both** "search" and "use my current location" for the pin. | Nominatim POI coverage is sparse in the user's area (Vellore); standing-at-the-place geolocation is the reliable way to distinguish two nearby branches. |
| 2026-08-07 (s6) | Location backfill (`PATCH /:id/location`) only fills a **missing** location (409 otherwise). | Restaurants are a shared public DB; letting anyone move an already-placed pin invites vandalism. Backfilling empty coords is safe and fixes legacy rows. |
| 2026-08-07 (s6) | Favourite items **staged in the form**, committed with the review on one Save (create review → upload drafts). | User asked to drop the "save review first" step; keeps the two-part model (items still their own privacy toggle) while making entry one flow. |
| 2026-08-07 (s6) | Admin = **`ADMIN_EMAILS` env allowlist** (no roles table/migration); `isAdmin` derived on the user object; `requireAdmin` middleware. | "Basic v1 admin capability" (Content.md §2.5). Avoids a schema change; the backend already holds trusted config. `isAdmin` on `/auth/me` lets the UI gate the queue link + page. |
| 2026-08-07 (s6) | Reports **dedupe** an existing *open* report from the same reporter+target (return it) instead of inserting duplicates. | Prevents one user spamming the queue on the same item; still lets a fresh report be filed after the prior one is closed. |
| 2026-08-07 (s6) | Report `reason` = preset choice + optional free-text note, stored as one text field. | Content.md lists spam/inappropriate/incorrect-info; a note adds context without a schema change (reason is free text in the `reports` table). |
| 2026-08-07 (s5) | Static map = **single keyless OSM raster tile**, cover-cropped + centre pin, env-overridable (`VITE_STATIC_MAP_TILE_URL`). | Content.md §4 forbids the billable Maps JS API; a static tile needs no key. Single tile (vs. stitched mosaic) is simplest and always fills the frame; ±one-z15-tile accuracy is fine for a tap-to-open-Maps thumbnail. Env override lets prod swap to keyed/self-hosted tiles (OSM policy discourages heavy hotlinking). |
| 2026-08-07 (s5) | `StaticMap` has an `interactive={false}` non-link variant for list cards. | The card is already a `<Link>`; the map's own Google-Maps `<a>` would nest anchors (invalid HTML). Detail page uses the interactive (linked) variant. |
| 2026-08-07 (s5) | `.glb` source models **gitignored** (local-only), sprites committed. | User decision — keeps the 43 MB out of the repo; re-rendering sprites needs the `.glb` supplied locally. |
| 2026-08-07 (s5) | Restaurant list **rating/distance sort**: rating enriched + sorted server-side; distance sort/filter **client-side**. | Distance needs the viewer's coords (not sent to the list API); rating is viewer-independent (public reviews only) so it belongs on the row. List is capped at 50 → client-side filter/sort is instant, no refetch. |
| 2026-08-07 (s5) | Geolocation via a `LocationProvider` requested **once on app load**, checking `navigator.permissions` before prompting. | Matches Content.md §2.3 ("request on load"); the permissions check avoids a pointless prompt after a prior denial. In-memory only (non-persistent). |
| 2026-08-07 (s5) | Distance fallback = **profile-saved `lat/lng`** (via a "Use my current location" button), not geocoding the manual-location text. | Distance needs coords; geocoding would add an external map API (Content.md §4 avoids that). Saving coords once makes the fallback real without new deps. Manual-location text stays as a human-readable label. |
| 2026-08-07 (s4) | **Popcorn effect uses Matter.js** (real gravity/collisions/bouncing) instead of the hand-rolled canvas sim; cursor is an invisible physics body that shoves the pile (no drag). | User request — wanted true physics & bouncing. `matter-js` (~85 KB) is worth it for the signature interaction; kept strictly scoped to `PopcornRain`. |

## Open questions / blockers

- **Blocker for step-2 e2e:** migration `0002_restaurant_matches.sql` not yet applied (user action).
- ~~Distance/rating **sort** for the list deferred~~ — DONE in session 5 (rating server-side, distance client-side).
- Production cookie/domain strategy — revisit at deploy time.
- Backend hosting (Render vs GCP) — not finalised; not blocking.
- Supabase Storage bucket for favourite-item photos — DONE (`favourite-photos`, private).
- ~~**`frontend/models/*.glb` (43 MB) — track vs. gitignore?**~~ — RESOLVED (s5, user): **gitignored** (`frontend/models/` in `.gitignore` + `frontend/.gitignore`), stored locally only. The generated `src/assets/popcorn/*.webp` sprites are committed and are what ship. Re-rendering sprites on a fresh clone requires re-supplying the `.glb` locally.
- **Design pass pending:** user will provide components + ideas; current UI is functional-but-basic by mutual agreement.

## Ops notes

- Local dev leaves orphan `node` servers on port 4000 (Git-bash `kill` doesn't reap the Windows process). To clear: PowerShell `Get-NetTCPConnection -LocalPort 4000 -State Listen | %{ Stop-Process -Id $_.OwningProcess -Force }`.
- Handy test scripts (server must be running): `node scripts/auth-e2e.mjs`, `node scripts/restaurants-e2e.mjs` — both create + clean up their own test rows.

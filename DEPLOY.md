# 🍿 Caramel Popcorn — Deployment Runbook (Step 10)

Production deploy of the frontend (Cloudflare Pages) and backend (Render). DB is
already on Supabase. The Supabase uptime ping (avoids 7-day auto-pause) is
**deferred** — see the last section.

## Target topology

| Piece    | Host             | URL                                   |
|----------|------------------|---------------------------------------|
| Frontend | Cloudflare Pages | `https://popcorn.shauryasaini.dev`    |
| Backend  | Render           | `https://api.popcorn.shauryasaini.dev`|
| Database | Supabase         | (already deployed)                    |

**Why the backend lives on `api.popcorn.shauryasaini.dev`:** the session is an
httpOnly JWT cookie with `SameSite=Lax`. Putting frontend and backend under the
**same registrable domain** (`shauryasaini.dev`) makes their requests *same-site*,
so the `Lax` cookie is sent on XHR — **no code change needed** and no reliance on
third-party cookies (which Safari/Brave block). If the backend were on a
different domain (`*.onrender.com`), login would silently fail.

---

## 0. Prerequisites

- The repo is pushed to GitHub (both Render and Cloudflare deploy from it).
- You control DNS for `shauryasaini.dev` (you already added `popcorn.` for the frontend).
- Supabase project is live; you have the **service key** and **URL**.
- Google Cloud project with OAuth client + **Places API (New)** enabled (done).

---

## 1. Backend → Render

### 1a. Create the service
1. Render Dashboard → **New** → **Web Service** → connect the GitHub repo.
2. Settings:
   - **Root Directory:** `backend`
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance type:** Free (fine to start; see cold-start note below).

### 1b. Environment variables (Render → Environment)
Copy from `backend/.env`, with these production values:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` ← **required** (flips the cookie to `Secure`) |
| `PORT` | `10000` (Render sets `PORT`; our config reads it — you can omit and let Render inject it) |
| `CORS_ORIGINS` | `https://popcorn.shauryasaini.dev` ← drives CORS **and** the OAuth redirect target |
| `SUPABASE_URL` | (from Supabase) |
| `SUPABASE_SERVICE_KEY` | (from Supabase — secret) |
| `GOOGLE_CLIENT_ID` | (existing) |
| `GOOGLE_CLIENT_SECRET` | (existing) |
| `GOOGLE_CALLBACK_URL` | `https://api.popcorn.shauryasaini.dev/api/auth/google/callback` |
| `SESSION_SECRET` | a long random string (**generate a new one for prod**) |
| `ADMIN_EMAILS` | your Google email (comma-separated for more) |
| `GOOGLE_MAPS_API_KEY` | (existing key) |
| `GEOCODE_USER_AGENT` | `CaramelPopcorn/1.0 (shauryathemaster01@gmail.com)` |

> `CORS_ORIGINS` is doubly important: `config.frontendUrl` = its first entry, and
> that's where the OAuth callback redirects after login. Set it to the real
> frontend URL, no trailing slash.

### 1c. Custom domain for the backend
1. Deploy once so the service is live at `…onrender.com`.
2. Render → your service → **Settings → Custom Domains** → add
   `api.popcorn.shauryasaini.dev`.
3. Render shows a **CNAME target** (e.g. `…onrender.com`). In your DNS provider,
   add a **CNAME**: `api.popcorn` → that target. (If Cloudflare hosts your DNS,
   set the record to **DNS-only / grey cloud**, not proxied — Render manages its
   own TLS.)
4. Wait for Render to show the domain **Verified** + certificate issued.

### 1d. Verify
- `https://api.popcorn.shauryasaini.dev/api/health` → `{"status":"ok","supabase":"configured","google":"configured"}`.

---

## 2. Frontend → Cloudflare Pages

### 2a. Create the project
1. Cloudflare Dashboard → **Workers & Pages** → **Create** → **Pages** →
   connect the GitHub repo.
2. Build settings:
   - **Root directory / project:** `frontend`
   - **Framework preset:** Vite (or None)
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`

### 2b. Environment variable (Cloudflare → Settings → Environment variables, Production)
| Key | Value |
|-----|-------|
| `VITE_API_URL` | `https://api.popcorn.shauryasaini.dev/api` |

> Note the `/api` suffix — `api.ts` calls `${API_URL}${path}` where paths start
> at `/auth/...`. Rebuild after changing this (Vite inlines it at build time).

### 2c. Custom domain
1. Cloudflare Pages → your project → **Custom domains** → add
   `popcorn.shauryasaini.dev`. (If your DNS is on Cloudflare, it wires this up
   automatically.)

### 2d. SPA routing
Already handled: `frontend/public/_redirects` contains `/* /index.html 200`, so
deep links (`/restaurants/:id`) resolve on refresh instead of 404-ing.

---

## 3. Google OAuth — add production URLs

Google Cloud Console → APIs & Services → **Credentials** → your OAuth 2.0 Client:

- **Authorized redirect URIs** → add:
  `https://api.popcorn.shauryasaini.dev/api/auth/google/callback`
  (keep the localhost one for dev).
- Authorized JavaScript origins: not required (we use a server-side redirect flow,
  not the Google JS SDK).

Save. Changes can take a few minutes to propagate.

---

## 4. Google Maps API key — server-side restriction

The Places API (New) is called **from the Render server**, not the browser, so:

- **Do NOT** use an *HTTP referrer* restriction (there's no referrer from a
  server → calls would 403).
- Recommended: **Application restriction = None**, **API restriction = "Places
  API (New)" only**. (Render free tier has no static outbound IP, so IP
  restriction isn't practical yet.)

---

## 5. End-to-end smoke test (in production)

1. Open `https://popcorn.shauryasaini.dev` → app loads, popcorn click works.
2. **Sign in with Google** → lands back on `/profile` **logged in** (this proves
   the cross-subdomain cookie works — the whole point of the topology).
3. Add a restaurant → location picker search returns branches (Places API live).
4. Post a review + a favourite item with a photo → photo displays (Supabase
   Storage signed URL).
5. As an `ADMIN_EMAILS` user → `/admin/reports` loads the queue.
6. Hard-refresh on a deep link (`/restaurants/<id>`) → no 404 (SPA redirect).

If step 2 lands on `/login?error=…` or shows logged-out: check `NODE_ENV=production`
on Render, `GOOGLE_CALLBACK_URL` matches the Console redirect URI exactly, and
`CORS_ORIGINS` is the exact frontend URL.

---

## 6. Known free-tier behaviours

- **Render free** spins the service down after ~15 min idle → first request has a
  ~50s cold start. Fine for a demo; upgrade or add a pinger later.
- **Supabase free** auto-pauses after 7 days of no activity.

---

## Deferred: Supabase uptime ping (do later)

Prevents the 7-day auto-pause **and** keeps Render warm. Simplest: a GitHub
Actions cron hitting `https://api.popcorn.shauryasaini.dev/api/health` every ~10
min (which in turn touches Supabase). Not set up yet — postponed per plan.

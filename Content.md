# 🍿 Caramel Popcorn — Project Specification

A popcorn-themed food review and recommendation platform where users log restaurant visits, rate them across multiple metrics, tag their personal favourite menu items, and browse a shared public database of places — all wrapped in a bright, playful UI with a signature popcorn click animation.

---

## 1. Core Concept

Users create **restaurant reviews** made of two independent parts:

1. **Generic Review** — structured ratings + free-text commentary
2. **Favourite Items** — personal picks from the menu, tied to the user's taste profile

Each part has its **own public/private toggle**, so a user can, for example, keep their star ratings public but keep their favourite dish notes private.

Restaurants live in a **shared public database** — once one user adds a restaurant, it's visible to everyone immediately, and other users can review that same entry rather than duplicating it (see fuzzy-matching in §4).

---

## 2. Feature Breakdown

### 2.1 Restaurant Reviews

**Generic Review**
- Sub-ratings: **Food, Service, Price, Ambiance** — each rated 0–5 stars
- A **metric-agnostic free-text field** for general commentary, independent of the star ratings
- Public/private toggle (separate from favourite items toggle)

**Favourite Items**
- Structured entries: item name + short note + optional photo
- Pulled from / linked to the user's **tag-based taste profile** (e.g. spicy, vegetarian, sweet-tooth), settable in profile and overridable per review
- Public/private toggle (separate from generic review toggle)
- Photos stored in **Supabase Storage** (free tier includes 1 GB file storage — sufficient for v1)

**Editing**
- Users can edit or delete their own reviews anytime; no version history is kept

### 2.2 Restaurant Database & Discovery

- Adding a restaurant: user enters name + location
- **Duplicate handling:** fuzzy-match against existing entries by name and location proximity.
  - Close match found → prompt "Did you mean [existing restaurant]?" before creating a new entry
  - Exact name but different location → still flagged for confirmation
  - No match → new entry created, immediately public
- **List view supports:**
  - Filter by cuisine, rating, distance
  - Sort by rating, distance, most recent
- **Location snippet per restaurant:**
  - Static map thumbnail image (auto-generated, not interactive/live)
  - Tapping/clicking the thumbnail opens Google Maps directly (works on both mobile and desktop via deep link/URL scheme)
  - Distance shown relative to the user's location

### 2.3 Location & Distance

- On load, request **browser geolocation permission**
- If granted → calculate live distance to each restaurant
- If denied → fallback to manual city/address entry, stored on the user's profile

### 2.4 User Profile

- Google OAuth login
- Tag-based taste profile (multi-select from a predefined list: spicy, vegetarian, vegan, sweet-tooth, seafood, etc.)
- Manual location fallback field
- Own reviews (public + private) manageable from profile

### 2.5 Moderation

- Users can **report** reviews or restaurant entries (spam, inappropriate content, incorrect info)
- Reports go to an admin queue (basic admin capability for v1 — full moderation dashboard can come later)

---

## 3. Design System

**Theme:** Bright popcorn theme
- **Palette:** Yellow (primary), White, Red (accent)
- Popcorn-themed illustrative elements throughout (icons, empty states, loaders)

**Signature Interaction — Popcorn Click Animation**
- **Desktop:** On click anywhere, a small popcorn kernel spawns at the click point and falls to the bottom of the screen, accumulating into a growing pile with repeated clicks (can fill the screen with enough clicks)
- **Mobile:** Lighter-weight version triggered on tap (fewer/simpler kernels to protect performance on mobile GPUs)
- **Non-persistent:** Pile resets on refresh or page navigation — purely a client-side, in-memory visual effect (no state saved)

**Responsiveness:** Full responsive design across mobile, tablet, and desktop breakpoints.

---

## 4. Technical Architecture

| Layer | Choice |
|---|---|
| Frontend | React + TypeScript + Tailwind CSS |
| Backend | Node.js + Express.js |
| Database | PostgreSQL (via Supabase) |
| File Storage | Supabase Storage (free tier, 1 GB) |
| Auth | Google OAuth 2.0 |
| Maps | Static map image generation + Google Maps deep-link redirect (no live interactive map — keeps costs down; avoids Maps JavaScript API billing) |
| Frontend Hosting | Cloudflare Pages |
| Backend Hosting | Render or Google Cloud Platform |

**Why this stack works for v1 scale (hundreds of users):**
- Supabase free tier covers 50,000 MAUs, 500 MB DB, 1 GB storage — comfortably above a hundreds-of-users launch
- Static maps avoid the Google Maps JS API's interactive billing tier entirely — a static image + `https://www.google.com/maps/search/?api=1&query=...` deep link works cross-platform (mobile app handoff + desktop browser) without needing a paid embed
- **Caveat to watch:** Supabase free projects auto-pause after 7 days of inactivity — worth adding a lightweight uptime ping (cron/GitHub Actions) once this goes live so early users don't hit a paused project

---

## 5. Data Model (high-level)

- **User**: id, google_id, name, avatar, taste_tags[], manual_location, created_at
- **Restaurant**: id, name, address, lat/lng, cuisine_tags[], created_by, created_at
- **Review**: id, user_id, restaurant_id, ratings{food, service, price, ambiance}, text_review, is_public_generic, created_at
- **FavouriteItem**: id, review_id, item_name, note, photo_url, is_public_items
- **Report**: id, target_type (review/restaurant), target_id, reporter_id, reason, status

---

## 6. Suggested Build Order (MVP path)

1. Auth (Google OAuth) + user profile + taste tags
2. Restaurant CRUD + fuzzy-match dedup logic
3. Review CRUD (generic ratings + text) with public/private toggle
4. Favourite items sub-feature + photo upload
5. Static map snippet + Google Maps deep link
6. Geolocation + distance calculation + filter/sort
7. Popcorn click animation (desktop, then mobile-lite version)
8. Reporting/moderation queue
9. Responsive polish + full theme pass
# Yggdrasil

A personal Asian media tracking web application built across three Norse mythology-themed realms.
Track anime, manga/manhwa/manhua, and Asian dramas — with ratings, reviews, progress, and curated Top 10 lists.

---

## Realms

| Realm | Content | API |
|-------|---------|-----|
| **Alfheim** | Anime | Jikan (MyAnimeList) |
| **Valhalla** | Manga · Manhwa · Manhua | AniList GraphQL |
| **Midgard** | K/C/J-dramas | TMDB |

All realms are accessible through **Yggdrasil** — the central landing hub.

---

## Features

### Every Realm Includes
- **Dashboard** — Stats, Trending, Currently Watching/Reading, Top 10, Recently Released, Explore, Recently Added
- **Browse** — Full catalogue with sort modes and infinite scroll
- **Search** — Live search with format/type filters and skeleton loading
- **Info Page** — Full metadata, cast, images, trailers, synopsis, and Add to List modal
- **My List** — Sortable, filterable table with status tabs and score display

### Tracking Fields
- Watch/read status
- Personal ratings (1–10, half-step precision)
- Episode / chapter progress
- Start and completion dates
- Platform tracking
- Personal reviews and notes
- Rewatch / reread count
- Custom tags
- Curated Top 10 lists per realm

### Authentication
- JWT-based auth
- Register / login / logout
- Optional profile image (URL)
- Auth-gated list actions

---

## Tech Stack

### Frontend
- React + Vite
- Inline style objects with realm-specific color token system (`C`)
- Tailwind CSS v4 (installed)
- Axios

### Backend (Vercel Serverless)
- Node.js serverless functions (`client/api/`)
- MongoDB Atlas + Mongoose
- JWT (`jsonwebtoken`) + `bcryptjs`

---

## Design Language

- **Fonts** — Cinzel / Cinzel Decorative (Google Fonts)
- **Aesthetic** — Norse / runic, dark cinematic
- **Decorations** — Rune characters, Vegvisir compass watermark, corner ornaments
- **Effects** — Soft glow, skeleton loading, animated counters

### Realm Color Palettes
| Realm | Primary | Accent | Background |
|-------|---------|--------|------------|
| Alfheim | Teal `#5EEAD4` | Aurora `#C084FC` | `#050C10` |
| Valhalla | Purple `#A78BFA` | Crimson `#F43F5E` | `#0A0810` |
| Midgard | Electric `#38BDF8` | Ember `#C2410C` | `#080D1A` |

---

## Project Structure

```
mimir/
└── client/
    ├── api/                        # Vercel serverless functions
    │   ├── _lib/                   # Shared utilities (DB, auth, models)
    │   │   ├── mongodb.js
    │   │   ├── auth.js
    │   │   └── models/
    │   ├── auth/[action].js
    │   ├── anime/
    │   ├── manga/
    │   ├── drama/
    │   ├── animetop10/
    │   ├── mangatop10/
    │   ├── top10/
    │   └── tmdb.js
    ├── public/
    └── src/
        ├── components/
        │   ├── Counter.jsx
        │   └── ProfileIcon.jsx
        ├── context/
        │   └── AuthContext.jsx
        ├── pages/
        │   ├── Yggdrasil/
        │   ├── Alfheim/
        │   ├── Valhalla/
        │   └── Midgard/
        └── utils/
            ├── anilistSearch.js
            ├── jikanSearch.js
            └── tmdbSearch.js
```

---

## API Routes

```
POST           /api/auth/register
POST           /api/auth/login
GET            /api/auth/me

GET/POST       /api/anime
GET/PUT/DELETE /api/anime/:id

GET/POST       /api/manga
GET/PUT/DELETE /api/manga/:id

GET/POST       /api/drama
GET/PUT/DELETE /api/drama/:id

GET            /api/animetop10/list
PUT            /api/animetop10/:position
DELETE         /api/animetop10/:position

GET            /api/mangatop10/list
PUT            /api/mangatop10/:position
DELETE         /api/mangatop10/:position

GET            /api/top10/:region
PUT            /api/top10/:region/:position
DELETE         /api/top10/:region/:position

GET            /api/tmdb?path=...
```

---

## Environment Variables

Create `client/.env`:

```env
MONGODB_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_jwt_secret
TMDB_KEY=your_tmdb_api_key
```

---

## External APIs

| API | Realm | Auth | Rate Limit |
|-----|-------|------|------------|
| [TMDB](https://www.themoviedb.org/documentation/api) | Midgard | API key required | Generous |
| [Jikan](https://jikan.moe/) | Alfheim | None | 3 req/sec |
| [AniList GraphQL](https://anilist.gitbook.io/anilist-apiv2-docs/) | Valhalla | None | 90 req/min |

> **Note:** TMDB is geo-restricted in some regions. The `/api/tmdb` serverless proxy handles all TMDB requests server-side.

---

## Deployment

Deployed on **Vercel** (Hobby plan).

Key constraints handled:
- Vercel's 12-function limit resolved by catch-all `[...params].js` routes
- Shared utilities placed in `api/_lib/` (underscore prefix excluded from routing)
- TMDB geo-restriction bypassed via Vercel's US server locations

---

## Architecture Notes

- **Navigation** — Each realm uses internal state (`activePage`) rather than React Router sub-routes
- **Entry creation** — Content is only added through the Info Page modal, never a standalone form
- **Top 10** — Always exactly 10 slots; never dynamic
- **ID matching** — List entries matched to API data via `tmdbId`, `malId`, or `anilistId`
- **Midgard is the canonical reference** — All UI and UX patterns in Alfheim and Valhalla follow Midgard's implementation

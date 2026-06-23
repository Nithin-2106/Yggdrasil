# Mimir — Asian Media Tracker

A personal media tracking web application for Asian dramas, anime, and manga/manhwa/manhua. Built with a Norse mythology aesthetic across three themed realms, each with its own visual identity and dedicated tracking features.

---

## Realms

| Realm | Content | API |
|-------|---------|-----|
| **Midgard** | Asian Dramas (Korean, Chinese, Japanese) | TMDB |
| **Alfheim** | Anime | Jikan (MyAnimeList) |
| **Valhalla** | Manga / Manhwa / Manhua | AniList GraphQL |

All realms are accessible through **Yggdrasil** — the central landing hub and realm selector.

---

## Features

### Every Realm Includes
- **Dashboard** — Stats, Trending, Currently Watching/Reading, Top 10, Recently Released, Explore, Recently Added
- **Browse** — Full catalogue explorer with sort modes and infinite scroll
- **Search** — Live search with format/type filters and skeleton loading
- **Info Page** — Full metadata, cast, images, trailers, synopsis, and Add to List modal
- **My List** — Sortable, filterable table view with status tabs and score display

### Tracking Features
- Status tracking (Watching / Completed / Dropped / Plan to Watch / On Hold)
- Personal ratings (1–10 with half-step precision)
- Episode / chapter progress
- Watch / read dates
- Platform tracking
- Personal reviews and notes
- Rewatch / reread count
- Custom tags
- Curated Top 10 lists per realm

---

## Tech Stack

### Frontend
- React + Vite
- Inline style objects with realm-specific color token system (`C`)
- Tailwind CSS v4 (installed)
- Framer Motion (animations)
- Axios

### Backend
- Node.js + Express 5
- MongoDB Atlas (MimirDB)
- Mongoose

---

## Design Language

- **Fonts** — Cinzel / Cinzel Decorative
- **Aesthetic** — Norse / runic, dark cinematic
- **Decorations** — Rune characters, Vegvisir compass watermark, corner ornaments
- **Effects** — Soft glow, skeleton loading, animated counters
- Each realm has its own color palette while sharing the same component architecture

---

## Project Structure

```
mimir/
├── client/                  # React frontend
│   ├── public/
│   │   └── favicon.svg
│   └── src/
│       ├── components/
│       │   └── Counter.jsx
│       ├── pages/
│       │   ├── Yggdrasil/
│       │   ├── Midgard/
│       │   │   ├── Midgard.jsx
│       │   │   ├── Dashboard.jsx
│       │   │   ├── SearchPage.jsx
│       │   │   ├── InfoPage.jsx
│       │   │   ├── MyList.jsx
│       │   │   └── BrowsePage.jsx
│       │   ├── Alfheim/
│       │   │   └── (same structure)
│       │   └── Valhalla/
│       │       └── (same structure)
│       └── utils/
│           ├── tmdbSearch.js
│           ├── jikanSearch.js
│           └── anilistSearch.js
└── server/                  # Node.js backend
    ├── config/
    │   └── db.js
    ├── models/
    │   ├── Drama.js
    │   ├── Anime.js
    │   ├── Manga.js
    │   ├── Top10.js
    │   ├── AnimeTop10.js
    │   └── MangaTop10.js
    ├── controllers/
    ├── routes/
    └── index.js
```

---

## API Routes

```
GET/POST       /api/drama
GET/PUT/DELETE /api/drama/:id

GET/POST       /api/anime
GET/PUT/DELETE /api/anime/:id

GET/POST       /api/manga
GET/PUT/DELETE /api/manga/:id

GET            /api/top10/:region
PUT            /api/top10/:region/:position
DELETE         /api/top10/:region/:position

GET            /api/animetop10
PUT            /api/animetop10/:position
DELETE         /api/animetop10/:position

GET            /api/mangatop10
PUT            /api/mangatop10/:position
DELETE         /api/mangatop10/:position
```

---

## Environment Variables

### Server — `server/.env` or root `.env`

```env
MONGO_URI=your_mongodb_atlas_connection_string
PORT=5000
```

### Client — `client/.env`

```env
VITE_TMDB_KEY=your_tmdb_api_key
```

---

## Getting Started

### Prerequisites
- Node.js 20+
- MongoDB Atlas account
- TMDB API key (free at themoviedb.org)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/mimir.git
cd mimir

# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### Running Locally

Two terminals are required.

**Terminal 1 — Backend**
```bash
cd server
npm run dev
```

**Terminal 2 — Frontend**
```bash
cd client
npm run dev
```

Then open `http://localhost:5173`

---

## External APIs Used

| API | Used In | Rate Limits |
|-----|---------|-------------|
| [TMDB](https://www.themoviedb.org/documentation/api) | Midgard | Generous, key required |
| [Jikan](https://jikan.moe/) | Alfheim | 3 req/sec, 60 req/min |
| [AniList GraphQL](https://anilist.gitbook.io/anilist-apiv2-docs/) | Valhalla | 90 req/min, no key needed |

---

## Architecture Notes

- **Navigation** — Each realm uses internal state navigation (`activePage`) rather than React Router sub-routes
- **Midgard is the canonical reference** — All UI, UX, layout, and component patterns in Alfheim and Valhalla follow Midgard's implementation
- **Entry creation** — Content is only added to lists through the Info Page modal, never through a standalone form
- **Top 10** — Always exactly 10 slots, never dynamic
- **ID-based matching** — List entries are matched to API data via `tmdbId`, `malId`, or `anilistId`

---

## Notes

This is a single-user personal project. There is no authentication, multi-user support, or public API. MongoDB Atlas IP whitelisting is required for the database connection.
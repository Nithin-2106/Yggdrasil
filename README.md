# Yggdrasil

**A personal media tracker for anime, manga, and Asian dramas — three Norse-themed realms, one consistent design system, an agentic AI assistant, and a hardened serverless backend.**

[![CI](https://github.com/Nithin-2106/Yggdrasil/actions/workflows/ci.yml/badge.svg)](https://github.com/Nithin-2106/Yggdrasil/actions/workflows/ci.yml)

🔗 **Live:** [yggdrasil-realms.vercel.app](https://yggdrasil-realms.vercel.app/)

---

## Highlights

*30-second version, for anyone skimming:*

- **Full-stack TypeScript/JavaScript** app — React 19 frontend, Vercel serverless backend, MongoDB Atlas, ~18,000 lines across 3 realms
- **JWT authentication** with rate-limited login/register and ownership-scoped data access on every route
- **Agentic AI assistant** with real tool-calling — searches, adds, edits, and deletes list entries via natural language, not just chat
- **Zod-validated, rate-limited, Sentry-monitored API** with a Vitest + GitHub Actions CI pipeline (lint → test → build)
- **Installable offline PWA** with a Workbox service worker and a partial TypeScript migration across the backend
- Built solo, from architecture to design system to deployment

---

## Why I built this

I originally built Yggdrasil because existing trackers split anime, manga, and Asian dramas across different platforms, each with its own UI and none of them talking to each other. I wanted a single application with a consistent design system, richer personal statistics than any of them offered, offline support, and an AI assistant capable of managing my library through natural language instead of forms and menus.

---

## Screenshots

*(Add images to a `docs/` folder and drop the paths in below — suggested shots:)*

| Screenshot | What it should show |
|---|---|
| `docs/landing.png` | The Yggdrasil hub — realm selection screen |
| `docs/dashboard.png` | A realm Dashboard — Trending row, Top 10 shelf, stat cards |
| `docs/info-page.png` | An Info page — hero art, ratings, Add to List modal open |
| `docs/mylist.png` | My List — sortable table with status tabs and score column |
| `docs/ai-assistant.png` | Mimir mid-conversation, showing a tool-call chip (e.g. "Added an entry") |
| `docs/analytics.png` | The Analytics dashboard — genre breakdown + activity heatmap |
| `docs/mobile.png` | A realm on a phone-width viewport, showing the collapsed nav |

```md
![Yggdrasil landing page](./docs/landing.png)
![Realm dashboard](./docs/dashboard.png)
```

---

## What it does

Yggdrasil tracks status, progress, ratings, reviews, rewatch counts, custom tags, and curated Top 10 lists — split across three realms:

| Realm | Content | API |
|---|---|---|
| **Alfheim** | Anime | Jikan (MyAnimeList) |
| **Valhalla** | Manga · Manhwa · Manhua | AniList GraphQL |
| **Midgard** | K/C/J-Dramas | TMDB |

Every realm ships the same page set: a Dashboard (trending, currently watching, Top 10, explore-and-shuffle), infinite-scroll Browse, live Search, a detail-rich Info page, and a sortable/filterable My List table.

**Authentication** is JWT-based (30-day tokens), gates all write actions (adding to a list, editing Top 10, reviews), and every API route checks the requester actually owns the record before returning or mutating it — never just that a valid token was presented.

---

## Features

- 🤖 **AI assistant ("Mimir")** — a floating, agentic assistant available on every realm. It doesn't just chat: it calls real tools to search the underlying APIs, add/update/delete list entries, edit or clear Top 10 slots, and answer natural-language questions against your list ("what dramas did I complete in 2025 rated above 8?"). Every tool call is scoped server-side to the logged-in user, so it can never touch anyone else's data.
- 📱 **Installable offline PWA** — a manifest + Workbox service worker cache the app shell, cover art (MAL/AniList/TMDB), and GET API responses, so previously visited pages keep working without a connection and the app installs to your home screen like a native app.
- 📊 **Analytics dashboard** — per-realm and cross-realm stats: total entries, estimated hours tracked, completion counts, genre breakdown, and a GitHub-style activity heatmap of when entries were added.
- 📴 **Mobile-first responsiveness** — a shared `useMediaQuery` breakpoint system drives collapsing nav, touch-sized tap targets, and layout changes across every page in every realm.
- 🔐 **Hardened API** — rate limiting on auth and the AI endpoint, Zod validation on every mutating route, and ownership checks on every read and write.
- 🧪 **Tested & automated** — Vitest coverage on auth, CRUD ownership, and Top 10 routes; GitHub Actions runs lint → test → build on every push (see badge above).
- 🩺 **Error monitoring** — Sentry wraps every serverless handler and every React error boundary, so failures surface with stack traces instead of silent 500s.

---

## Architecture

```
client/
├── api/                     Vercel serverless functions
│   ├── _lib/                 shared DB/auth/validation/rate-limit utilities
│   │   ├── crudFactory.ts       generic list+item handlers, reused across all 3 media types
│   │   ├── ai/                  tool schemas + tool execution for the agent
│   │   └── models/               Mongoose schemas (partial TypeScript)
│   ├── media/[type]/           dynamic CRUD routes (anime | manga | drama)
│   ├── auth/[action].js        register / login / me
│   ├── ai/chat.js              agentic tool-calling loop (Gemini)
│   └── tmdb.js                 server-side TMDB proxy (bypasses geo-block)
└── src/
    ├── pages/{Alfheim,Valhalla,Midgard}/   Dashboard · Browse · Search · Info · MyList
    └── components/                          shared UI (Counter, ErrorBoundary, AiAssistant)
```

**Stack:** React 19 + Vite · Vercel Serverless (Node) · MongoDB Atlas + Mongoose · JWT auth · Zod validation · Vitest · GitHub Actions CI · Sentry · PWA (Workbox) · partial TypeScript migration

**Project size:** ~18,000 lines of TypeScript/JavaScript across the three realm frontends and the serverless backend (rough estimate — no line-count tooling has been run against the final repo).

---

## Engineering challenges worth mentioning

- **Vercel's 12-function Hobby-plan cap** — six near-identical CRUD route files (anime/manga/drama × list/item) were consolidated into a single `crudFactory` with dynamic model resolution from `req.query.type`, cutting the function count while keeping per-type validation and ownership checks intact.
- **A Mongoose 7 breaking change silently broke registration** — `pre('save')` hooks lost callback-style `next()` support, so the password-hashing hook was throwing "next is not a function" on every new user. Root-caused via targeted tests, fixed by returning a promise instead of calling a callback.
- **TMDB is geo-restricted in some regions** — solved with a server-side proxy (`/api/tmdb`) so the browser never talks to TMDB directly, and Vercel's US edge functions never hit the restriction.
- **Agentic AI with real write access** — before shipping the assistant, the API got rate limiting, Zod schemas on every mutating route, and ownership-scoped queries, since a tool-calling LLM is effectively a new class of authenticated client that can create/update/delete data on the user's behalf.
- **Partial TypeScript migration without a rewrite** — `_lib/` and all Mongoose models were converted to `.ts` with `allowJs: true` / `strict: false`, so typed backend code and untouched JSX coexist in one build.

---

## Core design decisions

- **Midgard is the reference implementation.** New UX/architecture patterns land there first, then get ported to Alfheim and Valhalla, so the three realms never drift into inconsistent behavior.
- **No standalone "add" form** — entries are only created from an Info page's Add-to-List modal, keeping metadata (cover, id, year) always sourced from the real API record rather than typed by hand.
- **Top 10 lists are fixed at exactly 10 slots**, never dynamic, matching how the person actually thinks about a "top 10."
- **Realm navigation lives in the URL** (`useSearchParams`), not just component state, so the browser back button behaves correctly.

---

## Getting started

```bash
cd client
npm install
npm run dev
```

Requires a `.env` with the following:

```env
MONGODB_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_jwt_secret
TMDB_KEY=your_tmdb_api_key
GEMINI_API_KEY=your_gemini_api_key   # powers the Mimir AI assistant
SENTRY_DSN=optional
```

```bash
npm run lint     # eslint
npm test         # vitest (API route tests, incl. auth + CRUD ownership checks)
npm run build    # production build
```

CI runs lint → test → build on every push via GitHub Actions.

---

## License

Personal project — built for my own use and shared with friends. Not currently licensed for reuse.
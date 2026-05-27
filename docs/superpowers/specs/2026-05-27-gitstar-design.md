# GitStar — Design Spec

## Overview

A tool website for discovering high-star open-source projects on GitHub. Users can browse, filter, search, and view project details including README previews. Favorites are saved locally without authentication.

**Tech Stack:** Next.js + Tailwind CSS  
**Deployment:** Vercel (free tier)

---

## Pages & Routes

| Route | Purpose | Rendering |
|-------|---------|-----------|
| `/` | Homepage: project list with filters, search, pagination | SSG + ISR (1h) |
| `/project/[owner]/[repo]` | Detail page: repo info + README preview | ISR (on-demand, first request via SSR) |
| `/api/repos` | Proxy to GitHub Search API | Server-side cached |
| `/api/repos/[owner]/[repo]` | Proxy to GitHub repo detail + README | Server-side cached |

---

## Features

### Homepage
- Search bar with 300ms debounce
- Filters: language, time range (day/week/month/year), sort (stars/forks/updated)
- Repo cards: avatar, name, description, stars, language, license
- Favorite toggle per card
- Pagination (30 per page, numbered + prev/next)
- Empty state when no results
- Responsive down to 320px width

### Detail Page
- Repo header: avatar, owner, description, stats (stars/forks/watchers), language, license
- Action buttons: Star (link to GitHub), Open in GitHub, Favorite
- README rendered from Markdown (react-markdown + remark-gfm, raw HTML disabled)
- Dynamic SEO metadata (og:title, og:description per repo)
- Back button
- Error state for nonexistent repos

### Favorites
- Stored in localStorage via `useFavorites` hook (with SSR hydration guard)
- Toggle from any page
- Persisted across sessions on the same device

---

## Architecture

### Data Flow

```
GitHub API ← API Routes (cached) ← Pages (SSG/ISR/SSR) → Browser (localStorage)
```

- **Homepage default view:** SSG pre-rendered, ISR revalidates every hour
- **Filtered/search results:** Client fetches → API Route → GitHub API → cached in memory (5 min per query key)
- **Detail page:** First visit SSR, then ISR cached
- **Favorites:** Client-only, localStorage

### Caching Strategy
- API Route uses in-memory Map keyed by query string (best-effort; serverless cold starts reset cache)
- Supplement with HTTP `Cache-Control: public, max-age=300, stale-while-revalidate=600` on API responses
- Same query within 5 minutes returns cached result when cache is warm
- Protects GitHub API rate limit (5000 req/h authenticated, 60 req/h unauthenticated)

### API Proxy Security
- Whitelist allowed query params: `q`, `sort`, `order`, `per_page`, `page`, `language`
- Clamp `per_page` to max 50, `page` to first 34 pages (GitHub Search limit: 1000 results)
- Validate `owner` and `repo` path params against pattern `^[a-zA-Z0-9._-]+$`
- Handle GitHub error responses: 403 (rate limit), 404 (not found), 5xx (service down)
- Return typed error responses so the client can render meaningful messages

---

## Components

```
Layout
├── Header
└── Main
    ├── [Homepage]
    │   ├── SearchBar
    │   ├── FilterBar
    │   │   ├── LanguageSelect
    │   │   ├── TimeRangeSelect
    │   │   └── SortSelect
    │   ├── RepoList
    │   │   └── RepoCard
    │   ├── Pagination
    │   └── EmptyState
    │
    └── [DetailPage]
        ├── BackButton
        ├── RepoHeader
        ├── ActionButtons
        ├── ReadmeViewer
        └── ErrorState
```

---

## Technical Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Framework | Next.js | SSR/ISR for SEO, API Routes for proxy, Vercel free deploy |
| Styling | Tailwind CSS | Fast iteration, good ecosystem |
| Markdown | react-markdown + remark-gfm | Lightweight, GitHub-flavored markdown support |
| State management | URL search params + useState | No global state needed; filters live in URL for shareability |
| Search debounce | 300ms | Balance between responsiveness and API call frequency |
| Favorite persistence | localStorage via useFavorites hook | No auth needed, simple and sufficient |
| GitHub API token | Server-side env var | Token never exposed to client |

---

## Non-Goals
- User authentication / login system
- Trending charts / star history graphs
- Database persistence
- Personalized recommendations
- i18n / multi-language support

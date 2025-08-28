
# Centscape — Unified Wishlist (React Native + Node + TypeScript)

This repo contains a minimal but production‑ready implementation of the take‑home.

**Folders**
- `/app` – Expo/React Native (TypeScript) client.
- `/server` – Fastify (TypeScript) service with `/preview` endpoint.
- `/schemas` – JSON Schemas for API responses and local storage.
- This README also documents tradeoffs and AI usage.

## Quick start

### 1) Server
```bash
cd server
npm i
npm run dev       # runs fastify in watch mode
npm run test      # vitest + supertest + nock
```

### 2) App
```bash
cd app
npm i
npm run start     # Expo
npm run typecheck
```

### Deep linking (on device/emulator)
Open: `centscape://add?url=<encoded product url>` — this opens the Add flow with URL prefilled.

---

## Engineering overview

### Server highlights
- **/preview** extracts `{ title, image, price, currency, siteName, sourceUrl }` using the order:
  Open Graph → Twitter Card → oEmbed → fallback (`<title>`, `<img>`, heuristic price selectors/regex).
- **Safety**: 5s timeout with `AbortController`, **max redirects: 3**, **max HTML size: 512 KB** (stream cutoff),
  **Content‑Type must include `text/html`**, **custom User‑Agent**, **rate-limit 10 req/min/IP**,
  **SSRF guard** blocks private/loopback IPs (for IP hosts) and resolves hostnames to ensure they are not private.
- **Tests** cover: parsing fixtures, timeout, redirect cap, size cap, SSRF and rate limit.

### App highlights
- **Add flow**: paste URL or arrive via deep link → fetch preview from server → confirm → save.
- **Wishlist**: virtualized list with title, image (fallback), price or `N/A`, domain, timestamp.
- **Persistence**: AsyncStorage with **schema migration v1 → v2** adding `normalizedUrl`.
- **Dedup**: URL normalization strips UTM params, removes fragments, lowercases host. Duplicates blocked.
- **Resilience**: skeleton placeholders while loading; retry on errors; fallback image always shown.
- **Accessibility**: `accessibilityLabel` on all tappable controls.

### Scripts
- Root: `npm run verify` (typecheck & test)
- Server: `npm run dev`, `npm run test`
- App: `npm run start`, `npm run typecheck`

---

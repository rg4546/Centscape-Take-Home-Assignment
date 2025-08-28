
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

## Tradeoffs & risks

- **URL fetching**: A true production SSRF defense also validates DNS rebinding over time. Here we resolve once
  and also reject IP hosts in RFC1918, loopback, link‑local, and IPv6 unique‑local ranges. Further defense at egress
  or via a metadata‑proxy is recommended.
- **Price extraction** is heuristic. Retailers often render price via JS; server does not execute JS. For such sites,
  we accept returning `N/A`. Headless browser could improve accuracy but complicates the 5s SLA and cost.
- **Image fallback**: broken images are replaced client‑side; we also normalize obvious bad URLs server‑side.
- **Storage**: AsyncStorage for simplicity; in a larger app we'd use SQLite/WatermelonDB with migrations.
- **Deep linking**: Expo bare linking config is provided; on iOS you need to add URL types; on Android, intent filters.

---

## AI usage disclosure

I (the candidate) used an AI assistant to help draft boilerplate:
- Generated initial Fastify/TypeScript scaffolding, test skeletons, and React Native screens.
- Assisted with writing URL normalization util and SSRF guard ranges.
- No copyrighted code was copied; everything was reviewed and modified to match requirements.

Prompts included: "fastify rate limit typescript example", "cheerio open graph parse",
"react native AsyncStorage migration pattern", and "expo deep linking example".

---

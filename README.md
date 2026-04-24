# KCView — Kansas City Spatial Intelligence Platform

Real-time spatial intelligence for the KC metro, purpose-built for FIFA World Cup 2026.
Inspired by WorldView (Bilawal Sidhu / spatialintelligence.ai).

## Quick start

```bash
npm install
npm run dev          # starts at http://localhost:5173
```

## Project structure

```
src/
  components/
    MapView.tsx        # deck.gl + MapLibre map canvas
    ControlPanel.tsx   # Sidebar: layer toggles, view modes, weather
    CameraPopup.tsx    # CCTV snapshot popup on camera click
  layers/
    index.ts           # All deck.gl layer factory functions
  services/
    opensky.ts         # Live aircraft (OpenSky Network API)
    satellites.ts      # Orbital tracking (CelesTrak + satellite.js)
    cameras.ts         # KC Scout / MoDOT CCTV snapshot feeds
    weather-fifa.ts    # NOAA NWS weather + FIFA match schedule
  store.ts             # Zustand global state
  types/index.ts       # All TypeScript types
  utils/viewModes.ts   # CSS shader/filter modes (night vision, FLIR, etc.)
functions/
  api/worker.ts        # Cloudflare Worker: CORS proxy + KV caching
```

---

## Data sources (all free / Phase 1)

| Layer | Source | API key? | Update rate |
|---|---|---|---|
| Aircraft | OpenSky Network | No (anon) | 10s |
| Satellites | CelesTrak TLE | No | 30s |
| Traffic cameras | KC Scout (MoDOT/KDOT) | No | 30s (snapshot) |
| Transit vehicles | KCATA GTFS-RT | No | ~15s |
| Speed sensors | MoDOT Traveler Info | No | 2min |
| Weather | NOAA NWS | No | 5min |
| Base map tiles | OpenFreeMap | No | Static |
| FIFA venues | Custom GeoJSON | No | Static |

---

## Google Photorealistic 3D Tiles (optional upgrade)

### Cost reality check (as of March 2025 pricing)

The old $200/month credit ended **February 28, 2025**.

Current model (Enterprise SKU):
- **Free tier: 1,000 sessions/month** (reset monthly)
- **Overage: $6.00 per 1,000 sessions**
- 1 session = one root tile request (3-hour window per user)
- Page refresh = new session

**What this means for you:**
- Dev/personal use: 1,000 free sessions covers it entirely
- Light public use (50-100 visitors/day): ~$5-10/month
- FIFA World Cup traffic spike (500 visitors/day for 30 days): ~$90/month
- **Recommendation: Enable it, set a $30/month billing cap in Google Cloud Console**

### How to enable

1. Get API key at console.cloud.google.com → Enable "Map Tiles API"
2. Add to `.env.local`:
   ```
   VITE_GOOGLE_MAPS_API_KEY=AIza...
   ```
3. In `MapView.tsx`, change the prop:
   ```tsx
   <MapView useGoogleTiles={true} />
   ```
4. Install Cesium:
   ```bash
   npm install cesium @cesium/engine
   ```
5. See `/docs/google-3d-tiles-upgrade.md` for full Cesium integration

---

## KC Scout CCTV cameras

KC Scout is the bi-state traffic management system operated jointly by
**MoDOT** (Missouri) and **KDOT** (Kansas). It covers:

- **380+ cameras** across the KC metro
- All major interstates: I-70, I-35, I-435, I-29, I-670, US-71
- Downtown KC, Power & Light, Country Club Plaza
- Stadium corridors (US-71 / Arrowhead approach)
- Both Missouri and Kansas sides of the metro

**Camera data is publicly accessible** — no authentication required.
The Cloudflare Worker proxy handles CORS and caches snapshots for 30s.

Camera snapshot URLs:
- KC Scout: `https://www.kcscout.net/cameras/snapshot/{id}.jpg`
- MoDOT Traveler: `https://traveler.modot.org/cameras/{id}.jpg`
- KDOT KanDrive: `https://www.kandrive.org/cameras/{id}.jpg`

The worker parses the KC Scout XML catalog (`/XML/Cameras.xml`) to get all
camera IDs, names, and coordinates automatically.

---

## Cloudflare deployment

### Full compatibility: YES

KCView is 100% compatible with Cloudflare infrastructure:

| Component | Cloudflare product | Notes |
|---|---|---|
| Frontend SPA | **Pages** | Same pipeline as jonperkinsmedicare.com |
| API proxy + CORS | **Workers** | Handles OpenSky, cameras, TLE, weather |
| Response caching | **KV** | Caches TLE (1hr), camera catalog (1hr), weather (5min) |
| JPEG snapshot caching | **Cache API** | 30s TTL per camera |
| Bandwidth | Pages free tier | 500GB/month free |

### Setup

```bash
# Create KV namespace
wrangler kv:namespace create "KCVIEW_CACHE"
# Paste the id into wrangler.toml

# Build and deploy
npm run deploy
```

The same GitHub repo + Cloudflare Pages integration from jonperkinsmedicare.com
works here — push to main, Cloudflare auto-deploys.

---

## Phase roadmap

### Phase 1 (current — weekend build)
- [x] deck.gl + MapLibre base map (dark, KC centered)
- [x] OpenSky live aircraft layer
- [x] KC Scout CCTV camera layer with popup
- [x] KCATA bus GTFS-RT layer
- [x] FIFA venue GeoJSON overlay
- [x] 5 view modes (Normal / Night Vision / FLIR / CRT / Match Day)
- [x] Cloudflare Worker CORS proxy

### Phase 2 (2-3 weeks)
- [ ] CelesTrak satellite orbital paths
- [ ] MoDOT speed sensor choropleth
- [ ] NOAA severe weather alerts layer
- [ ] KCPD crime density heatmap
- [ ] Meta HRSL population density
- [ ] Match-day crowd dispersal wave animation
- [ ] Google Photorealistic 3D Tiles upgrade (optional)

### Phase 3 (post-event / stretch)
- [ ] Full GLSL shader pipeline (WebGL post-process)
- [ ] CCTV frames draped on building faces (billboard textures)
- [ ] Natural language query ("show all cameras near Arrowhead")
- [ ] Cesium 3D globe mode with orbital satellite paths
- [ ] Historical playback of FIFA match-day data

---

## OpenSky rate limits

- Anonymous: 10 requests/minute, data capped to some state vectors
- Free account (register at opensky-network.org): 100 req/hour
- The 10-second poll interval in `opensky.ts` respects anonymous limits
- **Recommended**: Register a free account and set credentials in `.env.local`:
  ```
  VITE_OPENSKY_USER=your_username
  VITE_OPENSKY_PASS=your_password
  ```
  Then update `opensky.ts` to include Basic auth header.

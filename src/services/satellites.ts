// Satellite orbital tracking via CelesTrak TLE data + satellite.js
// satellite.js computes real-time position from Two-Line Elements in-browser
// No API key required. CelesTrak is free and public.

import type { SatellitePosition } from '../types'

// KC observer coordinates (for elevation angle calc)
const KC_LAT_DEG = 39.0997
const KC_LON_DEG = -94.5786
const KC_ALT_KM  = 0.3       // ~1000 ft elevation

// We use the visual satellites group — widely tracked, interesting overhead passes
// Other options: starlink, iridium, gps-ops, stations (ISS)
const TLE_URLS = [
  'https://celestrak.org/SOCRATES/query.php?GROUP=visual&FORMAT=tle',
  // Fallback: stations (includes ISS)
  'https://celestrak.org/SOCRATES/query.php?GROUP=stations&FORMAT=tle',
]

// CORS note: CelesTrak does NOT send CORS headers.
// In dev: Vite proxy handles it (add to vite.config.ts proxy)
// In prod: route through Cloudflare Worker at /api/tle
const TLE_PROXY = '/api/tle?group=visual'

interface TLERecord {
  name: string
  line1: string
  line2: string
}

function parseTLE(text: string): TLERecord[] {
  const lines = text.trim().split('\n').map(l => l.trim()).filter(Boolean)
  const records: TLERecord[] = []
  for (let i = 0; i + 2 < lines.length; i += 3) {
    if (lines[i + 1].startsWith('1 ') && lines[i + 2].startsWith('2 ')) {
      records.push({
        name:  lines[i],
        line1: lines[i + 1],
        line2: lines[i + 2],
      })
    }
  }
  return records
}

// satellite.js is loaded as ESM. Types come from @types/satellite.js if installed.
// We dynamic-import to keep initial bundle lean.
export async function fetchSatellitePositions(): Promise<SatellitePosition[]> {
  const satellite = await import('satellite.js')

  // Fetch TLE data (via Cloudflare Worker proxy in prod)
  const res = await fetch(TLE_PROXY)
  if (!res.ok) throw new Error(`TLE fetch failed: ${res.status}`)
  const text = await res.text()
  const records = parseTLE(text)

  const now = new Date()
  const results: SatellitePosition[] = []

  // Observer geodetic position (for topocentric calculations)
  const observerGd = {
    latitude:  satellite.degreesToRadians(KC_LAT_DEG),
    longitude: satellite.degreesToRadians(KC_LON_DEG),
    height:    KC_ALT_KM,
  }

  for (const rec of records) {
    try {
      const satrec = satellite.twoline2satrec(rec.line1, rec.line2)
      const pv = satellite.propagate(satrec, now)

      if (!pv.position || typeof pv.position === 'boolean') continue

      const gmst = satellite.gstime(now)
      const geo  = satellite.eciToGeodetic(pv.position as satellite.EciVec3<number>, gmst)

      const lon = satellite.degreesLong(geo.longitude)
      const lat = satellite.degreesLat(geo.latitude)
      const alt = geo.height // km

      // Compute elevation angle from KC to determine visibility
      const lookAngles = satellite.ecfToLookAngles(
        observerGd,
        satellite.eciToEcf(pv.position as satellite.EciVec3<number>, gmst)
      )
      const elevDeg = satellite.radiansToDegrees(lookAngles.elevation)

      // Velocity magnitude from velocity vector
      const vel = pv.velocity && typeof pv.velocity !== 'boolean'
        ? Math.sqrt(
            Math.pow((pv.velocity as satellite.EciVec3<number>).x, 2) +
            Math.pow((pv.velocity as satellite.EciVec3<number>).y, 2) +
            Math.pow((pv.velocity as satellite.EciVec3<number>).z, 2)
          )
        : 0

      results.push({
        id:        satrec.satnum,
        name:      rec.name,
        longitude: lon,
        latitude:  lat,
        altitude:  alt,
        velocity:  vel,
        elevation: elevDeg,
        tle:       [rec.line1, rec.line2],
      })
    } catch {
      // Skip malformed TLE records silently
    }
  }

  return results
}

// Recompute positions every 30 seconds (orbits change slowly)
export function startSatelliteTracking(
  onData: (sats: SatellitePosition[]) => void,
  intervalMs = 30_000
): () => void {
  let active = true

  const tick = async () => {
    if (!active) return
    try {
      const sats = await fetchSatellitePositions()
      if (active) onData(sats)
    } catch (err) {
      console.warn('[Satellites] update failed:', err)
    }
    if (active) setTimeout(tick, intervalMs)
  }

  tick()
  return () => { active = false }
}

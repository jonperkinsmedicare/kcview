import type { SatellitePosition } from '../types'

const KC_LAT_DEG = 39.0997
const KC_LON_DEG = -94.5786
const KC_ALT_KM  = 0.3

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
      records.push({ name: lines[i], line1: lines[i + 1], line2: lines[i + 2] })
    }
  }
  return records
}

export async function fetchSatellitePositions(): Promise<SatellitePosition[]> {
  const sat = await import('satellite.js')

  const res = await fetch(TLE_PROXY)
  if (!res.ok) throw new Error(`TLE fetch failed: ${res.status}`)
  const text = await res.text()
  const records = parseTLE(text)

  const now = new Date()
  const results: SatellitePosition[] = []

  const observerGd = {
    latitude:  sat.degreesToRadians(KC_LAT_DEG),
    longitude: sat.degreesToRadians(KC_LON_DEG),
    height:    KC_ALT_KM,
  }

  for (const rec of records) {
    try {
      const satrec = sat.twoline2satrec(rec.line1, rec.line2)
      const pv = sat.propagate(satrec, now)
      if (!pv.position || typeof pv.position === 'boolean') continue

      const gmst = sat.gstime(now)
      const pos = pv.position as { x: number; y: number; z: number }
      const geo = sat.eciToGeodetic(pos, gmst)

      const lon = sat.degreesLong(geo.longitude)
      const lat = sat.degreesLat(geo.latitude)
      const alt = geo.height

      const ecf = sat.eciToEcf(pos, gmst)
      const lookAngles = sat.ecfToLookAngles(observerGd, ecf)
      const elevDeg = (lookAngles.elevation * 180) / Math.PI

      const vel = pv.velocity && typeof pv.velocity !== 'boolean'
        ? (() => {
            const v = pv.velocity as { x: number; y: number; z: number }
            return Math.sqrt(v.x**2 + v.y**2 + v.z**2)
          })()
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
    } catch { /* skip malformed TLE */ }
  }

  return results
}

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
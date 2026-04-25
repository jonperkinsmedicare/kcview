import type { TrafficSegment } from '../types'

export type { TrafficSegment }

const KC_BBOX = {
  north: 39.35,
  south: 38.85,
  east: -94.20,
  west: -94.85,
}

const BASE_URL = 'https://data.traffic.hereapi.com/v7'

export async function fetchTrafficFlow(): Promise<TrafficSegment[]> {
  const apiKey = import.meta.env.VITE_HERE_API_KEY
  if (!apiKey) {
    console.warn('[HERE] No API key found')
    return []
  }

  const params = new URLSearchParams({
    apiKey,
    in: `bbox:${KC_BBOX.west},${KC_BBOX.south},${KC_BBOX.east},${KC_BBOX.north}`,
    locationReferencing: 'shape',
    units: 'metric',
  })

  try {
    const res = await fetch(`${BASE_URL}/flow?${params}`)
    if (!res.ok) throw new Error(`HERE traffic error: ${res.status}`)
    const data = await res.json()
    return parseHereFlow(data)
  } catch (err) {
    console.warn('[HERE] Traffic fetch failed:', err)
    return []
  }
}

function parseHereFlow(data: any): TrafficSegment[] {
  const segments: TrafficSegment[] = []

  for (const result of data.results ?? []) {
    const loc = result.location
    const flow = result.currentFlow
    if (!loc?.shape?.links || !flow) continue

    for (const link of loc.shape.links) {
      if (!link.points || link.points.length < 2) continue
      const points: Array<[number, number]> = link.points.map(
        (p: { lat: number; lng: number }) => [p.lng, p.lat]
      )
      segments.push({
        id: link.linkId ?? Math.random().toString(36),
        points,
        currentSpeed:  flow.speed ?? 0,
        freeFlowSpeed: flow.freeFlow ?? flow.speed ?? 50,
        jamFactor:     flow.jamFactor ?? 0,
        confidence:    flow.confidence ?? 1,
        roadName:      loc.description,
      })
    }
  }

  return segments
}

export function jamFactorToColor(jamFactor: number): [number, number, number, number] {
  if (jamFactor <= 1) return [0, 255, 120, 220]
  if (jamFactor <= 3) return [120, 255, 0, 200]
  if (jamFactor <= 5) return [255, 220, 0, 220]
  if (jamFactor <= 7) return [255, 120, 0, 230]
  if (jamFactor <= 9) return [255, 40, 0, 240]
  return [200, 0, 80, 255]
}

export function startTrafficPolling(
  onData: (segments: TrafficSegment[]) => void,
  intervalMs = 120_000
): () => void {
  let active = true

  const poll = async () => {
    if (!active) return
    try {
      const segments = await fetchTrafficFlow()
      if (active && segments.length > 0) onData(segments)
    } catch (err) {
      console.warn('[HERE] Poll failed:', err)
    }
    if (active) setTimeout(poll, intervalMs)
  }

  poll()
  return () => { active = false }
}
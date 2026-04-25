import { PathLayer } from '@deck.gl/layers'
import { TripsLayer } from '@deck.gl/geo-layers'
import type { TrafficSegment } from '../types'
import { jamFactorToColor } from '../services/traffic'

export function buildTrafficRoadLayer(segments: TrafficSegment[]) {
  return [
    new PathLayer<TrafficSegment>({
      id: 'traffic-glow-outer',
      data: segments,
      getPath: (d) => d.points,
      getColor: (d) => {
        const c = jamFactorToColor(d.jamFactor)
        return [c[0], c[1], c[2], 25] as [number, number, number, number]
      },
      getWidth: 12,
      widthMinPixels: 4,
      widthMaxPixels: 20,
      pickable: false,
      opacity: 0.6,
    }),
    new PathLayer<TrafficSegment>({
      id: 'traffic-core',
      data: segments,
      getPath: (d) => d.points,
      getColor: (d) => {
        const c = jamFactorToColor(d.jamFactor)
        return [c[0], c[1], c[2], 160] as [number, number, number, number]
      },
      getWidth: 3,
      widthMinPixels: 1,
      widthMaxPixels: 6,
      pickable: false,
      opacity: 0.8,
    }),
  ]
}

function generateTripWaypoints(
  segment: TrafficSegment,
  currentTime: number,
  trailLength: number
): Array<{ coordinates: [number, number]; timestamp: number }> {
  const points = segment.points
  if (points.length < 2) return []

  let totalLength = 0
  const distances: number[] = [0]
  for (let i = 1; i < points.length; i++) {
    const dx = points[i][0] - points[i - 1][0]
    const dy = points[i][1] - points[i - 1][1]
    const dist = Math.sqrt(dx * dx + dy * dy)
    totalLength += dist
    distances.push(totalLength)
  }

  if (totalLength === 0) return []

  const speedRatio = Math.max(0.1, segment.currentSpeed / Math.max(segment.freeFlowSpeed, 1))

  return points.map((point, i) => ({
    coordinates: point as [number, number],
    timestamp: currentTime + (distances[i] / totalLength) * trailLength * (1 / speedRatio),
  }))
}

export function buildTrafficParticleLayer(
  segments: TrafficSegment[],
  currentTime: number,
) {
  const TRAIL_LENGTH = 0.08
  const LOOP_LENGTH = 1.0

  const trips: Array<{
    id: string
    waypoints: Array<{ coordinates: [number, number]; timestamp: number }>
    color: [number, number, number, number]
    jamFactor: number
  }> = []

  for (const segment of segments) {
    if (segment.jamFactor > 9) continue
    const color = jamFactorToColor(segment.jamFactor)
    for (let offset = 0; offset < 3; offset++) {
      const offsetTime = (currentTime + (offset * LOOP_LENGTH) / 3) % LOOP_LENGTH
      const waypoints = generateTripWaypoints(segment, offsetTime, TRAIL_LENGTH)
      if (waypoints.length >= 2) {
        trips.push({ id: `${segment.id}-${offset}`, waypoints, color, jamFactor: segment.jamFactor })
      }
    }
  }

  return new TripsLayer({
    id: 'traffic-particles',
    data: trips,
    getPath: (d: typeof trips[0]) => d.waypoints.map(w => w.coordinates),
    getTimestamps: (d: typeof trips[0]) => d.waypoints.map(w => w.timestamp),
    getColor: (d: typeof trips[0]) => d.color,
    currentTime: currentTime % LOOP_LENGTH,
    trailLength: TRAIL_LENGTH,
    widthMinPixels: 2,
    widthMaxPixels: 4,
    fadeTrail: true,
    opacity: 0.85,
  })
}

export function buildTrafficFlowLayer(
  segments: TrafficSegment[],
  currentTime: number,
) {
  return [
    ...buildTrafficRoadLayer(segments),
    buildTrafficParticleLayer(segments, currentTime),
  ]
}
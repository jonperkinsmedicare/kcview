import { PathLayer } from '@deck.gl/layers'
import { TripsLayer } from '@deck.gl/geo-layers'
import type { TrafficSegment } from '../types'
import { jamFactorToColor } from '../services/traffic'

const LOOP_LENGTH = 100   // animation cycles 0→100
const TRAIL_LENGTH = 15   // trail is 15% of loop length

// Glow road base layer
export function buildTrafficRoadLayer(segments: TrafficSegment[]) {
  return [
    new PathLayer<TrafficSegment>({
      id: 'traffic-glow-outer',
      data: segments,
      getPath: (d) => d.points,
      getColor: (d) => {
        const c = jamFactorToColor(d.jamFactor)
        return [c[0], c[1], c[2], 30] as [number, number, number, number]
      },
      getWidth: 14,
      widthMinPixels: 3,
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
        return [c[0], c[1], c[2], 180] as [number, number, number, number]
      },
      getWidth: 3,
      widthMinPixels: 1,
      widthMaxPixels: 5,
      pickable: false,
      opacity: 0.9,
    }),
  ]
}

export function buildTrafficParticleLayer(
  segments: TrafficSegment[],
  currentTime: number,
) {
  // currentTime should be 0-100 (use animTime % LOOP_LENGTH in MapView)
  const time = currentTime % LOOP_LENGTH

  const trips: Array<{
    id: string
    path: Array<[number, number]>
    timestamps: number[]
    color: [number, number, number, number]
  }> = []

  for (const segment of segments) {
    if (segment.jamFactor > 9.5) continue
    if (segment.points.length < 2) continue

    const color = jamFactorToColor(segment.jamFactor)

    // Speed ratio affects how spread out the timestamps are
    // Fast road = particles move quickly through their window
    const speedRatio = Math.max(0.2, segment.currentSpeed / Math.max(segment.freeFlowSpeed, 1))

    // Each trip covers 1/3 of the loop, 3 copies fill the full loop
    const segmentDuration = (LOOP_LENGTH / 3) / speedRatio

    for (let offset = 0; offset < 3; offset++) {
      const startT = (offset * LOOP_LENGTH) / 3

      // Build timestamps: start at startT, end at startT + segmentDuration
      const timestamps = segment.points.map((_, i) => {
        return startT + (i / (segment.points.length - 1)) * segmentDuration
      })

      trips.push({
        id: `${segment.id}-${offset}`,
        path: segment.points,
        timestamps,
        color,
      })
    }
  }

  return new TripsLayer({
    id: 'traffic-particles',
    data: trips,
    getPath: (d) => d.path,
    getTimestamps: (d) => d.timestamps,
    getColor: (d) => d.color,
    currentTime: time,
    trailLength: TRAIL_LENGTH,
    widthMinPixels: 3,
    widthMaxPixels: 8,
    fadeTrail: true,
    opacity: 0.9,
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
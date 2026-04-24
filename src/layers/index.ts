import { IconLayer, ScatterplotLayer, TextLayer } from '@deck.gl/layers'
import { HeatmapLayer } from '@deck.gl/aggregation-layers'
import { TripsLayer } from '@deck.gl/geo-layers'
import type { Aircraft, SatellitePosition, TrafficCamera, TransitVehicle, SpeedSensor } from '../types'

// ---------------------------------------------------------------
// AIRCRAFT LAYER
// ---------------------------------------------------------------
export function buildAircraftLayer(
  aircraft: Aircraft[],
  history: Record<string, Array<[number, number, number, number]>>,
  onHover: (info: { object?: Aircraft }) => void,
  onClick: (info: { object?: Aircraft }) => void,
) {
  const airborne = aircraft.filter(a => !a.onGround && a.altitude > 50)

  return [
    new TripsLayer({
      id: 'aircraft-trails',
      data: Object.entries(history).map(([id, positions]) => ({
        id,
        waypoints: positions.map(([lon, lat, alt, t]) => ({
          coordinates: [lon, lat, alt],
          timestamp: t,
        })),
      })),
      getPath: (d: { waypoints: Array<{ coordinates: number[] }> }) =>
        d.waypoints.map(w => w.coordinates) as unknown as number[],
      getTimestamps: (d: { waypoints: Array<{ timestamp: number }> }) =>
        d.waypoints.map(w => w.timestamp),
      getColor: [0, 220, 255],
      widthMinPixels: 2,
      trailLength: 120,
      currentTime: Date.now() / 1000,
      fadeTrail: true,
      opacity: 0.6,
    }),
    new IconLayer<Aircraft>({
      id: 'aircraft-icons',
      data: airborne,
      getPosition: (d) => [d.longitude, d.latitude, d.altitude],
      getIcon: () => ({
        url: '/icons/aircraft.svg',
        width: 64,
        height: 64,
        anchorX: 32,
        anchorY: 32,
      }),
      getSize: 28,
      getColor: (d) => {
        if (d.altitude < 1000) return [0, 255, 200, 220]
        if (d.altitude < 5000) return [255, 255, 255, 200]
        return [255, 200, 50, 200]
      },
      getAngle: (d) => -d.heading,
      pickable: true,
      onHover,
      onClick,
      billboard: true,
    }),
    new TextLayer<Aircraft>({
      id: 'aircraft-labels',
      data: airborne.filter(a => a.callsign),
      getPosition: (d) => [d.longitude, d.latitude, d.altitude],
      getText: (d) => d.callsign,
      getSize: 11,
      getColor: [0, 255, 200, 180],
      getPixelOffset: [0, -20],
      fontFamily: 'monospace',
      pickable: false,
    }),
  ]
}

// ---------------------------------------------------------------
// SATELLITE LAYER
// ---------------------------------------------------------------
export function buildSatelliteLayer(
  satellites: SatellitePosition[],
  onHover: (info: { object?: SatellitePosition }) => void,
) {
  return new ScatterplotLayer<SatellitePosition>({
    id: 'satellites',
    data: satellites,
    getPosition: (d) => [d.longitude, d.latitude, d.altitude * 100],
    getRadius: 8000,
    getFillColor: (d) => d.elevation > 0
      ? [255, 160, 0, 220]
      : [100, 100, 100, 80],
    pickable: true,
    onHover,
    stroked: true,
    getLineColor: [255, 200, 50, 120],
    getLineWidth: 1,
  })
}

// ---------------------------------------------------------------
// TRAFFIC CAMERA LAYER
// ---------------------------------------------------------------
export function buildCameraLayer(
  cameras: TrafficCamera[],
  onClick: (info: { object?: TrafficCamera }) => void,
) {
  return new IconLayer<TrafficCamera>({
    id: 'traffic-cameras',
    data: cameras,
    getPosition: (d) => [d.longitude, d.latitude],
    getIcon: () => ({
      url: '/icons/camera.svg',
      width: 64,
      height: 64,
      anchorX: 32,
      anchorY: 32,
    }),
    getSize: 22,
    getColor: [0, 220, 255, 200],
    pickable: true,
    onClick,
    billboard: true,
  })
}

// ---------------------------------------------------------------
// TRANSIT VEHICLES (KCATA GTFS-RT)
// ---------------------------------------------------------------
export function buildTransitLayer(vehicles: TransitVehicle[]) {
  return new ScatterplotLayer<TransitVehicle>({
    id: 'transit-vehicles',
    data: vehicles,
    getPosition: (d) => [d.longitude, d.latitude],
    getRadius: 60,
    getFillColor: [255, 100, 100, 200],
    pickable: false,
    stroked: false,
  })
}

// ---------------------------------------------------------------
// SPEED SENSOR CHOROPLETH (MoDOT)
// ---------------------------------------------------------------
export function buildSpeedSensorLayer(sensors: SpeedSensor[]) {
  const colorMap: Record<string, [number, number, number, number]> = {
    'free':        [0, 200, 100, 180],
    'moderate':    [255, 200, 0, 200],
    'heavy':       [255, 100, 0, 220],
    'stop-and-go': [220, 0, 0, 240],
  }

  return new ScatterplotLayer<SpeedSensor>({
    id: 'speed-sensors',
    data: sensors,
    getPosition: (d) => [d.longitude, d.latitude],
    getRadius: (d) => 300 + d.volume * 0.1,
    getFillColor: (d) => colorMap[d.congestionLevel] as [number, number, number, number],
    pickable: true,
    stroked: false,
    opacity: 0.7,
  })
}

// ---------------------------------------------------------------
// FIFA VENUE LAYER
// ---------------------------------------------------------------
export interface FifaVenue {
  name: string
  type: 'stadium' | 'fan-zone' | 'hotel-cluster' | 'shuttle-hub' | 'medical'
  longitude: number
  latitude: number
  capacity?: number
  notes?: string
}

export const KC_FIFA_VENUES: FifaVenue[] = [
  {
    name: 'Arrowhead Stadium',
    type: 'stadium',
    longitude: -94.4846,
    latitude: 39.0489,
    capacity: 80000,
    notes: 'Primary FIFA match venue. 6 matches including Round of 16.',
  },
  {
    name: 'Power & Light Fan Fest',
    type: 'fan-zone',
    longitude: -94.5822,
    latitude: 39.0971,
    capacity: 30000,
    notes: 'Official FIFA Fan Festival zone, downtown KC.',
  },
  {
    name: 'Union Station Fan Zone',
    type: 'fan-zone',
    longitude: -94.5873,
    latitude: 39.0836,
    notes: 'Secondary fan activation site near Crown Center.',
  },
  {
    name: 'MCI Airport',
    type: 'shuttle-hub',
    longitude: -94.7131,
    latitude: 39.2976,
    notes: 'Primary international arrival point.',
  },
  {
    name: 'Truman Medical Center',
    type: 'medical',
    longitude: -94.5521,
    latitude: 39.0892,
    notes: 'Level I trauma center, event medical support.',
  },
  {
    name: 'AdventHealth Stadium Clinic',
    type: 'medical',
    longitude: -94.4850,
    latitude: 38.8210,
    notes: 'On-site medical at Arrowhead for FIFA matches.',
  },
]

const VENUE_COLORS: Record<FifaVenue['type'], [number, number, number, number]> = {
  'stadium':       [255, 220, 0, 255],
  'fan-zone':      [50, 200, 255, 220],
  'hotel-cluster': [200, 100, 255, 200],
  'shuttle-hub':   [100, 255, 100, 200],
  'medical':       [255, 80, 80, 230],
}

export function buildFifaVenueLayer(onClick: (info: { object?: FifaVenue }) => void) {
  return [
    new ScatterplotLayer<FifaVenue>({
      id: 'fifa-venues-glow',
      data: KC_FIFA_VENUES,
      getPosition: (d) => [d.longitude, d.latitude],
      getRadius: (d) => d.type === 'stadium' ? 800 : 300,
      getFillColor: (d) => {
        const c = VENUE_COLORS[d.type]
        return [c[0], c[1], c[2], 40] as [number, number, number, number]
      },
      stroked: false,
      pickable: false,
    }),
    new ScatterplotLayer<FifaVenue>({
      id: 'fifa-venues',
      data: KC_FIFA_VENUES,
      getPosition: (d) => [d.longitude, d.latitude],
      getRadius: (d) => d.type === 'stadium' ? 180 : 80,
      getFillColor: (d) => VENUE_COLORS[d.type],
      pickable: true,
      onClick,
      stroked: true,
      getLineColor: [255, 255, 255, 100] as [number, number, number, number],
      getLineWidth: 2,
    }),
    new TextLayer<FifaVenue>({
      id: 'fifa-venue-labels',
      data: KC_FIFA_VENUES.filter(v => v.type === 'stadium' || v.type === 'fan-zone'),
      getPosition: (d) => [d.longitude, d.latitude],
      getText: (d) => d.name,
      getSize: 13,
      getColor: [255, 255, 255, 230],
      getPixelOffset: [0, -25],
      fontFamily: 'monospace',
      fontWeight: '600',
      pickable: false,
    }),
  ]
}

// ---------------------------------------------------------------
// CROWD DENSITY HEATMAP
// ---------------------------------------------------------------
export function buildCrowdHeatmapLayer(
  points: Array<{ longitude: number; latitude: number; weight: number }>
) {
  return new HeatmapLayer({
    id: 'crowd-heatmap',
    data: points,
    getPosition: (d: { longitude: number; latitude: number }) => [d.longitude, d.latitude],
    getWeight: (d: { weight: number }) => d.weight,
    radiusPixels: 60,
    intensity: 1,
    threshold: 0.03,
    colorRange: [
      [0, 25, 0, 20],
      [0, 150, 0, 80],
      [200, 200, 0, 150],
      [255, 150, 0, 200],
      [255, 50, 0, 220],
      [255, 0, 0, 240],
    ] as [number, number, number, number][],
  })
}
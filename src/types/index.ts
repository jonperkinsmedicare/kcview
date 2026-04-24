// ============================================================
// KCView — Core Types
// ============================================================

// --- Aircraft (OpenSky Network) ---
export interface Aircraft {
  icao24: string        // Unique transponder address
  callsign: string
  longitude: number
  latitude: number
  altitude: number      // Baro altitude in meters
  velocity: number      // m/s
  heading: number       // Track angle in degrees
  onGround: boolean
  lastContact: number   // Unix timestamp
}

// --- Satellite (CelesTrak TLE + satellite.js computed) ---
export interface SatellitePosition {
  id: string
  name: string
  longitude: number
  latitude: number
  altitude: number      // km above surface
  velocity: number      // km/s
  elevation: number     // degrees above horizon from KC
  tle: [string, string] // TLE line 1 and line 2
}

// --- Traffic Camera (KC Scout / MoDOT / KDOT) ---
export interface TrafficCamera {
  id: string
  name: string
  longitude: number
  latitude: number
  snapshotUrl: string   // JPEG snapshot URL (refreshes every ~30s)
  agency: 'kcscout' | 'modot' | 'kdot'
  direction?: string
  highway?: string
}

// --- KCATA Transit Vehicle (GTFS Realtime) ---
export interface TransitVehicle {
  id: string
  routeId: string
  routeName: string
  longitude: number
  latitude: number
  bearing: number
  speed: number         // m/s
  timestamp: number
}

// --- MoDOT Speed Sensor ---
export interface SpeedSensor {
  id: string
  longitude: number
  latitude: number
  highway: string
  direction: string
  speed: number         // mph
  volume: number        // vehicles/hour
  occupancy: number     // % 0-100
  congestionLevel: 'free' | 'moderate' | 'heavy' | 'stop-and-go'
}

// --- FIFA Match ---
export interface FifaMatch {
  id: string
  date: string          // ISO 8601
  homeTeam: string
  awayTeam: string
  homeFlag: string      // emoji
  awayFlag: string
  stage: 'group' | 'round-of-16' | 'quarterfinal' | 'semifinal' | 'final'
  kickoffLocal: string  // e.g. "7:00 PM CT"
  expectedAttendance: number
}

// --- Weather (NOAA NWS) ---
export interface WeatherCondition {
  temperature: number   // F
  windSpeed: number     // mph
  windDirection: number // degrees
  precipProbability: number // 0-1
  shortForecast: string
  severeAlertActive: boolean
  alertHeadline?: string
}

// --- View Mode (shader/filter state) ---
export type ViewMode = 'normal' | 'night-vision' | 'thermal' | 'crt' | 'match-day'

// --- Active Layer toggles ---
export interface LayerVisibility {
  aircraft: boolean
  satellites: boolean
  transitVehicles: boolean
  trafficCameras: boolean
  speedSensors: boolean
  fifaVenues: boolean
  fifaFanZones: boolean
  crowdDensity: boolean
  crimeDensity: boolean
  weather: boolean
  osmBuildings: boolean
}

// --- App Store shape (Zustand) ---
export interface KCViewState {
  // Viewport
  viewState: {
    longitude: number
    latitude: number
    zoom: number
    pitch: number
    bearing: number
  }
  // Live data
  aircraft: Aircraft[]
  satellites: SatellitePosition[]
  transitVehicles: TransitVehicle[]
  cameras: TrafficCamera[]
  speedSensors: SpeedSensor[]
  weather: WeatherCondition | null
  // UI state
  viewMode: ViewMode
  layers: LayerVisibility
  selectedEntity: Aircraft | SatellitePosition | TrafficCamera | null
  sidebarOpen: boolean
  activeMatch: FifaMatch | null
  // Actions
  setViewMode: (mode: ViewMode) => void
  toggleLayer: (layer: keyof LayerVisibility) => void
  setSelectedEntity: (entity: KCViewState['selectedEntity']) => void
  setSidebarOpen: (open: boolean) => void
  setAircraft: (data: Aircraft[]) => void
  setSatellites: (data: SatellitePosition[]) => void
  setTransitVehicles: (data: TransitVehicle[]) => void
  setWeather: (data: WeatherCondition) => void
}

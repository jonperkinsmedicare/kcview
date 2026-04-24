// ============================================================
// KCView — Core Types
// ============================================================

// --- Aircraft (OpenSky Network) ---
export interface Aircraft {
  icao24: string
  callsign: string
  longitude: number
  latitude: number
  altitude: number
  velocity: number
  heading: number
  onGround: boolean
  lastContact: number
}

// --- Satellite (CelesTrak TLE + satellite.js computed) ---
export interface SatellitePosition {
  id: string
  name: string
  longitude: number
  latitude: number
  altitude: number
  velocity: number
  elevation: number
  tle: [string, string]
}

// --- Traffic Camera (KC Scout / MoDOT / KDOT) ---
export interface TrafficCamera {
  id: string
  name: string
  longitude: number
  latitude: number
  snapshotUrl: string
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
  speed: number
  timestamp: number
}

// --- MoDOT Speed Sensor ---
export interface SpeedSensor {
  id: string
  longitude: number
  latitude: number
  highway: string
  direction: string
  speed: number
  volume: number
  occupancy: number
  congestionLevel: 'free' | 'moderate' | 'heavy' | 'stop-and-go'
}

// --- FIFA Match ---
export interface FifaMatch {
  id: string
  date: string
  homeTeam: string
  awayTeam: string
  homeFlag: string
  awayFlag: string
  stage: 'group' | 'round-of-16' | 'quarterfinal' | 'semifinal' | 'final'
  kickoffLocal: string
  expectedAttendance: number
}

// --- Weather (NOAA NWS) ---
export interface WeatherCondition {
  temperature: number
  windSpeed: number
  windDirection: number
  precipProbability: number
  shortForecast: string
  severeAlertActive: boolean
  alertHeadline?: string
}

// --- View Mode ---
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
  viewState: {
    longitude: number
    latitude: number
    zoom: number
    pitch: number
    bearing: number
  }
  aircraft: Aircraft[]
  aircraftHistory: Record<string, Array<[number, number, number, number]>>
  satellites: SatellitePosition[]
  transitVehicles: TransitVehicle[]
  cameras: TrafficCamera[]
  speedSensors: SpeedSensor[]
  weather: WeatherCondition | null
  viewMode: ViewMode
  layers: LayerVisibility
  selectedEntity: Aircraft | SatellitePosition | TrafficCamera | null
  sidebarOpen: boolean
  activeMatch: FifaMatch | null
  setViewMode: (mode: ViewMode) => void
  toggleLayer: (layer: keyof LayerVisibility) => void
  setSelectedEntity: (entity: KCViewState['selectedEntity']) => void
  setSidebarOpen: (open: boolean) => void
  setAircraft: (data: Aircraft[]) => void
  setSatellites: (data: SatellitePosition[]) => void
  setTransitVehicles: (data: TransitVehicle[]) => void
  setWeather: (data: WeatherCondition) => void
}
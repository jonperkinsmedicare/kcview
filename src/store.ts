import { create } from 'zustand'
import type { KCViewState, ViewMode, LayerVisibility, Aircraft, SatellitePosition, TransitVehicle, WeatherCondition } from './types'

const KC_CENTER = { longitude: -94.4846, latitude: 39.0489 }

export const useStore = create<KCViewState>((set) => ({
  viewState: {
    longitude: KC_CENTER.longitude,
    latitude: KC_CENTER.latitude,
    zoom: 10.5,
    pitch: 45,
    bearing: -10,
  },

  aircraft: [],
  aircraftHistory: {},
  satellites: [],
  transitVehicles: [],
  cameras: [],
  speedSensors: [],
  weather: null,

  viewMode: 'normal',

  layers: {
    aircraft: true,
    satellites: false,
    transitVehicles: true,
    trafficCameras: true,
    speedSensors: true,
    fifaVenues: true,
    fifaFanZones: true,
    crowdDensity: false,
    crimeDensity: false,
    weather: true,
    osmBuildings: true,
  },

  selectedEntity: null,
  sidebarOpen: true,
  activeMatch: null,

  setViewMode: (viewMode: ViewMode) => set({ viewMode }),

  toggleLayer: (layer: keyof LayerVisibility) =>
    set((state: KCViewState) => ({
      layers: { ...state.layers, [layer]: !state.layers[layer] },
    })),

  setSelectedEntity: (selectedEntity: KCViewState['selectedEntity']) => set({ selectedEntity }),
  setSidebarOpen: (sidebarOpen: boolean) => set({ sidebarOpen }),

  setAircraft: (aircraft: Aircraft[]) => set((state: KCViewState) => {
    const now = Date.now() / 1000
    const history = { ...state.aircraftHistory }
    aircraft.forEach((a) => {
      if (!history[a.icao24]) history[a.icao24] = []
      history[a.icao24] = [
        ...history[a.icao24].slice(-20),
        [a.longitude, a.latitude, a.altitude, now]
      ]
    })
    return { aircraft, aircraftHistory: history }
  }),

  setSatellites: (satellites: SatellitePosition[]) => set({ satellites }),
  setTransitVehicles: (transitVehicles: TransitVehicle[]) => set({ transitVehicles }),
  setWeather: (weather: WeatherCondition) => set({ weather }),
}))
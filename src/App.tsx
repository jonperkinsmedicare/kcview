import { useEffect } from 'react'
import MapView from './components/MapView'
import ControlPanel from './components/ControlPanel'
import CameraPopup from './components/CameraPopup'
import { useStore } from './store'
import { startAircraftPolling } from './services/opensky'
import { fetchCameras } from './services/cameras'
import { fetchWeather } from './services/weather-fifa'
import { VIEW_MODE_CSS } from './utils/viewModes'
import type { TrafficCamera } from './types'

// Inject view mode CSS overlay effects
const styleEl = document.createElement('style')
styleEl.textContent = VIEW_MODE_CSS
document.head.appendChild(styleEl)

export default function App() {
  const {
    setAircraft,
    setSatellites,
    cameras,
    setWeather,
    selectedEntity,
    setSelectedEntity,
    layers,
  } = useStore()

  // Fetch cameras once on mount
  useEffect(() => {
    fetchCameras().then(data => {
      useStore.setState({ cameras: data })
    })
  }, [])

  // Poll aircraft on 10s interval
  useEffect(() => {
    const stop = startAircraftPolling(setAircraft, 30_000)
    return stop
  }, [])

  // Poll weather every 5 minutes
  useEffect(() => {
    fetchWeather().then(setWeather).catch(console.warn)
    const interval = setInterval(() => {
      fetchWeather().then(setWeather).catch(console.warn)
    }, 5 * 60_000)
    return () => clearInterval(interval)
  }, [])

  // Satellite tracking (loaded on demand when layer toggled on)
  useEffect(() => {
    if (!layers.satellites) return
    import('./services/satellites').then(({ startSatelliteTracking }) => {
      const stop = startSatelliteTracking(setSatellites)
      return stop
    })
  }, [layers.satellites])

  // Determine if selected entity is a camera
  const selectedCamera =
    selectedEntity && 'snapshotUrl' in selectedEntity
      ? (selectedEntity as TrafficCamera)
      : null

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: '#000810' }}>
      <MapView />
      <ControlPanel />
      {selectedCamera && (
        <CameraPopup
          camera={selectedCamera}
          onClose={() => setSelectedEntity(null)}
        />
      )}
    </div>
  )
}

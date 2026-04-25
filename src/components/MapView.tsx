import { useEffect, useRef, useCallback } from 'react'
import DeckGL from '@deck.gl/react'
import { Map } from 'react-map-gl/maplibre'
import type { MapViewState } from '@deck.gl/core'
import { useStore } from '../store'
import {
  buildAircraftLayer,
  buildSatelliteLayer,
  buildCameraLayer,
  buildTransitLayer,
  buildSpeedSensorLayer,
  buildFifaVenueLayer,
  buildCrowdHeatmapLayer,
  type FifaVenue,
} from '../layers'
import type { Aircraft, SatellitePosition, TrafficCamera } from '../types'
import { getCanvasStyle } from '../utils/viewModes'
import { buildTrafficFlowLayer } from '../layers/traffic'

// Free MapLibre-compatible tile style — no API key
// Uses OpenFreeMap (https://openfreemap.org) — zero cost, no limits
// Alternative: Protomaps tiles (self-host on Cloudflare R2 for ~$5/mo)
const MAP_STYLE = 'https://tiles.openfreemap.org/styles/dark'

// If using Google Photorealistic 3D Tiles, replace MAP_STYLE with:
// const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
// Then use Cesium integration (see README - Phase 2 upgrade path)

interface MapViewProps {
  useGoogleTiles?: boolean // flip to true once you add VITE_GOOGLE_MAPS_API_KEY
}

export default function MapView({ useGoogleTiles = false }: MapViewProps) {
  const {
    viewState,
    aircraft,
    satellites,
    transitVehicles,
    trafficSegments,
    cameras,
    speedSensors,
    layers,
    viewMode,
    setSelectedEntity,
  } = useStore()

  // Build all active deck.gl layers
  const deckLayers = [
    ...(layers.fifaVenues ? buildFifaVenueLayer(
      ({ object }: { object?: FifaVenue }) => {
        if (object) setSelectedEntity(null)
      }
    ) : []),
    ...(layers.aircraft ? buildAircraftLayer(
      aircraft,
      useStore.getState().aircraftHistory,
      () => {},
      ({ object }: { object?: Aircraft }) => {
        if (object) setSelectedEntity(object)
      }
    ) : []),
    ...(layers.satellites && satellites.length > 0 ? [buildSatelliteLayer(
      satellites,
      ({ object }: { object?: SatellitePosition }) => {
        if (object) setSelectedEntity(object)
      }
    )] : []),
    ...(layers.trafficCameras ? [buildCameraLayer(
      cameras,
      ({ object }: { object?: TrafficCamera }) => {
        if (object) setSelectedEntity(object)
      }
    )] : []),
    ...(layers.transitVehicles ? [buildTransitLayer(transitVehicles)] : []),
    ...(layers.speedSensors ? [buildSpeedSensorLayer(speedSensors)] : []),
    ...(layers.trafficFlow && trafficSegments.length > 0 ? buildTrafficFlowLayer(trafficSegments, Date.now() / 1000) : []),
  ]

  const canvasStyle = getCanvasStyle(viewMode)

  if (useGoogleTiles) {
    // Phase 2: Cesium + Google 3D Tiles integration
    // See /docs/google-3d-tiles-upgrade.md
    return (
      <div style={{ width: '100%', height: '100%', ...canvasStyle }}>
        <DeckGL
          viewState={viewState as MapViewState}
          controller={true}
          layers={deckLayers}
        >
          {/* Cesium viewer injected here in Phase 2 */}
          <div style={{ width: '100%', height: '100%', background: '#0a0a0f' }} />
        </DeckGL>
      </div>
    )
  }

  return (
    <div
      style={{ width: '100%', height: '100%', ...canvasStyle }}
      className={`kcview-canvas viewmode-${viewMode}`}
    >
      <DeckGL
        viewState={viewState as MapViewState}
        controller={{ touchRotate: true, keyboard: true }}
        onViewStateChange={({ viewState: vs }) => 
          useStore.setState({ viewState: vs as typeof viewState })
        }
        layers={deckLayers}
        getTooltip={({ object }: { object?: Aircraft | SatellitePosition | TrafficCamera }) => {
          if (!object) return null
          if ('callsign' in object) {
            return {
              html: `
                <div style="font-family:monospace;font-size:11px;color:#00dcff;padding:6px 8px">
                  <strong>${object.callsign || object.icao24}</strong><br/>
                  Alt: ${Math.round((object as Aircraft).altitude)}m &nbsp;
                  Hdg: ${Math.round((object as Aircraft).heading)}°<br/>
                  Speed: ${Math.round((object as Aircraft).velocity)}m/s
                </div>
              `,
              style: { background: 'rgba(0,10,20,0.9)', border: '1px solid rgba(0,220,255,0.3)' }
            }
          }
          if ('elevation' in object) {
            const sat = object as SatellitePosition
            return {
              html: `
                <div style="font-family:monospace;font-size:11px;color:#ffcc00;padding:6px 8px">
                  <strong>${sat.name}</strong><br/>
                  Alt: ${Math.round(sat.altitude)} km<br/>
                  Elev from KC: ${Math.round(sat.elevation)}°
                </div>
              `,
              style: { background: 'rgba(10,5,0,0.9)', border: '1px solid rgba(255,200,0,0.3)' }
            }
          }
          if ('snapshotUrl' in object) {
            const cam = object as TrafficCamera
            return {
              html: `
                <div style="font-family:monospace;font-size:11px;color:#00dcff;padding:6px 8px">
                  <strong>${cam.name}</strong><br/>
                  ${cam.highway ?? ''} ${cam.direction ?? ''}<br/>
                  <em>Click to view feed</em>
                </div>
              `,
              style: { background: 'rgba(0,10,20,0.9)', border: '1px solid rgba(0,220,255,0.3)' }
            }
          }
          return null
        }}
      >
        <Map
          mapStyle={MAP_STYLE}
          reuseMaps
          attributionControl={false}
        />
      </DeckGL>
    </div>
  )
}

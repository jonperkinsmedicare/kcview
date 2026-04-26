import { useEffect, useRef, useState } from 'react'
import { Deck } from '@deck.gl/core'
import { useStore } from '../store'
import { buildTrafficFlowLayer } from '../layers/traffic'

interface POI {
  id: string
  label: string
  emoji: string
  lat: number
  lon: number
  altitude: number
  pitch: number
  category: 'venue' | 'camp' | 'transport' | 'fanzone'
}

const KC_POIS: POI[] = [
  { id: 'arrowhead', label: 'Arrowhead', emoji: '🏟', lat: 39.0489, lon: -94.4846, altitude: 600, pitch: -40, category: 'venue' },
  { id: 'sporting', label: 'CPKC Stadium', emoji: '⚽', lat: 39.1211, lon: -94.5916, altitude: 500, pitch: -40, category: 'venue' },
  { id: 'current', label: 'KC Current', emoji: '🏟', lat: 39.1003, lon: -94.6278, altitude: 500, pitch: -40, category: 'venue' },
  { id: 'argentina', label: '🇦🇷 Argentina', emoji: '⚽', lat: 39.1150, lon: -94.7200, altitude: 400, pitch: -45, category: 'camp' },
  { id: 'england', label: '🏴󠁧󠁢󠁥󠁮󠁧󠁿 England', emoji: '⚽', lat: 38.9700, lon: -94.5100, altitude: 400, pitch: -45, category: 'camp' },
  { id: 'netherlands', label: '🇳🇱 Netherlands', emoji: '⚽', lat: 39.1650, lon: -94.6350, altitude: 400, pitch: -45, category: 'camp' },
  { id: 'algeria', label: '🇩🇿 Algeria', emoji: '⚽', lat: 38.9717, lon: -95.2353, altitude: 400, pitch: -45, category: 'camp' },
  { id: 'mci', label: 'MCI Airport', emoji: '✈', lat: 39.2976, lon: -94.7131, altitude: 800, pitch: -35, category: 'transport' },
  { id: 'wheeler', label: 'Wheeler', emoji: '✈', lat: 39.1203, lon: -94.5927, altitude: 400, pitch: -40, category: 'transport' },
  { id: 'powerlight', label: 'Power & Light', emoji: '🎉', lat: 39.0971, lon: -94.5822, altitude: 400, pitch: -45, category: 'fanzone' },
  { id: 'union', label: 'Union Station', emoji: '🚂', lat: 39.0836, lon: -94.5873, altitude: 400, pitch: -45, category: 'fanzone' },
  { id: 'plaza', label: 'Plaza', emoji: '🛍', lat: 39.0392, lon: -94.5958, altitude: 400, pitch: -45, category: 'fanzone' },
]

const CATEGORY_COLORS: Record<POI['category'], string> = {
  venue:     '#ffcc00',
  camp:      '#00ff88',
  transport: '#00dcff',
  fanzone:   '#ff44aa',
}

export default function CesiumView() {
  const containerRef = useRef<HTMLDivElement>(null)
  const deckCanvasRef = useRef<HTMLCanvasElement>(null)
  const viewerRef = useRef<any>(null)
  const cesiumRef = useRef<any>(null)
  const deckRef = useRef<any>(null)
  const animTimeRef = useRef(0)
  const [activePoi, setActivePoi] = useState('arrowhead')
  const [cesiumReady, setCesiumReady] = useState(false)

  const { trafficSegments, layers } = useStore()
  const trafficRef = useRef(trafficSegments)
  const layersRef = useRef(layers)

  useEffect(() => {
    trafficRef.current = trafficSegments
    layersRef.current = layers
  }, [trafficSegments, layers])

  useEffect(() => {
    if (!containerRef.current || !deckCanvasRef.current || viewerRef.current) return

    async function initCesium() {
      const Cesium = await import('cesium')
      cesiumRef.current = Cesium
      await import('cesium/Build/Cesium/Widgets/widgets.css')
      ;(window as any).CESIUM_BASE_URL = '/cesium/'

      const tileset = await Cesium.createGooglePhotorealistic3DTileset({
        key: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
      })

      const viewer = new Cesium.Viewer(containerRef.current!, {
        timeline: false,
        animation: false,
        baseLayerPicker: false,
        geocoder: false,
        homeButton: false,
        sceneModePicker: false,
        navigationHelpButton: false,
        infoBox: false,
        selectionIndicator: false,
        fullscreenButton: false,
        scene3DOnly: true,
        requestRenderMode: false,
      })

      viewer.clock.shouldAnimate = true
      viewer.clock.canAnimate = true
      viewer.useDefaultRenderLoop = true
      viewer.targetFrameRate = 60
      viewer.scene.shadowMap.enabled = false
      viewer.scene.fog.enabled = false
      if (viewer.scene.skyAtmosphere) viewer.scene.skyAtmosphere.show = false
      viewer.scene.globe.show = true

      viewer.imageryLayers.removeAll()
      viewer.scene.primitives.add(tileset)
      viewer.creditDisplay.container.style.display = 'none'

      viewer.camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(-94.4846, 39.0489, 600),
        orientation: {
          heading: Cesium.Math.toRadians(0),
          pitch: Cesium.Math.toRadians(-40),
          roll: 0,
        },
      })

      const deck = new Deck({
        canvas: deckCanvasRef.current!,
        width: '100%',
        height: '100%',
        initialViewState: {
          longitude: -94.4846,
          latitude: 39.0489,
          zoom: 12,
          pitch: 45,
          bearing: 0,
        },
        controller: false,
        layers: [],
      })

      deckRef.current = deck

      viewer.scene.postRender.addEventListener(() => {
        const camera = viewer.camera
        const carto = Cesium.Cartographic.fromCartesian(camera.position)
        const lon = Cesium.Math.toDegrees(carto.longitude)
        const lat = Cesium.Math.toDegrees(carto.latitude)
        const alt = carto.height
        const zoom = Math.log2(156543.03392 / alt) + 8
        const heading = Cesium.Math.toDegrees(camera.heading)
        const pitch = Cesium.Math.toDegrees(camera.pitch) + 90

        animTimeRef.current = (Date.now() / 1000) % 100

        console.log('[deck sync] segments:', trafficRef.current.length, 'zoom:', zoom.toFixed(1))

        if (deckRef.current) {
          deckRef.current.setProps({
            viewState: {
              longitude: lon,
              latitude: lat,
              zoom: Math.max(1, Math.min(zoom, 20)),
              bearing: heading,
              pitch: Math.max(0, Math.min(pitch, 85)),
            },
            layers: layersRef.current.trafficFlow && trafficRef.current.length > 0
              ? buildTrafficFlowLayer(trafficRef.current, animTimeRef.current)
              : [],
          })
        }
      })

      viewerRef.current = viewer
      setCesiumReady(true)
      console.log('[Cesium] Google Photorealistic 3D Tiles loaded!')
    }

    initCesium().catch(console.error)

    return () => {
      if (deckRef.current) {
        deckRef.current.finalize()
        deckRef.current = null
      }
      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        viewerRef.current.destroy()
        viewerRef.current = null
      }
    }
  }, [])

  const flyTo = (poi: POI) => {
    if (!viewerRef.current || !cesiumRef.current) return
    const viewer = viewerRef.current
    const Cesium = cesiumRef.current

    viewer.camera.cancelFlight()
    viewer.clock.shouldAnimate = true

    let isFlying = true
    const forceUpdate = () => {
      if (!isFlying) return
      viewer.scene.requestRender()
      requestAnimationFrame(forceUpdate)
    }
    requestAnimationFrame(forceUpdate)

    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(poi.lon, poi.lat, poi.altitude),
      orientation: {
        heading: Cesium.Math.toRadians(0),
        pitch: Cesium.Math.toRadians(poi.pitch),
        roll: 0,
      },
      duration: 2.5,
      easingFunction: Cesium.EasingFunction.QUADRATIC_IN_OUT,
      changed: () => { viewer.scene.requestRender() },
      complete: () => {
        isFlying = false
        setActivePoi(poi.id)
        console.log('[flyTo] arrived at:', poi.label)
      },
      cancel: () => {
        isFlying = false
        console.warn('[flyTo] flight was interrupted')
      },
    })
  }

  return (
    <div style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>

      <div ref={containerRef} style={{ position: 'absolute', inset: 0, zIndex: 0 }} />

      <canvas
        ref={deckCanvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          zIndex: 1,
          pointerEvents: 'none',
        }}
      />

      {cesiumReady && (
        <div style={{
          position: 'absolute',
          bottom: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 5,
          justifyContent: 'center',
          maxWidth: '70%',
          zIndex: 1000,
          pointerEvents: 'all',
          fontFamily: 'monospace',
        }}>
          {KC_POIS.map(poi => (
            <button
              key={poi.id}
              onClick={(e) => { e.stopPropagation(); flyTo(poi) }}
              style={{
                padding: '4px 10px',
                fontSize: 10,
                fontFamily: 'monospace',
                letterSpacing: 0.5,
                background: activePoi === poi.id
                  ? `${CATEGORY_COLORS[poi.category]}22`
                  : 'rgba(0,0,0,0.6)',
                border: `1px solid ${activePoi === poi.id ? CATEGORY_COLORS[poi.category] : 'rgba(255,255,255,0.15)'}`,
                color: activePoi === poi.id ? CATEGORY_COLORS[poi.category] : 'rgba(255,255,255,0.6)',
                borderRadius: 20,
                cursor: 'pointer',
                backdropFilter: 'blur(4px)',
                transition: 'all 0.15s',
                whiteSpace: 'nowrap',
                pointerEvents: 'all',
              }}
            >
              {poi.emoji} {poi.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
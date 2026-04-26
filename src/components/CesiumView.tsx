import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store'

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
  { id: 'arrowhead',   label: 'Arrowhead',      emoji: '🏟', lat: 39.0489, lon: -94.4846, altitude: 600, pitch: -40, category: 'venue' },
  { id: 'sporting',    label: 'CPKC Stadium',    emoji: '⚽', lat: 39.1211, lon: -94.5916, altitude: 500, pitch: -40, category: 'venue' },
  { id: 'current',     label: 'KC Current',      emoji: '🏟', lat: 39.1003, lon: -94.6278, altitude: 500, pitch: -40, category: 'venue' },
  { id: 'argentina',   label: '🇦🇷 Argentina',   emoji: '⚽', lat: 39.1150, lon: -94.7200, altitude: 400, pitch: -45, category: 'camp' },
  { id: 'england',     label: '🏴󠁧󠁢󠁥󠁮󠁧󠁿 England',     emoji: '⚽', lat: 38.9700, lon: -94.5100, altitude: 400, pitch: -45, category: 'camp' },
  { id: 'netherlands', label: '🇳🇱 Netherlands', emoji: '⚽', lat: 39.1650, lon: -94.6350, altitude: 400, pitch: -45, category: 'camp' },
  { id: 'algeria',     label: '🇩🇿 Algeria',     emoji: '⚽', lat: 38.9717, lon: -95.2353, altitude: 400, pitch: -45, category: 'camp' },
  { id: 'mci',         label: 'MCI Airport',     emoji: '✈', lat: 39.2976, lon: -94.7131, altitude: 800, pitch: -35, category: 'transport' },
  { id: 'wheeler',     label: 'Wheeler',         emoji: '✈', lat: 39.1203, lon: -94.5927, altitude: 400, pitch: -40, category: 'transport' },
  { id: 'powerlight',  label: 'Power & Light',   emoji: '🎉', lat: 39.0971, lon: -94.5822, altitude: 400, pitch: -45, category: 'fanzone' },
  { id: 'union',       label: 'Union Station',   emoji: '🚂', lat: 39.0836, lon: -94.5873, altitude: 400, pitch: -45, category: 'fanzone' },
  { id: 'plaza',       label: 'Plaza',           emoji: '🛍', lat: 39.0392, lon: -94.5958, altitude: 400, pitch: -45, category: 'fanzone' },
]

const CATEGORY_COLORS: Record<POI['category'], string> = {
  venue:     '#ffcc00',
  camp:      '#00ff88',
  transport: '#00dcff',
  fanzone:   '#ff44aa',
}

// Convert jam factor to Cesium Color
function jamFactorToCesiumColor(Cesium: any, jamFactor: number, alpha = 1.0) {
  if (jamFactor <= 1) return new Cesium.Color(0.0, 1.0, 0.47, alpha)   // bright green
  if (jamFactor <= 3) return new Cesium.Color(0.47, 1.0, 0.0, alpha)   // yellow-green
  if (jamFactor <= 5) return new Cesium.Color(1.0, 0.86, 0.0, alpha)   // amber
  if (jamFactor <= 7) return new Cesium.Color(1.0, 0.47, 0.0, alpha)   // orange
  if (jamFactor <= 9) return new Cesium.Color(1.0, 0.16, 0.0, alpha)   // red
  return new Cesium.Color(0.78, 0.0, 0.31, alpha)                       // deep red
}

export default function CesiumView() {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<any>(null)
  const cesiumRef = useRef<any>(null)
  const trafficCollectionRef = useRef<any>(null)
  const glowCollectionRef = useRef<any>(null)
  const animFrameRef = useRef<number>(0)

  const [activePoi, setActivePoi] = useState('arrowhead')
  const [cesiumReady, setCesiumReady] = useState(false)

  const { trafficSegments, layers } = useStore()
  const trafficRef = useRef(trafficSegments)
  const layersRef = useRef(layers)

  // Keep refs in sync with store
  useEffect(() => {
    trafficRef.current = trafficSegments
    layersRef.current = layers
  }, [trafficSegments, layers])

  // Rebuild traffic lines when data changes
  useEffect(() => {
    if (!viewerRef.current || !cesiumRef.current || !trafficCollectionRef.current) return
    if (!layers.trafficFlow || trafficSegments.length === 0) {
      trafficCollectionRef.current.removeAll()
      glowCollectionRef.current?.removeAll()
      return
    }
    buildTrafficLines(cesiumRef.current, trafficSegments)
  }, [trafficSegments, layers.trafficFlow])

  function buildTrafficLines(Cesium: any, segments: typeof trafficSegments) {
    if (!trafficCollectionRef.current || !glowCollectionRef.current) return

    trafficCollectionRef.current.removeAll()
    glowCollectionRef.current.removeAll()
const filtered = segments.filter(s => s.jamFactor >= 2 && s.points.length >= 2)
    const limited = filtered.slice(0, 2000) // hard cap at 2000

    console.log(`[Traffic] Rendering ${limited.length} of ${segments.length} segments`)

    for (const segment of limited) {
      if (segment.points.length < 2) continue

      // Convert [lon, lat] pairs to flat degrees array for Cesium
      const flatCoords = segment.points.flatMap(([lon, lat]) => [lon, lat])
      const positions = Cesium.Cartesian3.fromDegreesArrayHeights(
        segment.points.flatMap(([lon, lat]) => [lon, lat, 320])
      )

      const coreColor = jamFactorToCesiumColor(Cesium, segment.jamFactor, 0.9)
      const glowColor = jamFactorToCesiumColor(Cesium, segment.jamFactor, 0.25)

      // Outer glow line (wide, transparent)
      glowCollectionRef.current.add({
        positions,
        width: 8,
        material: Cesium.Material.fromType('Color', { color: glowColor }),
      })

      // Core line (narrow, bright)
      trafficCollectionRef.current.add({
        positions,
        width: 2.5,
        material: Cesium.Material.fromType('PolylineGlow', {
          glowPower: 0.3,
          color: coreColor,
        }),
      })
    }

    
  }

  // Animate traffic pulse effect
  function startPulseAnimation(Cesium: any) {
    let t = 0

    const animate = () => {
      t += 0.02
      const pulse = 0.6 + 0.4 * Math.sin(t)

      if (trafficCollectionRef.current && layersRef.current.trafficFlow) {
        const count = trafficCollectionRef.current.length
        for (let i = 0; i < count; i++) {
          const line = trafficCollectionRef.current.get(i)
          if (line?.material?.uniforms) {
            line.material.uniforms.color.alpha = pulse * 0.9
          }
        }
      }

      animFrameRef.current = requestAnimationFrame(animate)
    }

    animFrameRef.current = requestAnimationFrame(animate)
  }

  useEffect(() => {
    if (!containerRef.current || viewerRef.current) return

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

      // Add polyline collections for traffic
      const glowCollection = new Cesium.PolylineCollection()
      const trafficCollection = new Cesium.PolylineCollection()
      viewer.scene.primitives.add(glowCollection)
      viewer.scene.primitives.add(trafficCollection)
      glowCollectionRef.current = glowCollection
      trafficCollectionRef.current = trafficCollection

      viewer.camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(-94.4846, 39.0489, 600),
        orientation: {
          heading: Cesium.Math.toRadians(0),
          pitch: Cesium.Math.toRadians(-40),
          roll: 0,
        },
      })

      // Build initial traffic lines if data already loaded
      if (trafficRef.current.length > 0 && layersRef.current.trafficFlow) {
        buildTrafficLines(Cesium, trafficRef.current)
      }

      // Start pulse animation
      startPulseAnimation(Cesium)

      viewerRef.current = viewer
      setCesiumReady(true)
      console.log('[Cesium] Google Photorealistic 3D Tiles loaded!')
    }

    initCesium().catch(console.error)

    return () => {
      cancelAnimationFrame(animFrameRef.current)
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

      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />

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
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
  { id: 'powerlight',  label: 'Power & Light',   emoji: '🎉', lat: 39.0971, lon: -94.5822, altitude: 400, pitch: -45, category: 'fanzone' },
  { id: 'union',       label: 'Union Station',   emoji: '🚂', lat: 39.0836, lon: -94.5873, altitude: 400, pitch: -45, category: 'fanzone' },
  { id: 'plaza',       label: 'Plaza',           emoji: '🛍', lat: 39.0392, lon: -94.5958, altitude: 400, pitch: -45, category: 'fanzone' },
  { id: 'mci',         label: 'MCI Airport',     emoji: '✈', lat: 39.2976, lon: -94.7131, altitude: 800, pitch: -35, category: 'transport' },
]

const CATEGORY_COLORS: Record<POI['category'], string> = {
  venue:     '#ffcc00',
  camp:      '#00ff88',
  transport: '#00dcff',
  fanzone:   '#ff44aa',
}

export default function CesiumView() {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<any>(null)
  const cesiumRef = useRef<any>(null)
  const [activePoi, setActivePoi] = useState('arrowhead')
  const [cesiumReady, setCesiumReady] = useState(false)

  const { trafficSegments, layers } = useStore()
  const buildTimeoutRef = useRef<any>(null);

  useEffect(() => {
    if (!viewerRef.current || !cesiumRef.current || !cesiumReady) return
    if (buildTimeoutRef.current) clearTimeout(buildTimeoutRef.current);

    if (!layers.trafficFlow || trafficSegments.length === 0) {
      clearTrafficPrimitives();
      return
    }
    
    buildTimeoutRef.current = setTimeout(() => {
      buildTrafficLines(cesiumRef.current, trafficSegments);
    }, 500);
  }, [trafficSegments.length, layers.trafficFlow, cesiumReady]) 

  function clearTrafficPrimitives() {
    if (!viewerRef.current) return;
    const scene = viewerRef.current.scene;
    const trafficPrimitives = scene.primitives._primitives.filter((p: any) => p.isTrafficPrimitive);
    trafficPrimitives.forEach((p: any) => scene.primitives.remove(p));
  }

  async function buildTrafficLines(Cesium: any, segments: typeof trafficSegments) {
    const viewer = viewerRef.current;
    if (!viewer) return;
    clearTrafficPrimitives();

    const buckets = [
      { max: 2,  color: new Cesium.Color(0.0, 1.0, 0.25, 0.7) }, // Neon Green
      { max: 5,  color: new Cesium.Color(1.0, 1.0, 0.0, 0.8) },  // Yellow
      { max: 8,  color: new Cesium.Color(1.0, 0.5, 0.0, 0.9) },  // Orange
      { max: 11, color: new Cesium.Color(1.0, 0.0, 0.0, 1.0) }   // Red
    ];

    for (const bucket of buckets) {
      const bucketIdx = buckets.indexOf(bucket);
      const minJam = bucketIdx === 0 ? 0 : buckets[bucketIdx - 1].max;
      
      const bucketSegments = segments.filter(s => 
        s.jamFactor >= minJam && s.jamFactor < bucket.max && s.points.length >= 2
      ).slice(0, 2500); 

      if (bucketSegments.length === 0) continue;

      const instances = bucketSegments.map(segment => {
        return new Cesium.GeometryInstance({
          geometry: new Cesium.GroundPolylineGeometry({
            positions: Cesium.Cartesian3.fromDegreesArray(
              segment.points.flatMap(([lon, lat]: [number, number]) => [lon, lat])
            ),
            width: 12.0
          }),
          id: { jamFactor: segment.jamFactor, segmentId: segment.id, type: 'traffic' }
        });
      });

      const primitive = new Cesium.GroundPolylinePrimitive({
        geometryInstances: instances,
        appearance: new Cesium.PolylineMaterialAppearance({
          material: Cesium.Material.fromType('PolylineGlow', {
            glowPower: 0.5,
            color: bucket.color
          })
        }),
        depthFailAppearance: new Cesium.PolylineMaterialAppearance({
          material: Cesium.Material.fromType('PolylineGlow', {
            glowPower: 0.2,
            color: bucket.color.withAlpha(0.3)
          })
        }),
        asynchronous: true
      });

      (primitive as any).isTrafficPrimitive = true;
      viewer.scene.primitives.add(primitive);
    }
  }

  useEffect(() => {
    if (!containerRef.current || viewerRef.current) return

    async function initCesium() {
      const Cesium = await import('cesium')
      Cesium.Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_ION_TOKEN;
      cesiumRef.current = Cesium
      
      await import('cesium/Build/Cesium/Widgets/widgets.css')
      ;(window as any).CESIUM_BASE_URL = '/cesium/'

      const viewer = new Cesium.Viewer(containerRef.current!, {
        timeline: false, animation: false, baseLayerPicker: false,
        geocoder: false, homeButton: false, sceneModePicker: false,
        navigationHelpButton: false, infoBox: false, selectionIndicator: false,
        fullscreenButton: false, scene3DOnly: true, requestRenderMode: true,
        maximumRenderTimeChange: Infinity,
        terrainProvider: await Cesium.createWorldTerrainAsync()
      })

      const googleTileset = await Cesium.createGooglePhotorealistic3DTileset({
        key: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
      })
      viewer.scene.primitives.add(googleTileset)

      try {
        const osmBuildings = await Cesium.createOsmBuildingsAsync()
        // FIX: Make the gray OSM buildings invisible but still "clickable"
        osmBuildings.style = new Cesium.Cesium3DTileStyle({
          color: 'rgba(255, 255, 255, 0.01)',
          show: true
        });
        viewer.scene.primitives.add(osmBuildings)
      } catch (e) { console.error(e) }

      viewer.scene.globe.show = false 
      viewer.imageryLayers.removeAll()
      viewer.creditDisplay.container.style.display = 'none'

      viewer.camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(-94.5822, 39.0971, 1500),
        orientation: { heading: 0, pitch: Cesium.Math.toRadians(-60), roll: 0 }
      })

      const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
      handler.setInputAction((movement: any) => {
        const picked = viewer.scene.pick(movement.position);
        if (Cesium.defined(picked) && picked.getProperty) {
          console.log("OSM Building Identity:", picked.getProperty('name') || "KC Structure");
        }
      }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

      viewerRef.current = viewer
      setCesiumReady(true)
    }

    initCesium().catch(console.error)

    return () => {
      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        viewerRef.current.destroy()
        viewerRef.current = null
      }
    }
  }, [])

  const flyTo = (poi: POI) => {
    if (!viewerRef.current || !cesiumRef.current) return
    viewerRef.current.camera.flyTo({
      destination: cesiumRef.current.Cartesian3.fromDegrees(poi.lon, poi.lat, poi.altitude),
      orientation: { heading: 0, pitch: cesiumRef.current.Math.toRadians(poi.pitch), roll: 0 },
      duration: 2.5,
      complete: () => setActivePoi(poi.id),
    })
  }

  return (
    <div style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
      {cesiumReady && (
        <div style={{
          position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
          display: 'flex', flexWrap: 'wrap', gap: 5, justifyContent: 'center',
          maxWidth: '90%', zIndex: 1000, fontFamily: 'monospace',
        }}>
          {KC_POIS.map(poi => (
            <button key={poi.id} onClick={(e) => { e.stopPropagation(); flyTo(poi) }}
              style={{
                padding: '4px 10px', fontSize: 10, borderRadius: 20, cursor: 'pointer',
                background: activePoi === poi.id ? `${CATEGORY_COLORS[poi.category]}22` : 'rgba(0,0,0,0.6)',
                border: `1px solid ${activePoi === poi.id ? CATEGORY_COLORS[poi.category] : 'rgba(255,255,255,0.15)'}`,
                color: activePoi === poi.id ? CATEGORY_COLORS[poi.category] : 'rgba(255,255,255,0.6)',
                backdropFilter: 'blur(4px)',
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
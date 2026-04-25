import { useEffect, useRef } from 'react'
import { useStore } from '../store'

const CLASSIFICATION = 'TOP SECRET // SI-TK // NOFORN'
const MISSION_ID = 'KH11-4084 OPS-4114'

interface LensOverlayProps {
  children: React.ReactNode
}

export default function LensOverlay({ children }: LensOverlayProps) {
  const { viewMode, viewState, aircraft, satellites } = useStore()
  const clockRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const tick = () => {
      if (clockRef.current) {
        const now = new Date()
        const z = (n: number) => String(n).padStart(2, '0')
        clockRef.current.textContent =
          `REC ${now.getUTCFullYear()}-${z(now.getUTCMonth()+1)}-${z(now.getUTCDate())} ` +
          `${z(now.getUTCHours())}:${z(now.getUTCMinutes())}:${z(now.getUTCSeconds())}Z`
      }
    }
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [])

  const modeColor = {
    'normal':       '#00dcff',
    'night-vision': '#00ff44',
    'thermal':      '#ff6600',
    'crt':          '#33ff88',
    'match-day':    '#ffcc00',
  }[viewMode] ?? '#00dcff'

  const coords = `${viewState.latitude.toFixed(4)}°N  ${Math.abs(viewState.longitude).toFixed(4)}°W`

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: '#0a0f08' }}>


      {/* Tactical background grid */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1,
        backgroundImage: `
          linear-gradient(rgba(0,255,50,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,255,50,0.03) 1px, transparent 1px)
        `,
        backgroundSize: '40px 40px',
      }} />

      {/* Map content clipped to circle */}
      <div style={{
        position: 'absolute',
        inset: 0,
        clipPath: 'circle(38vh at calc(280px + ((100vw - 280px) / 2)) 50%)',
        WebkitClipPath: 'circle(38vh at calc(280px + ((100vw - 280px) / 2)) 50%)',
      }}>
        {children}
      </div>

      {/* Scanlines */}
      <div style={{
        position: 'absolute', inset: 0,
        clipPath: 'circle(38vh at calc(280px + ((100vw - 280px) / 2)) 50%)',
        WebkitClipPath: 'circle(38vh at calc(280pcalc(280px + ((100vw - 280px) / 2))x + 38vh) 50%)',
        background: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.08) 3px, rgba(0,0,0,0.08) 4px)',
        pointerEvents: 'none', zIndex: 10,
      }} />

      {/* Lens ring */}
      <div style={{
        position: 'absolute',
        left: 'calc(((100vw - 280px) / 2) + 280px - 38vh)',
        top: '50%',
        width: 'calc(76vh)',
        height: 'calc(76vh)',
        transform: 'translateY(-50%)',
        border: `2px solid ${modeColor}44`,
        borderRadius: '50%',
        boxShadow: `0 0 0 1px ${modeColor}22, inset 0 0 60px rgba(0,0,0,0.4), 0 0 40px ${modeColor}11`,
        pointerEvents: 'none', zIndex: 20,
      }} />

      {/* Inner detail ring */}
      <div style={{
        position: 'absolute',
        left: 'calc(((100vw - 280px) / 2) + 280px - 36vh)',
        top: '50%',
        width: 'calc(72vh)',
        height: 'calc(72vh)',
        transform: 'translateY(-50%)',
        border: `1px solid ${modeColor}22`,
        borderRadius: '50%',
        pointerEvents: 'none', zIndex: 20,
      }} />

      {/* Crosshair */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 20 }}>
        <div style={{ position: 'absolute', top: '50%', left: 280, right: 0, height: 1, background: `${modeColor}18` }} />
        <div style={{ position: 'absolute', left: 'calc(280px + ((100vw - 280px) / 2))', top: 0, bottom: 0, width: 1, background: `${modeColor}18` }} />
        <div style={{
          position: 'absolute', top: '50%', left: 'calc(280px + ((100vw - 280px) / 2))',
          width: 6, height: 6, borderRadius: '50%',
          border: `1px solid ${modeColor}66`,
          transform: 'translate(-50%, -50%)',
          boxShadow: `0 0 6px ${modeColor}44`,
        }} />
      </div>

      {/* TOP — Classification + Clock */}
      <div style={{
        position: 'absolute', top: 16, left: 0, right: 0,
        display: 'flex', justifyContent: 'space-between', padding: '0 16px',
        pointerEvents: 'none', zIndex: 30, fontFamily: 'monospace',
      }}>
        <div style={{ fontSize: 10, color: '#ffcc00', letterSpacing: 2, opacity: 0.8 }}>{CLASSIFICATION}</div>
        <div ref={clockRef} style={{ fontSize: 10, color: modeColor, letterSpacing: 1, opacity: 0.7 }} />
      </div>

      {/* TOP LEFT — Mission ID + Mode */}
      <div style={{ position: 'absolute', top: 36, left: 16, pointerEvents: 'none', zIndex: 30, fontFamily: 'monospace' }}>
        <div style={{ fontSize: 9, color: '#ffcc00', letterSpacing: 1, opacity: 0.6, marginBottom: 2 }}>{MISSION_ID}</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: modeColor, letterSpacing: 3 }}>
          {viewMode.toUpperCase().replace('-', ' ')}
        </div>
      </div>

      {/* TOP RIGHT — Active style */}
      <div style={{ position: 'absolute', top: 36, right: 16, textAlign: 'right', pointerEvents: 'none', zIndex: 30, fontFamily: 'monospace' }}>
        <div style={{ fontSize: 9, color: modeColor, letterSpacing: 1, opacity: 0.6, marginBottom: 2 }}>ACTIVE STYLE</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: modeColor, letterSpacing: 3 }}>
          {viewMode.toUpperCase().replace('-', ' ')}
        </div>
      </div>

      {/* BOTTOM LEFT — Coordinates */}
      <div style={{ position: 'absolute', bottom: 40, left: 16, pointerEvents: 'none', zIndex: 30, fontFamily: 'monospace' }}>
        <div style={{ fontSize: 9, color: modeColor, letterSpacing: 1, borderLeft: `2px solid ${modeColor}44`, paddingLeft: 8 }}>
          <div style={{ opacity: 0.5, marginBottom: 2 }}>COORDS</div>
          <div style={{ opacity: 0.8 }}>{coords}</div>
          <div style={{ opacity: 0.5, marginTop: 2 }}>ALT: {Math.round(viewState.zoom * 100)}m  BRG: {Math.round(viewState.bearing)}°</div>
        </div>
      </div>

      {/* BOTTOM RIGHT — Live counts */}
      <div style={{ position: 'absolute', bottom: 40, right: 16, textAlign: 'right', pointerEvents: 'none', zIndex: 30, fontFamily: 'monospace' }}>
        <div style={{ fontSize: 9, color: modeColor, opacity: 0.6, letterSpacing: 1, marginBottom: 3 }}>
          OPTIC VIS:{aircraft.length} SAT:{satellites.length}
        </div>
        <div style={{ fontSize: 9, color: '#ffcc00', opacity: 0.5, letterSpacing: 1 }}>KC METRO · ARROWHEAD</div>
      </div>

      {/* BOTTOM CENTER — Location tag */}
      <div style={{ position: 'absolute', bottom: 24, left: 'calc(280px + ((100vw - 280px) / 2))', transform: 'translateX(-50%)', pointerEvents: 'none', zIndex: 30, fontFamily: 'monospace' }}>
        <div style={{
          background: 'rgba(0,0,0,0.7)', border: `1px solid ${modeColor}33`,
          borderRadius: 4, padding: '5px 12px', fontSize: 10, color: modeColor,
          letterSpacing: 1, textAlign: 'center',
        }}>
          <div style={{ fontSize: 8, opacity: 0.5, marginBottom: 2 }}>LOCATION</div>
          <div>⊕ Kansas City, MO</div>
          <div style={{ fontSize: 9, opacity: 0.5 }}>Arrowhead Stadium · FIFA 2026</div>
        </div>
      </div>

      {/* Corner tick marks */}
      {[
        { top: 16, left: 16, borderTop: `1px solid ${modeColor}44`, borderLeft: `1px solid ${modeColor}44` },
        { top: 16, right: 16, borderTop: `1px solid ${modeColor}44`, borderRight: `1px solid ${modeColor}44` },
        { bottom: 16, left: 16, borderBottom: `1px solid ${modeColor}44`, borderLeft: `1px solid ${modeColor}44` },
        { bottom: 16, right: 16, borderBottom: `1px solid ${modeColor}44`, borderRight: `1px solid ${modeColor}44` },
      ].map((style, i) => (
        <div key={i} style={{ position: 'absolute', width: 20, height: 20, pointerEvents: 'none', zIndex: 30, ...style }} />
      ))}

    </div>
  )
}
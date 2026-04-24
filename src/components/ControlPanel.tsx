import { useStore } from '../store'
import { VIEW_MODES } from '../utils/viewModes'
import type { ViewMode, LayerVisibility } from '../types'
import { FIFA_KC_MATCHES } from '../services/weather-fifa'

const LAYER_CONFIG: Array<{
  key: keyof LayerVisibility
  label: string
  icon: string
  color: string
}> = [
  { key: 'aircraft',       label: 'Live aircraft',     icon: '✈', color: '#00dcff' },
  { key: 'satellites',     label: 'Satellites',         icon: '🛰', color: '#ffcc00' },
  { key: 'transitVehicles',label: 'KC buses',           icon: '🚌', color: '#ff6464' },
  { key: 'trafficCameras', label: 'Traffic cameras',    icon: '📷', color: '#00dcff' },
  { key: 'speedSensors',   label: 'Highway sensors',    icon: '🛣', color: '#44ff44' },
  { key: 'fifaVenues',     label: 'FIFA venues',        icon: '⚽', color: '#ffcc00' },
  { key: 'fifaFanZones',   label: 'Fan zones',          icon: '🎉', color: '#00aaff' },
  { key: 'crowdDensity',   label: 'Crowd density',      icon: '👥', color: '#ff8800' },
  { key: 'crimeDensity',   label: 'Crime heat (KCPD)', icon: '🚔', color: '#ff4444' },
  { key: 'weather',        label: 'Weather',            icon: '🌩', color: '#aaddff' },
]

export default function ControlPanel() {
  const {
    layers,
    toggleLayer,
    viewMode,
    setViewMode,
    weather,
    aircraft,
    satellites,
    transitVehicles,
    sidebarOpen,
    setSidebarOpen,
  } = useStore()

  const nextMatch = FIFA_KC_MATCHES.find(m => new Date(m.date) >= new Date())

  return (
    <>
      {/* Collapse toggle */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        style={{
          position: 'fixed',
          top: 16,
          left: sidebarOpen ? 284 : 16,
          zIndex: 1000,
          width: 32,
          height: 32,
          background: 'rgba(0,10,20,0.9)',
          border: '1px solid rgba(0,220,255,0.3)',
          color: '#00dcff',
          borderRadius: 4,
          cursor: 'pointer',
          fontSize: 14,
          fontFamily: 'monospace',
          transition: 'left 0.2s ease',
        }}
      >
        {sidebarOpen ? '◄' : '►'}
      </button>

      {/* Sidebar panel */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: sidebarOpen ? 0 : -280,
        width: 280,
        height: '100vh',
        background: 'rgba(0, 8, 18, 0.92)',
        borderRight: '1px solid rgba(0, 220, 255, 0.15)',
        backdropFilter: 'blur(12px)',
        zIndex: 999,
        overflowY: 'auto',
        transition: 'left 0.2s ease',
        fontFamily: 'monospace',
        color: '#a0c8d8',
        padding: '16px 0',
      }}>

        {/* Header */}
        <div style={{ padding: '0 16px 16px', borderBottom: '1px solid rgba(0,220,255,0.12)' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#00dcff', letterSpacing: 2 }}>
            KCVIEW
          </div>
          <div style={{ fontSize: 10, color: '#558899', letterSpacing: 1, marginTop: 2 }}>
            SPATIAL INTELLIGENCE · KC METRO
          </div>
          {/* Live counts */}
          <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
            {[
              { val: aircraft.length, label: 'aircraft' },
              { val: satellites.length, label: 'sats' },
              { val: transitVehicles.length, label: 'buses' },
            ].map(({ val, label }) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#00dcff' }}>{val}</div>
                <div style={{ fontSize: 9, color: '#446677' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Next FIFA match */}
        {nextMatch && (
          <div style={{
            margin: '12px 16px',
            padding: '10px 12px',
            background: 'rgba(255, 200, 0, 0.07)',
            border: '1px solid rgba(255, 200, 0, 0.25)',
            borderRadius: 4,
          }}>
            <div style={{ fontSize: 9, color: '#998800', letterSpacing: 1, marginBottom: 4 }}>
              NEXT KC MATCH
            </div>
            <div style={{ fontSize: 12, color: '#ffcc00', fontWeight: 700 }}>
              {nextMatch.homeTeam}
            </div>
            <div style={{ fontSize: 10, color: '#887700', marginTop: 2 }}>
              {new Date(nextMatch.date).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', weekday: 'short'
              })} · {nextMatch.kickoffLocal}
            </div>
            <div style={{ fontSize: 10, color: '#665500', marginTop: 1 }}>
              Expected: {nextMatch.expectedAttendance.toLocaleString()} fans
            </div>
          </div>
        )}

        {/* View modes */}
        <div style={{ padding: '12px 16px' }}>
          <div style={{ fontSize: 9, color: '#446677', letterSpacing: 1, marginBottom: 8 }}>
            VIEW MODE
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {(Object.entries(VIEW_MODES) as [ViewMode, typeof VIEW_MODES[ViewMode]][]).map(([key, cfg]) => (
              <button
                key={key}
                onClick={() => setViewMode(key)}
                style={{
                  padding: '5px 8px',
                  fontSize: 10,
                  fontFamily: 'monospace',
                  background: viewMode === key ? 'rgba(0,220,255,0.15)' : 'transparent',
                  border: `1px solid ${viewMode === key ? cfg.uiTint : 'rgba(0,220,255,0.15)'}`,
                  color: viewMode === key ? cfg.uiTint : '#446677',
                  borderRadius: 3,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {cfg.icon} {cfg.label}
              </button>
            ))}
          </div>
        </div>

        {/* Layer toggles */}
        <div style={{ padding: '0 16px' }}>
          <div style={{ fontSize: 9, color: '#446677', letterSpacing: 1, marginBottom: 8 }}>
            DATA LAYERS
          </div>
          {LAYER_CONFIG.map(({ key, label, icon, color }) => (
            <button
              key={key}
              onClick={() => toggleLayer(key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                width: '100%',
                padding: '7px 0',
                background: 'transparent',
                border: 'none',
                borderBottom: '1px solid rgba(0,220,255,0.06)',
                color: layers[key] ? color : '#334455',
                cursor: 'pointer',
                fontFamily: 'monospace',
                fontSize: 12,
                textAlign: 'left',
                transition: 'color 0.15s',
              }}
            >
              <span style={{
                width: 8, height: 8, borderRadius: '50%',
                background: layers[key] ? color : '#223344',
                flexShrink: 0,
                boxShadow: layers[key] ? `0 0 6px ${color}66` : 'none',
              }} />
              {icon} {label}
            </button>
          ))}
        </div>

        {/* Weather widget */}
        {weather && layers.weather && (
          <div style={{
            margin: '12px 16px',
            padding: '10px 12px',
            background: 'rgba(0, 100, 180, 0.08)',
            border: '1px solid rgba(0,150,255,0.2)',
            borderRadius: 4,
          }}>
            <div style={{ fontSize: 9, color: '#446688', letterSpacing: 1, marginBottom: 6 }}>
              KC WEATHER · ARROWHEAD
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: weather.severeAlertActive ? '#ff4444' : '#aaddff' }}>
              {weather.temperature}°F
            </div>
            <div style={{ fontSize: 11, color: '#557788', marginTop: 2 }}>
              {weather.shortForecast}
            </div>
            <div style={{ fontSize: 10, color: '#446677', marginTop: 2 }}>
              Wind {weather.windSpeed} mph · Precip {Math.round(weather.precipProbability * 100)}%
            </div>
            {weather.severeAlertActive && (
              <div style={{
                marginTop: 6, padding: '4px 6px',
                background: 'rgba(255,0,0,0.15)',
                border: '1px solid rgba(255,0,0,0.4)',
                borderRadius: 3,
                fontSize: 10,
                color: '#ff6666',
              }}>
                ⚠ {weather.alertHeadline}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div style={{
          padding: '16px',
          borderTop: '1px solid rgba(0,220,255,0.08)',
          marginTop: 12,
          fontSize: 9,
          color: '#334455',
          lineHeight: 1.6,
        }}>
          DATA SOURCES: OpenSky Network · KC Scout / MoDOT · KCATA GTFS-RT
          · CelesTrak TLE · NOAA NWS · OSM · KCMO Open Data
        </div>
      </div>
    </>
  )
}

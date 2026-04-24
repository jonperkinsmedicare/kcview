import { useState, useEffect } from 'react'
import type { TrafficCamera } from '../types'
import { getCameraSnapshotUrl } from '../services/cameras'

interface CameraPopupProps {
  camera: TrafficCamera
  onClose: () => void
}

export default function CameraPopup({ camera, onClose }: CameraPopupProps) {
  const [imgSrc, setImgSrc] = useState<string>('')
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [error, setError] = useState(false)

  const refreshSnapshot = () => {
    setError(false)
    setImgSrc(getCameraSnapshotUrl(camera))
    setLastUpdate(new Date())
  }

  useEffect(() => {
    refreshSnapshot()
    // Auto-refresh every 30 seconds (KC Scout snapshot update rate)
    const interval = setInterval(refreshSnapshot, 30_000)
    return () => clearInterval(interval)
  }, [camera.id])

  return (
    <div style={{
      position: 'fixed',
      bottom: 20,
      right: 20,
      width: 340,
      background: 'rgba(0, 8, 18, 0.95)',
      border: '1px solid rgba(0, 220, 255, 0.3)',
      borderRadius: 6,
      zIndex: 1001,
      fontFamily: 'monospace',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px 12px',
        borderBottom: '1px solid rgba(0,220,255,0.15)',
      }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#00dcff' }}>
            {camera.name}
          </div>
          <div style={{ fontSize: 9, color: '#446677', marginTop: 2 }}>
            {camera.agency.toUpperCase()} · {camera.highway} {camera.direction}
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: '#446677',
            cursor: 'pointer',
            fontSize: 14,
            padding: '0 4px',
          }}
        >
          ✕
        </button>
      </div>

      {/* Camera feed */}
      <div style={{ position: 'relative', width: '100%', height: 210, background: '#000810' }}>
        {!error ? (
          <img
            src={imgSrc}
            alt={`Traffic camera: ${camera.name}`}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            onError={() => setError(true)}
          />
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: '#334455',
            fontSize: 11,
          }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>📷</div>
            Feed temporarily unavailable
          </div>
        )}

        {/* Overlay: timestamp + agency badge */}
        <div style={{
          position: 'absolute',
          bottom: 6,
          left: 8,
          fontSize: 9,
          color: 'rgba(0,220,255,0.7)',
          background: 'rgba(0,0,0,0.5)',
          padding: '2px 5px',
          borderRadius: 2,
        }}>
          {lastUpdate.toLocaleTimeString()}
        </div>
      </div>

      {/* Actions */}
      <div style={{
        display: 'flex',
        gap: 8,
        padding: '8px 12px',
        borderTop: '1px solid rgba(0,220,255,0.1)',
      }}>
        <button
          onClick={refreshSnapshot}
          style={{
            flex: 1,
            padding: '5px',
            background: 'rgba(0,220,255,0.08)',
            border: '1px solid rgba(0,220,255,0.2)',
            color: '#00dcff',
            borderRadius: 3,
            cursor: 'pointer',
            fontSize: 10,
            fontFamily: 'monospace',
          }}
        >
          ↻ Refresh
        </button>
        <button
          onClick={() => window.open(camera.snapshotUrl, '_blank')}
          style={{
            flex: 1,
            padding: '5px',
            background: 'transparent',
            border: '1px solid rgba(0,220,255,0.15)',
            color: '#446677',
            borderRadius: 3,
            cursor: 'pointer',
            fontSize: 10,
            fontFamily: 'monospace',
          }}
        >
          ↗ Open direct
        </button>
      </div>
    </div>
  )
}

// KCView — View Mode Filters
// Applied as CSS filter + overlay on the map canvas to replicate
// WorldView's surveillance aesthetic modes.
// Full GLSL shaders can replace these in Phase 3.

import type { ViewMode } from '../types'

export interface ViewModeConfig {
  label: string
  icon: string
  description: string
  canvasFilter: string        // CSS filter applied to map canvas
  overlayClass: string        // CSS class for HTML overlay
  uiTint: string              // CSS color for UI accent
}

export const VIEW_MODES: Record<ViewMode, ViewModeConfig> = {
  'normal': {
    label: 'Standard',
    icon: '👁',
    description: 'Normal visual display',
    canvasFilter: 'none',
    overlayClass: '',
    uiTint: '#00dcff',
  },

  'night-vision': {
    label: 'Night Vision',
    icon: '🌿',
    description: 'NVG green phosphor display',
    // Desaturate, boost brightness, green tint
    canvasFilter: 'grayscale(100%) brightness(1.8) contrast(1.4) sepia(100%) hue-rotate(65deg) saturate(4)',
    overlayClass: 'overlay-nvg',
    uiTint: '#00ff44',
  },

  'thermal': {
    label: 'FLIR Thermal',
    icon: '🌡',
    description: 'False-color thermal infrared',
    // Invert + hue shift to simulate hot=orange/red, cool=blue/purple
    canvasFilter: 'invert(100%) hue-rotate(180deg) saturate(3) contrast(1.3) brightness(0.9)',
    overlayClass: 'overlay-flir',
    uiTint: '#ff6600',
  },

  'crt': {
    label: 'CRT / Radar',
    icon: '📺',
    description: 'Phosphor CRT scan-line display',
    canvasFilter: 'brightness(1.2) contrast(1.5) saturate(0.4) sepia(30%)',
    overlayClass: 'overlay-crt',
    uiTint: '#33ff88',
  },

  'match-day': {
    label: 'Match Day',
    icon: '⚽',
    description: 'FIFA World Cup operational view',
    canvasFilter: 'none',
    overlayClass: 'overlay-matchday',
    uiTint: '#ffcc00',
  },
}

// Injects global CSS for overlay effects
// Call once at app init (or inject into a <style> tag in index.html)
export const VIEW_MODE_CSS = `
/* Night Vision — scanline + green vignette */
.overlay-nvg::before {
  content: '';
  position: fixed; inset: 0; z-index: 999; pointer-events: none;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(0, 255, 50, 0.04) 2px,
    rgba(0, 255, 50, 0.04) 4px
  );
}
.overlay-nvg::after {
  content: '';
  position: fixed; inset: 0; z-index: 999; pointer-events: none;
  background: radial-gradient(ellipse at center,
    transparent 50%,
    rgba(0, 20, 0, 0.6) 100%
  );
}

/* CRT scanlines */
.overlay-crt::before {
  content: '';
  position: fixed; inset: 0; z-index: 999; pointer-events: none;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 3px,
    rgba(0, 0, 0, 0.15) 3px,
    rgba(0, 0, 0, 0.15) 4px
  );
}

/* FLIR — targeting reticle overlay */
.overlay-flir::before {
  content: '';
  position: fixed;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  width: 80px; height: 80px;
  z-index: 999; pointer-events: none;
  border: 1px solid rgba(255, 100, 0, 0.6);
  border-radius: 50%;
  box-shadow: 0 0 0 1px rgba(255, 100, 0, 0.3),
              0 0 30px rgba(255, 80, 0, 0.15);
}

/* Match Day — subtle gold vignette */
.overlay-matchday::after {
  content: '';
  position: fixed; inset: 0; z-index: 999; pointer-events: none;
  background: radial-gradient(ellipse at center,
    transparent 60%,
    rgba(40, 30, 0, 0.35) 100%
  );
}
`

export function getCanvasStyle(mode: ViewMode): React.CSSProperties {
  return {
    filter: VIEW_MODES[mode].canvasFilter,
    transition: 'filter 0.4s ease',
  }
}

/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Phase 2: Google Maps API key for Photorealistic 3D Tiles
  // Add to .env.local: VITE_GOOGLE_MAPS_API_KEY=your_key_here
  readonly VITE_GOOGLE_MAPS_API_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

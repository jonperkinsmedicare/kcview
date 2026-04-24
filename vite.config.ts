import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    // deck.gl needs this
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
  },
  server: {
    port: 5173,
    proxy: {
      // Proxy OpenSky (CORS workaround in dev)
      '/opensky-auth': {
        target: 'https://auth.opensky-network.org',
        changeOrigin: true,
        secure: true,
        rewrite: (p) => p.replace(/^\/opensky-auth/, ''),
      },
      '/proxy/opensky': {
        target: 'https://opensky-network.org',
        changeOrigin: true,
        secure: true,
        rewrite: (p) => p.replace(/^\/proxy\/opensky/, ''),
      },
      // Proxy KC Scout CCTV snapshots (CORS workaround in dev)
      '/proxy/kcscout': {
        target: 'https://www.kcscout.net',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy\/kcscout/, ''),
      },
      // Proxy MoDOT traveler info
      '/proxy/modot': {
        target: 'https://traveler.modot.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy\/modot/, ''),
      },
    },
  },
})

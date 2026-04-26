import { defineConfig } from 'vite'
import path from 'path'
import react from '@vitejs/plugin-react'


export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
  },
  resolve: {
    alias: {
      'mersenne-twister': path.resolve('./node_modules/mersenne-twister/src/mersenne-twister.js'),
    },
  },
  optimizeDeps: {
    include: ['mersenne-twister', 'urijs'],
  },
  build: {
    target: 'es2020',
  },
  server: {
    port: 5173,
    proxy: {
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
      '/proxy/kcscout': {
        target: 'https://www.kcscout.net',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy\/kcscout/, ''),
      },
      '/proxy/modot': {
        target: 'https://traveler.modot.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy\/modot/, ''),
      },
    },
  },
})
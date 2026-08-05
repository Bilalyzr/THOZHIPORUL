import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Pre-bundle heavy dependencies that are imported ONLY by lazily-loaded
  // routes (react-leaflet/leaflet → Parks Explorer; recharts → dashboards;
  // xlsx/jspdf/html2canvas → Report Export Center). Without this, Vite first
  // discovers them mid-session when the lazy route is opened, re-optimizes its
  // dependency cache, and invalidates the in-flight dynamic import — which
  // surfaces as a 500 on the page chunk and a "Failed to fetch dynamically
  // imported module" crash (the Parks page symptom). Including them here forces
  // pre-bundling at dev-server startup so the first visit never re-optimizes.
  optimizeDeps: {
    include: [
      'react-leaflet',
      'leaflet',
      'recharts',
      'xlsx',
      'jspdf',
      'html2canvas',
    ],
  },
})

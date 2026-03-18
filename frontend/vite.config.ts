import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // listen on 0.0.0.0 so other devices can reach via your LAN IP
    port: 5174,
    strictPort: true, // fail if 5173 is occupied so the UI doesn't silently break
    proxy: {
      // Forward API calls to the FastAPI backend.
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      // Forward websocket connections used by the fleet telemetry.
      '/ws': {
        target: 'http://localhost:8000',
        ws: true,
        changeOrigin: true,
      },
    },
  },
})

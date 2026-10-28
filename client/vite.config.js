import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// El cliente siempre llama a /api (mismo origen). En desarrollo Vite reenvía /api
// a la API: http://localhost:4002 por defecto, o API_PROXY_TARGET (Docker: http://api:4002).
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const proxy = {
    '/api': { target: env.API_PROXY_TARGET || 'http://localhost:4002', changeOrigin: false },
  }

  return {
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      port: 5173,
      proxy,
      // Necesario para hot-reload con bind mounts de Docker.
      watch: env.CHOKIDAR_USEPOLLING === 'true' ? { usePolling: true } : undefined,
    },
    preview: {
      host: '0.0.0.0',
      port: 4173,
      proxy,
    },
  }
})

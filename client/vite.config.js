import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Permite acceso desde fuera del contenedor
    port: 5173,
    watch: {
      usePolling: true, // Necesario para hot-reload en Docker
    },
  },
})

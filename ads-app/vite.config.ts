import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Explicitly bind to 0.0.0.0
    allowedHosts: ['all'], // Allow traffic from any host (fixes bad gateway on VPS)
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:3333',
        changeOrigin: true,
      },
    },
  },
})

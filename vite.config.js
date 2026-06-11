import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  // Dev server configuration
  server: {
    port: 5173,
    open: true,
  },

  // Build optimizations
  build: {
    // Chunk splitting for better caching
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/chart.js') || id.includes('node_modules/react-chartjs-2')) {
            return 'vendor-charts';
          }
          if (id.includes('node_modules/jspdf')) {
            return 'vendor-pdf';
          }
        },
      },
    },
    // Target modern browsers
    target: 'es2020',
    // Generate source maps for debugging
    sourcemap: false,
  },

  // Preview (production preview) configuration
  preview: {
    port: 4173,
  },
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    // Redirect all unmatched routes to index.html for React Router
    historyApiFallback: true,
  },
  // Make history API fallback work in preview mode too
  preview: {
    host: '0.0.0.0',
    port: 5173,
  },
})

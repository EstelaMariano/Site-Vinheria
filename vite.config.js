import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/orion': {
        target: 'http://13.221.253.95:1026',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/orion/, ''),
      },
      '/api/iot': {
        target: 'http://13.221.253.95:4041',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/iot/, ''),
      },
      '/api/sth': {
        target: 'http://13.221.253.95:8666',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/sth/, ''),
      },
    },
  },
})

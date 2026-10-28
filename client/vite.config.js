import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In dev, requests to /api are forwarded to the Express server,
// so the browser never hits CORS. Change the port if the backend uses another one.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:4000', changeOrigin: true },
    },
  },
});

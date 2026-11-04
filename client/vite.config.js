import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In dev, requests to /api are forwarded to the Express server,
// so the browser never hits CORS. Change the port if the backend uses another one.
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Library code changes far less often than app code, so keeping it in separate files
        // lets browsers reuse the cached copy after a deploy.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (/node_modules\/(react|react-dom|react-router|react-router-dom|scheduler)\//.test(id)) return 'vendor-react';
          if (/node_modules\/(antd|@ant-design|rc-[^/]+|@rc-component)\//.test(id)) return 'vendor-antd';
          return 'vendor';
        },
      },
    },
    chunkSizeWarningLimit: 1200, // antd is ~1.1 MB minified (345 KB gzipped) and is shared by every page
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.js'],
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:5001', changeOrigin: true },
    },
  },
});

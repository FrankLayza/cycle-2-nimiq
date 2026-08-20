import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

const backendUrl = process.env.VITE_BACKEND_URL ?? 'http://localhost:8080';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      // Dev: REST + WebSocket share the server's single port (D26).
      '/api': { target: backendUrl, changeOrigin: true },
      // Colyseus performs HTTP matchmaking first, then upgrades the returned
      // endpoint to WebSocket. The proxy must support both protocols.
      '/colyseus': { target: backendUrl, changeOrigin: true, ws: true },
    },
  },
  // @snake/sim ships as source (zero-deps TS) — exclude from pre-bundling.
  optimizeDeps: { exclude: ['@snake/sim'] },
  build: { target: 'es2022', sourcemap: true },
});

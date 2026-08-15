import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      // Dev: REST + WebSocket share the server's single port (D26).
      '/api': { target: 'http://localhost:8080', changeOrigin: true },
      '/colyseus': { target: 'ws://localhost:8080', ws: true },
    },
  },
  // @snake/sim ships as source (zero-deps TS) — exclude from pre-bundling.
  optimizeDeps: { exclude: ['@snake/sim'] },
  build: { target: 'es2022', sourcemap: true },
});

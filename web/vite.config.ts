import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    // En desarrollo, /api va al backend local (node tools/server.js), igual que la reescritura de Vercel en producción
    proxy: { '/api': 'http://localhost:3000' },
  },
});

import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import extractHandler from './api/extract';

// En dev local no corren las edge functions de Vercel (y prod está detrás de login),
// así que servimos /api/extract acá mismo con el MISMO handler que se deploya.
const apiExtractDev = (): Plugin => ({
  name: 'api-extract-dev',
  configureServer(server) {
    server.middlewares.use('/api/extract', async (req, res) => {
      try {
        const request = new Request(`http://localhost/api/extract${req.url || ''}`);
        const response = await extractHandler(request);
        res.statusCode = response.status;
        response.headers.forEach((v, k) => res.setHeader(k, v));
        res.end(await response.text());
      } catch (e: any) {
        res.statusCode = 500;
        res.end(JSON.stringify({ error: e?.message || 'dev handler error' }));
      }
    });
  },
});

export default defineConfig({
  plugins: [react(), apiExtractDev()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: { port: 5173, host: true },
  build: {
    target: 'es2020',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          moveable: ['react-moveable'],
          export: ['html-to-image', 'jszip'],
        },
      },
    },
  },
});

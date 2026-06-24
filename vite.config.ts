import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import extractHandler from './api/extract';
import visionHandler from './api/vision';
import assembleHandler from './api/assemble';
import pickCoverHandler from './api/pickCover';

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

// /api/vision (POST con body JSON): leer el body crudo y pasárselo al handler edge.
const apiVisionDev = (): Plugin => ({
  name: 'api-vision-dev',
  configureServer(server) {
    server.middlewares.use('/api/vision', async (req, res) => {
      try {
        const chunks: Buffer[] = [];
        for await (const c of req) chunks.push(c as Buffer);
        const body = Buffer.concat(chunks).toString('utf8');
        const request = new Request('http://localhost/api/vision', {
          method: req.method || 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: body || undefined,
        });
        const response = await visionHandler(request);
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

// /api/assemble (POST con body JSON, fotos incluidas): igual que vision pero otro handler.
const apiAssembleDev = (): Plugin => ({
  name: 'api-assemble-dev',
  configureServer(server) {
    server.middlewares.use('/api/assemble', async (req, res) => {
      try {
        const chunks: Buffer[] = [];
        for await (const c of req) chunks.push(c as Buffer);
        const body = Buffer.concat(chunks).toString('utf8');
        const request = new Request('http://localhost/api/assemble', {
          method: req.method || 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: body || undefined,
        });
        const response = await assembleHandler(request);
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

// /api/pickCover (POST con body JSON, fotos incluidas).
const apiPickCoverDev = (): Plugin => ({
  name: 'api-pickcover-dev',
  configureServer(server) {
    server.middlewares.use('/api/pickCover', async (req, res) => {
      try {
        const chunks: Buffer[] = [];
        for await (const c of req) chunks.push(c as Buffer);
        const body = Buffer.concat(chunks).toString('utf8');
        const request = new Request('http://localhost/api/pickCover', {
          method: req.method || 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: body || undefined,
        });
        const response = await pickCoverHandler(request);
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
  plugins: [react(), apiExtractDev(), apiVisionDev(), apiAssembleDev(), apiPickCoverDev()],
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

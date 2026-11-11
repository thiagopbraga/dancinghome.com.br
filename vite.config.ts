import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';
import { VitePWA } from 'vite-plugin-pwa';

export const SECURITY_HEADERS: Record<string, string> = {
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self' 'wasm-unsafe-eval' https://www.youtube.com https://s.ytimg.com; frame-src https://www.youtube-nocookie.com https://www.youtube.com; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self'; style-src 'self' 'unsafe-inline'",
  'Permissions-Policy': 'camera=(self), microphone=(), geolocation=(), interest-cohort=()',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'Cross-Origin-Opener-Policy': 'same-origin',
};

function cloudflareAssetsPlugin(): Plugin {
  return {
    name: 'ensaio-cloudflare-assets',
    configurePreviewServer(server) {
      server.middlewares.use((_req, res, next) => {
        for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
          res.setHeader(k, v);
        }
        next();
      });
    },
    closeBundle() {
      const distRoot = resolve(process.cwd(), 'dist');
      mkdirSync(distRoot, { recursive: true });
      const srcHeaders = resolve(process.cwd(), 'public/_headers');
      if (existsSync(srcHeaders)) {
        copyFileSync(srcHeaders, resolve(distRoot, '_headers'));
      }
    },
  };
}

export default defineConfig({
  base: '/jogar/',
  build: {
    outDir: 'dist/jogar',
    emptyOutDir: true,
    target: 'es2022',
    chunkSizeWarningLimit: 1500,
  },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: null,
      includeAssets: ['icon.svg', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'Ensaio de Dança',
        short_name: 'Ensaio',
        description: 'Jogo de dança com a câmera, para brincar em casa.',
        lang: 'pt-BR',
        start_url: '/jogar/',
        scope: '/jogar/',
        display: 'fullscreen',
        orientation: 'landscape',
        background_color: '#2a1052',
        theme_color: '#2a1052',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,wasm,task,webmanifest}'],
        maximumFileSizeToCacheInBytes: 40 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
      },
    }),
    cloudflareAssetsPlugin(),
  ],
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
  },
});

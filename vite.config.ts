import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { extname, join, resolve } from 'node:path';
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

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.json': 'application/json; charset=utf-8',
};

function serveSiteMiddleware(req: IncomingMessage, res: ServerResponse, next: () => void): void {
  const rawUrl = req.url ?? '/';
  const pathname = rawUrl.split('?')[0] || '/';
  if (pathname.startsWith('/jogar') || pathname.startsWith('/api') || pathname.startsWith('/@')) {
    next();
    return;
  }
  const siteDir = resolve(process.cwd(), 'site');
  const publicDir = resolve(process.cwd(), 'public');
  const candidates: string[] = [];
  if (pathname === '/') {
    candidates.push(join(siteDir, 'index.html'));
  } else {
    const clean = pathname.replace(/^\/+|\/+$/g, '');
    candidates.push(
      join(siteDir, clean),
      join(siteDir, `${clean}.html`),
      join(siteDir, clean, 'index.html'),
      join(publicDir, clean),
    );
  }
  for (const file of candidates) {
    if (existsSync(file) && statSync(file).isFile()) {
      const ext = extname(file);
      res.statusCode = 200;
      res.setHeader('Content-Type', MIME_TYPES[ext] ?? 'application/octet-stream');
      res.end(readFileSync(file));
      return;
    }
  }
  next();
}

function cloudflareAssetsPlugin(): Plugin {
  return {
    name: 'ensaio-cloudflare-assets',
    configureServer(server) {
      server.middlewares.use(serveSiteMiddleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use((_req, res, next) => {
        for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
          res.setHeader(k, v);
        }
        next();
      });
      server.middlewares.use(serveSiteMiddleware);
    },
    closeBundle() {
      const distRoot = resolve(process.cwd(), 'dist');
      mkdirSync(distRoot, { recursive: true });
      const siteDir = resolve(process.cwd(), 'site');
      if (existsSync(siteDir)) {
        cpSync(siteDir, distRoot, { recursive: true });
        for (const cleanPage of ['privacidade', 'contribuir', 'placar']) {
          const srcHtml = resolve(siteDir, `${cleanPage}.html`);
          if (existsSync(srcHtml)) {
            const subDir = resolve(distRoot, cleanPage);
            mkdirSync(subDir, { recursive: true });
            copyFileSync(srcHtml, resolve(subDir, 'index.html'));
          }
        }
      }
      for (const pubFile of ['_headers', 'icon.svg', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png']) {
        const src = resolve(process.cwd(), 'public', pubFile);
        if (existsSync(src)) {
          copyFileSync(src, resolve(distRoot, pubFile));
        }
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

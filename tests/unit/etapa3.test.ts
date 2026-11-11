import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { YOUTUBE_HOST } from '../../src/core/youtube';
import { SECURITY_HEADERS } from '../../vite.config';

describe('etapa 3: configuração Cloudflare, base /jogar/, youtube-nocookie e CSP', () => {
  it('usa o domínio youtube-nocookie.com para o player do YouTube', () => {
    expect(YOUTUBE_HOST).toBe('https://www.youtube-nocookie.com');
  });

  it('define wrangler.jsonc com static assets em ./dist e roteamento /api/*', () => {
    const raw = readFileSync(resolve(process.cwd(), 'wrangler.jsonc'), 'utf8');
    const cfg = JSON.parse(raw) as {
      name: string;
      main: string;
      assets: {
        directory: string;
        binding: string;
        not_found_handling: string;
        run_worker_first: string[];
      };
    };
    expect(cfg.name).toBe('ensaio-de-danca');
    expect(cfg.main).toBe('worker/index.ts');
    expect(cfg.assets).toEqual({
      directory: './dist',
      binding: 'ASSETS',
      not_found_handling: '404-page',
      run_worker_first: ['/api/*'],
    });
  });

  it('define cabeçalhos de segurança e CSP em public/_headers compatíveis com MediaPipe e YouTube', () => {
    const headersPath = resolve(process.cwd(), 'public/_headers');
    expect(existsSync(headersPath)).toBe(true);
    const content = readFileSync(headersPath, 'utf8');
    expect(content).toContain("Content-Security-Policy: default-src 'self'");
    expect(content).toContain("'wasm-unsafe-eval'");
    expect(content).toContain('https://www.youtube-nocookie.com');
    expect(content).toContain('Permissions-Policy: camera=(self), microphone=(), geolocation=(), interest-cohort=()');
    expect(content).toContain('Referrer-Policy: no-referrer');
    expect(content).toContain('X-Content-Type-Options: nosniff');
    expect(content).toContain('Cross-Origin-Opener-Policy: same-origin');
    expect(SECURITY_HEADERS['Referrer-Policy']).toBe('no-referrer');
    expect(SECURITY_HEADERS['X-Content-Type-Options']).toBe('nosniff');
  });

  it('index.html usa caminhos relativos ao base (/jogar/)', () => {
    const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');
    expect(html).toContain('href="./icon.svg"');
    expect(html).toContain('href="./apple-touch-icon.png"');
  });
});

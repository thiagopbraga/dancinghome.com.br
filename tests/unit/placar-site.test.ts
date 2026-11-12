import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

describe('Placar no site (/ e /placar) e painel de moderação (/admin/) — Etapas 7 e 8', () => {
  it('inclui site/site.js, site/placar.html e site/admin/index.html sem scripts de terceiros', () => {
    for (const rel of ['site/site.js', 'site/placar.html', 'site/admin/index.html']) {
      const p = resolve(root, rel);
      expect(existsSync(p)).toBe(true);
      const txt = readFileSync(p, 'utf-8');
      expect(txt).not.toMatch(/googletagmanager|google-analytics|facebook\.net|hotjar/i);
    }
  });

  it('usa apenas criação segura de DOM (textContent / createTextNode) em site/site.js, sem innerHTML', () => {
    const js = readFileSync(resolve(root, 'site/site.js'), 'utf-8');
    expect(js).not.toContain('innerHTML');
    expect(js).toContain('/api/destaques');
    expect(js).toContain('/api/placar');
    expect(js).toContain('/api/admin/pontuacoes');
  });

  it('contém filtros para as 3 músicas públicas, 2 níveis e 2 períodos em site/placar.html', () => {
    const html = readFileSync(resolve(root, 'site/placar.html'), 'utf-8');
    expect(html).toContain('data-filtro-musica="ensaio-aquecimento"');
    expect(html).toContain('data-filtro-musica="ensaio-brisa"');
    expect(html).toContain('data-filtro-musica="ensaio-festa"');
    expect(html).toContain('data-filtro-nivel="facil"');
    expect(html).toContain('data-filtro-nivel="normal"');
    expect(html).toContain('data-filtro-periodo="semana"');
    expect(html).toContain('data-filtro-periodo="sempre"');
    expect(html).toContain('Dance e apareça aqui!');
  });

  it('contém estrutura de moderação em site/admin/index.html com meta robots noindex', () => {
    const html = readFileSync(resolve(root, 'site/admin/index.html'), 'utf-8');
    expect(html).toContain('noindex, nofollow');
    expect(html).toContain('id="admin-painel"');
    expect(html).toContain('id="admin-musicas-lista"');
    expect(html).toContain('id="admin-pontuacoes-lista"');
  });
});

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function readSite(file: string): string {
  const p = resolve(process.cwd(), 'site', file);
  expect(existsSync(p)).toBe(true);
  return readFileSync(p, 'utf8');
}

describe('etapa 4: site de apresentação, política de privacidade e página de contribuição', () => {
  it('tem todas as páginas estáticas e folha de estilos local', () => {
    for (const f of ['index.html', 'privacidade.html', 'contribuir.html', '404.html', 'site.css']) {
      expect(readSite(f).length).toBeGreaterThan(200);
    }
  });

  it('não carrega nenhuma fonte, script, folha de estilo ou imagem de domínio externo', () => {
    for (const f of ['index.html', 'privacidade.html', 'contribuir.html', '404.html']) {
      const html = readSite(f);
      const tags = html.match(/<(?:script|link|img|iframe|source)\b[^>]*>/gi) ?? [];
      for (const tag of tags) {
        expect(tag).not.toMatch(/(?:src|href)=["']https?:\/\//i);
      }
    }
    const css = readSite('site.css');
    expect(css).not.toMatch(/@import/i);
    expect(css).not.toMatch(/url\(\s*["']?https?:\/\//i);
  });

  it('a página inicial tem hero, 3 passos ilustrados em código, privacidade, pais, código aberto e rodapé', () => {
    const index = readSite('index.html');
    expect(index).toContain('lang="pt-BR"');
    expect(index).toContain('Dance em casa com a câmera do celular. Sem login, sem anúncio, sem enviar imagem.');
    expect(index).toContain('href="/jogar/"');
    expect(index).toContain('Jogar agora');
    expect(index).toContain('Destaques da semana');
    expect(index).toContain('Dance e apareça aqui!');
    expect(index).toContain('Apoie o celular');
    expect(index).toContain('Imite a pose');
    expect(index).toContain('Ganhe estrelas');
    expect(index.match(/<svg\b/g)?.length ?? 0).toBeGreaterThanOrEqual(4);
    expect(index).toContain('A câmera não sai do aparelho');
    expect(index).toContain('Não tem conta nem rastreio');
    expect(index).toContain('O placar é opcional');
    expect(index).toContain('Pausa para beber água');
    expect(index).toContain('Modo Dupla e Estátua');
    expect(index).toContain('href="/privacidade"');
    expect(index).toContain('href="/contribuir"');
    expect(index).toContain('sem nenhuma relação com');
  });

  it('a política de privacidade traz o resumo em 3 frases para crianças e os 10 pontos da seção 8.2', () => {
    const priv = readSite('privacidade.html');
    expect(priv).toContain('Para crianças (em 3 frases)');
    expect(priv).toContain('1. Quem é o responsável');
    expect(priv).toContain('2. A câmera');
    expect(priv).toContain('3. O que fica guardado no seu aparelho');
    expect(priv).toContain('4. O placar online (opcional)');
    expect(priv).toContain('5. Dados técnicos e hospedagem');
    expect(priv).toContain('6. Cookies e serviços de terceiros');
    expect(priv).toContain('www.youtube-nocookie.com');
    expect(priv).toContain('7. Prazo de retenção das pontuações');
    expect(priv).toContain('90 dias');
    expect(priv).toContain('8. Como pedir para apagar uma pontuação');
    expect(priv).toContain('9. Proteção de crianças (LGPD, COPPA e GDPR)');
    expect(priv).toContain('10. Mudanças nesta política');
  });

  it('respeita acessibilidade (pular para conteúdo, foco visível e prefers-reduced-motion)', () => {
    const index = readSite('index.html');
    expect(index).toContain('href="#conteudo-principal"');
    expect(index).toContain('<main id="conteudo-principal">');
    const css = readSite('site.css');
    expect(css).toContain('prefers-reduced-motion: reduce');
    expect(css).toContain(':focus-visible');
  });
});

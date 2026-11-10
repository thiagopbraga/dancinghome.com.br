# DECISIONS — escolhas feitas durante a construção

Cada linha é uma decisão que o plano não fechava, com a justificativa.

## Etapa 0

- **TypeScript 6.0.3 em vez da 7.x.** O `typescript-eslint` 8.72 só aceita TypeScript abaixo de 6.1; a 6.0 é a mais nova compatível com o lint exigido no `npm run check`.
- **`@playwright/test` 1.63.0.** É a versão que casa com o Chromium já instalado no ambiente de construção; num clone limpo, rode `npx playwright install chromium` uma vez.
- **Modelos e wasm do MediaPipe fora do git.** São ~44 MB; `npm run setup:mediapipe` copia e baixa tudo para `public/mediapipe/`, como o plano pede.
- **Ícones do PWA gerados por script (`scripts/make-icons.mjs`).** Mantém a regra de "todo visual gerado em código" e dá PNG para o iPhone, que não aceita SVG na tela de início.
- **Os testes ponta a ponta rodam em dois servidores.** O servidor de desenvolvimento (porta 5173) para tudo que usa `?sim=1` e `window.__ensaio`, e o build de produção (porta 4173) só para o teste offline, porque o service worker e a ausência de `__ensaio` só existem no build.
- **`docs/musicas-e-poses.md` e `docs/plano-do-jogo.md` foram transcritos dos documentos originais** (os links das fontes de BPM viraram texto simples).

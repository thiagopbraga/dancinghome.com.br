# Software e Conteúdo de Terceiros

Este documento descreve as dependências de terceiros utilizadas pelo **Ensaio de Dança** e as regras sobre mídia e marcas externas.

## 1. Declaração de Não Afiliação

**Ensaio de Dança** é um projeto independente e de código aberto. Não possui nenhuma relação, patrocínio ou endosso da Netflix, Sony Pictures Animation, gravadoras ou dos artistas citados como referência de ritmo para uso doméstico.

## 2. Bibliotecas e Modelos de Código Aberto

| Componente | Licença | Uso no projeto |
|---|---|---|
| [`@mediapipe/tasks-vision`](https://github.com/google-ai-edge/mediapipe) e modelos `pose_landmarker_*.task` | Apache-2.0 | Detecção de pontos do corpo (Pose Landmarker) localmente no navegador. Os arquivos `.wasm` e `.task` são baixados no momento do build (`npm run setup:mediapipe`) e não são versionados no Git. |
| [`idb`](https://github.com/jakearchibald/idb) | ISC | Armazenamento local no IndexedDB do navegador. |
| [`zod`](https://github.com/colinhacks/zod) | MIT | Validação de esquemas JSON de poses, coreografias, progresso e API. |
| [`vite`](https://github.com/vitejs/vite), [`vite-plugin-pwa`](https://github.com/vite-pwa/vite-plugin-pwa), [`workbox-window`](https://github.com/GoogleChrome/workbox) | MIT | Empacotamento e service worker para funcionamento offline (PWA). |
| [`typescript`](https://github.com/microsoft/TypeScript), [`eslint`](https://github.com/eslint/eslint), [`vitest`](https://github.com/vitest-dev/vitest), [`@playwright/test`](https://github.com/microsoft/playwright) | Apache-2.0 / MIT | Ferramentas de desenvolvimento, verificação de tipos, lint e testes automatizados. |

As versões exatas e árvores completas de pacotes constam em `package.json` e `package-lock.json`.

## 3. O que fica fora do repositório e do build

- **Áudio de músicas de terceiros:** Nunca entra no repositório nem na publicação. As faixas que vêm prontas para tocar no jogo público são 100% sintetizadas em código (`src/core/demoSong.ts`). Arquivos MP3/M4A/WAV para o pacote de exemplo doméstico são carregados pelo próprio adulto na Área dos Pais e ficam exclusivamente no IndexedDB do aparelho. **Pull requests com áudio, letra ou imagem protegidos por direitos autorais são recusados.**
- **Vídeos do YouTube:** O jogo não distribui nem sugere vídeos específicos. Quando o adulto opta por colar um link na Área dos Pais, o jogo usa a API oficial de IFrame Player do YouTube (`www.youtube-nocookie.com`).
- **Personagens, logos e artes:** Não há nenhuma imagem, personagem ou logo de filmes ou séries no repositório. Todo o visual do jogo e do site (idols, pets, cartões de pose, cenários e ícones) é original e desenhado em código (Canvas 2D e SVG).

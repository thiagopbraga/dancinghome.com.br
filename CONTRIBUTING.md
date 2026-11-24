# Como Contribuir com o Ensaio de Dança

Obrigado pelo interesse em contribuir! O **Ensaio de Dança** é um jogo infantil feito para rodar no navegador com foco total em privacidade, acessibilidade e reforço positivo.

> *Contributions in English (issues, pull requests, and code comments) are also very welcome!*

---

## 1. Regras Inegociáveis do Projeto

Todo pull request precisa respeitar estas regras:

1. **Zero mídia ou marcas de terceiros:** Nada de arquivos de áudio protegidos, letras de músicas, fotos, imagens, personagens ou logotipos de filmes/séries/artistas. Todo visual é original e desenhado em código (Canvas 2D ou SVG).
2. **Privacidade em primeiro lugar:** Nenhum envio de dados novo sem revisão explícita de privacidade. Todo `fetch` novo precisa ser justificado na descrição do PR.
3. **Sem rastreio ou CDNs externas:** Nenhuma dependência que faça analytics, telemetria, gravação de cookies de rastreio ou que carregue scripts/fontes de CDNs de terceiros.
4. **Tom 100% positivo para a criança:** Toda mensagem exibida ou narrada para a criança deve ser encorajadora e em português do Brasil. Não existe "game over" nem derrota; a nota mínima é sempre **1 estrela**.
5. **Proibido usar imagens de pessoas reais nos testes:** Nunca anexe ou versione fotos ou vídeos de pessoas reais (especialmente crianças) em issues, PRs ou testes. Use sempre a pose simulada (`?sim=1`).
6. **Observabilidade mínima no Worker:** Logs do Cloudflare Worker nunca podem registrar endereço IP, cabeçalhos HTTP ou corpo da requisição — apenas rota, status e tempo de execução.

---

## 2. Ambiente de Desenvolvimento

### Pré-requisitos

- **Node.js** `>= 20.19.0`
- **npm**

### Instalação e execução

```bash
npm ci
npm run setup:mediapipe   # copia o wasm e baixa os modelos de pose para public/mediapipe/
npm run dev               # abre o servidor local em http://localhost:5173
```

Para desenvolver e testar sem precisar de webcam nem dançar na frente do computador, use os parâmetros de URL do modo de desenvolvimento:

| Parâmetro | Para que serve |
|---|---|
| `?sim=1` | Substitui a câmera por uma pessoa simulada que executa as poses |
| `?debug=1` | Mostra painel com FPS, visibilidade e os 8 ângulos medidos ao vivo |
| `?cena=danca` | Abre direto numa cena (`metronomo`, `esqueleto`, `danca`, `pais`, ...) |
| `?semvoz=1` | Desliga a síntese de voz e mostra as falas como legenda na tela |
| `?fim=16` | Encerra a música na batida indicada (para testes rápidos) |
| `?pessoas=2` | Simula duas pessoas na câmera (modo Dupla) |

### Rodando o Worker e o banco D1 localmente

Quando estiver mexendo na API do placar (`worker/`) ou no site completo servido pelo Worker:

```bash
npm run build
npx wrangler d1 migrations apply DB --local
npx wrangler dev
```

---

## 3. Verificação e Testes

Antes de abrir um PR, garanta que todos os testes passam:

```bash
npm run check      # TypeScript (tsc --noEmit), ESLint, testes de unidade (Vitest) e build
npm run test:e2e   # Testes ponta a ponta no Playwright (Chromium)
```

Na primeira vez que rodar o Playwright, instale o navegador de teste com:

```bash
npx playwright install chromium
```

- Nunca desligue, pule (`test.skip`) ou afrouxe um teste existente para fazer o CI passar.
- Não deixe `TODO` ou `FIXME` no começo de comentários (o ESLint bloqueia).

---

## 4. Como Propor uma Pose ou Coreografia Nova

### Propor uma pose nova (`src/data/poses/catalog.json`)

Cada pose usa até 8 ângulos em 2D (`lShoulder`, `rShoulder`, `lElbow`, `rElbow`, `lHip`, `rHip`, `lKnee`, `rKnee`), medidos de `0` a `180` graus:

- **Nível `facil`:** deve cobrar apenas ângulos de braços (`*Shoulder` e `*Elbow`), para funcionar mesmo quando a câmera não enxerga os pés.
- **Nível `normal`:** pode incluir pernas (`*Hip` e `*Knee`).
- **Ergonomia:** evite poses que dependam de profundidade (braço apontado direto para a lente) ou que tirem o rosto da criança da direção da tela.
- Adicione a pose em `src/data/poses/catalog.json` com `nome`, `nivel`, `angles` e `descricao`, e rode `npm run check` para validar o esquema Zod e os testes de esqueleto (`tests/unit/angles.test.ts`).

### Propor uma coreografia ou música livre nova (`src/data/songs/<id>/choreo.json`)

- **Ritmo seguro (6 a 9 anos):** no nível `facil`, o intervalo entre poses deve ficar entre **2,0 s e 3,4 s** (e o trecho deve durar de 60 a 90 s, usando apenas poses `facil`); no nível `normal`, o intervalo deve ser de pelo menos **1,0 s**.
- A primeira pose nunca pode cair antes da batida 4 (`beat >= 4`).
- Para músicas públicas (que entram no placar online), o áudio deve ser sintetizado em código (`src/core/demoSong.ts`) ou ter licença aberta compatível (CC0 / CC BY 4.0) documentada em `TERCEIROS.md`.

---

## 5. Padrão de Commits e Pull Requests

- Faça commits pequenos e claros em português (ex.: `feat: adiciona pose ...`, `fix: corrige ...`, `docs: ...`).
- Preencha o checklist do template de Pull Request.
- Todo PR passa pelo CI (`npm run check` + Playwright) e pela revisão via `CODEOWNERS`.

Ao enviar uma contribuição, você concorda em licenciá-la sob os mesmos termos do projeto: [MIT](./LICENSE) para código e [CC BY 4.0](./LICENSE-CONTEUDO.md) para documentação, poses e coreografias.

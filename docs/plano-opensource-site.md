# Ensaio de Dança: plano para abrir o código, receber contribuições e lançar o site com placar

2026-11-10 · plano, nada implementado ainda

Este documento diz o que fazer, em que ordem e por quê, para:

1. deixar o repositório aberto (open source);
2. receber contribuições de outras pessoas;
3. publicar um site de apresentação do jogo;
4. mostrar um placar (scoreboard) na abertura do site;
5. hospedar tudo na Cloudflare (site e jogo como arquivos estáticos, API num Worker, dados no D1);
6. manter o jogo "100% privacidade": sem login, sem cookie de rastreio, só um apelido no placar.

As decisões que dependem de você estão juntas na seção 9. Para cada uma há uma recomendação, e o plano já segue a recomendação; se você escolher outra coisa, só a etapa indicada muda.

---

## 1. Ponto de partida

O que o repositório tem hoje, e que muda o plano:

- **O jogo não tem servidor.** Tudo roda no aparelho (MediaPipe local, progresso no IndexedDB, PWA offline). O placar é a primeira coisa que manda dados para fora. Por isso ele entra como opcional e desligado por padrão.
- **A pontuação é calculada no aparelho** (`src/core/stars.ts` e `src/core/judge.ts`): cada pose vale até 100 pontos ("Perfeito") mais até 20 de energia. O servidor nunca vê a câmera, então não tem como provar que a dança aconteceu. Ele só consegue recusar o que é impossível (seção 7.4).
- **As cinco músicas são de Guerreiras do K-pop** (Brilho, Meu Pequeno Guaraná, O Som da Nossa Voz, Letal, Não Tem Perdão). O repositório não traz áudio, letra nem imagem do filme, só os títulos, BPMs e coreografias originais em `src/data/songs/`. O `docs/plano-do-jogo.md` já anotava o risco: "Para publicar, só faixas livres de direitos".
- **O link do YouTube** usa a API oficial de player, carregada de `www.youtube.com`. O YouTube grava cookies quando o player carrega.
- **Os documentos em `docs/`** falam de "uma menina de 7 anos" e dos gostos dela. Não há nome, foto nem cidade. Os screenshots em `tests/e2e/screens/` são da pose simulada, sem câmera de verdade.
- **A publicação está preparada para a Vercel** (`vercel.json`), e nada foi publicado.
- **Autoria do histórico:** commits seus e do Claude, com e-mails `noreply`. Nada a limpar.

---

## 2. Arquitetura proposta

```
                    ensaiodedanca.<seu-domínio>
                               │
                    ┌──────────▼───────────┐
                    │ Worker único          │
                    │  (Workers + assets)   │
                    │                       │
   GET /            │  site (estático)      │──► página de apresentação + placar na abertura
   GET /jogar/      │  jogo (estático, PWA) │──► o jogo de hoje, com outro caminho base
   GET /api/placar  │  API (código)         │──► lê o D1 (com cache de 60 s)
   POST /api/...    │                       │──► valida, limita e grava no D1
                    └──────────┬────────────┘
                               │ binding DB
                        ┌──────▼──────┐
                        │  D1 (SQLite) │  apelidos gerados, pontuações, fichas de partida
                        └─────────────┘
```

**Recomendação: um Worker só, com "static assets"**, servindo site, jogo e API no mesmo domínio. Hoje a Cloudflare recomenda Workers com assets estáticos para projetos novos (o Pages continua funcionando e tem Pages Functions). Um Worker só dá:

- um deploy, uma configuração (`wrangler.jsonc`) e um domínio;
- API no mesmo endereço do site, sem CORS;
- o mesmo build roda localmente com `wrangler dev`, com D1 local.

**Alternativa equivalente:** Cloudflare Pages para os estáticos e Pages Functions em `functions/api/` para a API, com o D1 ligado ao projeto Pages. Se preferir o Pages (deploy automático pelo GitHub com preview por PR é o forte dele), a única diferença é a etapa 5: o código da API vai para `functions/` em vez de `worker/`. Os previews por PR também existem no Workers Builds.

**Onde mora cada coisa no repositório (monorepo simples, sem ferramenta nova):**

```
/                   jogo (como hoje: src/, public/, tests/)
site/               página de apresentação (Vite multi-página, HTML + TS, sem framework)
worker/             código da API (TypeScript, roteador mínimo, sem dependência de framework)
worker/migrations/  migrações do D1 (SQL numerado)
wrangler.jsonc      configuração do Worker, assets e binding do D1
```

O build gera `dist/` com o site na raiz e o jogo em `dist/jogar/`. O jogo passa a usar `base: '/jogar/'` no Vite, e o PWA fica com escopo `/jogar/`: quem "adiciona à tela inicial" instala só o jogo, e o service worker do jogo não intercepta o site nem a API.

**Por que o jogo em `/jogar/` e não num subdomínio:** um domínio só, um certificado, nenhum CORS. Se você preferir `jogar.<domínio>`, funciona igual com duas rotas no mesmo Worker.

---

## 3. Ordem de execução

Cada etapa termina com algo verificável e pode virar um PR. As etapas 1 e 2 não dependem da Cloudflare; dá para abrir o repositório antes de existir site.

| # | Etapa | Depende de | Pronto quando |
|---|---|---|---|
| 0 | Suas decisões (seção 9) | — | Licença, músicas, domínio e apelido decididos |
| 1 | Preparar o repositório para abrir | 0 | Arquivos da seção 4 no `main`, CI verde, revisão de conteúdo feita |
| 2 | Tornar público e abrir contribuições | 1 | Repositório público, regras de branch, issues "boa primeira contribuição" |
| 3 | Mover a hospedagem para a Cloudflare (só estáticos) | 0 | Jogo em `https://<domínio>/jogar/` com câmera e offline funcionando |
| 4 | Site de apresentação (sem placar) | 3 | `/` no ar, com Lighthouse ≥ 95 em acessibilidade e sem nenhuma requisição a terceiros |
| 5 | API e D1 | 3 | `GET /api/placar` e `POST` de pontuação funcionando no ambiente de teste, com testes |
| 6 | Placar no jogo (opcional, com porteira dos pais) | 5 | Com o placar ligado na Área dos Pais, a pontuação aparece no site; desligado, nenhuma requisição sai |
| 7 | Placar na abertura do site | 4, 5 | Top da semana visível na hero, com cache e estado vazio |
| 8 | Privacidade, moderação e lançamento | 6, 7 | Política publicada, painel de moderação protegido, checklist da seção 8 completo |

Esforço estimado, no ritmo de fins de semana: etapas 1 e 2 em 1 fim de semana; 3 e 4 em 1; 5 a 7 em 2; 8 em 1.

---

## 4. Etapa 1: preparar o repositório para abrir

### 4.1 Licença

**Recomendação: MIT para o código e CC BY 4.0 para documentos e coreografias.**

- **MIT** é curta, conhecida e não assusta quem quer contribuir ou reaproveitar. Bom para um projeto pessoal que você quer que se espalhe.
- **CC BY 4.0** cobre o que não é código: `docs/`, catálogo de poses (`src/data/poses/catalog.json`) e coreografias (`src/data/songs/*/choreo.json`). Pede crédito e permite reuso.
- **Alternativa se você quiser que melhorias voltem abertas:** AGPL-3.0 no código (obriga quem hospedar uma versão modificada a publicar o código, inclusive da API). É mais protetora e afasta algumas empresas e contribuições. Para um jogo infantil feito em casa, a MIT costuma ser a escolha que dá menos atrito.

Arquivos:

- `LICENSE` (MIT, com "Copyright (c) 2026 Thiago Braga e contribuidores").
- `LICENSE-CONTEUDO.md` dizendo quais pastas são CC BY 4.0.
- `"license": "MIT"` no `package.json` e remover `"private": true` só se for publicar no npm (não precisa; pode manter).

### 4.2 Terceiros: o que está no repositório e o que fica fora

Criar `TERCEIROS.md` (ou `THIRD_PARTY_NOTICES.md`) listando:

| Item | Situação | O que fazer |
|---|---|---|
| `@mediapipe/tasks-vision` e os modelos `.task` | Apache-2.0, baixados no build, não versionados | Citar licença e origem; manter fora do git (já está no `.gitignore`) |
| `idb`, `zod`, Vite, Workbox etc. | MIT/ISC/Apache | Basta o `package-lock.json`; opcional gerar lista com `npx license-checker` no CI |
| Áudio das músicas | Nunca está no repositório nem no build | Deixar escrito no README e no CONTRIBUTING: **PR com áudio, letra ou imagem de terceiros é recusado** |
| Títulos e BPMs das 5 músicas do filme | Estão no código | Ver decisão D2 (seção 9) |
| Vídeos do YouTube | O jogo não traz nenhum id; o adulto cola o link | Manter assim; o site não deve sugerir vídeos específicos |
| Personagens, logos e visual do filme | Não existem no repositório | Manter a regra do plano: todo visual é original e desenhado em código |

**Sobre as cinco músicas (recomendação para a decisão D2):** a coreografia é original e não há áudio nem letra, então ter os títulos no código é de baixo risco. O risco cresce quando há um **site público com placar por música** usando "Brilho", "Guerreiras do K-pop" etc.: isso parece produto associado ao filme e é o tipo de coisa que recebe notificação de marca ou de direitos autorais. Por isso o plano recomenda:

1. O jogo público vem com a música **"Aquecimento" (sintetizada, já original)** e mais 2 ou 3 músicas originais ou livres de direitos (ver seção 4.6).
2. As cinco coreografias do filme continuam no repositório como **"pacote de exemplo para uso em casa"**, carregadas só pela Área dos Pais, com títulos neutros no código (`kpop-1` … `kpop-5`) e o nome real só como texto que o adulto edita. Assim o jogo continua igual para vocês em casa.
3. **O placar só aceita as músicas originais ou livres.** Nada do filme aparece no site.
4. Um aviso no README: "Projeto independente, sem relação com Netflix, Sony ou os artistas. Não inclui nem distribui músicas de terceiros."

### 4.3 Revisão de conteúdo antes de abrir

- `docs/`: decidir (D5) se os três documentos de origem ficam públicos. Eles contam os gostos da sua filha (K-pop, patins, bicicleta, cachorros, gatos). Não é dado sensível, mas é sobre uma criança real. Recomendação: manter `plano-de-construcao.md` (é útil para quem contribui), trocar "uma menina de 7 anos que gosta de…" por "crianças de 6 a 9 anos" nos outros dois, ou mover os dois para fora do repositório. Não precisa reescrever o histórico do git, porque não há dado pessoal identificável; se você quiser apagar do histórico, o caminho é `git filter-repo` **antes** de tornar público.
- `tests/e2e/screens/`: são capturas da pose simulada, sem câmera. Podem ficar.
- Rodar uma varredura de segredos antes de abrir (o GitHub faz isso sozinho quando o repositório fica público; dá para rodar antes com `gitleaks detect`). Hoje não há nenhuma chave no código.

### 4.4 Arquivos da comunidade

Todos em português, com uma frase em inglês no topo do README dizendo que contribuições em inglês também são bem-vindas.

| Arquivo | Conteúdo |
|---|---|
| `README.md` | Ajustar: o que é, link do site e do jogo, screenshot, como rodar, como contribuir, licença, aviso de não afiliação, seção "Privacidade" curta com link para a política |
| `CONTRIBUTING.md` | Como rodar (`npm ci`, `npm run setup:mediapipe`, `npm run dev`, `?sim=1`), como testar (`npm run check`, `npm run test:e2e`), padrão de commit e de PR, regras do projeto (abaixo), como propor uma pose ou uma coreografia nova, como rodar a API localmente (`wrangler dev`) |
| `CODE_OF_CONDUCT.md` | Contributor Covenant 2.1 em português, com o contato de denúncia (D6) |
| `SECURITY.md` | Como reportar falha: "Private vulnerability reporting" do GitHub (ativar em Settings → Security). Prazo de resposta, o que está no escopo (API, placar, dados) |
| `.github/ISSUE_TEMPLATE/bug.yml` | Aparelho, navegador, passos, o que esperava; aviso: **não anexe vídeo ou foto de criança** |
| `.github/ISSUE_TEMPLATE/ideia.yml` | Ideia de pose, música, modo de jogo |
| `.github/ISSUE_TEMPLATE/config.yml` | Desligar issue em branco; link para Discussions e para o SECURITY.md |
| `.github/pull_request_template.md` | O que muda, como testei, checklist (abaixo) |
| `.github/CODEOWNERS` | `* @thiagopbraga` (você revisa tudo) |
| `.github/workflows/ci.yml` | `npm ci`, `npm run check`, Playwright em Chromium; depois, testes do Worker |
| `.github/dependabot.yml` | npm e GitHub Actions, semanal, agrupado |

**Regras do projeto que entram no CONTRIBUTING e no checklist do PR:**

- Nada de áudio, letra, imagem, personagem ou logo de terceiros.
- Nenhum envio de dados novo sem passar pela seção de privacidade (todo `fetch` novo precisa ser explicado no PR).
- Nenhuma dependência que faça rastreio, analytics ou carregue script de CDN.
- Toda mensagem para a criança é positiva; nota mínima continua 1 estrela.
- Imagens de pessoas reais nos testes: proibido. Use `?sim=1`.

### 4.5 CI

O `npm run check` já faz tipos, lint, unidade e build. O CI roda isso e o Playwright em todo PR. O `setup:mediapipe` baixa modelos do Google Storage; no CI, guardar em cache (`actions/cache` com a chave da versão do `@mediapipe/tasks-vision`) para não baixar a cada execução.

### 4.6 Músicas livres para a versão pública

Opções, da mais simples para a mais trabalhosa:

1. **Sintetizar em código**, como o "Aquecimento" (`src/core/demoSong.ts`). Zero risco de direito, funciona offline, fica pequeno. Dá para fazer 2 ou 3 faixas com BPMs diferentes (100, 120, 140).
2. **Faixas CC0 ou CC BY** de bibliotecas abertas, versionadas em `public/musicas/` com o crédito em `TERCEIROS.md`. Conferir a licença de cada faixa individualmente.
3. **Pedir para a comunidade** compor e doar faixas com CC BY 4.0, via issue com template.

O placar só existe para músicas desta lista.

---

## 5. Etapa 2: abrir e permitir contribuições

1. Settings → General → **Change visibility → Public**.
2. Settings → Code security: ativar **Private vulnerability reporting**, **Dependabot alerts**, **Secret scanning** e **Push protection**.
3. Settings → Branches → regra para `main` (ou Ruleset): exigir PR, exigir CI verde, exigir 1 aprovação (a sua, via CODEOWNERS), proibir force push. Isso muda o fluxo de hoje (commit direto na `main`): a partir daqui, tudo por PR, inclusive o seu.
4. Settings → Actions: "Require approval for all outside collaborators" para workflows de forks (evita que um PR de fora rode código no CI com acesso a segredos; o deploy nunca roda em PR de fork).
5. Ativar **Discussions** (dúvidas e ideias ficam fora das issues).
6. Criar etiquetas: `boa primeira contribuição`, `ajuda bem-vinda`, `pose`, `coreografia`, `acessibilidade`, `privacidade`, `site`, `api`.
7. Abrir 5 a 10 issues iniciais com `boa primeira contribuição`, por exemplo: tradução da interface para inglês e espanhol, poses novas, uma faixa sintetizada nova, melhorias de acessibilidade no site, testes de aparelhos diferentes.
8. Topics do repositório: `dance-game`, `mediapipe`, `pose-estimation`, `pwa`, `kids`, `privacy`, `cloudflare-workers`.

---

## 6. Etapas 3 e 4: Cloudflare e site de apresentação

### 6.1 Mudar a hospedagem (etapa 3)

1. Criar conta na Cloudflare (o plano gratuito cobre tudo deste projeto; ver custos em 6.4).
2. Se tiver domínio, apontar os nameservers para a Cloudflare. Sem domínio, usar o `*.workers.dev` no começo.
3. Mudar o Vite do jogo para `base: '/jogar/'` e o escopo do PWA para `/jogar/`. Conferir que os caminhos do MediaPipe (`/mediapipe/...`) passam a ser relativos ao `base`.
4. Criar `wrangler.jsonc` só com assets (sem API ainda):

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "ensaio-de-danca",
  "main": "worker/index.ts",
  "compatibility_date": "2026-11-01",
  "assets": {
    "directory": "./dist",
    "binding": "ASSETS",
    "not_found_handling": "404-page",
    "run_worker_first": ["/api/*"]
  }
}
```

5. Ligar o repositório em **Workers & Pages → Create → Import a repository** (Workers Builds), com comando de build `npm ci && npm run setup:mediapipe && npm run build` e deploy `npx wrangler deploy`. Cada PR ganha uma URL de preview.
6. Conferir o tamanho dos arquivos: o limite por arquivo de asset estático é 25 MiB; os modelos `lite` e `full` ficam abaixo disso. Não usar o modelo `heavy`.
7. Cabeçalhos de segurança no arquivo `dist/_headers` (servido pelos assets):

```
/*
  Content-Security-Policy: default-src 'self'; script-src 'self' 'wasm-unsafe-eval' https://www.youtube.com https://s.ytimg.com; frame-src https://www.youtube-nocookie.com https://www.youtube.com; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self'; style-src 'self' 'unsafe-inline'
  Permissions-Policy: camera=(self), microphone=(), geolocation=(), interest-cohort=()
  Referrer-Policy: no-referrer
  X-Content-Type-Options: nosniff
  Cross-Origin-Opener-Policy: same-origin
```

   A CSP do site (`/`) pode ser ainda mais fechada que a do jogo, sem YouTube. Testar a CSP com o MediaPipe (wasm) e o player do YouTube antes de publicar.
8. Remover o `vercel.json` (ou manter até a Cloudflare estar no ar e só então apagar).

### 6.2 YouTube com menos rastreio

Trocar o player para o domínio **`www.youtube-nocookie.com`** (a API de iframe aceita `host: 'https://www.youtube-nocookie.com'` no `new YT.Player`). Isso reduz cookies até o vídeo tocar, mas não zera: o YouTube ainda é um terceiro. A política de privacidade e a Área dos Pais precisam dizer isso, e o player só carrega quando o adulto cola um link (já é assim).

### 6.3 Site de apresentação (etapa 4)

Público principal: pais e mães. Público secundário: quem quer contribuir.

**Estrutura de uma página só (`/`) e mais duas (`/privacidade`, `/contribuir`):**

1. **Hero:** nome do jogo, frase ("Dance em casa com a câmera do celular. Sem login, sem anúncio, sem enviar imagem."), botão grande **"Jogar agora"** (`/jogar/`) e, ao lado, o **placar da semana** (seção 7.6).
2. **Como funciona** em 3 passos com desenhos em código (o mesmo boneco dos cartões de pose): apoie o celular, imite a pose, ganhe estrelas.
3. **Privacidade em uma frase por item:** a câmera não sai do aparelho; não tem conta; o placar é opcional e só guarda um apelido inventado.
4. **Para os pais:** espaço livre, pausa para água, modo dupla.
5. **Código aberto:** link do GitHub, como contribuir, licença.
6. **Rodapé:** política de privacidade, aviso de não afiliação, contato.

**Regras técnicas do site:**

- Sem fonte do Google, sem CDN, sem pixel, sem analytics por padrão. Tudo servido do próprio domínio.
- HTML estático com um pouco de TypeScript só para o placar; o site precisa funcionar com JS desligado (o placar some, o resto fica).
- Acessível: contraste, texto alternativo, navegação por teclado, `prefers-reduced-motion`.
- Responsivo: celular em pé e deitado.
- Medição de visitas, se você quiser (D7): **Cloudflare Web Analytics** não usa cookie nem guarda IP de forma identificável. Recomendação: começar sem nada e decidir depois; as métricas agregadas de requisições do próprio Worker já mostram o volume.

### 6.4 Custos e limites (plano gratuito)

- Workers: 100 mil requisições por dia. Requisições de assets estáticos são gratuitas e não contam no limite.
- D1: 5 GB de armazenamento e milhões de leituras por dia no plano gratuito; o placar usa uma fração mínima disso.
- Se o jogo bombar, o plano pago do Workers (US$ 5 por mês) cobre com folga. Conferir os números atuais na página de preços antes de lançar.

---

## 7. Etapas 5 a 7: API, D1 e placar

### 7.1 Princípio: o placar não guarda nada que identifique alguém

O que o placar guarda: um apelido **gerado pelo jogo**, a música, o nível, os pontos, as estrelas e o dia. Só isso.

O que o placar **não** guarda: nome digitado, e-mail, IP, user-agent, país, id de aparelho, cookie, impressão digital do navegador, foto, vídeo, ângulos das poses.

### 7.2 Apelido: gerado, não digitado (recomendação para D3)

O jogo é para crianças. Um campo de texto livre vai receber o nome completo dela, o nome da escola ou um palavrão. Filtro de palavras sempre deixa passar alguma coisa e moderar manualmente dá trabalho. Por isso:

- **O apelido é montado a partir de listas fechadas:** `Animal + Qualidade + número de 2 dígitos`, por exemplo "Gatinha Brilhante 27", "Coelho Veloz 08", "Dragão Dançante 54". A criança escolhe com a mão entre 3 sugestões e pode pedir outras. Com ~40 animais × ~40 qualidades × 100 números há 160 mil combinações.
- **O servidor só aceita apelidos que existem nas listas** (as listas ficam em `shared/apelidos.ts`, usadas pelo jogo e pelo Worker). Assim é impossível gravar um nome real ou um palavrão, mesmo chamando a API direto.
- Isso tira o problema de dado pessoal (o apelido não identifica ninguém), de moderação de nomes ofensivos e de filtro de palavras.
- As listas passam por revisão no PR (nada que combine para formar ofensa; a lista é pequena o bastante para revisar à mão).

**Alternativa (se você quiser texto livre):** apelido de 3 a 16 caracteres, só letras, números e espaço, normalizado (NFKC, minúsculas, sem acento) e checado contra uma lista de bloqueio em português e inglês (palavrões, termos de ódio, padrões de e-mail, telefone, `@`, links, sequências de números), e ainda assim **pré-moderado**: fica invisível até você aprovar no painel. Dá mais trabalho e ainda tem risco. Não recomendado.

### 7.3 Esquema do D1

`worker/migrations/0001_placar.sql`:

```sql
-- Músicas que aceitam placar. Valores conferidos pelo servidor, copiados das coreografias no build.
CREATE TABLE musica (
  id            TEXT PRIMARY KEY,           -- 'aquecimento', 'ritmo-120' ...
  titulo        TEXT NOT NULL,
  nivel         TEXT NOT NULL CHECK (nivel IN ('facil', 'normal')),
  num_poses     INTEGER NOT NULL,
  duracao_ms    INTEGER NOT NULL,           -- duração do trecho jogado
  versao        INTEGER NOT NULL,           -- muda quando a coreografia muda
  ativa         INTEGER NOT NULL DEFAULT 1,
  UNIQUE (id, nivel)
);

-- Uma linha por pontuação aceita.
CREATE TABLE pontuacao (
  id            INTEGER PRIMARY KEY,
  musica_id     TEXT NOT NULL,
  nivel         TEXT NOT NULL,
  apelido       TEXT NOT NULL,              -- sempre um apelido das listas fechadas
  pontos        INTEGER NOT NULL CHECK (pontos >= 0),
  estrelas      INTEGER NOT NULL CHECK (estrelas BETWEEN 1 AND 3),
  semana        TEXT NOT NULL,              -- '2026-W46', para o placar da semana
  criado_em     INTEGER NOT NULL,           -- epoch em segundos, arredondado para a hora
  oculta        INTEGER NOT NULL DEFAULT 0, -- moderação
  FOREIGN KEY (musica_id, nivel) REFERENCES musica (id, nivel)
);
CREATE INDEX idx_placar ON pontuacao (musica_id, nivel, semana, oculta, pontos DESC);

-- Fichas de partida já usadas (impede reenviar a mesma partida). Limpas depois de 2 dias.
CREATE TABLE ficha_usada (
  jti           TEXT PRIMARY KEY,
  expira_em     INTEGER NOT NULL
);
```

Notas:

- `criado_em` arredondado para a hora: não precisa de mais precisão e reduz o que se pode inferir (por exemplo, a que horas a criança joga).
- **Retenção:** o placar mostra a semana e o "melhor de sempre". Pontuações com mais de 90 dias que não estão no top 10 de sempre de cada música são apagadas por um Cron Trigger diário, junto com as fichas vencidas. Definir esse prazo na política (D8).
- A tabela `musica` é preenchida por uma migração gerada no build a partir de `src/data/songs/*/choreo.json` (script `scripts/gerar-musicas-sql.mjs`), para o servidor e o jogo concordarem sobre número de poses e duração.

Comandos (Wrangler):

```bash
npx wrangler d1 create ensaio-de-danca            # uma vez; anota o database_id
npx wrangler d1 migrations create DB placar        # cria worker/migrations/000N_placar.sql
npx wrangler d1 migrations apply DB --local        # banco local para o wrangler dev
npx wrangler d1 migrations apply DB --remote       # produção (rodar no deploy, depois dos testes)
```

### 7.4 Configuração do Worker

`wrangler.jsonc` completo (os nomes exatos das chaves de rate limit devem ser conferidos na documentação da Cloudflare na hora de implementar, porque esse recurso mudou de nome desde o beta):

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "ensaio-de-danca",
  "main": "worker/index.ts",
  "compatibility_date": "2026-11-01",
  "assets": {
    "directory": "./dist",
    "binding": "ASSETS",
    "not_found_handling": "404-page",
    "run_worker_first": ["/api/*"]
  },
  "d1_databases": [
    { "binding": "DB", "database_name": "ensaio-de-danca", "database_id": "<id>", "migrations_dir": "worker/migrations" }
  ],
  "ratelimits": [
    { "name": "LIMITE_FICHA", "namespace_id": "1001", "simple": { "limit": 30, "period": 60 } },
    { "name": "LIMITE_ENVIO", "namespace_id": "1002", "simple": { "limit": 10, "period": 60 } }
  ],
  "triggers": { "crons": ["17 4 * * *"] },
  "observability": { "enabled": true, "head_sampling_rate": 0.1 },
  "env": {
    "preview": { "d1_databases": [ { "binding": "DB", "database_name": "ensaio-de-danca-preview", "database_id": "<id-preview>", "migrations_dir": "worker/migrations" } ] }
  }
}
```

Segredos (fora do repositório, com `npx wrangler secret put`):

- `FICHA_SEGREDO`: chave HMAC para assinar as fichas de partida.
- Opcional, se usar Turnstile (D9): `TURNSTILE_SECRET`.

**Observabilidade:** logs do Worker não podem conter IP, cabeçalhos nem corpo da requisição. Só rota, status e tempo. Escrever isso no `CONTRIBUTING.md` e manter o `head_sampling_rate` baixo.

### 7.5 Rotas da API

| Rota | Para quê | Limites |
|---|---|---|
| `GET /api/placar?musica=&nivel=&periodo=semana\|sempre` | Top 10, com `Cache-Control: public, max-age=60` e cache na borda (Cache API) | Só leitura; sem rate limit além do da Cloudflare |
| `GET /api/destaques` | Para a hero: top 5 da semana somando todas as músicas, e número de danças da semana | Cache de 60 s |
| `POST /api/partidas` | Começa uma partida e devolve uma **ficha** assinada | Corpo ≤ 256 bytes; `LIMITE_FICHA` |
| `POST /api/pontuacoes` | Envia o resultado de uma partida | Corpo ≤ 1 KB; `LIMITE_ENVIO`; ficha válida |
| `GET /api/saude` | Verificação simples | — |
| `/api/admin/*` | Moderação (ocultar, apagar) | Protegido por **Cloudflare Access** (seção 7.8) |

**Fluxo de uma partida com placar:**

1. Ao começar uma música elegível (seção 7.6), o jogo chama `POST /api/partidas` com `{ musica, nivel, versao }`. O Worker responde com uma ficha: `base64url({ jti, musica, nivel, versao, inicio }) + "." + HMAC`. Nada é gravado aqui (a ficha é autossuficiente).
2. Ao fim, o jogo mostra o resultado e, se o placar estiver ligado, pergunta "Mandar para o placar?" com o apelido escolhido.
3. `POST /api/pontuacoes` com `{ ficha, apelido, pontos, estrelas, perfeitos, poses }`.
4. O Worker valida, em ordem, e recusa com `400`/`422` sem dizer qual regra falhou:
   - corpo JSON com tamanho e tipos exatos (schema com zod, que o projeto já usa);
   - HMAC da ficha confere, ficha com menos de 2 horas;
   - música e nível ativos e `versao` igual à da tabela;
   - **tempo mínimo:** `agora − inicio ≥ duracao_ms × 0,9` (não dá para mandar a pontuação 10 segundos depois de começar);
   - **teto de pontos:** `pontos ≤ num_poses × 120` e `poses = num_poses` e `perfeitos ≤ num_poses`;
   - **coerência:** `estrelas` igual ao que `starsFor` calcularia com os pontos de pose (o Worker importa `src/core/stars.ts`, a mesma função do jogo);
   - apelido existe nas listas fechadas;
   - `jti` ainda não usado (`INSERT INTO ficha_usada` falha se repetido).
5. Grava em `pontuacao` com `semana` e `criado_em` arredondado, e devolve a posição na semana.

**O que isso impede e o que não impede:** impede spam, pontuações impossíveis, reenvio da mesma partida e envio sem esperar a música acabar. **Não impede** alguém que leia o código e mande uma pontuação alta plausível depois de esperar o tempo da música. Num jogo aberto que roda no aparelho isso é impossível de impedir de verdade. As defesas extras são: o teto de pontos mostrado como "estrelas" e não como número grande na hero, a moderação (ocultar outliers) e, se virar problema, o Turnstile (D9).

### 7.6 Rate limit sem guardar IP

- Os limites usam o **binding de Rate Limiting do Workers**. A chave do limite é um hash do IP com um sal que troca todo dia: `SHA-256(IP + sal_do_dia)`, onde `sal_do_dia = HMAC(FICHA_SEGREDO, data)`. O contador vive na memória da Cloudflare por 60 segundos e **nada vai para o D1 nem para log**. Depois da troca do sal, ninguém consegue ligar o hash a um IP.
- O IP aparece só durante a requisição, na memória do Worker, como em qualquer site. Isso vai escrito na política.
- Limites sugeridos: 30 fichas e 10 envios por minuto por chave; e um limite global de envios por minuto (proteção contra ataque distribuído) com alerta.
- **Firewall/WAF da Cloudflare** (plano gratuito): uma regra de rate limit em `/api/pontuacoes` como segunda camada, e "Bot Fight Mode" ligado.

### 7.7 No jogo (etapa 6)

- **Porteira dos pais:** o placar começa **desligado**. Na Área dos Pais (que já exige segurar 3 segundos), uma chave "Participar do placar online" com o texto do que é enviado e link para a política. Só com a chave ligada o jogo faz qualquer requisição à API.
- **Músicas elegíveis:** só as músicas públicas (seção 4.6), no modo Dançar, sozinho, fácil ou normal. Fora do placar: Treinar, Dupla, Estátua, Surpresa, danças gravadas por ela e o pacote de exemplo para casa.
- **Escolha do apelido:** uma vez, com a mão, entre 3 sugestões. Guardado no IndexedDB do aparelho. Botão "trocar apelido" na Área dos Pais.
- **Sem internet:** o jogo continua igual. A ficha é pedida só se houver rede; sem ficha, a tela de resultado não oferece o placar. (Fila offline para mandar depois não vale a pena: a ficha vence e cria um caminho a mais para abuso.)
- **Tom positivo:** o resultado nunca diz "você ficou em 47º". Mostra "Seu nome está no placar da semana!" quando entrou no top 10, e nada quando não entrou.
- O código do placar fica num módulo separado (`src/net/placar.ts`) e é o **único** lugar do jogo que usa `fetch` para a API. Um teste de unidade garante que, com a chave desligada, nenhuma chamada é feita; um teste no Playwright confere que a página não faz requisição para fora com o placar desligado.

### 7.8 Moderação

- `/api/admin/*` e uma página simples `/admin/` atrás do **Cloudflare Access** (Zero Trust, gratuito até 50 usuários), liberado só para o seu e-mail. Nenhuma senha no código.
- Ações: ocultar pontuação, apagar pontuação, desativar uma música, ver as 50 mais recentes.
- Botão "Reportar" no placar do site? Não recomendado no começo (abre um canal de entrada de dados). Com apelidos gerados não há nome ofensivo para reportar; outliers você vê no painel.

### 7.9 Placar na hero do site (etapa 7)

- Ao lado do botão "Jogar agora": **"Destaques da semana"**, com o top 5 (apelido, música, estrelas) e "N danças esta semana".
- Carregado com `fetch('/api/destaques')` depois da página aparecer; com JS desligado ou erro, o espaço mostra "Dance e apareça aqui!" e o botão continua visível.
- O HTML da hero pode já vir com o placar preenchido: o Worker intercepta `GET /` (com `run_worker_first` para `/`), busca o placar no cache e injeta com `HTMLRewriter`. Isso evita o "pulo" de layout e funciona sem JS. Recomendado como segunda versão, depois do `fetch` simples funcionando.
- Atualização: cache de 60 segundos na borda. Sem WebSocket e sem tempo real (desnecessário e mais caro).
- Uma página `/placar` com abas por música e nível, semana e "de sempre".

### 7.10 Testes

- **Worker:** Vitest com `@cloudflare/vitest-pool-workers`, que roda o código no runtime do Workers com D1 local. Casos: ficha válida, ficha adulterada, ficha vencida, reenvio, tempo mínimo, teto de pontos, estrelas incoerentes, apelido fora da lista, corpo grande, rate limit, placar ordenado, ocultas fora do placar, cron de retenção.
- **Jogo:** unidade para `placar.ts` com `fetch` falso; Playwright com a API em `wrangler dev` (ou rota interceptada) cobrindo a porteira dos pais, a escolha do apelido e o envio.
- **Site:** Playwright para a hero com placar cheio, vazio e com a API fora do ar; Lighthouse no CI para acessibilidade e "nenhum terceiro".

---

## 8. Privacidade, crianças e lançamento (etapa 8)

### 8.1 Posição legal resumida (não é parecer jurídico)

- **LGPD (Brasil):** dados de crianças só com consentimento específico de um dos pais (art. 14) e sempre no melhor interesse da criança. O desenho deste plano evita tratar dado pessoal: o apelido é gerado de listas fechadas e não identifica ninguém, e nada é guardado sobre o aparelho ou a rede. O IP passa pela memória do Worker só durante a requisição, e o hash diário vira dado anônimo quando o sal troca. A chave na Área dos Pais funciona como a autorização do adulto mesmo assim, e a política explica tudo.
- **COPPA (EUA):** aplica-se a serviços dirigidos a menores de 13 anos que coletam "informação pessoal", o que inclui nome, identificadores persistentes (cookie, id de aparelho, IP usado para rastrear) e foto/vídeo/voz. Com apelido gerado, sem cookie, sem id persistente e sem guardar IP, o placar não coleta informação pessoal. O ponto que quebraria isso é **texto livre no apelido** (pode conter o nome real). Mais um motivo para o apelido gerado.
- **GDPR/Reino Unido (Children's Code):** mesma lógica; com nada pessoal guardado, sobra transparência e configurações protetoras por padrão (placar desligado).
- **YouTube:** é um terceiro com regras próprias. Usar `youtube-nocookie.com`, carregar só quando o adulto cola o link e dizer isso na política.
- Recomendação: antes de divulgar amplamente, pedir para um advogado de privacidade ler a política (uma leitura, não um projeto).

### 8.2 Política de privacidade (`/privacidade`)

Curta, em linguagem simples, com uma versão "para crianças" de 3 frases no topo. Conteúdo:

1. **Quem é o responsável** e como falar com ele (D6).
2. **A câmera:** o vídeo é lido no aparelho e nunca é enviado nem gravado.
3. **O que fica no aparelho:** progresso, músicas carregadas, poses regravadas, configurações (IndexedDB). Apagar: limpar os dados do site no navegador.
4. **O placar (opcional):** desligado por padrão; quando um adulto liga, enviamos o apelido gerado, a música, o nível, os pontos e as estrelas. Não enviamos nome, foto, vídeo, localização nem identificador do aparelho.
5. **Dados técnicos:** o endereço IP é usado só durante a requisição, para limitar abusos, e não é guardado. Hospedagem na Cloudflare (link para a política deles).
6. **Cookies:** o site e o jogo não usam cookies. O player do YouTube, se usado, é do YouTube.
7. **Retenção:** quanto tempo as pontuações ficam (D8).
8. **Apagar uma pontuação:** pelo contato, informando apelido, música e dia (como não sabemos quem é quem, isso é o que dá para fazer, e a política diz isso).
9. **Crianças:** o jogo é feito para elas, por isso não coletamos dado pessoal e o placar depende de um adulto.
10. **Mudanças:** data da versão e histórico no GitHub.

### 8.3 Checklist de lançamento

- [ ] `LICENSE`, `TERCEIROS.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, templates e CI no `main`
- [ ] Revisão de `docs/` feita (D5) e aviso de não afiliação no README
- [ ] Repositório público, regras de branch, private vulnerability reporting ativo
- [ ] Jogo em `/jogar/` com câmera, YouTube (nocookie) e offline testados num Android e num iPhone de verdade
- [ ] CSP e cabeçalhos ativos e o jogo funcionando com eles
- [ ] Site sem nenhuma requisição a terceiros (conferido na aba Network e no Playwright)
- [ ] API com todos os testes da seção 7.10 passando; migrações aplicadas em preview e depois em produção
- [ ] Placar desligado por padrão; com ele desligado, zero requisições do jogo para a API
- [ ] Rate limit e regra de WAF ativos; Access protegendo `/admin/`
- [ ] Logs do Worker sem IP, cabeçalhos ou corpo
- [ ] Cron de retenção rodando (ver nos logs do primeiro dia)
- [ ] Política de privacidade publicada e linkada no site, no jogo (Área dos Pais) e no README
- [ ] Teste com sua filha: escolher apelido com a mão, ver o nome no site, reação ao placar

---

## 9. Decisões que dependem de você

| # | Decisão | Recomendação | O que muda se escolher outra |
|---|---|---|---|
| D1 | Licença do código | **MIT** (+ CC BY 4.0 para docs, poses e coreografias) | AGPL-3.0: só o arquivo `LICENSE` e o README; pode afastar algumas contribuições |
| D2 | As 5 músicas do filme na versão pública | **Ficam como "pacote para casa"** com ids neutros, fora do site e do placar; versão pública com Aquecimento + 2 ou 3 faixas sintetizadas | Mantê-las como estão: risco de notificação de marca/direitos quando o site divulgar o placar por música. Removê-las de vez: você perde as coreografias em casa (dá para manter num fork privado) |
| D3 | Apelido | **Gerado de listas fechadas** (Animal + Qualidade + número) | Texto livre: exige filtro, pré-moderação e muda a análise de COPPA/LGPD |
| D4 | Domínio | Um domínio próprio (ex. `ensaiodedanca.com.br`, ~R$ 40 por ano no Registro.br) | `*.workers.dev` de graça no começo; trocar depois quebra o "adicionar à tela inicial" de quem já instalou |
| D5 | Documentos de origem em `docs/` | Manter `plano-de-construcao.md`; generalizar o trecho sobre sua filha nos outros dois | Manter tudo como está (baixo risco) ou tirar do repositório (e do histórico, com `git filter-repo`, antes de abrir) |
| D6 | Contato público (código de conduta, segurança, privacidade) | Um e-mail só para o projeto (ex. alias `contato@<domínio>` com Email Routing da Cloudflare, de graça) | Usar seu e-mail pessoal: fica público no repositório |
| D7 | Medição de visitas | **Nenhuma** no começo; se precisar, Cloudflare Web Analytics (sem cookie) | Qualquer outra ferramenta exige rever a política e o banner |
| D8 | Retenção das pontuações | **90 dias**, mantendo o top 10 de sempre | Prazo maior: mais dado guardado; menor: o "de sempre" fica curto |
| D9 | Turnstile (desafio anti-robô da Cloudflare) no envio | **Não no começo**; ligar só se aparecer abuso | Ligar desde o início: menos spam, mas é um script de terceiro rodando na tela de uma criança |
| D10 | Workers com assets ou Pages | **Workers com assets** (um deploy, um arquivo de configuração) | Pages + Functions: mesma arquitetura, API em `functions/` |
| D11 | Fluxo de trabalho depois de abrir | **Tudo por PR**, inclusive seus commits, com CI obrigatório | Continuar commitando na `main`: mais rápido, mas contribuidores não terão o mesmo processo |

---

## 10. Riscos

| Risco | Chance | Impacto | Como reduzir |
|---|---|---|---|
| Notificação por direitos/marca das músicas do filme | Média se o site divulgar as músicas; baixa se ficarem só no código | Alto (site fora do ar, repositório com DMCA) | D2: pacote para casa, nada do filme no site |
| Pontuação falsa no placar | Alta (código aberto) | Baixo (é um jogo infantil) | Ficha assinada, tempo mínimo, teto, moderação, Turnstile se precisar |
| Nome real ou ofensivo no placar | Alta com texto livre; nula com apelido gerado | Alto (exposição de criança) | D3: apelido gerado e validado no servidor |
| Comparação deixa criança frustrada | Média | Médio | Placar opcional, sem posição baixa visível, só "você entrou nos destaques" |
| Contribuição que adiciona rastreio, CDN ou envio de dados | Baixa | Alto | Regra no CONTRIBUTING, CSP fechada, teste "sem terceiros" no CI, CODEOWNERS |
| PR malicioso usando o CI | Baixa | Médio | Aprovação para workflows de forks; deploy só a partir da `main`; segredos só no ambiente de produção |
| Mudança de `base` quebra o PWA de quem já instalou | Baixa (nada publicado ainda) | Baixo | Fazer a etapa 3 antes de divulgar |
| CSP quebra MediaPipe (wasm) ou YouTube | Média | Médio | Testar em preview com aparelhos reais antes de publicar |
| Custos acima do gratuito | Baixa | Baixo | Assets são gratuitos; cache de 60 s no placar; plano de US$ 5 se precisar |
| Mudanças nas APIs da Cloudflare (rate limit, assets) | Média | Baixo | Conferir a documentação na hora de implementar; fixar `compatibility_date` |
| Manutenção de comunidade toma seu tempo | Média | Médio | Templates, Discussions, CODEOWNERS, issues bem descritas; deixar claro no README que é um projeto de fim de semana |

---

## 11. Primeiro passo concreto

Depois das decisões D1, D2, D3 e D5, a etapa 1 é um PR só com: `LICENSE`, `LICENSE-CONTEUDO.md`, `TERCEIROS.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `.github/` (templates, CODEOWNERS, CI, Dependabot), README revisado e, se escolhido, o pacote de músicas para casa com ids neutros. Ele não muda nada no jogo e pode ser revisado em uma sentada.

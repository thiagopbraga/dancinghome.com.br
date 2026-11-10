# Ensaio de Dança — Plano de Construção One-Shot

2026-11-09 · Thiago

## Resumo

Este plano transforma os dois documentos do jogo numa especificação fechada, com 12 etapas em ordem, cada uma com critério de aceite verificável. Ele foi escrito para o Fable 5.2 construir tudo numa única execução, sem precisar perguntar nada no meio.

Baseado em: [Ensaio de Dança — Plano do Jogo](https://claude.ai/artifact/WyxJ5oZzyBPcqMmhGw6KAE) e [Ensaio de Dança — Músicas e Poses](https://claude.ai/artifact/Smn8WHSb6SgHbR5tq9SypS).

**Como usar:**

1. Crie um repositório vazio no GitHub (por exemplo `ensaio-de-danca`).
2. Exporte os três documentos (os dois originais e este) como Markdown e coloque em `docs/` no repositório: `docs/plano-do-jogo.md`, `docs/musicas-e-poses.md` e `docs/plano-de-construcao.md`.
3. Abra uma sessão do Claude Code com o modelo `claude-fable-5-2` nesse repositório e cole o **Prompt mestre** do fim deste documento.
4. Quando terminar, rode `npm run dev` no celular ou notebook, carregue os MP3 das músicas pela Área dos Pais e marque as seções no editor.

**Por que funciona em one shot:** toda escolha que o modelo teria de fazer já está decidida aqui (stack, versões, formatos, limites de nota), os conflitos entre os documentos já estão resolvidos, e o jogo inteiro pode ser testado sem câmera e sem música, com uma pose simulada e uma música de demonstração gerada pelo próprio jogo.

## Escopo da entrega

A entrega é o jogo inteiro descrito nos dois documentos: MVP, v2 e extras, construídos nessa ordem de prioridade. Se a execução acabar antes do fim, o que estiver pronto precisa ser um jogo jogável, por isso o MVP fecha na etapa 6 e cada etapa seguinte só acrescenta.

| Prioridade | O que entra | Etapas |
|---|---|---|
| P0 · MVP | Câmera espelhada com esqueleto, calibração, cartões de pose no ritmo, nota por ângulos, bônus de energia, menu e pausa por gesto, narração, tela de estrelas, 5 músicas com coreografia, níveis fácil e normal, música de demonstração | 0 a 6 |
| P0 · Celular | Tela cheia, horizontal, Wake Lock, aviso "Gire o celular", desempenho adaptativo, PWA offline | 7 |
| P1 · Ferramentas | Área dos Pais, carregar MP3, editor para marcar seções, gravador de poses do catálogo | 8 |
| P1 · v2 | Gravador de coreografias, modo treino, idols e pets animados, figurinos e cenários desbloqueáveis, personagem a partir de foto do desenho | 9 e 10 |
| P2 · Extras | Modo dupla, álbum de conquistas, modo história, pose congelada, modo surpresa com detecção de BPM | 11 |

**Fica de fora (não construir):**

- Qualquer servidor, login, análise de uso, anúncio ou envio de dados para a rede.
- Arquivos de áudio das músicas dentro do repositório ou do build. O áudio é carregado pelo usuário e fica só no IndexedDB do aparelho.
- Imagens, nomes visuais ou desenhos das personagens do filme. Todo visual é original e gerado em código (SVG ou Canvas).
- Gravação de vídeo. O jogo guarda apenas ângulos.
- Testes em aparelho real. O modelo não tem câmera; o teste com ela fica para você, com o roteiro da seção de testes.

## Decisões fechadas

O modelo não deve reabrir nenhuma destas escolhas. Uma decisão nova que surgir durante a construção vai para `DECISIONS.md` com uma linha de justificativa.

| Camada | Escolha | Observação |
|---|---|---|
| Linguagem e build | TypeScript em modo `strict` + Vite, Node 20 ou mais novo | Versões exatas no `package.json`, sem `^` |
| Interface do jogo | Canvas 2D num único `<canvas>` em tela cheia | PixiJS fica de fora: Canvas 2D dá conta de 60 fps com cartões e partículas e tira uma dependência |
| Interface da Área dos Pais | HTML e CSS simples sobre o canvas, sem framework | Formulários, listas e botões de toque |
| Visão | `@mediapipe/tasks-vision`, Pose Landmarker, modelo `lite` por padrão e `full` como opção | Os arquivos `.wasm` e o modelo `.task` ficam em `public/mediapipe/`, copiados no build, para funcionar offline |
| Áudio | Web Audio API com `AudioBufferSourceNode` | O relógio do jogo é sempre `AudioContext.currentTime` |
| Narração | `speechSynthesis` com voz `pt-BR` | Sem voz disponível, mostra a frase grande na tela e toca um som |
| Efeitos sonoros | Sintetizados com Web Audio (osciladores) | Nenhum arquivo de som no repositório |
| Dados | JSON em `src/data/` validado com `zod` na carga | Erro de validação mostra a mensagem na tela, nunca tela branca |
| Armazenamento | IndexedDB pela biblioteca `idb` | Áudio (Blob), coreografias editadas, poses regravadas, progresso, configurações |
| Offline | `vite-plugin-pwa` com manifest `display: fullscreen` e `orientation: landscape` | Pré-cache de todo o build, incluindo o MediaPipe |
| Testes | Vitest (unidade, com `fake-indexeddb`) e Playwright (ponta a ponta com pose simulada) | Ver a seção de testes |
| Publicação | Estático, pronto para Vercel | HTTPS é exigido pela câmera |

**Padrões de código:** funções puras para tudo que é cálculo (ângulos, nota, expansão de coreografia, estrelas), sem acesso a DOM nesses módulos. Textos da interface em português, centralizados em `src/game/texts.ts`. Nenhum `TODO` ou função vazia no código entregue.

## Conflitos resolvidos

Os dois documentos divergem em oito pontos e deixam três valores em aberto. Onde divergem, vale o "Músicas e Poses", que é o mais recente e mais detalhado.

| Tema | Plano do Jogo | Músicas e Poses | Decisão |
|---|---|---|---|
| Formato da coreografia | Lista de `{beat, pose}` por nível | Seções com `inicioBeat`, `aCada` e sequência | Seções, expandidas em lista de eventos na carga. O formato aceita também `eventos` explícitos, que é o que o gravador gera |
| Frequência das poses | Fácil a cada 4 batidas, normal a cada 2 | Letal e Não Tem Perdão usam 8 e 4 | `aCada` por seção e por nível no JSON. Regra-guia: fácil 2 a 3,4 s por pose, normal 1 a 1,7 s |
| Duração da partida | Músicas de 1 a 2 minutos | Fácil usa trecho de 60 a 90 s, normal a música inteira | Fácil com `trecho` e fade de 2 s no fim; normal com a música inteira |
| Ângulos da Estrela | Ombros 100, quadris 160 | Ombros 90, cotovelos 170 | Catálogo do "Músicas e Poses". Os JSON do Plano são só ilustração |
| Número de poses | Umas 20, incluindo "mão no queixo" | 18 poses fechadas | As 18 do catálogo. "Mão no queixo" fica de fora |
| Variações do normal | Não fala | "Perna de Lado no lugar da Estrela no segundo refrão" | Cada nível tem sua própria lista de seções; a variação vira uma seção `refrao2` com a sequência trocada |
| Renderização | PixiJS ou Canvas 2D | Não fala | Canvas 2D |
| Esquerda e direita | "As poses-alvo trocam esquerda e direita" por causa do espelho | E e D do ponto de vista dela | O MediaPipe rotula pelo lado do corpo da pessoa. Os ângulos são calculados dos pontos sem espelhar, então batem direto com o catálogo, sem troca. Só o desenho é espelhado. A etapa 3 tem um teste manual para confirmar isso |

**Valores que estavam em aberto e foram definidos:**

- **Estrelas:** percentual = pontos obtidos ÷ (100 × número de poses). 1 estrela sempre; 2 estrelas a partir de 55%; 3 estrelas a partir de 75%. O bônus de energia não entra nesse cálculo, só no placar.
- **Bônus de energia:** entre duas poses, soma o deslocamento de pulsos, cotovelos, joelhos e tornozelos, dividido pela altura do tronco (ombro ao quadril). Até +20 pontos por pose, e no máximo 10 desses pontos vão para uma pose com nota abaixo de "Quase", para premiar quem dança com vontade.
- **Pesos dos ângulos:** ombros e cotovelos pesam 1,5; quadris e joelhos pesam 1,0. Só contam os ângulos listados na pose e com visibilidade acima de 0,5. Pose sem nenhum ângulo visível vale "Quase" (40), nunca zero.

Os valores de `inicioBeat` e `offsetMs` dos documentos são exemplos. As coreografias saem com `"calibrado": false` e o editor da etapa 8 marca os valores reais. Até lá, o jogo funciona com as estimativas.

## Arquitetura e contratos

O jogo é dividido em três camadas: `core` (cálculo puro e acesso a câmera e áudio), `game` (cenas e desenho) e `data` (JSON e armazenamento). As cenas só falam com o `core` pelas interfaces abaixo, e é isso que permite trocar a câmera por uma pose simulada nos testes.

**Fluxo de cada quadro:** fonte de pose (câmera ou simulada) → filtro One Euro → 8 ângulos → juiz, que lê a batida atual no relógio de áudio → placar → desenho da cena.

```
src/
  core/
    camera.ts          // getUserMedia, facingMode user, 640x480
    poseSource.ts      // interface PoseSource + MediaPipePoseSource + SimulatedPoseSource
    oneEuro.ts         // filtro One Euro por coordenada
    angles.ts          // 8 ângulos em 2D a partir dos 33 pontos
    judge.ts           // nota de uma pose, janela de ±300 ms, energia
    stars.ts           // percentual e estrelas
    clock.ts           // AudioClock: tempo da música e batida atual
    audio.ts           // carregar, tocar, pausar, playbackRate, fade
    demoSong.ts        // música de demonstração sintetizada (120 BPM, 64 batidas)
    sfx.ts             // efeitos sintetizados
    narrator.ts        // speechSynthesis pt-BR com fallback
    gestures.ts        // mão sobre botão por 1 s, duas mãos para o alto por 1 s
    bpm.ts             // detecção de BPM (etapa 11)
    device.ts          // tela cheia, orientação, Wake Lock, fps adaptativo
  game/
    engine.ts          // loop requestAnimationFrame, troca de cenas, escala 16:9
    scenes/            // Menu, Calibracao, Contagem, Danca, Resultado, AreaDosPais,
                       // EditorSecoes, GravadorPose, GravadorCoreografia, Treino, Historia
    draw/              // boneco a partir de ângulos, cartão de pose, esqueleto, partículas, cenários
    characters/        // idols, cachorro e gato desenhados em código
    texts.ts           // todos os textos e falas em português
  data/
    schema.ts          // schemas zod e tipos inferidos
    poses/catalog.json
    songs/<id>/choreo.json   // sem áudio
    choreo.ts          // expandSections(): seções -> eventos
    storage.ts         // IndexedDB com idb
  main.ts
public/mediapipe/      // wasm + pose_landmarker_lite.task + full.task
tests/unit/  tests/e2e/  tests/fixtures/
```

**Contratos principais** (o modelo pode acrescentar campos, mas não mudar estes):

```ts
type AngleName = 'lShoulder'|'rShoulder'|'lElbow'|'rElbow'|'lHip'|'rHip'|'lKnee'|'rKnee';
type Angles = Partial<Record<AngleName, number>>; // graus, 0..180

interface Landmark { x: number; y: number; z: number; visibility: number } // normalizado 0..1
interface PoseFrame { t: number; people: Landmark[][] } // t = AudioClock.now() em s

interface PoseSource {
  start(video?: HTMLVideoElement): Promise<void>;
  next(t: number): PoseFrame | null;   // chamado uma vez por quadro
  stop(): void;
}

interface PoseDef { nome: string; nivel: 'facil'|'normal'; angles: Angles; descricao: string }
type Catalog = Record<string, PoseDef>;

interface ChoreoEvent { beat: number; pose: string; mirror: boolean; holdBeats: number; secao: string }

interface AudioClock {
  now(): number;            // segundos de música, já descontados offsetMs e outputLatency
  beat(): number;           // now() * bpm / 60
  timeOfBeat(b: number): number;
}

type Rating = 'perfeito'|'muitoBem'|'quase'|'tenteiDeNovo';
interface PoseResult { event: ChoreoEvent; bestDiff: number; rating: Rating; points: number; energy: number }
```

**Ângulos em 2D:** ombro = ângulo em ombro entre quadril e cotovelo; cotovelo = entre ombro e pulso; quadril = entre ombro e joelho; joelho = entre quadril e tornozelo. Usar só `x` e `y` (multiplicando `x` pela razão largura/altura do vídeo), porque a profundidade da câmera frontal não é confiável. `mirror: true` troca cada ângulo `l*` pelo `r*` correspondente na pose-alvo.

**Cartões de pose sem arquivos de imagem:** o desenho de cada cartão é um boneco gerado a partir dos próprios ângulos da pose (`draw/stickFigure.ts`), espelhado como ela se vê. Isso deixa as 18 poses e as poses gravadas por ela com desenho automático e original.

## Dados do jogo

O catálogo abaixo é o arquivo final, com as 18 poses do "Músicas e Poses" já convertidas para os nomes de ângulo do código. As coreografias seguem o formato de seções, com a sequência de poses tirada do mesmo documento.

**`src/data/poses/catalog.json`** (o campo `descricao` vem da coluna "Como fazer"):

```json
{
  "bracos-pra-cima":     { "nome": "Braços pra Cima",     "nivel": "facil",  "angles": { "lShoulder": 170, "rShoulder": 170, "lElbow": 170, "rElbow": 170 } },
  "estrela":             { "nome": "Estrela",             "nivel": "facil",  "angles": { "lShoulder": 90,  "rShoulder": 90,  "lElbow": 170, "rElbow": 170 } },
  "coracao":             { "nome": "Coração",             "nivel": "facil",  "angles": { "lShoulder": 150, "rShoulder": 150, "lElbow": 60,  "rElbow": 60 } },
  "raio-de-sol":         { "nome": "Raio de Sol",         "nivel": "facil",  "angles": { "lShoulder": 140, "rShoulder": 140, "lElbow": 170, "rElbow": 170 } },
  "microfone":           { "nome": "Microfone",           "nivel": "facil",  "angles": { "rShoulder": 30,  "rElbow": 40,  "lShoulder": 40,  "lElbow": 90 } },
  "pose-de-idol":        { "nome": "Pose de Idol",        "nivel": "facil",  "angles": { "lShoulder": 40,  "rShoulder": 40,  "lElbow": 80,  "rElbow": 80 } },
  "espada-de-luz":       { "nome": "Espada de Luz",       "nivel": "facil",  "angles": { "rShoulder": 150, "rElbow": 170, "lShoulder": 40,  "lElbow": 90 } },
  "escudo":              { "nome": "Escudo",              "nivel": "facil",  "angles": { "lShoulder": 60,  "rShoulder": 60,  "lElbow": 40,  "rElbow": 40 } },
  "apontar":             { "nome": "Apontar pra Galera",  "nivel": "facil",  "angles": { "rShoulder": 90,  "rElbow": 175, "lShoulder": 20 } },
  "bolhas":              { "nome": "Bolhas de Refri",     "nivel": "facil",  "angles": { "lShoulder": 150, "lElbow": 100, "rShoulder": 30,  "rElbow": 100 } },
  "garrinha-de-gato":    { "nome": "Garrinha de Gato",    "nivel": "facil",  "angles": { "lShoulder": 50,  "rShoulder": 50,  "lElbow": 30,  "rElbow": 30 } },
  "orelhas-de-cachorro": { "nome": "Orelhas de Cachorro", "nivel": "facil",  "angles": { "lShoulder": 140, "rShoulder": 140, "lElbow": 30,  "rElbow": 30 } },
  "joelho-pra-cima":     { "nome": "Joelho pra Cima",     "nivel": "normal", "angles": { "rHip": 100, "rKnee": 90,  "lShoulder": 90,  "rShoulder": 90 } },
  "ciclista":            { "nome": "Ciclista",            "nivel": "normal", "angles": { "rHip": 100, "rKnee": 90,  "lShoulder": 70,  "rShoulder": 70, "lElbow": 120, "rElbow": 120 } },
  "patinadora":          { "nome": "Patinadora",          "nivel": "normal", "angles": { "lKnee": 140, "rKnee": 140, "lShoulder": 160, "rShoulder": 20 } },
  "mola":                { "nome": "Mola",                "nivel": "normal", "angles": { "lHip": 120, "rHip": 120, "lKnee": 120, "rKnee": 120, "lShoulder": 90, "rShoulder": 90 } },
  "inclinacao":          { "nome": "Inclinação",          "nivel": "normal", "angles": { "lShoulder": 170, "lElbow": 140, "rShoulder": 20 } },
  "perna-de-lado":       { "nome": "Perna de Lado",       "nivel": "normal", "angles": { "rHip": 150, "rKnee": 175, "lShoulder": 140, "rShoulder": 140 } }
}
```

**Formato da coreografia** (`src/data/songs/<id>/choreo.json`):

```json
{
  "id": "brilho",
  "title": "Brilho",
  "tema": "brilhar no palco",
  "bpm": 123,
  "offsetMs": 0,
  "calibrado": false,
  "duracaoBeats": 400,
  "niveis": {
    "facil": {
      "trecho": { "inicioBeat": 0, "fimBeat": 160 },
      "secoes": [
        { "nome": "intro",  "inicioBeat": 0,   "aCada": 4, "poses": ["pose-de-idol", "microfone"] },
        { "nome": "verso",  "inicioBeat": 16,  "aCada": 4, "poses": ["microfone", "apontar", "coracao", "pose-de-idol"] },
        { "nome": "refrao", "inicioBeat": 80,  "aCada": 4, "poses": ["raio-de-sol", "bracos-pra-cima", "estrela", "coracao"] },
        { "nome": "final",  "inicioBeat": 152, "aCada": 4, "poses": ["raio-de-sol"], "segurar": 4 }
      ]
    },
    "normal": {
      "secoes": [
        { "nome": "intro",   "inicioBeat": 0,   "aCada": 2, "poses": ["pose-de-idol", "microfone"] },
        { "nome": "verso",   "inicioBeat": 16,  "aCada": 2, "poses": ["microfone", "apontar", "coracao", "pose-de-idol"] },
        { "nome": "refrao",  "inicioBeat": 80,  "aCada": 2, "poses": ["raio-de-sol", "bracos-pra-cima", "estrela", "coracao"] },
        { "nome": "verso2",  "inicioBeat": 144, "aCada": 2, "poses": ["microfone", "apontar", "coracao", "pose-de-idol"] },
        { "nome": "refrao2", "inicioBeat": 208, "aCada": 2, "poses": ["raio-de-sol", "bracos-pra-cima", "perna-de-lado", "coracao"] },
        { "nome": "final",   "inicioBeat": 392, "aCada": 2, "poses": ["raio-de-sol"], "segurar": 4 }
      ]
    }
  }
}
```

**Regras de expansão** (`expandSections`, com teste de unidade para cada uma):

1. Uma seção vai do seu `inicioBeat` até o `inicioBeat` da próxima, ou até o fim do `trecho`, ou até `duracaoBeats`.
2. Dentro dela, uma pose a cada `aCada` batidas, percorrendo `poses` em ciclo. É assim que o refrão se repete sozinho.
3. Um item de `poses` pode ser texto ou `{ "pose": "bolhas", "mirror": true }`.
4. `segurar` vale para o último evento da seção e vira `holdBeats`; nenhuma pose nova entra durante a segurada.
5. Um nível pode trazer `eventos` prontos em vez de `secoes` (formato do gravador). Se trouxer os dois, `eventos` vence.
6. A primeira pose nunca cai antes da batida 4, para dar tempo da contagem terminar.

**As cinco músicas:** o modelo gera os outros quatro arquivos com as sequências de "Coreografias" do documento "Músicas e Poses", usando os ids `meu-pequeno-guarana`, `o-som-da-nossa-voz`, `letal` e `nao-tem-perdao`. Os valores de cada uma:

| id | BPM | Duração | `aCada` fácil / normal | Variação do outro nível |
|---|---|---|---|---|
| brilho | 123 | ~3:15 | 4 / 2 | Normal: Perna de Lado no lugar da Estrela no segundo refrão |
| meu-pequeno-guarana | 126 | ~2:31 | 4 / 2 | Normal: Mola entre as duas Bolhas do refrão |
| o-som-da-nossa-voz | 120 | ~4:10 | 4 / 2 | Normal: Inclinação, normal e espelhada, no segundo verso |
| letal | 140 | ~3:02 | 8 / 4 | Normal: Joelho pra Cima depois de cada Estrela |
| nao-tem-perdao | 160 | ~2:56 | 8 / 4 | Fácil: Ciclista vira Apontar e Patinadora vira Estrela |

Sem as batidas reais, as seções usam esta estimativa: intro 0 a 16, verso 16 a 80, refrão 80 a 144, verso2 de 144 a 208 e refrão2 de 208 até 8 batidas antes do fim, onde entra o final (o refrão2 se repete sozinho pela regra 2). O `trecho` do fácil vai da batida 0 até o múltiplo de 4 mais próximo de 75 segundos (`75 × bpm / 60`). `duracaoBeats` = duração em segundos × bpm / 60, arredondado para baixo.

**Música de demonstração:** `ensaio-aquecimento`, 120 BPM, 64 batidas (32 s), sintetizada em `demoSong.ts` com bumbo, chimbal e uma melodia simples. Já vem com `"calibrado": true`, níveis fácil e normal, e é a única música jogável antes de carregar os MP3. Os testes ponta a ponta usam ela.

## Etapas de construção

São 12 etapas, de 0 a 11, feitas nesta ordem. Uma etapa só termina quando `npm run check` (tipos, lint, testes de unidade e build) e os testes ponta a ponta dela passam, e aí ela ganha um commit próprio `etapa N: <resumo>`. O MVP jogável fica pronto ao fim da etapa 6.

### Etapa 0 · Fundação

- **Construir:** projeto Vite + TypeScript `strict`, ESLint, Prettier, Vitest, Playwright, `zod`, `idb`, `@mediapipe/tasks-vision`, `vite-plugin-pwa`. Script que copia o wasm e baixa os modelos `lite` e `full` para `public/mediapipe/` (`npm run setup:mediapipe`). Estrutura de pastas da seção de arquitetura, `README.md`, `DECISIONS.md` e `PROGRESS.md`.
- **Aceite:** `npm run check` passa; `npm run dev` abre um canvas 16:9 com o texto "Ensaio de Dança"; um teste Playwright confirma o título.

### Etapa 1 · Dados e regras puras

- **Construir:** `schema.ts` com zod, `catalog.json` completo, as 6 coreografias (5 músicas + demonstração), `expandSections`, `angles.ts`, `judge.ts` (tabela de nota, janela de ±300 ms, pesos, energia) e `stars.ts`.
- **Aceite:** testes de unidade cobrem as 6 regras de expansão; ângulos de pontos sintéticos dão 90° e 180° com erro abaixo de 1°; uma pose igual ao alvo dá "Perfeito" (100), 30° de diferença dá "Muito bem" (70), 45° dá "Quase" (40), 70° dá 10; `mirror` troca os lados; todas as coreografias passam no schema e só citam poses que existem no catálogo.

### Etapa 2 · Áudio e relógio

- **Construir:** `AudioClock` sobre `AudioContext.currentTime`, descontando `offsetMs` e `outputLatency`; tocar, pausar, retomar, `playbackRate` e fade; `demoSong.ts`; `sfx.ts`; tela de teste com um metrônomo visual que pisca a cada batida.
- **Aceite:** teste de unidade do relógio com um `AudioContext` falso (tempo de batida, pausa e retomada sem salto); no Playwright, com a música de demonstração, `clock.beat()` avança 2 batidas por segundo com erro abaixo de 50 ms.

### Etapa 3 · Câmera e esqueleto (prova de conceito)

- **Construir:** `camera.ts`, `MediaPipePoseSource` (GPU com recuo para CPU), filtro One Euro, `SimulatedPoseSource` que lê poses-alvo e gera pontos com ruído, e uma cena que mostra o vídeo espelhado com o esqueleto por cima. Parâmetro de URL `?sim=1` troca a câmera pela simulação. Painel `?debug=1` com fps, visibilidade média e os 8 ângulos ao vivo, com o lado mais levantado escrito como "braço direito" ou "braço esquerdo".
- **Aceite:** com `?sim=1` o esqueleto aparece e se move no Playwright; sem permissão de câmera o jogo mostra uma tela amigável em vez de erro. Para você testar depois: levantar o braço direito e o painel dizer "braço direito".

### Etapa 4 · Cena de dança

- **Construir:** `draw/stickFigure.ts` (boneco a partir de ângulos), cartões de pose deslizando da direita até uma linha de chegada (o cartão aparece 4 batidas antes e chega na batida exata), nome da pose em letras grandes, avaliação no fim da janela, mensagem "Perfeito!", "Muito bem!" ou "Quase!" com partículas, placar e barra de progresso da música.
- **Aceite:** com `?sim=1` e a música de demonstração, todas as poses são avaliadas na ordem certa; com a simulação fazendo a pose certa, pelo menos 90% saem "Perfeito"; screenshot da cena salva em `tests/e2e/screens/`.

### Etapa 5 · Fluxo completo da partida

- **Construir:** cenas Menu, Calibração, Contagem e Resultado. Menu por gesto (mão sobre o botão por 1 s, com anel de progresso) e também por toque. Calibração com silhueta que fica verde quando os 12 pontos principais estão visíveis acima de 0,6 e dentro da tela; aviso de pouca luz quando a visibilidade média cai abaixo de 0,5; lembrete de afastar os móveis. Contagem "3, 2, 1" falada. Pausa levantando as duas mãos por 1 s. Resultado com 1 a 3 estrelas e confete.
- **Aceite:** no Playwright com `?sim=1`, uma partida vai do menu ao resultado sem toque nenhum depois do "Começar", usando só gestos simulados; nenhuma tela mostra mensagem negativa; o resultado nunca tem menos de 1 estrela.

### Etapa 6 · Narração, progresso e as 5 músicas (MVP pronto)

- **Construir:** `narrator.ts` com as falas de `texts.ts` (boas-vindas, instruções, nome de cada pose quando o cartão aparece, comemorações); progresso no IndexedDB (melhor resultado por música e nível, total de estrelas); seleção de música e nível com as 5 músicas, que mostram um cadeado com "Peça para um adulto carregar a música" enquanto não tiverem áudio; dica de água e descanso depois de 3 músicas seguidas.
- **Aceite:** progresso continua depois de recarregar a página (Playwright); sem voz `pt-BR` a frase aparece na tela; o jogo inteiro é jogável com a música de demonstração.

### Etapa 7 · Celular e offline

- **Construir:** `device.ts` com Fullscreen API e `screen.orientation.lock("landscape")` no Android, aviso "Gire o celular" na vertical, Wake Lock durante a música, `devicePixelRatio` limitado a 2, detecção em quadros alternados abaixo de 20 fps, opção de modelo `full`. Manifest e service worker com pré-cache de tudo, incluindo `public/mediapipe/`. Layout 16:9 que estende o cenário nas laterais em telas 20:9.
- **Aceite:** Playwright com viewport de celular na vertical mostra o aviso; em 915x412 o layout cabe sem rolagem; depois de uma visita, com a rede desligada (`context.setOffline(true)`), o jogo recarrega e abre o menu.

### Etapa 8 · Área dos Pais e editor

- **Construir:** acesso segurando um botão por 3 s. Dentro: carregar MP3 por música (`<input type=file accept="audio/*">`, salvo como Blob no IndexedDB, com aviso de que o áudio não sai do aparelho); editor de seções (toca a música e uma tecla ou toque marca o início de cada parte, arredondando para a batida); ajuste de `offsetMs` com um metrônomo por cima da música; gravador de pose do catálogo (segurar a pose 2 s, média dos ângulos, substitui os valores daquela pose); exportar e importar todos os dados em JSON; configurações (modelo, volume, voz, limites de nota).
- **Aceite:** no Playwright, carregar um WAV gerado no teste libera a música no menu; marcar seções grava `"calibrado": true`; exportar e importar devolve os mesmos dados.

### Etapa 9 · Gravador de coreografias e modo treino

- **Construir:** o fluxo de 5 passos do Plano do Jogo: escolher música e BPM, dançar, retrato a cada N batidas, revisão (apagar retratos, dar nome), salvar como nível com `eventos`. Descartar retratos com pouca visibilidade e tirar da pose os ângulos de membros que não se mexeram. Poses novas podem entrar no catálogo com o nome que ela escolher. Modo treino a 0,5x, que pausa antes de cada pose até "Muito bem" ou 6 s.
- **Aceite:** com `?sim=1`, gravar 16 batidas gera uma fase jogável que aparece no menu; no treino, a música só avança depois da pose.

### Etapa 10 · Personagens, pets e desbloqueios

- **Construir:** grupo de idols original (3 personagens desenhadas em código, com nome, cor e cabelo editáveis na tela de personagens), cachorro e gato que dançam no ritmo e pulam a cada "Perfeito!", personagem a partir de foto do desenho dela (câmera ou arquivo, fundo branco removido por limiar, animação de balanço no ritmo), figurinos (cores e acessórios) e 3 cenários (palco, parque de patins, ciclovia) desbloqueados por total de estrelas: 5, 15 e 30.
- **Aceite:** com progresso falso no IndexedDB, os desbloqueios aparecem nos limites certos; os pets pulam no Perfeito (teste pela contagem de eventos); screenshot de cada cenário.

### Etapa 11 · Extras

- **Construir:** modo dupla (`numPoses: 2`, a pessoa da esquerda e a da direita com nota própria e cor própria); álbum de conquistas (no mínimo 8 medalhas, como "10 músicas" e "5 perfeitos seguidos"); modo história (turnê com as 5 músicas como fases, cada show libera um pet resgatado e um cenário); pose congelada (a música para 3 s em pontos aleatórios do refrão e quem fica parado ganha bônus); modo surpresa (música qualquer do aparelho, BPM detectado em `bpm.ts`, poses sorteadas do catálogo pelo nível).
- **Aceite:** testes de unidade do detector de BPM com batidas sintéticas de 100, 120 e 140 BPM (erro abaixo de 2 BPM); modo dupla com duas pessoas simuladas dá duas notas; conquistas liberam com progresso falso.

## Testes e verificação

O modelo não tem câmera nem caixa de som, então tudo que ele precisa provar roda com pose simulada e áudio sintetizado. O teste de verdade, com ela dançando, fica no roteiro manual do fim desta seção.

**Comandos que precisam existir:**

| Comando | O que faz |
|---|---|
| `npm run check` | `tsc --noEmit`, ESLint, Vitest e `vite build`, nessa ordem |
| `npm run test:e2e` | Playwright em Chromium com `--trace off` |
| `npm run setup:mediapipe` | Copia o wasm e baixa os modelos para `public/mediapipe/` |

**Como a simulação funciona:**

- `SimulatedPoseSource` recebe um roteiro: para cada evento da coreografia, "acertar", "errar por N graus" ou "sumir" (visibilidade zero). Ele monta os 33 pontos a partir dos ângulos-alvo com o mesmo esqueleto do `stickFigure.ts` e acrescenta ruído.
- Gestos simulados: o roteiro também pode pôr a mão sobre um botão ou levantar as duas mãos.
- Em `?sim=1` ou `?test=1`, o jogo expõe `window.__ensaio` com a cena atual, a batida, os resultados e um método para escolher o roteiro. Isso não existe no build de produção.
- O Chromium do Playwright roda com `--use-fake-ui-for-media-stream`, `--use-fake-device-for-media-stream` e `--autoplay-policy=no-user-gesture-required`, para testar também o caminho de permissão da câmera.

**Regra de autoverificação:** depois de cada etapa, o modelo roda `npm run check` e os testes ponta a ponta. Se algo falhar, ele corrige antes de seguir; nunca desliga, pula ou afrouxa um teste para passar. Cada etapa atualiza `PROGRESS.md` com o que foi feito, o que foi verificado e o comando que verificou.

**Roteiro manual com ela** (para você, depois da entrega):

- [ ] No notebook, `?debug=1`: levantar o braço direito e o painel dizer "braço direito"
- [ ] No celular na horizontal, a uns 2 metros: o esqueleto acompanha sem travar e o fps fica acima de 20
- [ ] "Braços pra Cima" dá Perfeito com ela e com você
- [ ] Carregar os 5 MP3 na Área dos Pais e marcar as seções de Brilho no editor
- [ ] Regravar as poses que ela errar muito (Escudo, Mola e Ciclista são as mais prováveis)
- [ ] Ela joga Brilho no fácil sozinha, do menu ao resultado, sem tocar no celular
- [ ] Anotar onde ela travou ou se frustrou e ajustar os limites de nota nas configurações

## Riscos técnicos

O maior risco é a nota parecer injusta com uma criança de verdade, porque os ângulos do catálogo ainda não foram medidos nela. Por isso o gravador de poses e os limites ajustáveis entram antes da v2.

| Risco | Onde aparece | Como o plano contorna |
|---|---|---|
| Poses com braços para a frente não aparecem em 2D | Escudo, Mola, Ciclista | Gravador de pose do catálogo na etapa 8; o painel de debug mostra o ângulo medido |
| Poses parecidas demais | Raio de Sol e Braços pra Cima (30° de diferença), Coração e Orelhas de Cachorro | Pontuação generosa resolve na prática; o cartão e a narração deixam claro qual é a pose |
| Lado esquerdo e direito trocados | Toda pose assimétrica | Teste manual da etapa 3 antes de qualquer coisa; se estiver trocado, um único ajuste em `angles.ts` |
| MediaPipe baixando da internet | Primeira abertura offline | Arquivos em `public/mediapipe/` e pré-cache no service worker |
| Áudio fora de sincronia no Bluetooth | Caixa de som ou fone sem fio | `outputLatency` descontado e ajuste de `offsetMs` na Área dos Pais |
| iPhone não trava a horizontal nem entra em tela cheia | Safari | Aviso "Gire o celular" e instalação como PWA |
| Celular esquentando e caindo de fps | Sessões longas | Modelo `lite`, quadros alternados abaixo de 20 fps, pausa sugerida depois de 3 músicas |
| `speechSynthesis` sem voz `pt-BR` | Alguns Android | Frase grande na tela e som de comemoração |
| Escopo grande demais para uma execução | Etapas 9 a 11 | Ordem por prioridade, commit por etapa e `PROGRESS.md`; uma nova sessão retoma de onde parou |

## Prompt mestre

Cole o texto abaixo no Claude Code com o modelo `claude-fable-5-2`, num repositório que já tenha os três documentos em `docs/`. Ele segue as práticas de one shot: contexto e objetivo primeiro, fonte de verdade única, decisões travadas, ordem de trabalho, critério de pronto verificável e o que fazer diante de dúvida.

```
<contexto>
Você vai construir sozinho, do zero e numa única execução, o "Ensaio de Dança": um jogo de dança
no navegador para uma menina de 7 anos. A webcam lê o corpo dela com o MediaPipe, cartões de pose
chegam no ritmo da música e ela ganha estrelas por imitar cada pose. Roda no celular na horizontal
e no notebook, sem servidor e sem internet depois de carregado. Quem vai jogar não sabe ler bem,
então o jogo fala, usa ícones grandes e nunca mostra derrota.
</contexto>

<fontes_de_verdade>
1. docs/plano-de-construcao.md: especificação técnica, decisões, dados, etapas e critérios de aceite.
   Em qualquer divergência, este documento vence.
2. docs/musicas-e-poses.md: músicas, catálogo de poses e coreografias.
3. docs/plano-do-jogo.md: visão, princípios de design para 7 anos e features.
Leia os três inteiros antes de escrever qualquer código.
</fontes_de_verdade>

<objetivo>
Entregar as etapas 0 a 11 do plano de construção, nessa ordem. O MVP (etapas 0 a 6) é obrigatório e
precisa estar jogável de ponta a ponta com a música de demonstração. As etapas 7 a 11 vêm em seguida,
na ordem, sem pular nenhuma.
</objetivo>

<como_trabalhar>
- Antes de começar, escreva em PROGRESS.md a lista das 12 etapas com os critérios de aceite de cada uma.
- Para cada etapa: implemente, rode `npm run check` e os testes ponta a ponta da etapa, corrija até
  passar, atualize PROGRESS.md com o que foi feito e o comando que provou, e faça um commit
  "etapa N: <resumo>". Só então passe para a próxima.
- Você não tem câmera nem som: prove tudo com SimulatedPoseSource, `?sim=1`, `window.__ensaio` e a
  música de demonstração sintetizada, como descreve a seção "Testes e verificação".
- Tire screenshots das cenas principais com o Playwright e olhe para elas antes de dar a etapa por
  pronta: textos legíveis, nada cortado, nada sobreposto em 1280x720 e em 915x412.
</como_trabalhar>

<regras>
- Use exatamente a stack, as versões e os contratos da seção "Decisões fechadas" e "Arquitetura".
  Não troque bibliotecas nem acrescente framework de interface.
- Não pergunte nada: diante de uma dúvida, escolha a opção mais simples que respeite os princípios
  de design para 7 anos, registre em DECISIONS.md com uma linha de justificativa e siga.
- Nunca desligue, pule ou afrouxe um teste para ele passar. Se um teste estiver errado, corrija o
  teste e explique em DECISIONS.md.
- Nada de TODO, função vazia, dado inventado como se fosse medido ou feature fingida. Se algo não
  der para fazer, diga em PROGRESS.md o que faltou e por quê.
- Não inclua áudio de música no repositório nem no build. Áudio só entra pelo upload na Área dos Pais.
- Todo visual é original e desenhado em código. Não reproduza personagens, logos ou visual do filme.
- Nenhum envio de dados para a rede, nenhuma gravação de vídeo, nenhum comentário sobre o corpo.
- Toda mensagem que aparece para a criança é positiva e em português do Brasil.
</regras>

<pronto_quando>
- `npm run check` e `npm run test:e2e` passam do zero num clone limpo, depois de
  `npm ci && npm run setup:mediapipe`.
- Com `npm run dev` e `?sim=1`, uma partida da música de demonstração vai do menu ao resultado
  só com gestos simulados.
- As 5 músicas aparecem no menu e ficam jogáveis depois de carregar o MP3 na Área dos Pais.
- README.md explica, em português, como instalar, rodar no celular, carregar as músicas, marcar
  as seções, regravar poses e publicar na Vercel.
- PROGRESS.md mostra as 12 etapas com o status final e a evidência de cada critério de aceite.
</pronto_quando>

<relatorio_final>
No fim, responda com: o que foi entregue por etapa, o que ficou faltando e por quê, as decisões que
você tomou sozinho e o roteiro de teste manual que um adulto deve fazer com a criança.
</relatorio_final>
```

**Dica:** se a execução parar no meio, abra uma nova sessão no mesmo repositório com "Continue de onde parou seguindo `PROGRESS.md` e `docs/plano-de-construcao.md`". O commit por etapa garante que nada se perde.

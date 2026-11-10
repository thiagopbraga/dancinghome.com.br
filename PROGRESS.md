# PROGRESS — Ensaio de Dança

Lista das 12 etapas do `docs/plano-de-construcao.md`, com o critério de aceite de cada uma, o que foi feito e o comando que provou.

Legenda: ⬜ não começou · 🟨 em andamento · ✅ pronta

| Etapa | Nome                                     | Status |
| ----- | ---------------------------------------- | ------ |
| 0     | Fundação                                 | ✅     |
| 1     | Dados e regras puras                     | ✅     |
| 2     | Áudio e relógio                          | ✅     |
| 3     | Câmera e esqueleto                       | ✅     |
| 4     | Cena de dança                            | ✅     |
| 5     | Fluxo completo da partida                | ✅     |
| 6     | Narração, progresso e as 5 músicas (MVP) | ✅     |
| 7     | Celular e offline                        | ✅     |
| 8     | Área dos Pais e editor                   | ✅     |
| 9     | Gravador de coreografias e modo treino   | ✅     |
| 10    | Personagens, pets e desbloqueios         | ✅     |
| 11    | Extras                                   | ⬜     |

## Critérios de aceite

- **Etapa 0.** `npm run check` passa; `npm run dev` abre um canvas 16:9 com o texto "Ensaio de Dança"; um teste Playwright confirma o título.
- **Etapa 1.** Testes de unidade cobrem as 6 regras de expansão; ângulos de pontos sintéticos dão 90° e 180° com erro abaixo de 1°; pose igual ao alvo dá "Perfeito" (100), 30° dá "Muito bem" (70), 45° dá "Quase" (40), 70° dá 10; `mirror` troca os lados; todas as coreografias passam no schema e só citam poses do catálogo.
- **Etapa 2.** Teste de unidade do relógio com `AudioContext` falso (tempo de batida, pausa e retomada sem salto); no Playwright, com a música de demonstração, `clock.beat()` avança 2 batidas por segundo com erro abaixo de 50 ms.
- **Etapa 3.** Com `?sim=1` o esqueleto aparece e se move no Playwright; sem permissão de câmera o jogo mostra uma tela amigável em vez de erro.
- **Etapa 4.** Com `?sim=1` e a música de demonstração, todas as poses são avaliadas na ordem certa; com a simulação fazendo a pose certa, pelo menos 90% saem "Perfeito"; screenshot em `tests/e2e/screens/`.
- **Etapa 5.** No Playwright com `?sim=1`, uma partida vai do menu ao resultado sem toque depois do "Começar", só com gestos simulados; nenhuma tela mostra mensagem negativa; o resultado nunca tem menos de 1 estrela.
- **Etapa 6.** Progresso continua depois de recarregar a página; sem voz `pt-BR` a frase aparece na tela; o jogo inteiro é jogável com a música de demonstração.
- **Etapa 7.** Viewport de celular na vertical mostra o aviso; em 915x412 o layout cabe sem rolagem; depois de uma visita, com a rede desligada, o jogo recarrega e abre o menu.
- **Etapa 8.** Carregar um WAV gerado no teste libera a música no menu; marcar seções grava `"calibrado": true`; exportar e importar devolve os mesmos dados.
- **Etapa 9.** Com `?sim=1`, gravar 16 batidas gera uma fase jogável que aparece no menu; no treino, a música só avança depois da pose.
- **Etapa 10.** Com progresso falso no IndexedDB, os desbloqueios aparecem nos limites certos; os pets pulam no Perfeito (contagem de eventos); screenshot de cada cenário.
- **Etapa 11.** Detector de BPM com batidas sintéticas de 100, 120 e 140 BPM (erro abaixo de 2 BPM); modo dupla com duas pessoas simuladas dá duas notas; conquistas liberam com progresso falso.

## Diário

### Etapa 0 · Fundação

- Feito: projeto Vite + TypeScript `strict`, ESLint, Prettier, Vitest, Playwright, `zod`, `idb`, `@mediapipe/tasks-vision`, `vite-plugin-pwa`; `npm run setup:mediapipe` (copia o wasm e baixa os modelos `lite` e `full`); ícones do PWA gerados em código (`npm run icons`); motor de cenas com escala 16:9 (`src/game/engine.ts`); os três documentos em `docs/`.
- Verificado: `npm run check` (tipos, lint, 3 testes de unidade, build) e `npm run test:e2e` (`tests/e2e/etapa0.spec.ts`: título e canvas 1280x720).

### Etapa 1 · Dados e regras puras

- Feito: `src/data/schema.ts` (zod), `catalog.json` com as 18 poses, as 6 coreografias (5 músicas + `ensaio-aquecimento`), `expandSections`, `angles.ts`, `skeleton.ts` (esqueleto a partir dos ângulos), `judge.ts` (tabela de nota, janela de ±300 ms, pesos, energia) e `stars.ts`.
- Verificado com `npm run check`: `tests/unit/choreo.test.ts` (uma prova por regra de expansão, schema, poses citadas existem, variações de cada nível), `tests/unit/angles.test.ts` (90° e 180° com erro < 1°, ida e volta ângulos → esqueleto → ângulos para as 18 poses e suas espelhadas), `tests/unit/judge.test.ts` (100 / 70 / 40 / 10, pesos, visibilidade, `mirror`, janela, energia, estrelas).

### Etapa 2 · Áudio e relógio

- Feito: `SongClock` (`src/core/clock.ts`) sobre `AudioContext.currentTime`, descontando `offsetMs` e `outputLatency`; `AudioEngine` (`src/core/audio.ts`) com tocar, pausar, retomar, `playbackRate` e fade; música de demonstração sintetizada (`src/core/demoSong.ts`); efeitos sonoros com osciladores (`src/core/sfx.ts`); tela do metrônomo em `?cena=metronomo`.
- Verificado: `npm run check` (`tests/unit/clock.test.ts`: tempo de batida, latência, pausa e retomada sem salto, velocidade 0,5x, contagem negativa, duração da demonstração) e `npm run test:e2e` (`tests/e2e/etapa2.spec.ts`: 2 batidas por segundo com erro abaixo de 50 ms, contra o relógio do áudio e contra o relógio de parede). Screenshot: `tests/e2e/screens/etapa2-metronomo.png`.

### Etapa 3 · Câmera e esqueleto

- Feito: `camera.ts` (frontal, 640x480), `MediaPipePoseSource` com GPU e recuo para CPU carregando wasm e modelo de `public/mediapipe/`, filtro One Euro, `SimulatedPoseSource` (`?sim=1`), `PoseTracker`, gestos (`gestures.ts`), cena do vídeo espelhado com esqueleto (`?cena=esqueleto`), painel `?debug=1` com fps, visibilidade média, os 8 ângulos e "braço direito" ou "braço esquerdo", tela amigável quando a câmera não liga.
- Verificado: `npm run check` (`tests/unit/gestures.test.ts`) e `npm run test:e2e` (`tests/e2e/etapa3.spec.ts`): com `?sim=1` o esqueleto aparece, o pulso sobe quando o roteiro levanta o braço direito e o painel escreve "braço direito"; com a câmera recusada aparece a tela "Precisamos da câmera" sem erro de página; com a câmera falsa do Chromium o MediaPipe de verdade carrega só de `localhost` e entrega quadros. Screenshots: `etapa3-esqueleto.png`, `etapa3-sem-camera.png`.
- Fica para o teste manual: levantar o braço direito de verdade e o painel dizer "braço direito".

### Etapa 4 · Cena de dança

- Feito: cena da dança (`src/game/scenes/Danca.ts`) com o espelho no centro, cartões de pose desenhados em código que deslizam até o alvo 4 batidas antes, nome da próxima pose em letras grandes, placar, barra de progresso, palavra de incentivo e estrelinhas a cada nota, poses seguradas com barra, fade de 2 s no fim do trecho, pausa (gesto, toque ou Esc) e tela de resultado com as estrelas.
- Verificado: `npm run test:e2e` (`tests/e2e/etapa4.spec.ts`): com `?sim=1&cena=danca` a demonstração inteira no fácil avalia os 15 eventos na ordem, com 100% de Perfeito e sem erro de página; errando de propósito a nota cai e a pose seguinte volta a ser Perfeito. Screenshots vistos: `etapa4-danca.png` e `etapa4-resultado.png`.

### Etapa 5 · Fluxo completo

- Feito: menu com botões gigantes escolhidos pela mão (1 s com anel de progresso) ou por toque, escolha de música em cartões (cadeado nas que ainda não têm áudio), escolha de nível com os modos Dupla e Estátua, calibração com silhueta que fica verde quando o corpo inteiro aparece, aviso de pouca luz, contagem 3, 2, 1, pausa com as duas mãos para o alto e volta ao menu pelo resultado.
- Verificado: `npm run test:e2e` (`tests/e2e/etapa5.spec.ts`): depois do toque em "Começar", a partida vai do menu ao resultado só com gestos simulados (menu, música, nível, calibração, contagem, dança, pausa e continuar, resultado, menu); quem não acerta nenhuma pose fica com 1 estrela; nenhuma fala tem palavra negativa; a calibração espera o corpo aparecer. Screenshots vistos: `etapa5-menu.png`, `etapa5-musicas.png`, `etapa5-nivel.png`, `etapa5-calibracao.png`, `etapa5-contagem.png`, `etapa5-pausa.png`, `etapa5-resultado.png`.

### Etapa 6 · Narração e progresso

- Feito: narrador com as falas de `texts.ts` (boas-vindas, instruções, nome da pose quando o cartão aparece no fácil, comemoração no resultado) e legenda grande quando não há voz pt-BR; armazenamento no IndexedDB (`src/data/storage.ts`) e regras de progresso (`src/data/progress.ts`): melhor resultado por música e nível, total de estrelas no menu, "Novo recorde!", dica de água a cada 3 músicas seguidas; as 5 músicas no menu com cadeado e "Peça para um adulto carregar a música" enquanto não têm áudio.
- Verificado: `npm run check` (`tests/unit/progress.test.ts`: recorde, soma de estrelas, treino, medalhas, desbloqueios em 5, 15 e 30, ida e volta do armazenamento e exportar/importar sem áudio) e `npm run test:e2e` (`tests/e2e/etapa6.spec.ts`): o progresso é igual depois de recarregar a página; com `?semvoz=1` a frase aparece na tela; as 5 músicas aparecem com cadeado, apontar para uma delas faz o jogo pedir um adulto, e a demonstração é jogável do menu ao resultado; a dica de água vem na terceira música seguida. Screenshots vistos: `etapa6-menu-com-estrelas.png`, `etapa6-legenda.png`, `etapa6-musicas-2.png`, `etapa6-agua.png`.

### Etapa 7 · Celular e offline

- Feito: `src/core/device.ts` (tela cheia e trava de paisagem no toque em "Começar", aviso "Gire o celular" na vertical, tela sempre acesa durante a música, detecção em quadros alternados abaixo de 20 fps), `devicePixelRatio` limitado a 2, opção de modelo `full` lida das configurações, manifest e service worker com pré-cache de tudo, incluindo `public/mediapipe/`, e cenário estendido nas laterais em telas 20:9.
- Verificado: `npm run check` (`tests/unit/device.test.ts`) e `npm run test:e2e`: `tests/e2e/etapa7.spec.ts` (aviso na vertical; em 915x412 não há rolagem e todos os botões cabem na tela do menu ao resultado; virar o celular pausa a dança; a trava de tela é pedida quando a música começa e solta quando acaba) e `tests/e2e/offline.spec.ts` contra o build (depois de uma visita, com a rede desligada, o jogo recarrega, abre o menu e o modelo de pose vem do cache, sem nenhum pedido de rede falho). Screenshots vistos: `etapa7-gire.png`, `etapa7-celular-menu.png`, `etapa7-celular-musicas.png`, `etapa7-celular-danca.png`, `etapa7-celular-resultado.png`, `etapa7-offline-menu.png`.
- Fica para o teste manual: tela cheia, trava de paisagem e tela acesa num celular de verdade.

### Etapa 8 · Área dos Pais

- Feito: Área dos Pais (`src/game/scenes/Pais.ts`), aberta segurando o botão "Pais" por 3 s: carregar o áudio de cada música (guardado como Blob no IndexedDB, com o aviso de que não sai do aparelho), editor de partes (toca a música e o botão "Marcar" ou a barra de espaço marca cada parte na batida mais próxima), ajuste de `offsetMs` e BPM com metrônomo por cima da música, gravador de pose do catálogo (`GravarPose.ts`), exportar e importar os dados em JSON, e configurações (modelo, volume, voz, limites de nota).
- Verificado: `npm run check` (`tests/unit/editor.test.ts`: marcações, pose final, duração, média de ângulos) e `npm run test:e2e` (`tests/e2e/etapa8.spec.ts`): carregar um WAV gerado no teste libera "Brilho" no menu e a partida roda com ele a 123 BPM; marcar as 5 partes com a barra de espaço grava `"calibrado": true`, o `offsetMs` novo e as seções, e tudo continua depois de recarregar; regravar a pose "Estrela" troca os ângulos pelos medidos (erro de até 3°) e "Voltar ao original" desfaz; exportar num contexto e importar em outro devolve o mesmo arquivo, sem áudio, e um arquivo errado é recusado com mensagem clara. Screenshots vistos: `etapa8-pais.png`, `etapa8-editor.png`, `etapa8-gravar-pose.png`, `etapa8-musica-liberada.png`.
- Fica para o teste manual: carregar MP3 de verdade no celular e acertar o `offsetMs` de cada arquivo de ouvido.

### Etapa 9 · Gravador e treino

- Feito: gravador de coreografias (`src/game/scenes/Gravador.ts` e regras puras em `src/core/recorder.ts`) com os 5 passos: escolher a música e o intervalo (4 ou 8 batidas), dançar com a música, retrato a cada N batidas, revisão (tirar ou recolocar retratos, dar nome à dança e às poses novas) e salvar como fase com `eventos`. Retratos com pouca visibilidade ou parados são descartados e os membros que não se mexeram saem da pose. Modo treino a 0,5x pelo botão "Treinar": a música pausa na batida de cada pose até "Muito bem" ou 6 s.
- Verificado: `npm run check` (`tests/unit/recorder.test.ts`) e `npm run test:e2e` (`tests/e2e/etapa9.spec.ts`): com `?sim=1`, gravar 16 batidas gera uma fase com 2 poses (uma do catálogo e uma nova, com o nome dado), que aparece no menu de músicas, é jogável com 100% de Perfeito e continua lá depois de recarregar; no treino a música toca a 0,5x, para na batida 4 enquanto ela está parada e só anda depois da pose, sem mexer nos recordes. Screenshots vistos: `etapa9-escolha.png`, `etapa9-gravando.png`, `etapa9-revisao.png`, `etapa9-nomes.png`, `etapa9-no-menu.png`, `etapa9-treino.png`.

### Etapa 10 · Personagens e cenários

- Feito: grupo de 3 idols originais desenhadas em código (`src/game/draw/idol.ts`), com nome, cor, penteado, cor do cabelo e acessório editáveis na tela "Meu grupo" (`Personagens.ts`); cachorro e gato (`draw/pets.ts`) que balançam no ritmo e pulam a cada "Perfeito!"; personagem a partir da foto do desenho dela (arquivo ou câmera, papel branco removido em `src/core/drawing.ts`, balanço no ritmo); 3 cenários novos (Palco, Parque de patins, Ciclovia) e figurinos liberados com 5, 15 e 30 estrelas.
- Verificado: `npm run check` (`tests/unit/drawing.test.ts`) e `npm run test:e2e` (`tests/e2e/etapa10.spec.ts`): com progresso falso de 4, 5, 14, 15, 29 e 30 estrelas os cadeados abrem nos limites certos; cor por gesto, cabelo, acessório, nomes e cenário ficam guardados depois de recarregar; o contador de pulos dos pets é igual ao número de Perfeitos da partida; os 4 cenários aparecem na dança; uma "foto" de teste vira desenho recortado com fundo transparente e um papel em branco é recusado com explicação. Screenshots vistos: `etapa10-grupo-4-estrelas.png`, `etapa10-grupo-30-estrelas.png`, `etapa10-grupo-editado.png`, `etapa10-menu.png`, `etapa10-desenho.png` e `etapa10-cenario-{sala,palco,patins,ciclovia}.png`.
- Fica para o teste manual: fotografar um desenho de verdade com a câmera do celular.

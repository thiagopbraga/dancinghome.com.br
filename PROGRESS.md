# PROGRESS — Ensaio de Dança

Lista das 12 etapas do `docs/plano-de-construcao.md`, com o critério de aceite de cada uma, o que foi feito e o comando que provou.

Legenda: ⬜ não começou · 🟨 em andamento · ✅ pronta

| Etapa | Nome                                     | Status |
| ----- | ---------------------------------------- | ------ |
| 0     | Fundação                                 | 🟨     |
| 1     | Dados e regras puras                     | ⬜     |
| 2     | Áudio e relógio                          | ⬜     |
| 3     | Câmera e esqueleto                       | ⬜     |
| 4     | Cena de dança                            | ⬜     |
| 5     | Fluxo completo da partida                | ⬜     |
| 6     | Narração, progresso e as 5 músicas (MVP) | ⬜     |
| 7     | Celular e offline                        | ⬜     |
| 8     | Área dos Pais e editor                   | ⬜     |
| 9     | Gravador de coreografias e modo treino   | ⬜     |
| 10    | Personagens, pets e desbloqueios         | ⬜     |
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

# DECISIONS — escolhas feitas durante a construção

Cada linha é uma decisão que o plano não fechava, com a justificativa.

## Etapa 0

- **TypeScript 6.0.3 em vez da 7.x.** O `typescript-eslint` 8.72 só aceita TypeScript abaixo de 6.1; a 6.0 é a mais nova compatível com o lint exigido no `npm run check`.
- **`@playwright/test` 1.63.0.** É a versão que casa com o Chromium já instalado no ambiente de construção; num clone limpo, rode `npx playwright install chromium` uma vez.
- **Modelos e wasm do MediaPipe fora do git.** São ~44 MB; `npm run setup:mediapipe` copia e baixa tudo para `public/mediapipe/`, como o plano pede.
- **Ícones do PWA gerados por script (`scripts/make-icons.mjs`).** Mantém a regra de "todo visual gerado em código" e dá PNG para o iPhone, que não aceita SVG na tela de início.
- **Os testes ponta a ponta rodam em dois servidores.** O servidor de desenvolvimento (porta 5173) para tudo que usa `?sim=1` e `window.__ensaio`, e o build de produção (porta 4173) só para o teste offline, porque o service worker e a ausência de `__ensaio` só existem no build.
- **`docs/musicas-e-poses.md` e `docs/plano-do-jogo.md` foram transcritos dos documentos originais** (os links das fontes de BPM viraram texto simples).

## Etapa 1

- **Brilho usa o JSON do plano ao pé da letra** (`duracaoBeats` 400, trecho até 160); as outras quatro seguem a fórmula do plano (`duracaoBeats` = segundos × BPM / 60, trecho do fácil no múltiplo de 4 mais perto de 75 s).
- **O `final` começa 8 batidas antes do fim, arredondado para baixo num múltiplo de 4**, para as poses não caírem em batidas ímpares quando a duração não é múltipla de 4.
- **A primeira pose de uma seção cortada pela regra da batida 4 é a primeira da lista**, não a segunda: a introdução começa em "Pose de Idol" como no documento.
- **"Mola entre as duas Bolhas" (Guaraná, normal) troca o Braços pra Cima pela Mola**, para o refrão continuar com 4 poses e fechar junto com a frase musical.
- **"Joelho pra Cima depois de cada Estrela" (Letal, normal) insere a pose**, e o refrão fica com 5 poses, como o documento descreve.
- **Segunda Inclinação do segundo verso (O Som da Nossa Voz, normal) entra espelhada no lugar do Raio de Sol**: "para os dois lados".
- **Segurada:** a janela de nota vai da batida até o fim da segurada (mais os 300 ms de cada lado), o que deixa a pose final mais fácil de acertar.
- **Energia cheia = 5 alturas de tronco** de deslocamento somado (pulsos, cotovelos, joelhos e tornozelos) entre duas poses. Levantar os dois braços do descanso já passa de 2.
- **Cotovelo dobra para dentro e joelho para baixo no boneco.** O ângulo sozinho não diz o lado da dobra; essa regra desenha todas as 18 poses de forma reconhecível.
- **Os contratos ficam em `src/core/types.ts`**; `PoseSource` ganhou o campo `aspect` (largura/altura do vídeo), que o cálculo dos ângulos exige.

## Etapas 2 e 3

- **Pausa retoma do ponto que estava sendo ouvido** (posição menos a latência de saída), e o relógio fica parado nesse ponto até o som voltar: assim o tempo nunca anda para trás.
- **A pose simulada fica em `src/core/simPose.ts`**, separada de `poseSource.ts`, e é carregada com `import()` só no servidor de desenvolvimento: `?sim=1` e `window.__ensaio` não existem no build de produção.
- **O cursor da mão é relativo ao corpo** (meio dos ombros e altura do tronco), não à tela: funciona igual a 1 ou a 3 metros da câmera, e as mãos em descanso caem fora da tela, então nada é escolhido sem querer.
- **O filtro One Euro usa o relógio de parede**, não o do áudio, porque o relógio do áudio para na pausa e no treino.
- **A regra do ESLint que barra `TODO` só olha o começo do comentário**, porque "todo" é uma palavra comum em português.
- **O teste "sem permissão de câmera" troca o `getUserMedia` por uma recusa**, já que o Chromium dos testes roda com a permissão sempre aceita (`--use-fake-ui-for-media-stream`).

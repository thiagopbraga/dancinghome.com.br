# Ensaio de Dança — Plano do Jogo

2026-11-09 · Thiago

## Visão geral

Um jogo de dança no navegador: a webcam lê o corpo dela com o MediaPipe, cartões de pose chegam no ritmo da música e ela ganha estrelas por imitar cada pose. Roda no navegador do celular, na horizontal, e também no computador. Não precisa de servidor nem de internet depois de carregado.

**Para quem:** uma menina de 7 anos que gosta de K-pop, aventura, cachorros, gatos, patins e bicicleta.

**Princípios de design para 7 anos:**

- **Sem derrota.** Não existe "game over". Toda música termina com estrelas e uma comemoração.
- **Pouco texto.** Ícones, cores e uma voz narrando. Ela não precisa ler para jogar.
- **Botões gigantes.** Ou, melhor ainda, menus que ela escolhe levantando a mão na frente da câmera.
- **Partidas curtas.** Músicas de 1 a 2 minutos, para caber várias rodadas sem cansar.
- **Pontuação generosa.** O jogo premia o esforço e a energia, não a perfeição.
- **Ela é coautora.** Ela inventa o grupo de idols, os nomes, os pets e até as coreografias.

## Como o jogo funciona

Cada música é uma sequência de poses marcadas em batidas. O jogo compara a pose dela com a pose-alvo no momento da batida e dá um resultado.

**Uma rodada:**

1. Ela escolhe a música e a personagem.
2. Calibração: o jogo pede para ela se afastar até o corpo inteiro aparecer (uma silhueta fica verde).
3. Contagem "3, 2, 1" e a música começa.
4. Cartões com o desenho da pose deslizam até uma linha de chegada, como num Guitar Hero.
5. Quando o cartão chega, o jogo compara a pose e mostra "Perfeito!", "Muito bem!" ou "Quase!".
6. No fim, a tela de estrelas (1 a 3) e os pets comemorando.

**Como a pose é comparada**

O MediaPipe devolve 33 pontos do corpo. Comparar posições diretamente falha com crianças de alturas diferentes ou longe da câmera. Por isso o jogo compara **ângulos das articulações**, que não mudam com o tamanho do corpo nem com a distância.

- 8 ângulos: os 2 cotovelos, os 2 ombros, os 2 quadris e os 2 joelhos.
- Para cada um, a diferença em graus entre ela e a pose-alvo. A nota é a média ponderada (braços pesam mais, porque criança mexe muito mais os braços).
- Janela de tempo: o jogo guarda a melhor nota entre 300 ms antes e 300 ms depois da batida.

| Diferença média | Resultado | Pontos |
|---|---|---|
| até 20° | Perfeito! | 100 |
| 20° a 35° | Muito bem! | 70 |
| 35° a 55° | Quase! | 40 |
| acima de 55° | (sem mensagem negativa) | 10 |

Os limites são um ponto de partida e devem ser ajustados testando com ela. Além da pose, um **bônus de energia** mede quanto o corpo se mexeu entre batidas, para premiar quem dança com vontade mesmo sem acertar a pose.

## Features

O MVP já é um jogo completo com uma música. A v2 traz o que faz ela querer voltar: personagens, pets e coreografias próprias.

| Feature | O que faz | Versão |
|---|---|---|
| Calibração | Silhueta que fica verde quando o corpo inteiro aparece | MVP |
| Câmera espelhada | Ela se vê como num espelho, com o esqueleto desenhado por cima | MVP |
| Cartões de pose | Desenho da pose deslizando até a linha no ritmo da música | MVP |
| Detecção e nota | Comparação por ângulos e mensagens "Perfeito!", "Muito bem!", "Quase!" | MVP |
| Tela de estrelas | 1 a 3 estrelas e confete no fim da música | MVP |
| Menu por gesto | Ela escolhe opções segurando a mão sobre um botão por 1 segundo | MVP |
| Narração | Voz que explica e comemora, para não depender de leitura | MVP |
| Grupo de idols original | Personagens criadas por ela, que dançam ao lado da câmera | v2 |
| Pets mascotes | Um cachorro e um gato que imitam a dança e pulam a cada "Perfeito!" | v2 |
| Gravador de coreografia | Ela dança, o jogo grava as poses e vira uma fase nova | v2 |
| Modo treino | Música a 0,5x, com pausa em cada pose até ela acertar | v2 |
| Figurinos e cenários | Desbloqueados com estrelas: palco, parque de patins, ciclovia | v2 |
| Modo dupla | Pai e filha dançando juntos, cada um com sua nota | v2 |
| Álbum de conquistas | Medalhas como "10 músicas" ou "5 perfeitos seguidos" | Extra |
| Modo história | Uma turnê por cidades, uma música por fase, com resgate de pets | Extra |
| Pose congelada | Pausa na música e todo mundo congela, valendo bônus | Extra |

O **modo história** junta a parte de aventura que ela gosta: cada show libera um pet resgatado e um cenário novo da turnê.

## Arquitetura técnica

Uma aplicação web estática em TypeScript, sem backend. Pode ser publicada como PWA na Vercel. A plataforma principal é o celular na horizontal; o notebook ligado na TV continua funcionando como alternativa.

| Camada | Escolha | Por quê |
|---|---|---|
| Build | Vite + TypeScript | Setup rápido e hot reload |
| Visão | `@mediapipe/tasks-vision` (Pose Landmarker) | Roda no navegador com GPU; modelo `lite` para notebooks fracos, `full` se der |
| Renderização | PixiJS (ou Canvas 2D no começo) | Sprites, partículas e animação a 60 fps |
| Áudio | Web Audio API | Relógio preciso para sincronizar as batidas |
| Dados | JSON por música + IndexedDB | Coreografias e progresso salvos localmente |
| Offline | PWA com service worker | Funciona sem internet depois da primeira visita |

**Fluxo de cada quadro:**

1. A webcam entrega o quadro de vídeo.
2. O Pose Landmarker devolve os 33 pontos do corpo.
3. Um filtro de suavização (One Euro) tira a tremedeira dos pontos.
4. O módulo de ângulos calcula os 8 ângulos.
5. O juiz compara com a pose-alvo da batida atual, usando o relógio do áudio.
6. O placar atualiza e a tela desenha o resultado.

Dois cuidados: o relógio do jogo deve ser o `AudioContext.currentTime`, nunca o tempo do quadro, senão a nota sai fora do ritmo. E, como a imagem é espelhada, as poses-alvo trocam esquerda e direita.

**Estrutura de pastas:**

```
src/
  core/
    camera.ts        // webcam e espelhamento
    pose.ts          // MediaPipe + filtro One Euro
    angles.ts        // cálculo dos 8 ângulos
    judge.ts         // comparação e nota
    clock.ts         // relógio baseado no AudioContext
    bpm.ts           // detecção de ritmo (modo surpresa)
  game/
    scenes/          // Menu, Calibração, Dança, Resultado, Editor
    ui/              // botões por gesto, cartões de pose
    characters/      // idols e pets
  data/
    poses/catalog.json   // catálogo de poses reutilizáveis
    songs/<id>/          // áudio + choreo.json
    storage.ts           // IndexedDB
  main.ts
```

**Formato de uma coreografia (`choreo.json`):**

```json
// poses/catalog.json
{
  "coracao": {
    "nome": "Coração",
    "icone": "coracao.png",
    "angles": { "lElbow": 60, "rElbow": 60, "lShoulder": 150, "rShoulder": 150 }
  },
  "estrela": {
    "nome": "Estrela",
    "icone": "estrela.png",
    "angles": { "lShoulder": 100, "rShoulder": 100, "lHip": 160, "rHip": 160 }
  }
}

// songs/estrela-do-palco/choreo.json
{
  "title": "Estrela do Palco",
  "audio": "musica.mp3",
  "bpm": 110,
  "offsetMs": 420,
  "niveis": {
    "facil":  [ { "beat": 8, "pose": "coracao" }, { "beat": 12, "pose": "estrela" } ],
    "normal": [ { "beat": 8, "pose": "coracao" }, { "beat": 10, "pose": "estrela" } ]
  }
}
```

Cada pose do catálogo lista só os ângulos que importam. Os que ficam de fora não contam na nota, o que deixa as poses mais fáceis de acertar. A coreografia só aponta para as poses pelo nome.

## Celular na horizontal

O MediaPipe funciona no Chrome do Android e no Safari do iPhone, mas o celular exige alguns cuidados que entram já na fase 1.

| Ponto | Como resolver |
|---|---|
| Câmera | Câmera frontal (`facingMode: "user"`), vídeo em 640x480. Exige HTTPS, o que a Vercel já entrega |
| Travar na horizontal | No Android, `screen.orientation.lock("landscape")` depois de entrar em tela cheia. No iPhone o travamento não é suportado: mostrar um aviso "Gire o celular" quando estiver na vertical |
| Tela cheia | Fullscreen API no Android. No iPhone, instalar como PWA ("Adicionar à Tela de Início") com `display: fullscreen` e `orientation: landscape` no manifest |
| Tela apagando | Wake Lock API para a tela não apagar durante a música |
| Áudio | O navegador só libera o som depois de um toque: o botão "Começar" cria o `AudioContext` |
| Desempenho | Modelo `lite`, GPU ligada, detecção em quadros alternados se cair abaixo de 20 fps e `devicePixelRatio` limitado a 2 |
| Aquecimento | Partidas curtas e pausa entre músicas; após alguns minutos o celular pode reduzir a velocidade |
| Distância | Celular num suporte na altura da cintura, ela a uns 2 metros. Nessa distância a tela é pequena, então cartões e ícones precisam ser grandes e de alto contraste |
| Sem toque durante o jogo | Ela está longe do celular: o menu por gesto deixa de ser um extra e vira essencial. Pausar levantando as duas mãos |

O layout é pensado para 16:9 e se adapta a telas mais largas (20:9 dos celulares atuais) estendendo o cenário nas laterais. Espelhar a tela do celular na TV (Chromecast ou AirPlay) é uma ótima opção para ela ver melhor.

## Músicas e poses

Cada música traz uma coreografia pronta, montada a partir de um catálogo de poses reutilizáveis. Ninguém configura ângulos música por música.

**Detalhes:** as músicas base, o catálogo completo de poses e as coreografias de cada música estão em "Ensaio de Dança — Músicas e Poses" (`docs/musicas-e-poses.md`).

**Catálogo de poses.** Umas 20 poses, cada uma com nome, desenho e ângulos: "braços pra cima", "coração com as mãos", "estrela", "joelho pra cima", "mão no queixo" e por aí vai. Ele é criado uma vez só, com o gravador, e serve para todas as músicas.

**Coreografia por música.** Um arquivo que diz só qual pose entra em qual batida. Montar uma música nova é encaixar poses do catálogo.

**Níveis.** A mesma música pode ter dois níveis:

| Nível | Frequência | Poses usadas |
|---|---|---|
| Fácil | 1 pose a cada 4 batidas | Só braços e tronco |
| Normal | 1 pose a cada 2 batidas | Braços, tronco e pernas |

**De onde vêm as músicas:**

1. **Pré-selecionadas (MVP).** De 3 a 5 músicas que já vêm no jogo, com a coreografia montada por você.
2. **Criadas por ela (v2).** Ela usa o gravador, dança e a coreografia vira fase nova. As poses que ela inventar podem entrar no catálogo, com o nome que ela escolher.
3. **Modo surpresa (extra).** Ela escolhe uma música salva no celular, o jogo detecta o BPM e sorteia poses do catálogo, respeitando o nível escolhido.

**Direitos:** para usar em casa, vale usar as músicas de K-pop que vocês já têm. Se um dia quiser publicar o jogo, use apenas faixas livres de direitos.

## Gravador de coreografias

Em vez de digitar ângulos à mão, você (ou ela) dança na frente da câmera e o jogo transforma isso em fase. É a feature que mais economiza trabalho e a que ela mais vai curtir.

1. Escolher a música e informar o BPM (ou usar um detector de BPM simples).
2. Dançar com a música tocando. O jogo grava os ângulos a cada quadro.
3. Em cada batida marcada (por exemplo, a cada 4 batidas), o jogo tira um "retrato" da pose.
4. Uma tela de revisão mostra os retratos. Dá para apagar os ruins e escolher o ícone de cada um.
5. Salvar gera o `choreo.json` no IndexedDB, com opção de exportar.

Poses com pouca visibilidade (o MediaPipe dá uma nota de visibilidade por ponto) são descartadas automaticamente. Antes de salvar, os ângulos quase retos (perto de 180°) dos membros que não se mexeram podem ser removidos, para a pose só cobrar o que é importante.

## Roteiro de construção

Seis fases curtas, cada uma terminando com algo que ela pode testar. As estimativas consideram fins de semana e noites livres.

1. **Prova de conceito (1 fim de semana).** Webcam espelhada com o esqueleto desenhado por cima.
   - Pronto quando: ela se mexe e o esqueleto acompanha sem travar, no celular na horizontal e no notebook.
2. **Uma pose (1 a 2 noites).** Cálculo dos 8 ângulos e uma pose-alvo fixa com a nota na tela.
   - Pronto quando: "braços para cima" dá Perfeito com ela e com você.
3. **MVP com música (2 fins de semana).** Relógio de áudio, cartões de pose, calibração, menu por gesto e tela de estrelas, com uma música e 15 a 20 poses escritas à mão.
   - Pronto quando: ela joga uma música inteira sozinha e pede para jogar de novo.
4. **Gravador de coreografias (1 fim de semana).** Gravar, revisar e salvar fases novas.
   - Pronto quando: ela cria uma coreografia e joga em seguida.
5. **Personagens e pets (2 fins de semana).** Grupo de idols, cachorro e gato animados, figurinos e cenários desbloqueáveis.
   - Pronto quando: ela desenha uma personagem no papel e ela aparece no jogo.
6. **Modo dupla e polimento (1 fim de semana).** Duas pessoas na câmera, modo treino, narração e PWA offline.

No fim de cada fase, uma sessão de teste com ela. Observe onde ela trava ou se frustra, e ajuste a pontuação antes de seguir.

## Segurança e privacidade

A imagem da câmera nunca sai do computador. O MediaPipe processa tudo localmente e o jogo não grava vídeo, só ângulos.

- **Sem rede:** sem login, anúncios, chat ou envio de dados. O progresso fica no IndexedDB do navegador.
- **Espaço livre:** a calibração lembra de afastar móveis. Mostre um tapete ou uma área marcada no chão.
- **Pausas:** depois de 3 músicas seguidas, os pets sugerem beber água e descansar.
- **Sem comparação com o corpo:** o jogo nunca comenta peso, altura ou aparência, só o movimento.
- **Modo dupla:** dançar junto com um adulto, e não sozinha o tempo todo, é o melhor uso do jogo.

## Riscos e próximos passos

| Risco | Como contornar |
|---|---|
| Celular ou notebook lento, menos de 20 fps | Modelo `lite`, vídeo em 640x480 e detecção em quadros alternados |
| Sala escura ou contraluz | Aviso na calibração quando a visibilidade dos pontos cai |
| Câmera não pega o corpo inteiro | Poses da MVP focadas em braços e tronco; pernas só depois |
| Nota parece injusta para ela | Limites generosos, bônus de energia e testes a cada fase |
| Direitos das músicas de K-pop | Para uso em casa, músicas que vocês têm. Para publicar, só faixas livres de direitos |
| Personagens de filmes ou séries | Usar o grupo de idols inventado por ela, sem personagens de terceiros |

**Próximos passos:**

- [ ] Criar o projeto Vite + TypeScript e instalar `@mediapipe/tasks-vision`
- [ ] Fazer a prova de conceito da webcam com esqueleto
- [ ] Sentar com ela para inventar o nome do grupo, as idols e os pets
- [ ] Escolher a primeira música e anotar o BPM

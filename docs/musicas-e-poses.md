# Ensaio de Dança — Músicas e Poses

2026-11-09 · Thiago

As músicas base e o catálogo de poses do jogo. Faz parte do plano "Ensaio de Dança — Plano do Jogo".

## Músicas base

Cinco músicas de Guerreiras do K-pop nas versões dubladas em português, liberadas da mais tranquila para a mais rápida. Brilho abre o jogo porque é a mais conhecida e tem ritmo médio.

| # | Música (PT-BR) | Original | Grupo | BPM | Duração | Pose a cada (fácil / normal) |
|---|---|---|---|---|---|---|
| 1 | Brilho | Golden | HUNTR/X | 123 | ~3:15 | 4 batidas, 2,0 s / 2 batidas, 1,0 s |
| 2 | Meu Pequeno Guaraná | Soda Pop | Saja Boys | 126 | ~2:31 | 4 batidas, 1,9 s / 2 batidas, 1,0 s |
| 3 | O Som da Nossa Voz | What It Sounds Like | HUNTR/X | 120 | ~4:10 | 4 batidas, 2,0 s / 2 batidas, 1,0 s |
| 4 | Letal | Takedown | HUNTR/X | 140 | ~3:02 | 8 batidas, 3,4 s / 4 batidas, 1,7 s |
| 5 | Não Tem Perdão | How It's Done | HUNTR/X | 160 | ~2:56 | 8 batidas, 3,0 s / 4 batidas, 1,5 s |

A regra para 7 anos: no fácil, uma pose a cada 2 a 3 segundos; no normal, a cada 1 a 1,7 segundo. Nas músicas rápidas (Letal e Não Tem Perdão), o intervalo dobra em batidas para manter esse tempo.

Como as músicas têm de 2,5 a 4 minutos, o nível fácil usa **um trecho de 60 a 90 segundos** (introdução curta, um verso e o refrão). O normal usa a música inteira.

Ficaram de fora por enquanto Livres (Free), que é uma balada lenta, e Seu Astro (Your Idol), que tem clima sombrio. As versões dubladas usam o mesmo instrumental das originais, então os BPMs são os mesmos; as durações podem variar alguns segundos. Os BPMs vêm dos dados do Spotify e devem ser conferidos com o detector de ritmo do jogo, porque o início da batida (`offsetMs`) varia de arquivo para arquivo.

## Catálogo de poses

São 33 poses originais (18 iniciais + 15 inspiradas nas coreografias de K-pop das músicas base): 22 fáceis (só braços) e 11 normais (com pernas). Todas foram pensadas para a câmera de frente, que não enxerga bem profundidade.

**Como ler os ângulos:**

- **Ombro:** 0° com o braço colado no corpo, 90° com o braço na horizontal e 180° com o braço para o alto.
- **Cotovelo e joelho:** 180° esticado, 90° dobrado em L.
- **Quadril:** 180° em pé, 90° com a coxa na horizontal.
- E = esquerdo, D = direito, do ponto de vista dela. "Ombros 90" vale para os dois lados.

| ID | Pose | Como fazer | Ângulos-chave | Nível |
|---|---|---|---|---|
| `bracos-pra-cima` | Braços pra Cima | Os dois braços esticados para o alto | Ombros 170, cotovelos 170 | Fácil |
| `estrela` | Estrela | Braços abertos na altura dos ombros | Ombros 90, cotovelos 170 | Fácil |
| `coracao` | Coração | As mãos formam um coração em cima da cabeça | Ombros 150, cotovelos 60 | Fácil |
| `raio-de-sol` | Raio de Sol | Braços em V, esticados para cima e para fora | Ombros 140, cotovelos 170 | Fácil |
| `microfone` | Microfone | Mão D perto da boca, mão E na cintura | Ombro D 30, cotovelo D 40, ombro E 40, cotovelo E 90 | Fácil |
| `pose-de-idol` | Pose de Idol | As duas mãos na cintura | Ombros 40, cotovelos 80 | Fácil |
| `espada-de-luz` | Espada de Luz | Braço D esticado na diagonal para cima, mão E na cintura | Ombro D 150, cotovelo D 170, ombro E 40, cotovelo E 90 | Fácil |
| `escudo` | Escudo | Braços cruzados na frente do peito | Ombros 60, cotovelos 40 | Fácil |
| `apontar` | Apontar pra Galera | Braço D esticado para o lado, apontando | Ombro D 90, cotovelo D 175, ombro E 20 | Fácil |
| `bolhas` | Bolhas de Refri | Uma mão alta e outra baixa, cotovelos dobrados | Ombro E 150, cotovelo E 100, ombro D 30, cotovelo D 100 | Fácil |
| `garrinha-de-gato` | Garrinha de Gato | Mãos em garra ao lado do rosto | Ombros 50, cotovelos 30 | Fácil |
| `orelhas-de-cachorro` | Orelhas de Cachorro | Mãos em cima da cabeça, como orelhas | Ombros 140, cotovelos 30 | Fácil |
| `coroa-dourada` | Coroa Dourada | Cotovelos abertos no alto emoldurando a cabeça como uma coroa dourada | Ombros 115, cotovelos 85 | Fácil |
| `moldura-glam` | Moldura Glam | Braço E alto dobrado sobre a cabeça, braço D dobrado no peito | Ombro E 135, cotovelo E 75, ombro D 45, cotovelo D 65 | Fácil |
| `canudinho` | Canudinho | Mão D pertinho da boca tomando refri e braço E aberto | Ombro D 45, cotovelo D 35, ombro E 100, cotovelo E 165 | Fácil |
| `tampinha` | Estouro da Tampinha | Braços abertos com cotovelos dobrados para cima em L | Ombros 110, cotovelos 95 | Fácil |
| `voz-pro-ceu` | Voz pro Céu | Mão D perto da boca soltando a voz e braço E esticado para o céu | Ombro D 40, cotovelo D 35, ombro E 155, cotovelo E 170 | Fácil |
| `onda-de-som` | Onda de Som | Braço E esticado na horizontal e braço D dobrado no peito | Ombro E 95, cotovelo E 170, ombro D 75, cotovelo D 50 | Fácil |
| `arco-e-flecha` | Arco e Flecha | Braço E esticado mirando para o lado e braço D puxando a corda do arco | Ombros 95, cotovelo E 175, cotovelo D 45 | Fácil |
| `guarda-letal` | Guarda Letal | Braço E alto protegendo a cabeça e braço D em guarda baixa | Ombro E 135, cotovelo E 105, ombro D 55, cotovelo D 45 | Fácil |
| `v-da-vitoria` | V da Vitória | Braço D erguido fazendo um V ao lado da cabeça e braço E no peito | Ombro D 165, cotovelo D 145, ombro E 55, cotovelo E 50 | Fácil |
| `swagger` | Ombro de Idol | Cotovelo D erguido apontando para o lado com atitude e mão E na cintura | Ombro D 115, cotovelo D 55, ombro E 35, cotovelo E 115 | Fácil |
| `joelho-pra-cima` | Joelho pra Cima | Joelho D levantado, braços abertos | Quadril D 100, joelho D 90, ombros 90 | Normal |
| `ciclista` | Ciclista | Joelho D alto, mãos à frente segurando um guidão | Quadril D 100, joelho D 90, ombros 70, cotovelos 120 | Normal |
| `patinadora` | Patinadora | Pernas afastadas, joelhos dobrados, um braço para cima e outro para baixo | Joelhos 140, ombro E 160, ombro D 20 | Normal |
| `mola` | Mola | Agachadinha com os braços esticados à frente | Quadris 120, joelhos 120, ombros 90 | Normal |
| `inclinacao` | Inclinação | Tronco para o lado, braço E por cima da cabeça | Ombro E 170, cotovelo E 140, ombro D 20 | Normal |
| `perna-de-lado` | Perna de Lado | Perna D aberta para o lado, braços em V | Quadril D 150, joelho D 175, ombros 140 | Normal |
| `passo-de-diva` | Passo de Diva | Perna E aberta em pose de palco, braço D coroando no alto e mão E na cintura | Quadril E 145, joelho E 170, ombro D 155, cotovelo D 100, ombro E 40, cotovelo E 85 | Normal |
| `pulo-pop` | Pulo Pop | Joelho E levantado no ritmo, braço D no alto e braço E na cintura | Quadril E 105, joelho E 95, ombro D 145, cotovelo D 110, ombro E 35, cotovelo E 70 | Normal |
| `passo-unido` | Passo Unido | Base firme com joelhos dobrados e braços formando um grande arco acima da cabeça | Quadris 145, joelhos 145, ombros 145, cotovelos 65 | Normal |
| `base-de-guerreira` | Base de Guerreira | Perna E dobrada em base de combate, braço E no alto e mão D na cintura | Quadril E 115, joelho E 110, quadril D 150, joelho D 170, ombro E 145, cotovelo E 170, ombro D 45, cotovelo D 80 | Normal |
| `pose-de-turne` | Pose de Turnê | Joelho E bem alto, braço D esticado para cima e braço E aberto | Quadril E 100, joelho E 90, ombro D 165, ombro E 85 | Normal |

Os ângulos são um ponto de partida. O ideal é regravar cada pose com o gravador, com ela fazendo a pose, e usar os valores medidos.

## Coreografias

Cada música tem um tema e uma sequência de poses por parte, combinando as poses clássicas com as poses inspiradas nas danças de K-pop de cada faixa. No refrão, a sequência se repete, para ela decorar e se sentir craque.

**1. Brilho — tema: brilhar no palco**

- Introdução: Pose de Idol → Moldura Glam → Moldura Glam (espelhada) → Microfone
- Verso: Microfone → Moldura Glam → Apontar pra Galera → Coroa Dourada → Coração → Pose de Idol
- Refrão (repete): Coroa Dourada → Raio de Sol → Braços pra Cima → Estrela → Coração
- Final: Raio de Sol, segurada por 4 batidas
- Normal: Passo de Diva no segundo verso; Perna de Lado e Passo de Diva no lugar da Estrela no segundo refrão

**2. Meu Pequeno Guaraná — tema: festa das bolhas de guaraná**

- Introdução: Bolhas → Bolhas (espelhada) → Estouro da Tampinha → Canudinho
- Verso: Canudinho → Estouro da Tampinha → Apontar pra Galera → Garrinha de Gato → Pose de Idol → Orelhas de Cachorro
- Refrão (repete): Bolhas → Estouro da Tampinha → Braços pra Cima → Bolhas (espelhada) → Canudinho → Coração
- Final: Pose de Idol
- Normal: Mola e Pulo Pop no refrão; Pulo Pop para os dois lados no segundo verso

**3. O Som da Nossa Voz — tema: todo mundo junto**

- Introdução: Escudo → Onda de Som → Onda de Som (espelhada) → Coração
- Verso: Microfone → Voz pro Céu → Onda de Som → Onda de Som (espelhada) → Estrela → Escudo → Raio de Sol
- Refrão (repete): Voz pro Céu → Braços pra Cima → Coração → Estrela → Raio de Sol
- Final: Coração, segurado por 8 batidas
- Normal: Inclinação para os dois lados e Passo Unido no segundo verso; Passo Unido no segundo refrão

**4. Letal — tema: caçadora de monstros**

- Introdução: Guarda Letal → Espada de Luz
- Verso: Espada de Luz → Arco e Flecha → Arco e Flecha (espelhada) → Guarda Letal → Escudo → Apontar pra Galera → Pose de Idol
- Refrão (repete): Espada de Luz → Espada de Luz (espelhada) → Arco e Flecha → Estrela → Braços pra Cima
- Final: Espada de Luz
- Normal: Joelho pra Cima depois de cada Estrela e Base de Guerreira no refrão; Base de Guerreira para os dois lados no segundo verso

**5. Não Tem Perdão — tema: a grande turnê**

- Introdução: Ombro de Idol → V da Vitória
- Verso (fácil): Ombro de Idol → Ombro de Idol (espelhada) → Apontar pra Galera → V da Vitória → Estrela → Microfone
- Verso (normal): Ciclista → Patinadora → Ombro de Idol → Pose de Turnê → Microfone → Apontar pra Galera
- Refrão (fácil): V da Vitória → Estrela → Raio de Sol → Espada de Luz → Coração
- Refrão (normal): V da Vitória → Pose de Turnê → Estrela → Raio de Sol → Espada de Luz → Coração
- Final: Braços pra Cima com confete

As poses "espelhadas" usam a mesma pose com esquerda e direita trocadas. No jogo, basta um campo `"mirror": true` na coreografia, sem criar uma pose nova. As batidas exatas de cada parte só dão para marcar ouvindo o arquivo de áudio, com o editor de coreografia.

## Nos arquivos do jogo

Para não listar centenas de batidas à mão, a coreografia descreve **seções**: onde começam, de quantas em quantas batidas vem uma pose e qual sequência repetir. Na hora de carregar, o jogo expande isso numa lista de poses por batida.

```json
// songs/brilho/choreo.json
{
  "title": "Brilho",
  "audio": "brilho.mp3",
  "bpm": 123,
  "offsetMs": 0,
  "niveis": {
    "facil": {
      "trecho": { "inicioBeat": 0, "fimBeat": 160 },
      "secoes": [
        { "nome": "intro",  "inicioBeat": 0,   "aCada": 4, "poses": ["pose-de-idol", "moldura-glam", { "pose": "moldura-glam", "mirror": true }, "microfone"] },
        { "nome": "verso",  "inicioBeat": 16,  "aCada": 4, "poses": ["microfone", "moldura-glam", "apontar", "coroa-dourada", "coracao", "pose-de-idol"] },
        { "nome": "refrao", "inicioBeat": 80,  "aCada": 4, "poses": ["coroa-dourada", "raio-de-sol", "bracos-pra-cima", "estrela", "coracao"] },
        { "nome": "final",  "inicioBeat": 152, "aCada": 4, "poses": ["raio-de-sol"], "segurar": 4 }
      ]
    }
  }
}
```

Os `inicioBeat` acima são exemplos. Os valores reais saem do editor: você toca a música e aperta uma tecla no começo de cada parte.

```json
// poses/catalog.json (trecho)
{
  "coracao":     { "nome": "Coração",     "nivel": "facil",  "angles": { "lShoulder": 150, "rShoulder": 150, "lElbow": 60, "rElbow": 60 } },
  "raio-de-sol": { "nome": "Raio de Sol", "nivel": "facil",  "angles": { "lShoulder": 140, "rShoulder": 140, "lElbow": 170, "rElbow": 170 } },
  "ciclista":    { "nome": "Ciclista",    "nivel": "normal", "angles": { "rHip": 100, "rKnee": 90, "lShoulder": 70, "rShoulder": 70, "lElbow": 120, "rElbow": 120 } }
}
```

Os arquivos de áudio ficam só no celular de vocês, carregados a partir das músicas que vocês têm, e não vão junto se o jogo for publicado. Os desenhos das poses devem ser de personagens criados por ela, sem usar as personagens do filme.

**Fontes dos BPMs:** SongBPM (Golden, How It's Done, Takedown, What It Sounds Like) e Tunebat (Soda Pop).

**Fontes dos títulos em português:** Billboard Brasil e The Dubbing Database.

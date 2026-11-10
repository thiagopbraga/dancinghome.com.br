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

São 18 poses originais: 12 fáceis (só braços) e 6 normais (com pernas). Todas foram pensadas para a câmera de frente, que não enxerga bem profundidade.

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
| `joelho-pra-cima` | Joelho pra Cima | Joelho D levantado, braços abertos | Quadril D 100, joelho D 90, ombros 90 | Normal |
| `ciclista` | Ciclista | Joelho D alto, mãos à frente segurando um guidão | Quadril D 100, joelho D 90, ombros 70, cotovelos 120 | Normal |
| `patinadora` | Patinadora | Pernas afastadas, joelhos dobrados, um braço para cima e outro para baixo | Joelhos 140, ombro E 160, ombro D 20 | Normal |
| `mola` | Mola | Agachadinha com os braços esticados à frente | Quadris 120, joelhos 120, ombros 90 | Normal |
| `inclinacao` | Inclinação | Tronco para o lado, braço E por cima da cabeça | Ombro E 170, cotovelo E 140, ombro D 20 | Normal |
| `perna-de-lado` | Perna de Lado | Perna D aberta para o lado, braços em V | Quadril D 150, joelho D 175, ombros 140 | Normal |

Os ângulos são um ponto de partida. O ideal é regravar cada pose com o gravador, com ela fazendo a pose, e usar os valores medidos.

## Coreografias

Cada música tem um tema e uma sequência de poses por parte. No refrão, a sequência se repete, para ela decorar e se sentir craque. As coreografias são originais, não cópias das danças do filme.

**1. Brilho — tema: brilhar no palco**

- Introdução: Pose de Idol → Microfone
- Verso: Microfone → Apontar pra Galera → Coração → Pose de Idol
- Refrão (repete): Raio de Sol → Braços pra Cima → Estrela → Coração
- Final: Raio de Sol, segurada por 4 batidas
- Normal: Perna de Lado no lugar da Estrela no segundo refrão

**2. Meu Pequeno Guaraná — tema: festa das bolhas de guaraná**

- Introdução: Bolhas → Bolhas (espelhada)
- Verso: Apontar pra Galera → Garrinha de Gato → Pose de Idol → Orelhas de Cachorro
- Refrão (repete): Bolhas → Braços pra Cima → Bolhas (espelhada) → Coração
- Final: Pose de Idol
- Normal: Mola entre as duas Bolhas do refrão

**3. O Som da Nossa Voz — tema: todo mundo junto**

- Introdução: Escudo → Coração
- Verso: Microfone → Estrela → Escudo → Raio de Sol
- Refrão (repete): Braços pra Cima → Coração → Estrela → Raio de Sol
- Final: Coração, segurado por 8 batidas
- Normal: Inclinação para os dois lados no segundo verso

**4. Letal — tema: caçadora de monstros**

- Introdução: Escudo → Espada de Luz
- Verso: Espada de Luz → Escudo → Apontar pra Galera → Pose de Idol
- Refrão (repete): Espada de Luz → Espada de Luz (espelhada) → Estrela → Braços pra Cima
- Final: Espada de Luz
- Normal: Joelho pra Cima depois de cada Estrela

**5. Não Tem Perdão — tema: a grande turnê**

- Introdução: Pose de Idol → Braços pra Cima
- Verso: Ciclista → Patinadora → Microfone → Apontar pra Galera
- Refrão (repete): Estrela → Raio de Sol → Espada de Luz → Coração
- Final: Braços pra Cima com confete
- Fácil: Ciclista e Patinadora viram Apontar e Estrela, que são só de braços

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
        { "nome": "intro",  "inicioBeat": 0,   "aCada": 4, "poses": ["pose-de-idol", "microfone"] },
        { "nome": "verso",  "inicioBeat": 16,  "aCada": 4, "poses": ["microfone", "apontar", "coracao", "pose-de-idol"] },
        { "nome": "refrao", "inicioBeat": 80,  "aCada": 4, "poses": ["raio-de-sol", "bracos-pra-cima", "estrela", "coracao"] },
        { "nome": "final",  "inicioBeat": 156, "aCada": 4, "poses": ["raio-de-sol"], "segurar": 4 }
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

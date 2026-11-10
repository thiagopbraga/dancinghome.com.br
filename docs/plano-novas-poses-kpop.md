# Plano — Novas Poses de K-pop para as Músicas Configuradas

2026-11-10

## Objetivo

Expandir o catálogo de poses (`src/data/poses/catalog.json`) com **15 novas poses inspiradas em coreografias (*point dances*) de K-pop** para as **5 músicas já configuradas** (*Guerreiras do K-pop* / *KPop Demon Hunters*), mantendo todas as regras ergonômicas para 7 anos e a compatibilidade com a câmera frontal 2D.

## Novas Poses por Música

| Música Base | ID da Pose | Nome | Nível | Inspiração K-pop / Como fazer | Ângulos (`angles`) |
|---|---|---|---|---|---|
| **Brilho** (*Golden*) | `coroa-dourada` | Coroa Dourada | `facil` | Cotovelos abertos no alto emoldurando a cabeça como uma coroa dourada (*point move* de *Golden*) | `lShoulder: 115, rShoulder: 115, lElbow: 85, rElbow: 85` |
| **Brilho** (*Golden*) | `moldura-glam` | Moldura Glam | `facil` | Pose clássica de *ending fairy* / diva: braço E alto dobrado sobre a cabeça, braço D dobrado na frente do peito | `lShoulder: 135, lElbow: 75, rShoulder: 45, rElbow: 65` |
| **Brilho** (*Golden*) | `passo-de-diva` | Passo de Diva | `normal` | Perna E aberta em pose de palco, braço D coroando no alto e mão E na cintura | `lHip: 145, lKnee: 170, rShoulder: 155, rElbow: 100, lShoulder: 40, lElbow: 85` |
| **Meu Pequeno Guaraná** (*Soda Pop*) | `canudinho` | Canudinho | `facil` | Mão D pertinho da boca tomando refri de canudinho e braço E aberto esticado para o lado | `rShoulder: 45, rElbow: 35, lShoulder: 100, lElbow: 165` |
| **Meu Pequeno Guaraná** (*Soda Pop*) | `tampinha` | Estouro da Tampinha | `facil` | O *pop* dos Saja Boys: braços abertos com cotovelos dobrados para cima em L, imitando a tampinha subindo | `lShoulder: 110, rShoulder: 110, lElbow: 95, rElbow: 95` |
| **Meu Pequeno Guaraná** (*Soda Pop*) | `pulo-pop` | Pulo Pop | `normal` | Passo saltitante de *boy group*: joelho E levantado, um braço alto dobrado e o outro baixo | `lHip: 105, lKnee: 95, rShoulder: 145, rElbow: 110, lShoulder: 35, lElbow: 70` |
| **O Som da Nossa Voz** (*What It Sounds Like*) | `voz-pro-ceu` | Voz pro Céu | `facil` | Mão D perto da boca soltando a voz e braço E esticado bem alto apontando para o céu | `rShoulder: 40, rElbow: 35, lShoulder: 155, lElbow: 170` |
| **O Som da Nossa Voz** (*What It Sounds Like*) | `onda-de-som` | Onda de Som | `facil` | *Wave* de braços do K-pop: braço E esticado na horizontal e braço D dobrado no peito | `lShoulder: 95, lElbow: 170, rShoulder: 75, rElbow: 50` |
| **O Som da Nossa Voz** (*What It Sounds Like*) | `passo-unido` | Passo Unido | `normal` | Base firme com joelhos flexionados e braços formando um grande coração/arco acima da cabeça | `lHip: 145, rHip: 145, lKnee: 145, rKnee: 145, lShoulder: 145, rShoulder: 145, lElbow: 65, rElbow: 65` |
| **Letal** (*Takedown*) | `arco-e-flecha` | Arco e Flecha | `facil` | Clássica pose de caçadora de K-pop: braço E esticado mirando para o lado e braço D puxando a corda do arco | `lShoulder: 95, lElbow: 175, rShoulder: 95, rElbow: 45` |
| **Letal** (*Takedown*) | `guarda-letal` | Guarda Letal | `facil` | Bloqueio ágil de artes marciais do K-pop: braço E alto protegendo a cabeça e braço D em guarda baixa | `lShoulder: 135, lElbow: 105, rShoulder: 55, rElbow: 45` |
| **Letal** (*Takedown*) | `base-de-guerreira` | Base de Guerreira | `normal` | Perna E flexionada em avanço de combate, braço E erguido em ataque diagonal e mão D na cintura | `lHip: 115, lKnee: 110, rHip: 150, rKnee: 170, lShoulder: 145, lElbow: 170, rShoulder: 45, rElbow: 80` |
| **Não Tem Perdão** (*How It's Done*) | `v-da-vitoria` | V da Vitória | `facil` | Braço D erguido fazendo um V vibrante ao lado da cabeça e braço E cruzado no peito | `rShoulder: 165, rElbow: 145, lShoulder: 55, lElbow: 50` |
| **Não Tem Perdão** (*How It's Done*) | `swagger` | Ombro de Idol | `facil` | Pose de atitude hip-hop K-pop (*How It's Done*): cotovelo D erguido apontando pro lado e mão E na cintura | `rShoulder: 115, rElbow: 55, lShoulder: 35, lElbow: 115` |
| **Não Tem Perdão** (*How It's Done*) | `pose-de-turne` | Pose de Turnê | `normal` | Grande chute/joelho E no alto com braço D cravado lá em cima e braço E aberto na horizontal | `lHip: 100, lKnee: 90, rShoulder: 165, rElbow: 170, lShoulder: 85, lElbow: 170` |

## Coreografias Atualizadas

1. **Brilho (*Golden*):**
   - Intro (`facil` / `normal`): `pose-de-idol` → `moldura-glam` → `moldura-glam` (espelhada) → `microfone`
   - Verso 1 (`facil` / `normal`): `microfone` → `moldura-glam` → `apontar` → `coroa-dourada` → `coracao` → `pose-de-idol`
   - Refrão 1 (`facil` / `normal`): `coroa-dourada` → `raio-de-sol` → `bracos-pra-cima` → `estrela` → `coracao`
   - Verso 2 (`normal`): `microfone` → `moldura-glam` → `moldura-glam` (espelhada) → `passo-de-diva` → `coracao` → `pose-de-idol`
   - Refrão 2 (`normal`): `coroa-dourada` → `raio-de-sol` → `bracos-pra-cima` → `perna-de-lado` → `passo-de-diva` → `coracao`
   - Final: `raio-de-sol` (segurada por 4 batidas)

2. **Meu Pequeno Guaraná (*Soda Pop*):**
   - Intro (`facil` / `normal`): `bolhas` → `bolhas` (espelhada) → `tampinha` → `canudinho`
   - Verso 1 (`facil` / `normal`): `canudinho` → `tampinha` → `apontar` → `garrinha-de-gato` → `pose-de-idol` → `orelhas-de-cachorro`
   - Refrão (`facil`): `bolhas` → `tampinha` → `bracos-pra-cima` → `bolhas` (espelhada) → `canudinho` → `coracao`
   - Refrão 1 e 2 (`normal`): `bolhas` → `mola` → `tampinha` → `bolhas` (espelhada) → `pulo-pop` → `coracao`
   - Verso 2 (`normal`): `canudinho` → `pulo-pop` → `pulo-pop` (espelhada) → `garrinha-de-gato` → `tampinha` → `orelhas-de-cachorro`
   - Final: `pose-de-idol`

3. **O Som da Nossa Voz (*What It Sounds Like*):**
   - Intro (`facil` / `normal`): `escudo` → `onda-de-som` → `onda-de-som` (espelhada) → `coracao`
   - Verso 1 (`facil` / `normal`): `microfone` → `voz-pro-ceu` → `onda-de-som` → `onda-de-som` (espelhada) → `estrela` → `escudo` → `raio-de-sol`
   - Refrão 1 (`facil` / `normal`): `voz-pro-ceu` → `bracos-pra-cima` → `coracao` → `estrela` → `raio-de-sol`
   - Verso 2 (`normal`): `microfone` → `inclinacao` → `onda-de-som` → `escudo` → `inclinacao` (espelhada) → `passo-unido`
   - Refrão 2 (`normal`): `voz-pro-ceu` → `bracos-pra-cima` → `passo-unido` → `coracao` → `estrela` → `raio-de-sol`
   - Final: `coracao` (segurada por 8 batidas)

4. **Letal (*Takedown*):**
   - Intro (`facil` / `normal`): `guarda-letal` → `espada-de-luz`
   - Verso 1 (`facil` / `normal`): `espada-de-luz` → `arco-e-flecha` → `arco-e-flecha` (espelhada) → `guarda-letal` → `escudo` → `apontar` → `pose-de-idol`
   - Refrão (`facil`): `espada-de-luz` → `espada-de-luz` (espelhada) → `arco-e-flecha` → `estrela` → `bracos-pra-cima`
   - Refrão 1 e 2 (`normal`): `espada-de-luz` → `espada-de-luz` (espelhada) → `arco-e-flecha` → `estrela` → `joelho-pra-cima` → `base-de-guerreira` → `bracos-pra-cima`
   - Verso 2 (`normal`): `espada-de-luz` → `arco-e-flecha` → `base-de-guerreira` → `base-de-guerreira` (espelhada) → `guarda-letal` → `pose-de-idol`
   - Final: `espada-de-luz`

5. **Não Tem Perdão (*How It's Done*):**
   - Intro (`facil` / `normal`): `swagger` → `v-da-vitoria`
   - Verso (`facil`): `swagger` → `swagger` (espelhada) → `apontar` → `v-da-vitoria` → `estrela` → `microfone`
   - Refrão (`facil`): `v-da-vitoria` → `estrela` → `raio-de-sol` → `espada-de-luz` → `coracao`
   - Verso 1 e 2 (`normal`): `ciclista` → `patinadora` → `swagger` → `pose-de-turne` → `microfone` → `apontar`
   - Refrão 1 e 2 (`normal`): `v-da-vitoria` → `pose-de-turne` → `estrela` → `raio-de-sol` → `espada-de-luz` → `coracao`
   - Final: `bracos-pra-cima`

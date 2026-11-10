// Todos os textos e falas do jogo, em português do Brasil. Toda mensagem para a criança é positiva.
import type { Rating } from '../core/types';

export const T = {
  titulo: 'Ensaio de Dança',
  comecar: 'Começar',
  tocarParaComecar: 'Toque para começar',
  carregando: 'Preparando o palco...',
  preparandoCamera: 'Preparando a câmera...',

  menu: {
    jogar: 'Dançar',
    treino: 'Treinar',
    criar: 'Criar dança',
    personagens: 'Meu grupo',
    album: 'Álbum',
    historia: 'Turnê',
    pais: 'Pais',
    segurePais: 'Adulto: segure 3 segundos',
    dicaMao: 'Levante a mão e segure em cima do botão',
  },

  musicas: {
    titulo: 'Escolha a música',
    voltar: 'Voltar',
    anterior: 'Anterior',
    proxima: 'Próxima',
    cadeado: 'Peça para um adulto carregar a música',
    surpresa: 'Surpresa',
    surpresaDica: 'Peça para um adulto escolher uma música do aparelho',
    facil: 'Fácil',
    normal: 'Normal',
    dupla: 'Dupla',
    estatua: 'Estátua',
    ligado: 'ligado',
    desligado: 'desligado',
    escolhaNivel: 'Como você quer dançar?',
    minha: 'Minha dança',
  },

  calibracao: {
    titulo: 'Fique dentro da silhueta',
    afaste: 'Dê uns passos para trás até aparecer o corpo inteiro',
    moveis: 'Afaste os móveis e deixe o chão livre',
    luz: 'Acenda mais uma luz para eu ver você melhor',
    pronto: 'Perfeito! Fique aí!',
    dupla: 'Fiquem lado a lado, os dois dentro da tela',
    pular: 'Pular',
  },

  contagem: ['3', '2', '1', 'Dança!'],

  danca: {
    segure: 'Segure!',
    pausa: 'Pausa',
    continuar: 'Continuar',
    sair: 'Sair',
    pausaDica: 'Para pausar, levante as duas mãos',
    estatua: 'Estátua!',
    estatuaBoa: 'Que estátua linda!',
    estatuaQuase: 'Valeu a tentativa!',
    treinoEspera: 'Faça a pose para a música continuar',
    treinoBoa: 'Isso! Vamos em frente!',
    jogadora: ['Rosa', 'Azul'],
  },

  ratings: {
    perfeito: 'Perfeito!',
    muitoBem: 'Muito bem!',
    quase: 'Quase!',
    tenteiDeNovo: '',
  } satisfies Record<Rating, string>,

  resultado: {
    titulo: 'Você arrasou!',
    estrelas: ['', 'Uma estrela!', 'Duas estrelas!', 'Três estrelas!'],
    pontos: 'pontos',
    energia: 'energia',
    perfeito: 'perfeito',
    perfeitos: 'perfeitos',
    deNovo: 'De novo',
    menu: 'Menu',
    recorde: 'Novo recorde!',
    agua: 'Hora de beber água e descansar um pouquinho!',
    novaConquista: 'Medalha nova',
    desbloqueou: 'Você ganhou',
    proximoShow: 'Próximo show',
  },

  camera: {
    titulo: 'Precisamos da câmera para dançar',
    texto: 'Peça para um adulto permitir a câmera no navegador.',
    tentar: 'Tentar de novo',
    semCamera: 'Não encontrei uma câmera neste aparelho.',
  },

  erroDados: 'Um arquivo do jogo precisa de ajuste:',

  narrador: {
    boasVindas: 'Oi! Bem-vinda ao Ensaio de Dança!',
    menu: 'Levante a mão e segure em cima do que você quer.',
    escolhaMusica: 'Escolha uma música!',
    escolhaNivel: 'Fácil ou normal?',
    calibracao: 'Dê uns passos para trás até aparecer o corpo inteiro. E afaste os móveis!',
    calibracaoOk: 'Perfeito! Fique aí!',
    luz: 'Acenda mais uma luz para eu ver você melhor.',
    danca: 'Dança!',
    pausa: 'Pausa! Para continuar, segure a mão no botão.',
    fim: [
      '',
      'Uma estrela! Que show!',
      'Duas estrelas! Você dançou demais!',
      'Três estrelas! Você é uma estrela!',
    ],
    agua: 'Hora de beber água e descansar um pouquinho!',
    treino: 'Vamos treinar devagar. Faça a pose para a música continuar.',
    estatua: 'Estátua!',
    gravador: 'Dance do seu jeito! Eu vou guardar as suas poses.',
    gravadorFim: 'Que dança linda! Agora escolha as poses que ficam.',
    poseGravar: 'Faça a pose e segure!',
    poseGravada: 'Pose guardada!',
    historiaPet: 'Você resgatou um amigo novo!',
    medalha: 'Você ganhou uma medalha!',
    dupla: 'Fiquem lado a lado!',
    cadeado: 'Peça para um adulto carregar a música.',
    comemoracoes: ['Uau!', 'Isso aí!', 'Que demais!', 'Arrasou!', 'Lindo!'],
  },

  gravador: {
    titulo: 'Criar dança',
    escolha: 'Escolha a música da sua dança',
    aCada: 'Uma pose a cada',
    batidas: 'batidas',
    gravar: 'Gravar',
    gravando: 'Gravando',
    pronto: 'Pronto',
    revisao: 'Toque numa pose para tirar ou colocar de volta',
    nomeDanca: 'Nome da dança',
    nomePadrao: 'Minha dança',
    salvar: 'Salvar',
    descartar: 'Descartar',
    poucas: 'Dance mais um pouquinho para eu pegar mais poses!',
    poseNova: 'Pose nova',
    demo: 'Aquecimento',
    darNomes: 'Dar nomes',
    deNovo: 'Gravar de novo',
    retrato: 'pose guardada',
    retratos: 'poses guardadas',
    tema: 'criada por mim',
    poseAtual: 'Pose de hoje',
    guardar: 'Guardar',
    segure: 'Segure a pose!',
    naoVi: 'Não vi o corpo direito. Chegue para trás, acenda a luz e tente de novo.',
    dicaPose: 'Toque em Gravar, faça a pose e segure. A contagem dá 3 segundos para se preparar.',
    nomePose: 'Nome da pose nova',
    salvo: 'Sua dança está no menu!',
  },

  gravadorPose: {
    titulo: 'Regravar pose',
    prepare: 'Prepare a pose',
    segure: 'Segure a pose!',
    salvo: 'Pose guardada!',
    semCorpo: 'Chegue para trás até eu ver você inteira',
    voltar: 'Voltar',
    deNovo: 'De novo',
  },

  personagens: {
    titulo: 'Meu grupo',
    nome: 'Nome',
    cor: 'Cor',
    cabelo: 'Cabelo',
    acessorio: 'Acessório',
    cenario: 'Cenário',
    desenho: 'Meu desenho',
    foto: 'Tirar foto do desenho',
    arquivo: 'Escolher foto',
    tirar: 'Tirar o desenho',
    faltam: (n: number) => `Faltam ${n} estrelas`,
    voltar: 'Voltar',
    renomear: 'Mudar nome',
    grupo: 'Nome do grupo',
    fotoDica: 'Mostre o desenho num papel branco, bem perto da câmera',
    capturar: 'Capturar',
    cadeado: 'o número no cadeado é quantas estrelas faltam',
    semDesenho: 'Não achei o desenho. Use papel branco e um traço bem forte.',
    idol: 'Nome da idol',
    cachorro: 'Nome do cachorro',
    gato: 'Nome do gato',
  },

  album: {
    titulo: 'Álbum de conquistas',
    estrelas: 'estrelas',
    voltar: 'Voltar',
  },

  historia: {
    titulo: 'A Grande Turnê',
    show: 'Show',
    feito: 'Feito!',
    proximo: 'Próximo show',
    voltar: 'Voltar',
    fim: 'Turnê completa! Todos os amigos resgatados!',
    resgatado: 'resgatado',
  },

  gire: 'Gire o celular',
};

export const CENARIOS: { id: string; nome: string; estrelas: number }[] = [
  { id: 'sala', nome: 'Sala de ensaio', estrelas: 0 },
  { id: 'palco', nome: 'Palco', estrelas: 5 },
  { id: 'patins', nome: 'Parque de patins', estrelas: 15 },
  { id: 'ciclovia', nome: 'Ciclovia', estrelas: 30 },
];

export const ACESSORIOS: { id: string; nome: string; estrelas: number }[] = [
  { id: 'nenhum', nome: 'Sem acessório', estrelas: 0 },
  { id: 'laco', nome: 'Laço', estrelas: 5 },
  { id: 'oculos', nome: 'Óculos de estrela', estrelas: 15 },
  { id: 'coroa', nome: 'Coroa', estrelas: 30 },
];

export const CORES_FIGURINO: { cor: string; estrelas: number }[] = [
  { cor: '#ff5fa8', estrelas: 0 },
  { cor: '#38c6ff', estrelas: 0 },
  { cor: '#ffd640', estrelas: 0 },
  { cor: '#3ddc84', estrelas: 5 },
  { cor: '#b06bff', estrelas: 5 },
  { cor: '#ff9a3d', estrelas: 15 },
  { cor: '#ff4d4d', estrelas: 15 },
  { cor: '#f5f5f5', estrelas: 30 },
];

export const CORES_CABELO = ['#3b2314', '#111111', '#f2c94c', '#ff7ab8', '#7a4dff', '#2ec4b6'];

/** As cinco paradas da turnê do modo história, na ordem das músicas. */
export const TURNE: {
  cidade: string;
  musica: string;
  pet: string;
  petNome: string;
  cenario: string | null;
}[] = [
  {
    cidade: 'Cidade das Luzes',
    musica: 'brilho',
    pet: 'coelho',
    petNome: 'Coelhinha Pluma',
    cenario: 'palco',
  },
  {
    cidade: 'Vila Guaraná',
    musica: 'meu-pequeno-guarana',
    pet: 'passaro',
    petNome: 'Passarinho Pingo',
    cenario: null,
  },
  {
    cidade: 'Porto da Amizade',
    musica: 'o-som-da-nossa-voz',
    pet: 'tartaruga',
    petNome: 'Tartaruga Tuca',
    cenario: 'patins',
  },
  { cidade: 'Montanha Trovão', musica: 'letal', pet: 'hamster', petNome: 'Hamster Bolota', cenario: null },
  {
    cidade: 'Capital da Turnê',
    musica: 'nao-tem-perdao',
    pet: 'porquinho',
    petNome: 'Porquinha Jujuba',
    cenario: 'ciclovia',
  },
];

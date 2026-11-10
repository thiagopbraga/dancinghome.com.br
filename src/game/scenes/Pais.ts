// Área dos Pais: um painel em HTML por cima do jogo, para o adulto.
// Carregar músicas, marcar as partes, regravar poses, configurações e exportar/importar os dados.
import { z } from 'zod';
import type { SongClock } from '../../core/clock';
import { DEFAULT_THRESHOLDS } from '../../core/judge';
import {
  applyMarks,
  beatsInAudio,
  checkMarks,
  fitToDuration,
  marksOf,
  nearestBeat,
  NOME_PARTE,
  PARTES,
  type Marcas,
} from '../../data/editor';
import { describeZodError, type Choreo, type Settings } from '../../data/schema';
import { BASE_SONG_IDS } from '../../data/songs';
import { drawBackdrop } from '../draw/backdrop';
import type { Scene, View } from '../engine';
import type { Game } from '../game';

type Child = Node | string | null | undefined | false;

/** Cria um elemento HTML com atributos e filhos. */
function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number | boolean | ((ev: Event) => void)> = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (typeof v === 'function') node.addEventListener(k.replace(/^on/, ''), v);
    else if (typeof v === 'boolean') {
      if (v) node.setAttribute(k, '');
    } else node.setAttribute(k, String(v));
  }
  for (const c of children) if (c) node.append(c);
  return node;
}

/** Troca o conteúdo de um elemento, pulando os filhos vazios. */
function fill(node: HTMLElement, ...children: Child[]): void {
  node.replaceChildren(...children.filter((c): c is Node | string => !!c));
}

export interface PaisParams {
  /** Abre direto o editor desta música. */
  editar?: string;
  /** Mensagem para mostrar no topo (por exemplo, "Pose guardada"). */
  aviso?: string;
}

interface Editor {
  song: Choreo;
  buffer: AudioBuffer;
  bpm: number;
  offsetMs: number;
  marcas: Marcas;
  /** Próxima parte que o botão "Marcar" grava. */
  proxima: number;
  metronomo: boolean;
  clock: SongClock | null;
  ultimaBatida: number;
}

export class PaisScene implements Scene {
  readonly name = 'pais';
  private readonly root: HTMLDivElement;
  private editor: Editor | null = null;
  private aviso = '';
  private readonly onKey = (ev: KeyboardEvent): void => this.keydown(ev);

  constructor(
    private readonly game: Game,
    private readonly params: PaisParams = {},
  ) {
    this.root = el('div', { class: 'painel', id: 'pais' });
    this.aviso = params.aviso ?? '';
  }

  enter(): void {
    document.getElementById('ui')!.append(this.root);
    document.addEventListener('keydown', this.onKey, true);
    this.game.narrator.silence();
    if (this.params.editar) void this.openEditor(this.params.editar);
    else this.render();
  }

  exit(): void {
    document.removeEventListener('keydown', this.onKey, true);
    this.game.audio.stop();
    this.root.remove();
  }

  update(): void {
    const ed = this.editor;
    if (!ed?.clock) return;
    const beat = ed.clock.beat();
    const batida = this.root.querySelector('#ed-batida');
    if (batida) batida.textContent = ed.clock.running ? String(Math.max(0, Math.floor(beat))) : '–';
    const whole = Math.floor(beat);
    if (ed.clock.running && whole > ed.ultimaBatida) {
      ed.ultimaBatida = whole;
      if (ed.metronomo && whole >= 0) this.game.sfx.play('tick');
      this.root.querySelector('.metronomo')?.classList.toggle('on', whole % 2 === 0);
    }
    if (ed.clock.running && ed.clock.position() >= ed.buffer.duration) this.stopEditor();
  }

  draw(g: CanvasRenderingContext2D, v: View): void {
    drawBackdrop(g, v, this.game.time, '#24163d', '#3d1a85');
  }

  // ---------- tela principal ----------

  private say(msg: string): void {
    this.aviso = msg;
    const box = this.root.querySelector('#pais-aviso');
    if (box) {
      box.textContent = msg;
      (box as HTMLElement).hidden = !msg;
    }
  }

  private render(): void {
    const game = this.game;
    this.editor = null;
    game.audio.stop();
    const semDados = !game.store;
    fill(
      this.root,
      el(
        'div',
        { class: 'topo' },
        el('h1', {}, 'Área dos Pais'),
        el(
          'button',
          { class: 'primario', id: 'pais-voltar', onclick: () => game.go('menu') },
          'Voltar ao jogo',
        ),
      ),
      el('p', { class: 'aviso', id: 'pais-aviso', hidden: !this.aviso }, this.aviso),
      semDados &&
        el(
          'p',
          { class: 'aviso' },
          'Este navegador não deixou guardar dados (modo anônimo?). As músicas e o progresso não vão ficar salvos.',
        ),
      this.musicas(),
      this.poses(),
      this.config(),
      this.dados(),
    );
  }

  private musicas(): HTMLElement {
    const game = this.game;
    const sec = el(
      'section',
      { id: 'pais-musicas' },
      el('h2', {}, 'Músicas'),
      el(
        'p',
        {},
        'Escolha, para cada música, o arquivo de áudio que vocês têm. ',
        el('strong', {}, 'O áudio fica guardado só neste aparelho e não é enviado para lugar nenhum.'),
        ' Depois de carregar, use "Marcar partes" para acertar a batida e o começo de cada parte.',
      ),
    );
    for (const id of BASE_SONG_IDS) {
      const song = game.song(id);
      if (!song) continue;
      const tem = game.audioIds.has(id);
      const input = el('input', {
        type: 'file',
        accept: 'audio/*',
        hidden: true,
        'data-musica': id,
        onchange: (ev) => void this.upload(id, ev.target as HTMLInputElement),
      });
      sec.append(
        el(
          'div',
          { class: 'linha', 'data-linha': id },
          el('span', { class: 'nome' }, song.title),
          el(
            'span',
            { class: tem ? 'ok' : '' },
            tem
              ? song.calibrado
                ? 'com áudio · partes marcadas'
                : 'com áudio · falta marcar as partes'
              : 'sem áudio',
          ),
          el('label', { class: 'botao' }, tem ? 'Trocar o áudio' : 'Carregar música', input),
          tem &&
            el('button', { 'data-editar': id, onclick: () => void this.openEditor(id) }, 'Marcar partes'),
          tem &&
            el('button', { 'data-remover': id, onclick: () => void this.removeAudio(id) }, 'Remover o áudio'),
        ),
      );
    }
    const gravadas = game.songs.filter((s) => s.origem === 'gravada');
    if (gravadas.length > 0) {
      sec.append(el('h3', {}, 'Danças criadas por ela'));
      for (const g of gravadas) {
        sec.append(
          el(
            'div',
            { class: 'linha' },
            el('span', { class: 'nome' }, g.title),
            el(
              'button',
              {
                'data-apagar': g.id,
                onclick: () => void this.deleteChoreo(g.id, `A dança "${g.title}" foi apagada.`),
              },
              'Apagar',
            ),
          ),
        );
      }
    }
    return sec;
  }

  private async upload(id: string, input: HTMLInputElement): Promise<void> {
    const game = this.game;
    const file = input.files?.[0];
    if (!file) return;
    if (!game.store) {
      this.say('Este navegador não deixou guardar dados.');
      return;
    }
    this.say('Abrindo o arquivo...');
    try {
      const dados = await file.arrayBuffer();
      const buffer = await game.audio.decode(dados);
      await game.store.saveAudio({ id, nome: file.name, tipo: file.type, dados });
      const song = game.song(id);
      if (song && !song.calibrado) {
        await game.store.saveChoreo(
          fitToDuration(song, beatsInAudio(buffer.duration, song.bpm, song.offsetMs)),
        );
      }
      await game.reload();
      this.aviso = `"${file.name}" carregada. Agora use "Marcar partes" para acertar a batida.`;
    } catch (err) {
      console.warn('Não consegui abrir o áudio', err);
      this.aviso = 'Não consegui abrir este arquivo. Tente um MP3, M4A ou WAV.';
    }
    this.render();
  }

  private async removeAudio(id: string): Promise<void> {
    await this.game.store?.deleteAudio(id);
    await this.game.reload();
    this.aviso = 'Áudio removido deste aparelho.';
    this.render();
  }

  private async deleteChoreo(id: string, msg: string): Promise<void> {
    await this.game.store?.deleteChoreo(id);
    await this.game.reload();
    this.aviso = msg;
    this.render();
  }

  private poses(): HTMLElement {
    const game = this.game;
    const sec = el(
      'section',
      { id: 'pais-poses' },
      el('h2', {}, 'Poses'),
      el(
        'p',
        {},
        'Os ângulos das poses são um ponto de partida. O ideal é regravar cada pose com ela fazendo: o jogo passa a usar o jeito dela.',
      ),
    );
    const lista = el('div', { class: 'marca-lista' });
    for (const [id, def] of Object.entries(game.catalog)) {
      const original = game.baseCatalog[id];
      const mudou = !original || JSON.stringify(original.angles) !== JSON.stringify(def.angles);
      lista.append(
        el(
          'div',
          { class: 'marca', 'data-pose': id },
          el('strong', {}, def.nome),
          el('div', {}, mudou ? (original ? 'regravada' : 'criada por ela') : 'original'),
          el('button', { 'data-regravar': id, onclick: () => game.go('gravarPose', id) }, 'Regravar'),
          mudou &&
            el(
              'button',
              { 'data-restaurar': id, onclick: () => void this.restorePose(id, !!original) },
              original ? 'Voltar ao original' : 'Apagar',
            ),
        ),
      );
    }
    sec.append(lista);
    return sec;
  }

  private async restorePose(id: string, temOriginal: boolean): Promise<void> {
    const game = this.game;
    if (!temOriginal && game.songs.some((s) => JSON.stringify(s.niveis).includes(`"${id}"`))) {
      this.say('Esta pose é usada numa dança criada por ela. Apague a dança antes.');
      return;
    }
    await game.store?.deletePose(id);
    await game.reload();
    this.aviso = temOriginal ? 'A pose voltou ao original.' : 'Pose apagada.';
    this.render();
  }

  private config(): HTMLElement {
    const game = this.game;
    const s = game.settings;
    const salvar = (parcial: Partial<Settings>): void => {
      void game.saveSettings({ ...game.settings, ...parcial });
    };
    const limite = (campo: 'perfeito' | 'muitoBem' | 'quase', nome: string): HTMLElement =>
      el(
        'label',
        {},
        `${nome} até `,
        el('input', {
          type: 'number',
          min: 5,
          max: 90,
          step: 1,
          value: s.limites[campo],
          'data-limite': campo,
          onchange: (ev) => {
            const v = Number((ev.target as HTMLInputElement).value);
            const lim = { ...game.settings.limites, [campo]: v };
            if (
              Number.isFinite(v) &&
              lim.perfeito < lim.muitoBem &&
              lim.muitoBem < lim.quase &&
              v >= 5 &&
              v <= 90
            ) {
              salvar({ limites: lim });
              this.say('Limites guardados.');
            } else {
              this.say('Os limites precisam crescer: Perfeito < Muito bem < Quase, entre 5 e 90 graus.');
            }
          },
        }),
        '°',
      );
    const modelo = el(
      'select',
      {
        id: 'cfg-modelo',
        onchange: (ev) => {
          salvar({ modelo: (ev.target as HTMLSelectElement).value as Settings['modelo'] });
          game.poseState = game.poseState === 'pronta' ? 'desligada' : game.poseState;
          this.say('Modelo guardado. Ele passa a valer na próxima vez que a câmera ligar.');
        },
      },
      el('option', { value: 'lite', selected: s.modelo === 'lite' }, 'Leve (recomendado para celular)'),
      el('option', { value: 'full', selected: s.modelo === 'full' }, 'Completo (mais preciso, mais pesado)'),
    );
    return el(
      'section',
      { id: 'pais-config' },
      el('h2', {}, 'Configurações'),
      el('div', { class: 'linha' }, el('span', { class: 'nome' }, 'Modelo de detecção'), modelo),
      el(
        'div',
        { class: 'linha' },
        el('span', { class: 'nome' }, 'Volume'),
        el('input', {
          type: 'range',
          id: 'cfg-volume',
          min: 0,
          max: 1,
          step: 0.05,
          value: s.volume,
          onchange: (ev) => salvar({ volume: Number((ev.target as HTMLInputElement).value) }),
        }),
      ),
      el(
        'div',
        { class: 'linha' },
        el('span', { class: 'nome' }, 'Voz do narrador'),
        el(
          'label',
          {},
          el('input', {
            type: 'checkbox',
            id: 'cfg-voz',
            checked: s.voz,
            onchange: (ev) => salvar({ voz: (ev.target as HTMLInputElement).checked }),
          }),
          ' ligada',
        ),
      ),
      el(
        'div',
        { class: 'linha' },
        el('span', { class: 'nome' }, 'Limites de nota (diferença em graus)'),
        limite('perfeito', 'Perfeito'),
        limite('muitoBem', 'Muito bem'),
        limite('quase', 'Quase'),
        el(
          'button',
          {
            id: 'cfg-limites-padrao',
            onclick: () => {
              salvar({ limites: { ...DEFAULT_THRESHOLDS } });
              this.aviso = 'Limites de volta ao padrão.';
              this.render();
            },
          },
          'Padrão',
        ),
      ),
    );
  }

  private dados(): HTMLElement {
    return el(
      'section',
      { id: 'pais-dados' },
      el('h2', {}, 'Guardar e trazer os dados'),
      el(
        'p',
        {},
        'O arquivo leva o progresso, as configurações, as personagens, as marcações das músicas e as poses. As músicas (áudio) não entram no arquivo.',
      ),
      el(
        'div',
        { class: 'linha' },
        el('button', { id: 'pais-exportar', onclick: () => void this.exportar() }, 'Exportar dados'),
        el(
          'label',
          { class: 'botao' },
          'Importar dados',
          el('input', {
            type: 'file',
            accept: 'application/json,.json',
            hidden: true,
            id: 'pais-importar',
            onchange: (ev) => void this.importar(ev.target as HTMLInputElement),
          }),
        ),
      ),
    );
  }

  private async exportar(): Promise<void> {
    const store = this.game.store;
    if (!store) return;
    const json = JSON.stringify(await store.exportAll(), null, 2);
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const a = el('a', { href: url, download: 'ensaio-de-danca-dados.json' });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    this.say('Arquivo "ensaio-de-danca-dados.json" criado.');
  }

  private async importar(input: HTMLInputElement): Promise<void> {
    const file = input.files?.[0];
    const store = this.game.store;
    if (!file || !store) return;
    try {
      await store.importAll(JSON.parse(await file.text()));
      await this.game.reload();
      this.aviso = 'Dados importados.';
    } catch (err) {
      this.aviso =
        err instanceof z.ZodError
          ? `Este arquivo não parece ser do Ensaio de Dança (${describeZodError(err)}).`
          : 'Não consegui ler este arquivo.';
    }
    this.render();
  }

  // ---------- editor de seções ----------

  private async openEditor(id: string): Promise<void> {
    const game = this.game;
    const song = game.song(id);
    const buffer = song ? await game.audioFor(song) : null;
    if (!song || !buffer) {
      this.aviso = 'Carregue o áudio desta música antes de marcar as partes.';
      this.render();
      return;
    }
    this.editor = {
      song,
      buffer,
      bpm: song.bpm,
      offsetMs: song.offsetMs,
      marcas: marksOf(song),
      proxima: 0,
      metronomo: true,
      clock: null,
      ultimaBatida: -1,
    };
    this.renderEditor();
  }

  private duracaoBeats(ed: Editor): number {
    return beatsInAudio(ed.buffer.duration, ed.bpm, ed.offsetMs);
  }

  private renderEditor(): void {
    const ed = this.editor;
    if (!ed) return;
    const marcas = el('div', { class: 'marca-lista', id: 'ed-marcas' });
    PARTES.forEach((parte, i) => {
      marcas.append(
        el(
          'div',
          { class: `marca${i === ed.proxima ? ' atual' : ''}`, 'data-parte': parte },
          el('strong', {}, NOME_PARTE[parte]),
          el(
            'label',
            {},
            'batida ',
            el('input', {
              type: 'number',
              min: 0,
              step: 1,
              value: ed.marcas[parte],
              'data-marca': parte,
              style: 'width: 90px',
              onchange: (ev) => {
                ed.marcas[parte] = nearestBeat(Number((ev.target as HTMLInputElement).value) || 0);
                this.renderEditor();
              },
            }),
          ),
          el('button', { onclick: () => this.playEditor(ed.marcas[parte] - 2) }, 'Ouvir daqui'),
        ),
      );
    });
    const erro = checkMarks(ed.marcas, this.duracaoBeats(ed));
    fill(
      this.root,
      el(
        'div',
        { class: 'topo' },
        el('h1', {}, `Marcar partes · ${ed.song.title}`),
        el('button', { id: 'ed-fechar', onclick: () => this.render() }, 'Fechar sem guardar'),
      ),
      el('p', { class: 'aviso', id: 'pais-aviso', hidden: !this.aviso }, this.aviso),
      el('h2', {}, '1. Acertar a batida'),
      el(
        'p',
        {},
        'Toque a música com o metrônomo ligado. Se os cliques caírem fora da batida, ajuste o começo da batida até encaixar. O BPM já vem certo para as cinco músicas; só mude se o seu arquivo for outra versão.',
      ),
      el(
        'div',
        { class: 'linha' },
        el(
          'button',
          { id: 'ed-tocar', class: 'primario', onclick: () => this.playEditor(0) },
          'Tocar do começo',
        ),
        el('button', { id: 'ed-parar', onclick: () => this.stopEditor() }, 'Parar'),
        el(
          'label',
          {},
          el('input', {
            type: 'checkbox',
            id: 'ed-metronomo',
            checked: ed.metronomo,
            onchange: (ev) => {
              ed.metronomo = (ev.target as HTMLInputElement).checked;
            },
          }),
          ' metrônomo por cima da música ',
          el('span', { class: 'metronomo' }),
        ),
        el('span', {}, 'Batida: ', el('strong', { id: 'ed-batida' }, '–')),
      ),
      el(
        'div',
        { class: 'linha' },
        el('span', { class: 'nome' }, 'Começo da batida (offsetMs)'),
        el('input', {
          type: 'range',
          id: 'ed-offset',
          min: 0,
          max: 3000,
          step: 5,
          value: ed.offsetMs,
          oninput: (ev) => this.setTempo(ed.bpm, Number((ev.target as HTMLInputElement).value), false),
        }),
        el('input', {
          type: 'number',
          id: 'ed-offset-num',
          min: -2000,
          max: 20000,
          step: 5,
          value: ed.offsetMs,
          style: 'width: 110px',
          onchange: (ev) => this.setTempo(ed.bpm, Number((ev.target as HTMLInputElement).value) || 0, true),
        }),
        ' ms',
      ),
      el(
        'div',
        { class: 'linha' },
        el('span', { class: 'nome' }, 'BPM'),
        el('input', {
          type: 'number',
          id: 'ed-bpm',
          min: 40,
          max: 240,
          step: 0.1,
          value: ed.bpm,
          style: 'width: 110px',
          onchange: (ev) => {
            const v = Number((ev.target as HTMLInputElement).value);
            if (v >= 40 && v <= 240) this.setTempo(v, ed.offsetMs, true);
          },
        }),
        ...this.editorExtras(ed),
      ),
      el('h2', {}, '2. Marcar o começo de cada parte'),
      el(
        'p',
        {},
        'Toque a música e aperte "Marcar" (ou a barra de espaço) quando cada parte começar, na ordem. A marcação vai para a batida mais próxima. Também dá para digitar o número da batida.',
      ),
      el(
        'div',
        { class: 'linha' },
        el(
          'button',
          { id: 'ed-marcar', class: 'primario', onclick: () => this.mark() },
          ed.proxima < PARTES.length ? `Marcar: ${NOME_PARTE[PARTES[ed.proxima]]}` : 'Todas marcadas',
        ),
        el(
          'button',
          {
            id: 'ed-recomecar',
            onclick: () => {
              ed.proxima = 0;
              this.renderEditor();
            },
          },
          'Marcar de novo desde a introdução',
        ),
      ),
      marcas,
      erro && el('p', { class: 'aviso', id: 'ed-erro' }, erro),
      el(
        'div',
        { class: 'linha' },
        el(
          'button',
          { id: 'ed-salvar', class: 'primario', disabled: !!erro, onclick: () => void this.saveEditor() },
          'Guardar marcações',
        ),
        el(
          'button',
          {
            id: 'ed-original',
            onclick: () => void this.deleteChoreo(ed.song.id, 'As marcações voltaram às que vêm com o jogo.'),
          },
          'Voltar às marcações do jogo',
        ),
      ),
    );
    if (ed.proxima >= PARTES.length)
      (this.root.querySelector('#ed-marcar') as HTMLButtonElement).disabled = true;
  }

  /** Botões extras do editor (o detector de BPM entra aqui). */
  private editorExtras(ed: Editor): Child[] {
    return this.game.editorTools.map((tool) =>
      el(
        'button',
        {
          'data-ferramenta': tool.id,
          onclick: () => {
            const r = tool.run(ed.buffer);
            if (r.bpm) this.setTempo(r.bpm, r.offsetMs ?? ed.offsetMs, true);
            this.say(r.mensagem);
          },
        },
        tool.nome,
      ),
    );
  }

  private setTempo(bpm: number, offsetMs: number, rerender: boolean): void {
    const ed = this.editor;
    if (!ed) return;
    ed.bpm = bpm;
    ed.offsetMs = offsetMs;
    if (ed.clock?.running) {
      // continua tocando do mesmo ponto, com a batida nova
      const pos = ed.clock.position();
      ed.clock = this.game.audio.load(ed.buffer, ed.bpm, ed.offsetMs);
      this.game.audio.play(pos, 1, 0.05);
      ed.ultimaBatida = Math.floor(ed.clock.beat());
    }
    if (rerender) this.renderEditor();
    else {
      const num = this.root.querySelector('#ed-offset-num') as HTMLInputElement | null;
      if (num) num.value = String(offsetMs);
    }
  }

  private playEditor(fromBeat: number): void {
    const ed = this.editor;
    if (!ed) return;
    ed.clock = this.game.audio.load(ed.buffer, ed.bpm, ed.offsetMs);
    const pos = Math.max(0, ed.clock.positionOfBeat(Math.max(0, fromBeat)));
    this.game.audio.play(fromBeat <= 0 ? 0 : pos, 1, 0.08);
    ed.ultimaBatida = Math.floor(ed.clock.beat());
  }

  private stopEditor(): void {
    const ed = this.editor;
    this.game.audio.stop();
    if (ed) ed.clock = null;
    const batida = this.root.querySelector('#ed-batida');
    if (batida) batida.textContent = '–';
  }

  private mark(): void {
    const ed = this.editor;
    if (!ed || ed.proxima >= PARTES.length) return;
    if (!ed.clock?.running) {
      this.say('Toque a música antes de marcar.');
      return;
    }
    ed.marcas[PARTES[ed.proxima]] = nearestBeat(ed.clock.beat());
    ed.proxima++;
    this.aviso = '';
    this.renderEditor();
  }

  private keydown(ev: KeyboardEvent): void {
    if (!this.editor || ev.code !== 'Space') return;
    const t = ev.target as HTMLElement | null;
    if (t && t.tagName === 'INPUT' && (t as HTMLInputElement).type !== 'checkbox') return;
    ev.preventDefault();
    ev.stopPropagation();
    (document.activeElement as HTMLElement | null)?.blur?.();
    this.mark();
  }

  private async saveEditor(): Promise<void> {
    const ed = this.editor;
    const game = this.game;
    if (!ed || !game.store) return;
    const dur = this.duracaoBeats(ed);
    if (checkMarks(ed.marcas, dur)) return;
    await game.store.saveChoreo(
      applyMarks(ed.song, ed.marcas, { bpm: ed.bpm, offsetMs: ed.offsetMs, duracaoBeats: dur }),
    );
    await game.reload();
    this.aviso = `Marcações de "${ed.song.title}" guardadas.`;
    this.render();
  }
}

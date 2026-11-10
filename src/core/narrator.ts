// Narração com speechSynthesis em pt-BR. Sem voz disponível, a frase aparece grande na tela e toca um som.

export interface Caption {
  text: string;
  /** Segundos restantes na tela. */
  left: number;
}

export interface SayOptions {
  /** false: não mostra legenda quando não há voz (o texto já está na tela). */
  caption?: boolean;
  /** true: corta a fala anterior. */
  interrupt?: boolean;
}

export class Narrator {
  /** Configuração "voz" da Área dos Pais. */
  enabled = true;
  caption: Caption | null = null;
  /** Últimas frases, para os testes. */
  readonly history: string[] = [];
  private voice: SpeechSynthesisVoice | null = null;
  private readonly synth: SpeechSynthesis | null;

  constructor(
    private readonly forceNoVoice: boolean,
    private readonly onFallback: () => void,
  ) {
    this.synth = !forceNoVoice && typeof speechSynthesis !== 'undefined' ? speechSynthesis : null;
    if (this.synth) {
      this.pickVoice();
      this.synth.addEventListener?.('voiceschanged', () => this.pickVoice());
    }
  }

  private pickVoice(): void {
    const voices = this.synth?.getVoices() ?? [];
    const norm = (l: string): string => l.toLowerCase().replace('_', '-');
    this.voice =
      voices.find((v) => norm(v.lang) === 'pt-br' && v.localService) ??
      voices.find((v) => norm(v.lang) === 'pt-br') ??
      null;
  }

  /** Há uma voz pt-BR pronta para falar? */
  get hasVoice(): boolean {
    return !!this.synth && !!this.voice;
  }

  say(text: string, opts: SayOptions = {}): void {
    if (!text) return;
    this.history.push(text);
    if (this.history.length > 50) this.history.shift();
    if (this.enabled && this.hasVoice && this.synth) {
      if (opts.interrupt) this.synth.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'pt-BR';
      u.voice = this.voice;
      u.rate = 1.05;
      u.pitch = 1.15;
      this.synth.speak(u);
      return;
    }
    if (opts.caption === false) return;
    this.caption = { text, left: Math.max(2.2, text.length * 0.075) };
    if (this.enabled) this.onFallback();
  }

  update(dt: number): void {
    if (this.caption) {
      this.caption.left -= dt;
      if (this.caption.left <= 0) this.caption = null;
    }
  }

  silence(): void {
    this.synth?.cancel();
    this.caption = null;
  }
}

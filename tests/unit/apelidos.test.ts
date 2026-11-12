import { describe, expect, it } from 'vitest';
import {
  ANIMAIS,
  gerarApelido,
  isValidApelido,
  parseApelido,
  QUALIDADES,
  sugerirApelidos,
  TOTAL_COMBINACOES,
} from '../../shared/apelidos';

describe('listas fechadas de apelidos (shared/apelidos.ts)', () => {
  it('possui exatamente 40 animais únicos, 40 qualidades únicas e 160.000 combinações', () => {
    expect(ANIMAIS).toHaveLength(40);
    expect(new Set(ANIMAIS).size).toBe(40);
    expect(QUALIDADES).toHaveLength(40);
    expect(new Set(QUALIDADES).size).toBe(40);
    expect(TOTAL_COMBINACOES).toBe(160_000);
  });

  it('aceita apelidos válidos formados pela combinação exata da lista fechada', () => {
    expect(isValidApelido('Gatinha Brilhante 27')).toBe(true);
    expect(isValidApelido('Coelho Veloz 08')).toBe(true);
    expect(isValidApelido('Dragão Dançante 54')).toBe(true);
    expect(parseApelido('Unicórnio Estelar 00')).toEqual({
      animal: 'Unicórnio',
      qualidade: 'Estelar',
      numero: '00',
    });
  });

  it('rejeita texto livre, nomes próprios, números fora de 00..99 ou espaços extras', () => {
    expect(isValidApelido('')).toBe(false);
    expect(isValidApelido('Maria Silva 10')).toBe(false);
    expect(isValidApelido('Gatinha Super 27')).toBe(false);
    expect(isValidApelido('Gatinha Brilhante 7')).toBe(false);
    expect(isValidApelido('Gatinha Brilhante 100')).toBe(false);
    expect(isValidApelido('Gatinha Brilhante -1')).toBe(false);
    expect(isValidApelido(' Gatinha Brilhante 27')).toBe(false);
    expect(isValidApelido('Gatinha Brilhante 27 ')).toBe(false);
    expect(isValidApelido('Gatinha  Brilhante 27')).toBe(false);
  });

  it('gera apelidos válidos e sugere opções distintas', () => {
    for (let i = 0; i < 50; i++) {
      const a = gerarApelido();
      expect(isValidApelido(a)).toBe(true);
    }
    const sugestoes = sugerirApelidos(3);
    expect(sugestoes).toHaveLength(3);
    expect(new Set(sugestoes).size).toBe(3);
    for (const s of sugestoes) {
      expect(isValidApelido(s)).toBe(true);
    }
  });
});

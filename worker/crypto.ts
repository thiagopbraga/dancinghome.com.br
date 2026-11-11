// Assinatura e verificação HMAC-SHA256 das fichas de partida e hash anônimo diário para rate limit.
import type { FichaPayload } from './types.ts';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function toBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function fromBase64Url(str: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]+$/.test(str)) return null;
  const pad = str.length % 4 === 0 ? '' : '='.repeat(4 - (str.length % 4));
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/') + pad;
  try {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

async function hmacSha256(segredo: string, mensagem: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(segredo),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(mensagem));
  return new Uint8Array(sig);
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

/** Gera a ficha assinada: base64url(JSON(payload)) + "." + base64url(HMAC_SHA256). */
export async function assinarFicha(payload: FichaPayload, segredo: string): Promise<string> {
  const body = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const sig = toBase64Url(await hmacSha256(segredo, body));
  return `${body}.${sig}`;
}

/** Verifica a assinatura da ficha em tempo constante e devolve o payload validado ou null. */
export async function verificarFicha(ficha: string, segredo: string): Promise<FichaPayload | null> {
  if (typeof ficha !== 'string') return null;
  const dot = ficha.indexOf('.');
  if (dot <= 0 || dot !== ficha.lastIndexOf('.')) return null;
  const body = ficha.slice(0, dot);
  const sigB64 = ficha.slice(dot + 1);
  const sigBytes = fromBase64Url(sigB64);
  if (!sigBytes) return null;
  const expected = await hmacSha256(segredo, body);
  if (!timingSafeEqual(sigBytes, expected)) return null;
  const payloadBytes = fromBase64Url(body);
  if (!payloadBytes) return null;
  try {
    const parsed = JSON.parse(decoder.decode(payloadBytes)) as Partial<FichaPayload>;
    if (
      typeof parsed.jti !== 'string' ||
      parsed.jti.length < 8 ||
      typeof parsed.musica !== 'string' ||
      (parsed.nivel !== 'facil' && parsed.nivel !== 'normal') ||
      typeof parsed.versao !== 'number' ||
      !Number.isInteger(parsed.versao) ||
      typeof parsed.inicio !== 'number' ||
      !Number.isFinite(parsed.inicio)
    ) {
      return null;
    }
    return {
      jti: parsed.jti,
      musica: parsed.musica,
      nivel: parsed.nivel,
      versao: parsed.versao,
      inicio: parsed.inicio,
    };
  } catch {
    return null;
  }
}

/**
 * Calcula uma chave efêmera e irreversível para rate-limit:
 * SHA-256(IP + ":" + HMAC(segredo, YYYY-MM-DD)).
 * Nenhum endereço IP é persistido nem pode ser reconstruído a partir da chave.
 */
export async function chaveTaxaAnonima(ip: string, segredo: string, diaIso: string): Promise<string> {
  const salDoDia = toBase64Url(await hmacSha256(segredo, `sal-diario:${diaIso}`));
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(`${ip}:${salDoDia}`));
  return toBase64Url(new Uint8Array(digest));
}

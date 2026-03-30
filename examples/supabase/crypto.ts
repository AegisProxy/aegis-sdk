/**
 * Browser / Node 18+ (Web Crypto). Encrypt JSON payloads with AES-GCM.
 * Use with exportState() from aegis-sdk; store { saltB64, ivB64, ciphertextB64 } in Supabase.
 */

const enc = new TextEncoder();
const dec = new TextDecoder();

function toB64(u8: Uint8Array): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(u8).toString('base64');
  }
  let s = '';
  for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]!);
  return btoa(s);
}

function fromB64(s: string): Uint8Array {
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(s, 'base64'));
  }
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export async function deriveAesKeyFromPassword(
  password: string,
  salt: Uint8Array,
): Promise<CryptoKey> {
  const subtle = globalThis.crypto.subtle;
  const baseKey = await subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey'],
  );
  return subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 210_000, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function encryptJson(
  value: unknown,
  password: string,
): Promise<{ saltB64: string; ivB64: string; ciphertextB64: string }> {
  const subtle = globalThis.crypto.subtle;
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveAesKeyFromPassword(password, salt);
  const plaintext = enc.encode(JSON.stringify(value));
  const ciphertext = new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext));
  return {
    saltB64: toB64(salt),
    ivB64: toB64(iv),
    ciphertextB64: toB64(ciphertext),
  };
}

export async function decryptJson<T = unknown>(
  bundle: { saltB64: string; ivB64: string; ciphertextB64: string },
  password: string,
): Promise<T> {
  const subtle = globalThis.crypto.subtle;
  const salt = fromB64(bundle.saltB64);
  const iv = fromB64(bundle.ivB64);
  const raw = fromB64(bundle.ciphertextB64);
  const key = await deriveAesKeyFromPassword(password, salt);
  const plaintext = await subtle.decrypt({ name: 'AES-GCM', iv }, key, raw);
  return JSON.parse(dec.decode(plaintext)) as T;
}

// Flitt signature helpers — https://docs.flitt.com/api/building-signature/
// sha1( secret | <non-empty values sorted by key> ), lowercase hex.

export async function sha1Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function flittSignature(secret: string, params: Record<string, unknown>): Promise<string> {
  const values = Object.keys(params)
    .filter((k) => k !== 'signature' && k !== 'response_signature_string')
    .sort()
    .map((k) => params[k])
    .filter((v) => v !== undefined && v !== null && String(v) !== '')
    .map((v) => String(v));
  return sha1Hex([secret, ...values].join('|'));
}

export async function verifyFlittSignature(secret: string, payload: Record<string, unknown>): Promise<boolean> {
  const given = String(payload.signature ?? '').toLowerCase();
  if (!given) return false;
  const expected = await flittSignature(secret, payload);
  if (expected.length !== given.length) return false;
  let diff = 0; // constant-time compare
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ given.charCodeAt(i);
  return diff === 0;
}

export const FLITT_API = 'https://pay.flitt.com/api';

/** Flitt amounts are integers in minor units (tetri / cents). */
export const toMinor = (amount: number | string) => Math.round(Number(amount) * 100);

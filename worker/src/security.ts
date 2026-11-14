const encoder = new TextEncoder();
const toBase64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const fromBase64 = (value: string) => Uint8Array.from(atob(value), c => c.charCodeAt(0));
export const randomToken = (size = 32) => toBase64(crypto.getRandomValues(new Uint8Array(size))).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
export async function hash(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value));
  return toBase64(new Uint8Array(digest));
}
export async function derivePassword(password: string, salt: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  // Cloudflare Workers Web Crypto caps PBKDF2 at 100,000 iterations.
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: fromBase64(salt), iterations: 100_000, hash: 'SHA-256' }, key, 256);
  return toBase64(new Uint8Array(bits));
}

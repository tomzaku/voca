// The current word is reflected in the URL so a card can be shared / reloaded.
// Storing it as plaintext (?word=impecunious) gives the answer away straight
// from the address bar while you're still guessing. We encode it as URL-safe
// base64 instead — light obfuscation to stop casual spoiling, not real secrecy
// (base64 is trivially reversible by anyone who bothers).

/** URL-safe base64 (base64url) of a UTF-8 string, without `=` padding. */
export function encodeWord(word: string): string {
  const bytes = new TextEncoder().encode(word);
  let binary = '';
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/** Inverse of {@link encodeWord}. Returns '' if the input isn't valid. */
export function decodeWord(encoded: string): string {
  try {
    let b64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    const binary = atob(b64);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return '';
  }
}

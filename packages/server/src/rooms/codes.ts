/** Crockford base32 without I/L/O/U — unambiguous 4-char room codes (D14). */
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

export function generateCode(): string {
  let out = '';
  for (let i = 0; i < 4; i++) out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return out;
}

export function isValidCode(code: string): boolean {
  return /^[0-9A-HJKMNP-TV-Z]{4}$/.test(code);
}

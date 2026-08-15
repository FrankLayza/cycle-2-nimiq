import { describe, expect, it } from 'vitest';
import { generateCode, isValidCode } from '../src/rooms/codes.js';

describe('room codes (D14)', () => {
  it('generates valid 4-char Crockford codes', () => {
    for (let i = 0; i < 100; i++) {
      const code = generateCode();
      expect(code).toHaveLength(4);
      expect(isValidCode(code)).toBe(true);
    }
  });

  it('rejects ambiguous characters and wrong shapes', () => {
    expect(isValidCode('ILOU')).toBe(false); // I, L, O, U excluded
    expect(isValidCode('ABC')).toBe(false);
    expect(isValidCode('ABCDE')).toBe(false);
    expect(isValidCode('ab12')).toBe(false); // lowercase not allowed
    expect(isValidCode('A1C-')).toBe(false);
  });
});

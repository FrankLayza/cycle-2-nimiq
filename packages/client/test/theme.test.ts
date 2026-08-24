import { describe, expect, it } from 'vitest';
import {
  LIGHT,
  SEAT_SKINS,
  mixHex,
  parseHexColor,
  shadowOffset,
  skinFor,
  specularOffset,
} from '../src/game/theme';

describe('theme colour helpers', () => {
  it('mixes channels independently and clamps t', () => {
    expect(mixHex(0x000000, 0xffffff, 0)).toBe(0x000000);
    expect(mixHex(0x000000, 0xffffff, 1)).toBe(0xffffff);
    expect(mixHex(0x000000, 0xffffff, 0.5)).toBe(0x808080);
    expect(mixHex(0xff0000, 0x0000ff, 0.5)).toBe(0x800080);
    // Out-of-range t must clamp rather than produce channel overflow.
    expect(mixHex(0x000000, 0xffffff, 5)).toBe(0xffffff);
    expect(mixHex(0x000000, 0xffffff, -5)).toBe(0x000000);
  });

  it('parses hex colours in both notations and falls back safely', () => {
    expect(parseHexColor('#ff686b', 0)).toBe(0xff686b);
    expect(parseHexColor('ff686b', 0)).toBe(0xff686b);
    expect(parseHexColor('#f0a', 0)).toBe(0xff00aa);
    expect(parseHexColor('  #35C982  ', 0)).toBe(0x35c982);
    expect(parseHexColor('rebeccapurple', 0x123456)).toBe(0x123456);
    expect(parseHexColor('', 0x123456)).toBe(0x123456);
    expect(parseHexColor(undefined, 0x123456)).toBe(0x123456);
    expect(parseHexColor(null, 0x123456)).toBe(0x123456);
  });
});

describe('seat skins', () => {
  it('defines four visually distinct seats with distinct markings', () => {
    expect(SEAT_SKINS).toHaveLength(4);
    expect(new Set(SEAT_SKINS.map((s) => s.base)).size).toBe(4);
    expect(new Set(SEAT_SKINS.map((s) => s.pattern)).size).toBe(4);
  });

  it('derives a darker shade and a lighter highlight from every base', () => {
    const luma = (c: number) =>
      0.2126 * ((c >> 16) & 0xff) + 0.7152 * ((c >> 8) & 0xff) + 0.0722 * (c & 0xff);
    for (const skin of SEAT_SKINS) {
      expect(luma(skin.shade)).toBeLessThan(luma(skin.base));
      expect(luma(skin.highlight)).toBeGreaterThan(luma(skin.base));
    }
  });

  it('honours a server-supplied colour instead of the seat default', () => {
    const custom = skinFor(0, '#4d9bff');
    expect(custom.base).toBe(0x4d9bff);
    // Shade/highlight must track the override, not the canonical seat colour.
    expect(custom.shade).not.toBe(SEAT_SKINS[0].shade);
    expect(custom.highlight).not.toBe(SEAT_SKINS[0].highlight);
    // The marking is identity, not colour, so it stays with the seat.
    expect(custom.pattern).toBe(SEAT_SKINS[0].pattern);
  });

  it('falls back to the canonical seat colour when the override is unusable', () => {
    expect(skinFor(1, 'not-a-colour')).toEqual(SEAT_SKINS[1]);
    expect(skinFor(1, undefined)).toEqual(SEAT_SKINS[1]);
  });

  it('wraps seat indices so any seat count renders', () => {
    expect(skinFor(4).base).toBe(SEAT_SKINS[0].base);
    expect(skinFor(6).base).toBe(SEAT_SKINS[2].base);
    expect(skinFor(-1).base).toBe(SEAT_SKINS[3].base);
  });
});

describe('lighting', () => {
  it('uses a normalised direction vector', () => {
    expect(Math.hypot(LIGHT.x, LIGHT.y)).toBeCloseTo(1, 3);
  });

  it('scales offsets with cell size so geometry never detaches', () => {
    const small = shadowOffset(24);
    const large = shadowOffset(48);
    expect(large.x).toBeCloseTo(small.x * 2, 6);
    expect(large.y).toBeCloseTo(small.y * 2, 6);
    expect(shadowOffset(0)).toEqual({ x: 0, y: 0 });
  });

  it('places speculars opposite the shadow', () => {
    const shadow = shadowOffset(24);
    const specular = specularOffset(24);
    expect(Math.sign(specular.x)).toBe(-Math.sign(shadow.x));
    expect(Math.sign(specular.y)).toBe(-Math.sign(shadow.y));
  });
});

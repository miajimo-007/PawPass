import { describe, expect, it } from 'vitest';
import { ACCENT_PRESETS, accentHex, buildTokens, contrastRatio, hexToHsl, resolveDark } from '@/lib/theme';
import { getPrefs, updatePrefs } from '@/services/prefs';

const parse = (v: string) => {
  const [h, s, l] = v.replace(/%/g, '').split(' ').map(Number);
  return { h: h!, s: s!, l: l! };
};

describe('themes', () => {
  it('converts hex to HSL', () => {
    expect(hexToHsl('#ffffff')).toEqual({ h: 0, s: 0, l: 100 });
    expect(hexToHsl('#1F4D3A').h).toBeGreaterThan(150);
  });

  it('keeps accent buttons and text readable (WCAG AA) for every preset, in light and dark', () => {
    for (const p of ACCENT_PRESETS) {
      for (const dark of [false, true]) {
        const t = buildTokens(dark, p.hex);
        expect(contrastRatio(parse(t['--primary']!), parse(t['--background']!))).toBeGreaterThanOrEqual(4.5);
        expect(contrastRatio(parse(t['--primary']!), parse(t['--primary-foreground']!))).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it('adjusts extreme custom colours so they stay readable', () => {
    for (const hex of ['#FFFF00', '#FFFFFF', '#000000', '#00FFFF']) {
      for (const dark of [false, true]) {
        const t = buildTokens(dark, hex);
        expect(contrastRatio(parse(t['--primary']!), parse(t['--background']!))).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it('resolves mode and accent settings', () => {
    expect(resolveDark('system', true)).toBe(true);
    expect(resolveDark('light', true)).toBe(false);
    expect(accentHex({ mode: 'light', accentId: 'custom', customAccent: '#123456' })).toBe('#123456');
    expect(accentHex({ mode: 'light', accentId: 'custom', customAccent: 'nope' })).toBe(ACCENT_PRESETS[0]!.hex);
    expect(accentHex({ mode: 'light', accentId: 'ocean' })).toBe('#1D4E89');
  });

  it('saves the appearance choice in preferences', async () => {
    await updatePrefs({ themeMode: 'dark', accentId: 'custom', customAccent: '#AA3366' });
    const p = await getPrefs();
    expect(p).toMatchObject({ themeMode: 'dark', accentId: 'custom', customAccent: '#AA3366' });
  });
});

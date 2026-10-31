/**
 * Theme engine: light/dark mode + accent color (preset or custom).
 * All colour tokens are produced here and applied as CSS variables on <html>,
 * so every component (and charts) follows the chosen theme.
 */

export type ThemeMode = 'light' | 'dark' | 'system';

export interface AccentPreset {
  id: string;
  name: string;
  hex: string;
}

export const ACCENT_PRESETS: AccentPreset[] = [
  { id: 'forest', name: 'Forest', hex: '#1F4D3A' },
  { id: 'ocean', name: 'Ocean', hex: '#1D4E89' },
  { id: 'teal', name: 'Lagoon', hex: '#0F5E63' },
  { id: 'indigo', name: 'Indigo', hex: '#3730A3' },
  { id: 'plum', name: 'Plum', hex: '#5B2A6E' },
  { id: 'rose', name: 'Rose', hex: '#9C2F55' },
  { id: 'terracotta', name: 'Terracotta', hex: '#A0482C' },
  { id: 'amber', name: 'Honey', hex: '#8A5A0B' },
  { id: 'slate', name: 'Slate', hex: '#334155' },
];

export interface ThemeSettings {
  mode: ThemeMode;
  accentId: string; // a preset id or 'custom'
  customAccent?: string; // hex, used when accentId === 'custom'
}

export const DEFAULT_THEME: ThemeSettings = { mode: 'light', accentId: 'forest' };

export interface HSL {
  h: number;
  s: number;
  l: number;
}

export function hexToHsl(hex: string): HSL {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hexToHsl(ACCENT_PRESETS[0]!.hex);
  let h = m[1]!;
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let hue = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) hue = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) hue = (b - r) / d + 2;
    else hue = (r - g) / d + 4;
    hue *= 60;
  }
  return { h: Math.round(hue), s: Math.round(s * 100), l: Math.round(l * 100) };
}

export function hslToRgb({ h, s, l }: HSL): [number, number, number] {
  const sat = s / 100;
  const lig = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sat * Math.min(lig, 1 - lig);
  const f = (n: number) => lig - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}

export function hslToHex(c: HSL): string {
  return '#' + hslToRgb(c).map((v) => v.toString(16).padStart(2, '0')).join('');
}

/** WCAG relative-luminance contrast ratio between two colours. */
export function contrastRatio(a: HSL, b: HSL): number {
  const lum = (c: HSL) => {
    const [r, g, bl] = hslToRgb(c).map((v) => {
      const x = v / 255;
      return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
    }) as [number, number, number];
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const fmt = (c: HSL) => `${Math.round(c.h)} ${Math.round(c.s)}% ${Math.round(c.l)}%`;

export function accentHex(t: ThemeSettings): string {
  if (t.accentId === 'custom' && t.customAccent && /^#[0-9a-f]{6}$/i.test(t.customAccent)) return t.customAccent;
  return (ACCENT_PRESETS.find((p) => p.id === t.accentId) ?? ACCENT_PRESETS[0]!).hex;
}

/**
 * Builds every colour token for a mode and accent. The accent's lightness is
 * adjusted until text/buttons meet WCAG AA contrast (4.5:1) on the background.
 */
export function buildTokens(dark: boolean, accent: string): Record<string, string> {
  const base = hexToHsl(accent);
  const h = base.h;
  const s = clamp(base.s, 8, 85);

  if (!dark) {
    const white: HSL = { h: 0, s: 0, l: 100 };
    let l = clamp(base.l, 18, 42);
    while (l > 10 && contrastRatio({ h, s, l }, white) < 4.6) l -= 2;
    const primary: HSL = { h, s, l };
    return {
      '--background': '40 33% 97%',
      '--foreground': '214 9% 15%',
      '--surface': '40 30% 99%',
      '--card': '0 0% 100%',
      '--card-foreground': '214 9% 15%',
      '--primary': fmt(primary),
      '--primary-foreground': '40 33% 98%',
      '--primary-soft': fmt({ h, s: clamp(s * 0.45, 10, 40), l: 92 }),
      '--secondary': fmt({ h, s: clamp(s * 0.3, 8, 25), l: 93 }),
      '--secondary-foreground': fmt({ h, s: clamp(s * 0.5, 15, 40), l: 24 }),
      '--sage': fmt({ h, s: clamp(s * 0.25, 10, 22), l: 61 }),
      '--sage-light': fmt({ h, s: clamp(s * 0.25, 10, 22), l: 88 }),
      '--muted': '40 22% 93%',
      '--muted-foreground': '140 3% 38%',
      '--accent': fmt({ h, s: clamp(s * 0.3, 8, 25), l: 93 }),
      '--accent-foreground': fmt(primary),
      '--destructive': '5 53% 43%',
      '--destructive-foreground': '0 0% 100%',
      '--destructive-soft': '8 55% 94%',
      '--warning': '36 79% 32%',
      '--warning-soft': '39 69% 91%',
      '--success': '151 39% 30%',
      '--success-soft': '140 25% 91%',
      '--info': '205 40% 36%',
      '--info-soft': '204 33% 92%',
      '--border': '42 20% 88%',
      '--input': '42 16% 82%',
      '--ring': fmt({ h, s, l: clamp(l + 7, 20, 50) }),
    };
  }

  const bg: HSL = { h, s: 10, l: 8 };
  let l = clamp(base.l + 30, 55, 72);
  while (l < 90 && contrastRatio({ h, s: clamp(s, 25, 70), l }, bg) < 4.6) l += 2;
  const primary: HSL = { h, s: clamp(s, 25, 70), l };
  return {
    '--background': fmt(bg),
    '--foreground': '40 20% 92%',
    '--surface': fmt({ h, s: 9, l: 10 }),
    '--card': fmt({ h, s: 8, l: 12 }),
    '--card-foreground': '40 20% 92%',
    '--primary': fmt(primary),
    '--primary-foreground': fmt({ h, s: 30, l: 9 }),
    '--primary-soft': fmt({ h, s: clamp(s * 0.4, 10, 35), l: 19 }),
    '--secondary': fmt({ h, s: 10, l: 18 }),
    '--secondary-foreground': fmt({ h, s: 25, l: 82 }),
    '--sage': fmt({ h, s: 14, l: 50 }),
    '--sage-light': fmt({ h, s: 10, l: 24 }),
    '--muted': fmt({ h, s: 7, l: 17 }),
    '--muted-foreground': '40 8% 68%',
    '--accent': fmt({ h, s: 10, l: 18 }),
    '--accent-foreground': fmt(primary),
    '--destructive': '5 70% 66%',
    '--destructive-foreground': '5 40% 10%',
    '--destructive-soft': '5 35% 18%',
    '--warning': '38 80% 62%',
    '--warning-soft': '38 40% 16%',
    '--success': '150 40% 58%',
    '--success-soft': '150 25% 15%',
    '--info': '205 55% 66%',
    '--info-soft': '205 30% 17%',
    '--border': fmt({ h, s: 6, l: 21 }),
    '--input': fmt({ h, s: 6, l: 28 }),
    '--ring': fmt({ h, s: clamp(s, 25, 70), l: clamp(l - 6, 45, 80) }),
  };
}

export function resolveDark(mode: ThemeMode, systemDark: boolean): boolean {
  return mode === 'dark' || (mode === 'system' && systemDark);
}

export function systemPrefersDark(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-color-scheme: dark)').matches;
}

/** Applies tokens to <html>, the browser chrome colour and the colour-scheme hint. */
export function applyTheme(t: ThemeSettings, systemDark = systemPrefersDark()): { dark: boolean; tokens: Record<string, string> } {
  const dark = resolveDark(t.mode, systemDark);
  const tokens = buildTokens(dark, accentHex(t));
  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    for (const [k, v] of Object.entries(tokens)) root.style.setProperty(k, v);
    root.dataset.theme = dark ? 'dark' : 'light';
    root.style.colorScheme = dark ? 'dark' : 'light';
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', `hsl(${tokens['--background']})`);
  }
  return { dark, tokens };
}

const CACHE_KEY = 'pawpass-theme';

/** Small localStorage mirror so the theme is applied before the database loads (no flash). */
export function readCachedTheme(): ThemeSettings {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return DEFAULT_THEME;
    const v = JSON.parse(raw) as Partial<ThemeSettings>;
    return { ...DEFAULT_THEME, ...v };
  } catch {
    return DEFAULT_THEME;
  }
}

export function cacheTheme(t: ThemeSettings) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(t));
  } catch {
    /* storage unavailable — theme still applies for this session */
  }
}

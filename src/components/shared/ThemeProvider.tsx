import * as React from 'react';
import { usePrefs } from '@/hooks/useData';
import { applyTheme, cacheTheme, DEFAULT_THEME, readCachedTheme, systemPrefersDark, type ThemeSettings } from '@/lib/theme';

interface ThemeState {
  dark: boolean;
  tokens: Record<string, string>;
  /** Resolved CSS colour for a token, e.g. color('--primary') → "hsl(155 43% 21%)". */
  color: (token: string) => string;
}

const ThemeContext = React.createContext<ThemeState>({ dark: false, tokens: {}, color: () => 'currentColor' });

export function useTheme() {
  return React.useContext(ThemeContext);
}

/** Applies the saved theme to the whole app and keeps it in sync with preferences and the OS setting. */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const prefs = usePrefs();
  const [systemDark, setSystemDark] = React.useState(systemPrefersDark);

  React.useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mq) return;
    const on = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  const settings: ThemeSettings = prefs
    ? { mode: prefs.themeMode ?? DEFAULT_THEME.mode, accentId: prefs.accentId ?? DEFAULT_THEME.accentId, customAccent: prefs.customAccent }
    : readCachedTheme();

  const { mode, accentId, customAccent } = settings;
  const state = React.useMemo(() => {
    const s = { mode, accentId, customAccent };
    const { dark, tokens } = applyTheme(s, systemDark);
    if (prefs) cacheTheme(s);
    return { dark, tokens, color: (t: string) => (tokens[t] ? `hsl(${tokens[t]})` : 'currentColor') };
  }, [mode, accentId, customAccent, systemDark, prefs]);

  return <ThemeContext.Provider value={state}>{children}</ThemeContext.Provider>;
}

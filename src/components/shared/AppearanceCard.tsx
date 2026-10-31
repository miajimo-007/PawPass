import * as React from 'react';
import { Check, Monitor, Moon, Palette, Sun } from 'lucide-react';
import { usePrefs } from '@/hooks/useData';
import { DEFAULT_PREFS, updatePrefs } from '@/services/prefs';
import { ACCENT_PRESETS, accentHex, buildTokens, type ThemeMode } from '@/lib/theme';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTheme } from './ThemeProvider';

const MODES: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'Auto', icon: Monitor },
];

/** Lets the owner choose light/dark mode and an accent colour (preset or custom). */
export function AppearanceCard() {
  const prefs = usePrefs() ?? DEFAULT_PREFS;
  const { dark } = useTheme();
  const mode = prefs.themeMode ?? 'light';
  const accentId = prefs.accentId ?? 'forest';
  const custom = prefs.customAccent ?? '#2B6CB0';
  const colorRef = React.useRef<HTMLInputElement>(null);

  // Swatches show each colour as it will actually look in the current mode.
  const swatch = (hex: string) => `hsl(${buildTokens(dark, hex)['--primary']})`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-4 w-4 text-primary" aria-hidden /> Appearance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <p className="mb-2 text-sm font-semibold" id="mode-label">
            Mode
          </p>
          <div role="radiogroup" aria-labelledby="mode-label" className="grid grid-cols-3 gap-2">
            {MODES.map(({ value, label, icon: Icon }) => {
              const active = mode === value;
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => updatePrefs({ themeMode: value })}
                  className={cn(
                    'flex h-16 flex-col items-center justify-center gap-1 rounded-xl border text-[13px] font-semibold transition-colors',
                    active ? 'border-primary bg-primary-soft text-primary' : 'bg-card text-muted-foreground hover:bg-muted',
                  )}
                >
                  <Icon className="h-5 w-5" aria-hidden />
                  {label}
                </button>
              );
            })}
          </div>
          {mode === 'system' && <p className="mt-1.5 text-[12.5px] text-muted-foreground">Follows your device's light/dark setting.</p>}
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold" id="accent-label">
            Color theme
          </p>
          <div role="radiogroup" aria-labelledby="accent-label" className="grid grid-cols-5 gap-2 sm:grid-cols-10">
            {ACCENT_PRESETS.map((p) => {
              const active = accentId === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  aria-label={p.name}
                  title={p.name}
                  onClick={() => updatePrefs({ accentId: p.id })}
                  className={cn('flex flex-col items-center gap-1 rounded-xl p-1.5 text-[11px] font-medium', active ? 'bg-muted' : 'hover:bg-muted/60')}
                >
                  <span
                    className={cn('flex h-10 w-10 items-center justify-center rounded-full ring-offset-2 ring-offset-card', active && 'ring-2 ring-foreground/70')}
                    style={{ background: swatch(p.hex) }}
                  >
                    {active && <Check className="h-4 w-4 text-background" aria-hidden />}
                  </span>
                  <span className="truncate text-muted-foreground">{p.name}</span>
                </button>
              );
            })}
            <button
              type="button"
              role="radio"
              aria-checked={accentId === 'custom'}
              aria-label="Custom color"
              title="Custom color"
              onClick={() => {
                if (accentId !== 'custom') void updatePrefs({ accentId: 'custom', customAccent: custom });
                colorRef.current?.click();
              }}
              className={cn('flex flex-col items-center gap-1 rounded-xl p-1.5 text-[11px] font-medium', accentId === 'custom' ? 'bg-muted' : 'hover:bg-muted/60')}
            >
              <span
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-full ring-offset-2 ring-offset-card',
                  accentId === 'custom' && 'ring-2 ring-foreground/70',
                )}
                style={{
                  background: accentId === 'custom' ? swatch(custom) : 'conic-gradient(#e11d48, #f59e0b, #16a34a, #0ea5e9, #6366f1, #db2777, #e11d48)',
                }}
              >
                {accentId === 'custom' && <Check className="h-4 w-4 text-background" aria-hidden />}
              </span>
              <span className="truncate text-muted-foreground">Custom</span>
            </button>
          </div>
          <input
            ref={colorRef}
            type="color"
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            value={custom}
            onChange={(e) => updatePrefs({ accentId: 'custom', customAccent: e.target.value })}
          />
          {accentId === 'custom' && (
            <label className="mt-3 flex items-center gap-3 rounded-lg border p-3 text-sm">
              <input
                type="color"
                value={custom}
                onChange={(e) => updatePrefs({ customAccent: e.target.value })}
                className="h-9 w-12 cursor-pointer rounded border-0 bg-transparent p-0"
                aria-label="Pick a custom color"
              />
              <span className="flex-1">
                <span className="block font-semibold">Your color</span>
                <span className="text-[12.5px] text-muted-foreground">Adjusted automatically so text stays easy to read.</span>
              </span>
              <span className="font-mono text-[12.5px] text-muted-foreground">{accentHex({ mode, accentId, customAccent: custom }).toUpperCase()}</span>
            </label>
          )}
        </div>

        <div className="rounded-xl border bg-background p-3" aria-hidden>
          <p className="eyebrow">Preview</p>
          <div className="mt-2 flex items-center gap-2">
            <span className="inline-flex h-9 items-center rounded-full bg-primary px-4 text-[13px] font-semibold text-primary-foreground">Save</span>
            <span className="inline-flex h-9 items-center rounded-full bg-secondary px-4 text-[13px] font-semibold text-secondary-foreground">Cancel</span>
            <span className="rounded-full bg-primary-soft px-2.5 py-0.5 text-[11.5px] font-semibold text-primary">Veterinarian</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

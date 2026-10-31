# PAWPASS design tokens

Defined as CSS variables in `src/index.css`, consumed via Tailwind. Use the same values in a native app.

| Token | Hex | Use |
|---|---|---|
| background | #FAF8F4 | warm white app background |
| card | #FFFFFF | cards, sheets |
| foreground | #23262A | charcoal text |
| muted-foreground | #5F6561 | secondary text (≥ 4.5:1 on white) |
| primary | #1F4D3A | deep forest green — actions, active nav |
| primary-soft | #E6EEE8 | selected states |
| sage | #8FA98F | accents |
| secondary | #EEF2EC | secondary buttons, chips |
| border | #E7E3DA | hairlines |
| success | #2E6A4E | given, completed |
| warning | #915F0F | due soon, skipped |
| destructive | #A63D33 | overdue, delete |
| info | #36617F | appointments, lab |

Typography: **Fraunces** (display headings) and **Manrope** (UI/body), both bundled locally for offline use.
Radius: 14 px base (cards 18 px, buttons fully rounded). Touch targets ≥ 44 × 44 px.
Motion: 180–220 ms ease-out fades/slides; disabled under `prefers-reduced-motion`.

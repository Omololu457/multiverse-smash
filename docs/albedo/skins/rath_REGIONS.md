# Rath — Albedo theme regions

Albedo-only. Source: Albedo's own `__albedo` sheets (40 strips, base + alternate tables). Rules are first-match; unmatched pixels are kept. Each matched pixel takes its role's theme colour, ramped by its own brightness ÷ the rule's reference brightness (vref). Alpha is never changed.

Fur form: fur shades (primary / secondary) are separate from the Ultimatrix mark / eyes (energy).

| # | region | role | match | vref | pixels (all strips) |
|---|---|---|---|---|---|
| 0 | outline (kept) | keep | s 0–1, v 0–0.07 | 0 | 38565 |
| 1 | chest Ultimatrix cross | energy | h 356–4, s 0.74–0.86, v 0.04–1 | 0.902 | 955 |
| 2 | orange fur | primary | h 5–45, s 0.25–1, v 0.1–1 | 1 | 46427 |
| 3 | white fur / grey | secondary | s 0–0.25, v 0.4–1 | 0.945 | 15098 |

## Animation coverage (themed wherever the art exists)

| action | art |
|---|---|
| idle | own art |
| walk | own art |
| light | own art |
| heavy | own art |
| hurt | own art |
| knockdown | own art |

![rath — default + 20 themes, bright and dark stage](img/rath_themes.png)

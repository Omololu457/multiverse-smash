# Jetray — Albedo theme regions

Albedo-only. Source: Albedo's own `__albedo` sheets (36 strips, base + alternate tables). Rules are first-match; unmatched pixels are kept. Each matched pixel takes its role's theme colour, ramped by its own brightness ÷ the rule's reference brightness (vref). Alpha is never changed.

Organic form.

| # | region | role | match | vref | pixels (all strips) |
|---|---|---|---|---|---|
| 0 | outline (kept) | keep | s 0–1, v 0–0.07 | 0.024 | 25472 |
| 1 | chest mark / eyes (Ultimatrix red) | energy | h 356–4, s 0.74–0.86, v 0.04–1 | 0.812 | 40085 |
| 2 | crimson hide | primary | h 300–12, s 0.25–1, v 0.07–1 | 0.671 | 482303 |
| 3 | wing membrane (yellow) | secondary | h 13–75, s 0.25–1, v 0.2–1 | 0.941 | 636559 |

## Animation coverage (themed wherever the art exists)

| action | art |
|---|---|
| idle | own art |
| walk | own art |
| light | own art |
| heavy | own art |
| hurt | own art |
| knockdown | own art |

![jetray — default + 20 themes, bright and dark stage](img/jetray_themes.png)

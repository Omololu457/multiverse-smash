# Arcticguana — Albedo theme regions

Albedo-only. Source: Albedo's own `__albedo` sheets (39 strips, base + alternate tables). Rules are first-match; unmatched pixels are kept. Each matched pixel takes its role's theme colour, ramped by its own brightness ÷ the rule's reference brightness (vref). Alpha is never changed.

Ice form: ice hide and dark hide / cloak are separate ramps.

| # | region | role | match | vref | pixels (all strips) |
|---|---|---|---|---|---|
| 0 | outline (kept) | keep | s 0–1, v 0–0.07 | 0 | 37868 |
| 1 | Ultimatrix mark | energy | h 356–4, s 0.74–0.86, v 0.04–1 | 0.902 | 573 |
| 2 | ice-blue hide | primary | h 170–250, s 0.2–1, v 0.1–1 | 0.91 | 20102 |
| 3 | dark hide | secondary | s 0–0.2, v 0.07–0.55 | 0.157 | 30764 |
| 4 | white belly / spikes | accent | s 0–0.2, v 0.55–1 | 0.878 | 11940 |

## Animation coverage (themed wherever the art exists)

| action | art |
|---|---|
| idle | own art |
| walk | own art |
| light | own art |
| heavy | own art |
| hurt | own art |
| knockdown | own art |

## Genuine gaps (recorded, not invented)

- Separate FX sheets (`*_fx_*`: beams, bursts, puffs) are not body strips and keep their colours — the same rule the original __albedo pass used, so they look the same for Ben and Albedo and never leak between owners.

![arcticguana — default + 20 themes, bright and dark stage](img/arcticguana_themes.png)

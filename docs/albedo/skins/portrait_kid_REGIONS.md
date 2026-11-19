# Kid Albedo portrait — Albedo theme regions

Albedo-only. Source: Albedo's own `__albedo` sheets (portrait art). Rules are first-match; unmatched pixels are kept. Each matched pixel takes its role's theme colour, ramped by its own brightness ÷ the rule's reference brightness (vref). Alpha is never changed.

| # | region | role | match | vref | pixels (all strips) |
|---|---|---|---|---|---|
| 0 | skin | keep | h 0–45, s 0.1–0.55, v 0.6–1 | — | — |
| 1 | outline | keep | s 0–1, v 0–0.14 | — | — |
| 2 | hair (incl. leftover brown) | hair | y 0–0.255, squash 0.35 | — | — |
| 3 | eyes / watch light | energy | h 345–15, s 0.5–1, v 0.2–1, y 0.255–0.62 | — | — |
| 4 | pants | secondary | h 330–25, s 0.35–1, v 0.12–1, y 0.62–1 | — | — |
| 5 | shirt panels | primary | s 0–0.14, v 0.7–1, y 0.36–1 | — | — |

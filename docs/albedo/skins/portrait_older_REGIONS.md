# Older Albedo portrait — Albedo theme regions

Albedo-only. Source: Albedo's own `__albedo` sheets (portrait art). Rules are first-match; unmatched pixels are kept. Each matched pixel takes its role's theme colour, ramped by its own brightness ÷ the rule's reference brightness (vref). Alpha is never changed.

| # | region | role | match | vref | pixels (all strips) |
|---|---|---|---|---|---|
| 0 | skin | keep | h 15–50, s 0.1–0.55, v 0.72–1 | — | — |
| 1 | outline | keep | s 0–1, v 0–0.16 | — | — |
| 2 | hair (incl. leftover brown flecks) | hair | y 0–0.245, squash 0.35 | — | — |
| 3 | eyes | energy | h 345–15, s 0.45–1, v 0.2–1, y 0.245–0.305 | — | — |
| 4 | jacket | primary | h 345–15, s 0.45–1, v 0.12–1, y 0.305–1 | — | — |
| 5 | jeans | secondary | h 195–240, s 0.3–1, v 0.12–1, y 0.6–1 | — | — |
| 6 | undershirt (darker) | secondary | s 0–0.15, v 0.12–0.32, y 0.38–1, shade ×0.42 | — | — |

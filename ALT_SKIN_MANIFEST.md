# Alt-Color Skin Manifest (v2 — targeted color replacement)

Cosmetic only — no damage/cost/frame/gameplay data touched. Base/default skins untouched.

## Tooling
- **`tools/recolor_palette.py`** — targeted color replacement (palette remap). Selects source pixels by
  hue-range or sample±tolerance, optionally scoped to a region band (`--yband`), and recolors ONLY
  those pixels — preserving each pixel's luminance so shading survives. Modes: `--to-hue` (hue swap,
  keep value), `--to` (map to color), `--swap` (simultaneous two-color inversion). `--val-gain`/
  `--to-sat` for vibrancy. Replaces the old global `hue-rotate` (which shifted skin/shading → muddy/pale).
- `harness/alt_skin_manifest.mjs` — `ALT_SKINS` map ({tag, name} per char) consumed by skins.js
  `recolorSkins()`. Also `REANIM` (Edo Tensei) + `FORM_PREFIXES` (kept).

## Modes
- **whole-sprite** — remap source color-family(ies) across the whole sheet.
- **region** — selection scoped to a specific color/region (e.g. hair only), optionally + `--yband`.

## Part 0 reset (2026-07-24)
Deleted the old 90-variant global-hue batch (2417 PNGs) + `beerusEmerald`/`saikiAzure`. KEPT: Flash
`flashBlue` (bespoke, hue-inverted blue speedster), the JJK bespoke costumes (gojo2/sukuna3/pinkFit/
megumi2), and the 476 Edo-Tensei `reanim` sheets.

## Part 1 (2026-07-24)
Built `recolor_palette.py`; proved on **Tobirama Gold** — see Batch 2 row.

---
## Manifest

Legend: mode = whole|region. All variants `unlockLevel: 0` (free). "source→target" = costume region → color.

### Batch 1 · DRAGON BALL ✅  (16 variants; regression green; 0 identity collisions)
| Character | Variant | source → target | mode | origin |
|---|---|---|---|---|
| **goku** | Pink | orange gi (hue 2-48, sat≥.50) → pink (h330 s.55 vg1.15) | region | standard |
| | Gold | → gold (h48 s.92 vg1.25) | region | standard |
| | Blue | → blue (h214 s.85 vg1.05) | region | standard |
| | Red | → red (h2 s.95) | region | standard |
| | ~~Black~~ | SKIPPED — black-gi Goku collides with the Goku Black character | — | standard |
| **vegeta** (×3 forms) | Black | blue suit (hue 195-235, sat≥.30) → desat (vg.55) | region | standard |
| | Pink | → pink (h330 s.55 vg1.25) | region | standard |
| | Gold | → gold (h47 s.90 vg1.55) | region | standard |
| | Red | → red (h5 s.90 vg1.25) | region | standard |
| | ~~Blue~~ | SKIPPED — Vegeta's default IS blue | — | standard |
| **beerus** | Black | blue outfit (hue 185-235, sat≥.35) → desat (vg.5) | region | standard |
| | Pink | → pink (h330 s.55 vg1.0) | region | standard |
| | Gold | → gold (h47 s.90 vg1.15) | region | standard |
| | Red | → red (h5 s.90 vg1.05) | region | standard |
| | ~~Blue~~ | SKIPPED — Beerus's outfit IS blue (purple skin preserved) | — | standard |
| **goku_black** (+SSJ Rose) | Pink | grey gi (colorize, sat 0-.18, yband .26-1) → pink (h330 s.60 vg1.9) | region | standard |
| | Gold | → gold (h47 s.85 vg2.0) | region | standard |
| | Blue | → blue (h214 s.80 vg1.9) | region | standard |
| | Red | → red (h5 s.85 vg1.9) | region | standard |
| | ~~Black~~ | SKIPPED — Goku Black's gi IS black | — | standard |

Collision audit: purple Beerus skin preserved in all Beerus variants; blue-Goku / blue-GokuBlack overlap
Vegeta's default HUE but differ in silhouette (not confusable) → acceptable. Only true identity clash
(black-gi Goku ≈ Goku Black char) was found and fixed by skipping Goku's Black.

### Batch 2 · NARUTO ✅  (16 variants; regression green; 0 identity collisions)
| Character | Variant | source → target | mode | origin |
|---|---|---|---|---|
| **naruto** | Black | KCM chakra body (hue 5-66, sat≥.45) → desat (vg.5) | region | standard |
| | Pink | → pink (h330 s.70 vg.95) | region | standard |
| | Blue | → blue (h214 s.80 vg.90) | region | standard |
| | Red | → red (h2 s.90 vg.95) | region | standard |
| | ~~Gold~~ | SKIPPED — KCM Naruto is already golden-orange | — | standard |
| **sasuke** | Pink | navy+purple clothes (hue 200-280, sat≥.18) → pink (h330 s.60 vg2.0) | region | standard |
| | Gold | → gold (h47 s.85 vg2.2) | region | standard |
| | Blue | → blue (h210 s.85 vg2.0) | region | standard |
| | Red | → red (h3 s.90 vg2.0) | region | standard |
| | ~~Black~~ | SKIPPED — Sasuke's outfit is already dark navy/black | — | standard |
| **itachi** | Pink | black cloak (colorize sat 0-.18, yband .20-1) → pink (h330 s.60 vg2.0) | region | standard |
| | Gold | → gold (h47 s.85 vg2.1) | region | standard |
| | Blue | → blue (h214 s.80 vg2.0) | region | standard |
| | Red | → red (h5 s.85 vg2.0) | region | standard |
| | ~~Black~~ | SKIPPED — Akatsuki cloak is already black (red clouds preserved) | — | standard |
| **tobirama** | Black | blue armor (hue 195-255, sat≥.13) → desat (vg.6) | region | standard |
| | Pink | → pink (h330 s.60 vg1.5) | region | standard |
| | Gold | → gold (h47 s.9 vg1.7) | region | Part 1 test |
| | Red | → red (h5 s.90 vg1.4) | region | standard |
| | ~~Blue~~ | SKIPPED — Tobirama's armor IS blue | — | standard |

Collision audit: no identity clashes — every Naruto-universe silhouette is distinct (glowing Naruto /
navy Sasuke / cloaked Itachi / armored Tobirama), so shared color names read as different characters.
Cross-universe hue overlaps (e.g. naruto_red vs goku_red) are different universes/silhouettes → INFO.
Portrait note: Sasuke's mugshot is face-only (no costume) → his select thumbnails don't preview the
color (in-match recolor is correct); same portrait-art limitation as Goku.

### Batch 3 · JUJUTSU KAISEN ✅  (19 variants incl. 3 named Gojo; regression green)
Coexists with bespoke gojo2/sukuna3/pinkFit/megumi2. NOTE: also fixed the SELECT_SKIN screen to
wrap into a grid (Gojo now has 9 skins — was overflowing a single row).
| Character | Variant | source → target | mode | origin |
|---|---|---|---|---|
| **gojo** | Pink | black shirt+white pants (colorize, yband .24-1 keeps white hair) → pink (h330 s.80 vg1.35) | region | standard |
| | Gold | → gold (h47 s.90 vg1.40) | region | standard |
| | Blue | → blue (h214 s.85 vg1.30) | region | standard |
| | Red | → red (h5 s.90 vg1.30) | region | standard |
| | **Pink Hair** | white hair → pink + blue eyes → pink; clothing untouched (2-pass per-region) | region | **NAMED** |
| | **Ben 10** | pants(light, min-val .5) → green h130; black shirt kept → green/black | region | **NAMED** |
| | **Albedo** | shirt(dark, max-val .45) → red + eyes → gold; white pants/hair kept → white/red/gold | region | **NAMED** |
| | ~~Black~~ | SKIPPED — Gojo's shirt is already black | — | standard |
| **sukuna** | Black | navy uniform (hue 230-262, sat≥.30) → desat (vg.7) | region | standard |
| | Gold | → gold (h47 s.88 vg2.3) | region | standard |
| | Blue | → blue (h210 s.85 vg2.1) | region | standard |
| | Red | → red (h3 s.90 vg2.1) | region | standard |
| | ~~Pink~~ | SKIPPED — Sukuna's hair IS pink (kept, + crimson accents) | — | standard |
| **megumi** | Pink | navy uniform (hue 230-262, sat≥.30) → pink (h330 s.60 vg2.4) | region | standard |
| | Gold | → gold (h47 s.85 vg2.6) | region | standard |
| | Blue | → blue (h210 s.85 vg2.3) | region | standard |
| | Red | → red (h3 s.90 vg2.3) | region | standard |
| | ~~Black~~ | SKIPPED — Megumi's uniform is already dark navy/black | — | standard |
| **toji** | Pink | dark top+white pants (colorize, yband .22-1 keeps hair) → pink (h330 s.60 vg1.8) | region | standard |
| | Gold | → gold (h47 s.85 vg2.0) | region | standard |
| | Blue | → blue (h214 s.80 vg1.8) | region | standard |
| | Red | → red (h5 s.85 vg1.8) | region | standard |
| | ~~Black~~ | SKIPPED — Toji's outfit is already black | — | standard |

Collision audit: no identity clashes. Gojo's `pinkhair` and Sukuna both have pink hair, but different
faces/outfits/builds → not confusable (WARN, acceptable). Bespoke costumes are distinct art. Portrait
note: Sukuna's mugshot is face-heavy (weak color preview on select); in-match recolor correct.

### Batch 4 · HUNTER x HUNTER ✅  (12 variants incl. 3 named Killua hair; regression green)
| Character | Variant | source → target | mode | origin |
|---|---|---|---|---|
| **netero** | Black | blue shorts+straps (hue 200-225, sat≥.40) → desat (vg.6) | region | standard |
| | Pink | → pink (h330 s.60 vg1.5) | region | standard |
| | Gold | → gold (h47 s.88 vg1.7) | region | standard |
| | Red | → red (h5 s.90 vg1.5) | region | standard |
| | ~~Blue~~ | SKIPPED — Netero's shorts ARE blue (skin/tanktop/nen-symbol preserved) | — | standard |
| **killua** | Black | outfit 2-pass: shirt(yband .40-1) + shorts(hue 245-278) → desat; silver hair kept | region | standard |
| | Pink | → pink h330 | region | standard |
| | Gold | → gold h47 | region | standard |
| | Blue | → blue h214 | region | standard |
| | Red | → red h5 | region | standard |
| | **Brown Hair** | silver hair (yband 0-.40) → brown (h25 s.55 vg.60); everything else default | region | **NAMED** |
| | **Black Hair** | → black (desat vg.28); everything else default | region | **NAMED** |
| | **Pink Hair** | → pink (h330 s.55); everything else default | region | **NAMED** |

Killua's default silver hair is kept for the standard (outfit) set, and only-hair-changes for the 3
named variants — confirmed reads correctly (screenshots). Collision audit: no identity clashes — Netero
(old, muscular) and Killua (kid) are unmistakable; a brown/black-haired Killua keeps his distinct
shirt/shorts/shoes so he doesn't read as any other roster character.

### Batch 5 · POWER RANGERS / RICK & MORTY / SAIKI K / DC ✅  (19 variants incl. named Reverse Flash + Godspeed)
Each char is the sole member of its universe → no same-universe collisions possible.
| Character | Variant | source → target | mode | origin |
|---|---|---|---|---|
| **omega_ranger** | Black/Pink/Gold/Blue/Red | white suit (colorize) → color; navy chest/gold trim/red visor kept | region | standard |
| **rick** | Black/Pink/Gold/Blue/Red | brown PANTS (hue 32-52, sat≥.45) → color; coat/shirt/blue-hair/skin kept | region | standard |
| **saiki** | Black/Gold/Blue/Red | green suit (hue 125-165, sat≥.40) → color; pink hair/skin/shoes kept | region | standard |
| | ~~Pink~~ | SKIPPED — Saiki's hair/limiters ARE pink | — | standard |
| **flash** | Black/Pink/Gold | red suit (hue 345-15) → color; yellow boots kept | region | standard |
| | **Reverse Flash** | **NAMED**: red↔yellow swap (3-pass via temp hue) → yellow suit + red boots/bolt | region | **NAMED** |
| | **Godspeed** | **NAMED** (added 2026-07-27): 2-pass whiteout — red suit(345-15,sat.42)→to-hue205 sat.16 vg1.35 vl.05 (near-white pale blue) + yellow(40-66,sat.42)→to-hue200 sat.48 vg1.12 (electric-blue bolts/boots). "God Speed Force" aesthetic; distinct from base(red), flashBlue(sat. blue), reverse(yellow) | region | **NAMED** |
| | ~~Red~~ | SKIPPED — Flash IS red | — | standard |
| | ~~Blue~~ | SKIPPED — bespoke `flashBlue` already covers blue (kept) | — | standard |

Notes: Rick's white coat is inseparable from his pale skin by color, and his teal shirt shares hue with
his iconic blue hair, so PANTS is the only robust (pose-independent) target. Flash keeps his bespoke
`flashBlue`. No collisions (lone-universe chars); cross-universe hue overlaps are INFO.

---
## Grand total (Part 2)
| Batch | Universe | Variants |
|---|---|---|
| 1 | Dragon Ball | 16 |
| 2 | Naruto | 16 |
| 3 | Jujutsu Kaisen | 19 (incl. 3 named Gojo) |
| 4 | Hunter x Hunter | 12 (incl. 3 named Killua hair) |
| 5 | PR / R&M / Saiki / DC | 19 (incl. named Reverse Flash + Godspeed) |
| **Total** | **18 characters** | **82 selectable recolor variants** |

Plus kept: Flash `flashBlue`; bespoke costumes gojo2/sukuna3/pinkFit/megumi2; Edo-Tensei `reanim`.
All targeted (tools/recolor_palette.py) — costume-only, skin/hair/outlines/identity-colors preserved.
0 identity collisions. All regression green across every batch.

# Roronoa Zoro — sprite ledger

Source: `assets/incoming/zoro/zoro_sheet.png` (286×549 RGBA, GBA *One Piece*, ripped by Paddy).
Extractor: `tools/zoro_build/extract.py` (rects frozen from `tools/zoro_build/components.py`).
Contact sheet: `docs/zoro/contact_sheet.png` (every frame numbered `n:RxFy`; magenta = mouth-sword frame).
Machine-readable rects + uses: `docs/zoro/frames.json`.

## Method
* **Chroma key:** the sheet background is already alpha 0 → the key is the sheet's own alpha. Nothing else removed.
* **Cut:** 8-connected components on alpha, components within 3 px merged (keeps detached blade tips / glints).
* **Scaling:** none at extraction. Frames are copied 1:1 (nearest-neighbour only, never interpolated) into
  320×256 cells with the feet on y=150 and the ground-contact pivot on x=160 — the same cell convention and the
  same in-game `spriteScale` (2.3/1.18) as Luffy, who comes from the same GBA game and ripper.
* **Orientation:** the sheet faces **left**; the engine stores right-facing art and mirrors at runtime when a
  fighter faces left. Every body frame is therefore stored mirrored, so a left-facing Zoro shows the sheet's
  exact original orientation. This is a storage normalisation applied to every frame, not an added copy.
* **No invented art.** The only non-1:1 assets are the derived copies listed below.

## Real frame counts (vs. the brief's read)
| Row | Brief | Real | Note |
|---|---|---|---|
| R1 | 6 standing cycle | **6** | It is a **walk cycle** (legs alternate), swords at the hip, bandana off |
| R2 | 2 | **2** | Standing pair |
| R3 | 5 | **5** | + a detached 2×2 white speck beside F3 (kept with F3) |
| R4 | 6 | **5** | Blue-bandana attack set; F5 carries the yellow slash arc |
| R5 | 3 | **3** | Lunge / dash slashes; F1 has the big yellow arcs |
| R6 | 4 | **4** | |
| R7 | 4 | **4** | |
| R8 | 4 | **4** | Grey-white tornado |
| R9 | 3 + credit | **3 + credit** | Post, kneeling figure, Going Merry. The Merry and the credit panels are **one fused component**: cut at sheet x=168 |

**Mouth-sword (three-sword) frames, judged by eye:** R3F1, R4F2, R4F3, R4F4, R6F4, R7F1, R7F3, R7F4.
R7F2 holds two hand swords with no blade in the mouth.

## Frame → animation → trigger
| # | Frame | Rect (x0,y0,x1,y1) | Animation(s) | Move / state that plays it |
|---|---|---|---|---|
| 1–6 | R1F1–F6 | see frames.json | `walk`, `walk_back` (reversed order), `run`, `intro` | Walking / running (double-tap dash run uses `dash`), INTRO walk-in |
| 7 | R2F1 | 19,62,49,117 | `idle`, `win`, `getup` (last) | Neutral idle, WIN 1 (sheathed stand), getting up |
| 8 | R2F2 | 59,62,89,117 | `idle`, `win` | Idle cycle partner, WIN 1 |
| 9 | R3F1 ★ | 0,123,49,176 | `zShishi`, `intro` (last), `zSanto` | Shishi Sonson ready stance (counter window), INTRO sword draw, Santoryu activation |
| 10 | R3F2 | 58,127,92,176 | `hurt` | Hitstun (stagger) |
| 11 | R3F3 (+speck) | 99,127,142,176 | `hurt_heavy`, `hurt_air`, `knockdown` (F1) | Heavy / airborne hitstun, knockdown start |
| 12 | R3F4 | 152,133,197,176 | `crouch`, `getup` (F1) | Crouch (hold Down), wake-up; NAP charge-up crouch |
| 13 | R3F5 | 211,162,274,176 | `knockdown` (F2) | Lying knockdown |
| 14 | R4F1 | 2,193,62,237 | `light` | **Jab** (Light) |
| 15 | R4F2 ★ | 71,187,107,237 | `light` (recovery), `zTaka` (wind-up), `zTatsu` (wind-up) | Jab recovery, Taka Nami / Tatsu Maki wind-up |
| 16 | R4F3 ★ | 115,193,151,237 | `zSlash` (start), `guard`, `guard_hit` | **Slash** start-up, blocking |
| 17 | R4F4 ★ | 162,187,207,237 | `zSlash` (active), `heavy` (start), `zOni` (wind-up), `zTatsu` (spin) | Slash / Heavy slash / Oni Giri crossed-swords wind-up |
| 18 | R4F5 | 217,190,285,237 | `heavy` (active), `zTaka` (release), `zAshura` (finisher) | **Heavy slash** (launch), Taka Nami release, Rengoku Onigiri finish |
| 19 | R5F1 | 3,247,95,288 | `zWake`, `zOni` (pass), `zAshura` (cut 1) | **Wake-up reversal**, Oni Giri dash-through, Ashura cut 1 |
| 20 | R5F2 | 109,247,169,288 | `zWake` (follow), `zOni` (dash), `zShishiStrike`, `zAshura` (cut 2) | Oni Giri dash, Shishi Sonson draw-through, Ashura cut 2 |
| 21 | R5F3 | 181,256,228,288 | `dash`, `grab`, `throw` (F1), `zOni` (end), `zShishiStrike` (end), `zAshuraMiss` | Dash, grab reach, Oni Giri end (behind the foe), whiffed super |
| 22 | R6F1 | 3,301,63,345 | `zLow` (start) | **Low thrust** start-up |
| 23 | R6F2 | 75,303,121,345 | `up` (active), `jump`, `zTora` (leap) | **Rising slash**, jump rise, Tora Gari leap |
| 24 | R6F3 | 128,306,176,345 | `zLow` (active), `up` (start), `fall`, `down_air`, `zTora` (cut) | Low thrust active, Rising slash crouch, falling, air plunge, Tora Gari low cut |
| 25 | R6F4 ★ | 184,293,249,345 | `up` (follow-through), `throw` (F2) | Rising slash follow-through, throw |
| 26 | R7F1 ★ | 11,359,62,410 | `zsIdle`, `zsLight`, `zSanto`, `zAshura` (aura), `win2`, `taunt` | **Santoryu stance idle**, Santoryu Jab, activation, Ashura aura, WIN 2 |
| 27 | R7F2 | 66,360,132,410 | `zsLight` (active), `taunt`, `zAshura` (cut 3) | Santoryu Jab active, taunt, Ashura cut 3 |
| 28 | R7F3 ★ | 143,360,191,410 | `air`, `zsHeavy` | **Air slash**, Santoryu heavy slash |
| 29 | R7F4 ★ | 207,360,254,410 | `air`, `zsHeavy` | Air slash follow-through, Santoryu heavy slash |
| 30–33 | R8F1–F4 | see frames.json | `fx_tornado` (4-frame loop, unmirrored) | **Tatsu Maki** tornado projectile |
| 34 | R9F1 | 12,489,46,548 | `lose` | **LOSE** pose (tied to the Shells Town post); brutality / defeat victim pose |
| 35 | R9F2 | 68,501,89,547 | `nap`, `zNap` | **NAP** idle (idle > 600 frames) and the NAP Spirit-regen special |
| 36 | R9F3 | 110,495,167,548 | `merry.png`, `portrait.png` | **Going Merry** emblem: roster/select icon, HUD Spirit badge, stage-intro emblem |

★ = mouth-sword frame.

## Derived copies (render-only or FX; every pixel is a source pixel)
| Asset | Derived from | How | Used for |
|---|---|---|---|
| `assets/zoro/fx_takanami.png` | R4F5 | The arc-coloured pixels only (white/yellow/gold, 8-connected components with <25% contact with a black outline); mirrored | Taka Nami flying-slash projectile |
| `assets/zoro/zsIdle.png` drawn ×3 at offsets | R7F1 | Same frame drawn as three translucent offset copies at render time | Ashura three-copy aura afterimages (render-only) |
| Oni Giri / Ashura afterimage trail | current body frame | Translucent offset copies at render time | Dash afterimages (render-only) |

## Excluded
| Item | Rect | Reason |
|---|---|---|
| "Ripped by Paddy / No credit needed" text panels | 168,495,273,548 | **excluded, credit** — recorded in `docs/zoro/CREDITS.md` |

Nothing else is excluded; every one of the 36 frames above is used by at least one animation.

## Judgement calls (the brief's row mapping vs. the real sheet)
* R4 has **5** frames, so the brief's "Jab fr1-2 / Slash fr3-4 / Heavy fr5-6" became Jab F1-F2, Slash F3-F4,
  Heavy F4-F5 (F4 is shared, as the rising crossed-swords pose reads as both the Slash hit and the Heavy wind-up).
* R6: by eye F1 = mid thrust, F2 = sword raised overhead, F3 = low sweep, F4 = two-sword extension. So
  Low thrust = F1→F3 (ends low) and Rising slash = F3→F2→F4 (crouch → rising → extension), not the brief's
  literal fr1-2 / fr3-4 split.
* R1 is a walk cycle, so it drives walking and the intro walk-in; R2 drives idle.
* No dedicated jump frames exist: jump = R6F2 (rising pose), fall = R6F3 (blades down).
* No dedicated block frame: guard = R4F3 (crouched, swords crossed in front).
* R9F2 keeps the small white marks under the figure (they are part of the same component in the source).

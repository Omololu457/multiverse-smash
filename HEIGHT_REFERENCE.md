# Character Height Reference — canon-accurate `spriteScale` methodology

**Purpose.** Set every character's on-screen size relative to their **actual canon height**, not
"looks about right next to whoever was built last." This is the process fix that stops the recurring
one-off corrections (Netero / Killua / Beerus were each re-tuned after the fact). Every new sprite
character (Hisoka, Omni-Man, Batman, … once finished) should set `spriteScale` with this from the start.

---

## 1. The reference block (the unit standard)

On-screen size is `visible_body_px = idle_content_height_px × spriteScale`, where *content height* is the
**trimmed (non-transparent) body height** of the idle frame — measured through the real
`SpriteHandler.draw()` pipeline, so every character is measured under identical conditions.

The measurement hook lives in `game.js` (`?harness` only):

- `window.__harness.measureSprite(who)` → `{ contentH, contentW, cellDstH, scale, action, clipped }`
  renders the fighter's current sprite to a clean offscreen canvas and returns the alpha bounding box.
  `contentH` = the visible body height in px (what the eye reads); `cellDstH` = full cell × scale
  (includes the sheet's transparent margins — **not** the body height).
- `window.__harness.spriteCrop(who)` → trimmed idle PNG data-URL, used to composite the roster montage.

Run the audit + montage with:

```bash
node harness/height_reference.mjs before   # measure all sprite chars → shots/height_measure_before.json + montage
node harness/height_reference.mjs after    # re-run after changing scales → side-by-side compare
```

**Reference constant (fit across the roster):** `k = 0.623 px per cm` → **1 meter = 62.3px on-screen**.
So the target visible height for any character is:

```
target_px = 0.623 × canon_height_cm
```

`k` is the least-squares-through-origin fit over all 23 sprite characters, i.e. the mapping that keeps the
overall roster size the same while fixing the *relative* proportions. Re-derive it if the roster changes a
lot (recompute in `harness/height_reference.mjs`'s companion `/tmp/audit.mjs` pattern), but it should stay
near 0.62.

**To scale a NEW character:** measure their idle `contentH` at a trial `spriteScale`, then
`spriteScale_final = spriteScale_trial × (0.623 × canon_cm) / contentH`. Sanity-check with the montage.

---

## 2. Canon-height lookup table

`cf` = confidence: **H** = official / databook / stated in source; **E** = reasoned estimate (unstated).
Estimates are applied more conservatively and flagged in the character's `spriteScale` comment.

| Character | Canon height | cf | Source / note |
|---|---|---|---|
| Gon Freecss | 154 cm | H | HxH databook (age 12, **base** form; Adult-Form ult is a separate mode) |
| Killua Zoldyck | 158 cm | H | HxH databook (age 12) |
| Vegeta | 164 cm | H | Dragon Ball databook |
| Naruto Uzumaki | 166 cm | H | Naruto Part II databook (Shippuden) |
| Sasuke Uchiha | 168 cm | H | Naruto Part II databook |
| Saiki Kusuo | 168 cm | H | Stated in series |
| Goku | 175 cm | H | Dragon Ball databook (adult) |
| Goku Black | 175 cm | H | Goku's frame (Zamasu) |
| Megumi Fushiguro | 175 cm | H | JJK official |
| Itachi Uchiha | 178 cm | H | Naruto databook |
| Rick Sanchez | 178 cm | E | est. ~5'10" (unstated) |
| Minato Namikaze | 179 cm | H | Naruto databook (179.2) |
| Isaac Netero | 180 cm | H | HxH databook |
| Tobirama Senju | 182 cm | H | Naruto databook (182.3) |
| Omega Ranger (White/S.P.D.) | 183 cm | E | est. adult human ranger (unstated) |
| The Flash (Barry Allen) | 183 cm | H | DC official (6'0") |
| Sukuna | 184 cm | E | est. true form; Itadori vessel is 173 |
| Hisoka Morrow | 187 cm | H | HxH databook |
| Toji Fushiguro | 188 cm | H | JJK official |
| Batman (Bruce Wayne) | 188 cm | H | DC official (6'2") |
| Gojo Satoru | 190 cm | H | JJK official |
| Omni-Man (Nolan) | 193 cm | E | est. ~6'4" Viltrumite (unstated) |
| Beerus | 200 cm | E | est. ~2m, slender (unstated) |

---

## 3. Audit (measured 2026-07-28, pre-correction)

Everyone was compressed into a flat ~100–124px band while canon spans 154–200cm: short characters
rendered too tall, tall characters too short. `ratio = current_px ÷ target_px` (>1 = too tall for canon).

Genuine outliers (|Δscale| ≥ ~10%): **gon (−15%), killua (−10%), sasuke (−10%), minato (+12%),
toji (+13%), beerus (+14%, est.)**. Everyone else was already within ±8% (reasonably proportional —
left untouched). Two special cases were **not** auto-corrected:

- **Rick** — the fit says shrink 11%, but his 1.85 is a *documented deliberate +8.8% "presence bump"*
  (thin silhouette / low visual mass, not height). **Preserved**, flagged for human decision only.
- **Naruto** — his measured 114px is inflated by the KCM chakra **aura** around the body, so his true
  body ratio is ~1.0. Correcting on the aura-inflated number would make him too small. **Left as-is.**

---

## 4. Corrections applied (2026-07-28)

Strategy chosen: **outliers only** (correct the genuine outliers to canon, leave proportional ones).
Each change also rescaled every `anchorY` in the character's `animationData` by the same ratio so feet
stay planted (`anchorY = -(bottom_gap × spriteScale)`). Verified: post-change measured px within ±4 of
target, no clipping, all affected test suites green.

| Character | spriteScale | measured px → | target px |
|---|---|---|---|
| Gon | 2.5 → **2.12** | 113 → 96 | 96 |
| Killua | 2.3 → **2.06** | 110 → 99 | 98 |
| Sasuke | 2.1 → **1.90** | 116 → 102 | 105 |
| Minato | 1.7 → **1.90** | 100 → 116 | 112 |
| Toji | 2.3 → **2.59** | 104 → 117 | 117 |
| Beerus | 1.85 → **2.12** | 109 → 125 | 125 |

**Preserved (not overridden):** Rick 1.85 (deliberate presence bump). **Skipped:** Naruto (aura-inflated
measurement). See `harness/shots/height_roster_before.png` vs `height_roster_after.png`.

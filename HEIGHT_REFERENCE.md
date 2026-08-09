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
| Shinobu Kocho | 151 cm | H | Demon Slayer databook (shortest Hashira) |
| Chrollo Lucilfer | 177 cm | H | HxH databook |
| Kyojuro Rengoku | 177 cm | H | Demon Slayer databook |
| Samurai Red Ranger (Jayden) | 178 cm | E | est. adult human ranger (unstated) |
| Gold Samurai Ranger (Antonio) | 178 cm | E | est. adult human ranger (unstated) |
| Superman | 191 cm | H | DC official (6'3") |
| Ben Tennyson (human) | 168 cm | E | est. teen (age/series-dependent, unstated) |
| Ben 10 aliens (XLR8/Diamondhead/Feedback) | ~178–190 cm | E | very soft est.; share `ben10.spriteScale`, art-relative to human |

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

---

## 5. Extended audit — characters built since the last pass (2026-08-01)

Re-ran the audit (same `k=0.623`, same `measureSprite` pipeline) across every char built since section 3:
Rengoku, Shinobu, Samurai Red Ranger, Gold Samurai Ranger, Chrollo, Superman, Batman, Omni-Man, and the
Ben 10 forms (human/XLR8/Diamondhead/Feedback). `ratio = measured_px ÷ target_px` (target = 0.623×canon).
Giant-form Ultimates excluded per the standing rule (measured the idle rest pose only).

| Character | canon | cf | scale | measured px | target px | ratio | verdict |
|---|---|---|---|---|---|---|---|
| **Rengoku** | 177 | H | 2.25 → **1.94** | 128 → **111** | 110 | 1.16 → 1.01 | **OUTLIER +16% → FIXED** |
| **Shinobu** | 151 | H | 2.25 → **1.73** | 122 → **93** | 94 | 1.30 → 0.99 | **OUTLIER +30% → FIXED** |
| Samurai Red Ranger | 178 | E | 1.85 | 111 | 111 | 1.00 | clean |
| Gold Samurai Ranger | 178 | E | 2.0 | 112 | 111 | 1.01 | clean |
| Chrollo | 177 | H | 1.9 | 106 | 110 | 0.96 | clean |
| Batman | 188 | H | 0.92 | 118 | 117 | 1.01 | clean |
| Omni-Man | 193 | E | 0.95 | 120 | 120 | 1.00 | clean |
| Superman | 191 | H | 1.6 | 132* | 119 | 1.11* | **CONFOUNDED — not fixed** |
| Ben (human) | 168 | E | 2.0 | 96 | 105 | 0.91 | within tol (−9%) |
| Ben · XLR8 | ~185 | E | (2.0 shared) | 82* | 115 | 0.71* | confounded + shared scale |
| Ben · Diamondhead | ~190 | E | (2.0 shared) | 128 | 118 | 1.08 | within tol |
| Ben · Feedback | ~178 | E | (2.0 shared) | 98 | 111 | 0.88 | within tol (−12%, est.) |

**Root cause of the two outliers:** both Demon Slayer chars blindly inherited Zenitsu's `2.25`, which is
correctly calibrated for *Zenitsu* (164.5cm → measures 99px, on target) but not for their own art+canon.
Rengoku's build note even mis-stated his idle content as ~48px (it's ~57px), so 2.25 rendered 128 not the
intended ~108. All anchorY are 0 (feet at cell bottom) on both → no anchor rescale needed. Re-measured
post-fix: Rengoku 111px, Shinobu 93px (both ≈ target). Suites green (rengoku 41/41, shinobu 35/35).

**Not corrected (flagged):**
- **Superman** — `*` the bbox 132 is inflated by the **cape trailing below the feet** in his flying-lean
  idle (row-density profile: dense body ends ~y64, then ~19 sparse cape rows). His true *body* is ~101px,
  which is actually *short* for 191cm — so correcting on the cape-inflated 132 would over-shrink the body.
  Same class as the Naruto-aura caveat (§3): measurement-confounded, left as-is.
- **Ben 10 forms** — all four share one `ben10.spriteScale` (2.0); the aliens have no per-form scale, so
  none can be tuned independently without new machinery (out of "spriteScale-only" scope). Human is within
  tolerance (−9%); alien canon heights are very soft estimates and XLR8's `*` low speedster stance confounds
  its height. No confirmed, independently-actionable outlier → left as-is.

---

## 6. Full-roster re-scale — 2026-08-03 (new canon table, 35 sprite chars)

Re-ran the audit across the **entire** current sprite roster (added since §5: **maki, green_samurai_ranger,
ghostface, miwa**) against a **refreshed canon-height table** supplied 2026-08-03. Same `k=0.623`, same
`measureSprite` pipeline, giant-form Ultimates excluded (idle rest pose only). `ratio = measured_px ÷ target`,
`target = round(0.623 × canon_cm)`, outlier = `|ratio−1| ≥ 0.10`.

**Canon-value revisions in the new table** (vs §2), applied as input: ~~Beerus 200→175 (M)~~ **[REVERTED to 200 — see correction below]**, Tobirama 182→**194**,
Itachi 178→**175**, Sukuna 184→**173** (Yuji vessel), Toji 188→**182**, Megumi 175→**170**, Netero 180→**178**,
Chrollo 177→**180**, Omni-Man 193→**188**, Saiki 168→**170**, Rick 178→**168**. New chars: Maki **167**,
Miwa **178 (est — undocumented)**, Ghostface **178 (est — no single canon height; mask worn by different
actors, so average-adult default)**, green ranger **178 (est)**. Most revised chars stayed inside ±8% (their
measured px were already proportional), so only the genuine outliers below were touched.

**Corrections applied (3):** every affected char has all-zero `anchorY` → no anchor rescale needed.

| Character | canon | scale | measured → | target | ratio | verdict |
|---|---|---|---|---|---|---|
| **ghostface** | 178 E | 1.15 → **0.982** | 130 → **111** | 111 | 1.17 → 1.00 | **OUTLIER +17% → FIXED** |
| ~~beerus~~ | ~~175~~ | ~~2.12 → 1.849~~ | — | — | — | **REVERTED — see correction below** |
| **miwa** | 178 E | 1.7 → **2.144** | 88 → **112** | 111 | 0.79 → 1.01 | **OUTLIER −21% → FIXED** |

**STEP 3 — Ghostface vs Sasuke/Naruto (explicitly checked):** CONFIRMED Ghostface was rendering **taller**
than both (130px vs Sasuke 102 / Naruto 114) — the flagged bug. After the fix he is **111px**, i.e. only
*mildly* taller than Sasuke (104) and Naruto's true body (~103, his 118 is KCM-aura-inflated), which matches
canon (178 > 168 > 166). Relationship corrected.

**Held — NOT auto-corrected (deliberate / measurement-confounded), flagged for review:**
- **rick** (ratio 1.18) — documented deliberate **+8.8% presence bump** (thin silhouette / low visual mass).
  NOTE the new table lists Rick **168cm** (down from the 178 est); if applied literally he'd shrink further,
  but the presence bump is a standing exception — **preserved**.
- **naruto** (1.11) — measured px inflated by the **KCM chakra aura**; true body ≈ target. Preserved (§3).
- **superman** (1.11) — measured px inflated by the **cape trailing below the feet**; true body is short-for-
  191cm. Preserved (§5).
- **ben10** (ratio 0.74 on the human form) — the 4 forms (human/XLR8/Diamondhead/Feedback) **share one
  `ben10.spriteScale`**; Diamondhead already measures ~128px, so bumping the shared scale to fit the 82px
  human form would make the aliens far too tall. **Not independently actionable within spriteScale-only
  scope** (needs per-form scale machinery) — held, same as §5.

All 34 other chars sit within ±8% of the new targets (proportional — untouched). Re-measured post-fix:
ghostface 111 / beerus 109 / miwa 112 (all ≈ target), no clipping. Suites green (miwa 25/0, ghostface 18/0,
beerus 38/0 — the beerus test's spriteScale assertion updated 2.12→1.849). Montage:
`height_roster_before.png` vs `height_roster_after.png`.

**Estimate flags (no reliable canon figure — used ~178cm average-adult fallback):** ghostface, miwa,
omega_ranger, samurai_red_ranger, gold_samurai_ranger, green_samurai_ranger, ben10 forms.

### 6a. Beerus canon correction — 2026-08-03 (single-row)

The 2026-08-03 table's Beerus figure (**175cm**) was **corrected back to ~200cm**: Beerus is the God of
Destruction and reads as **notably larger-than-human**, not roughly average height — the 175cm value was
too short for his on-screen presence and canon depiction (consistently taller than Goku's 175cm frame).

Re-applied the formula at 200cm: `target = 0.623 × 200 ≈ 125px`. From the post-§6 state (scale **1.849**,
measured **109px**): `1.849 × 125/109 ≈ 2.12`. So Beerus reverts to **spriteScale 2.12** (at which he
measures **125px = on target for 200cm**) — i.e. exactly his value prior to the §6 pass. All `anchorY`
are 0 → unchanged. **Single-character change: only Beerus was touched** (Miwa 2.144 / Ghostface 0.982 and
the other 33 chars are unchanged). Beerus suite green (spriteScale assertion updated 1.849→2.12).

---

## §8 — 2026-08-04: extend the audit to Yuji & Madara (never in the list) + re-verify Maki

**Trigger.** Maki, Miwa, Ghostface, Yuji, Madara were flagged as "built since the last pass." Direct
check of `harness/height_reference.mjs`'s `CHARS` list: Maki/Ghostface/Miwa were added (§7, 2026-08-03)
but **Yuji and Madara were NEVER in it** — they had never been measured by this methodology. Yuji's
`spriteScale` was still a literal **trial (2.10)** with a "refine via harness measureSprite" TODO in its
comment; Madara was an untuned **1.8**. Added both to `CHARS` (permanent).

**Same methodology** (spriteScale only, `k = 0.623 px/cm`, `target = 0.623 × canon`, giant forms excluded
because we measure the base idle — Madara's Complete-Susanoo and Maki's Shibuya both use runtime
`_canvasHeightFrac`, untouched). All five have `anchorY: 0`, so no re-anchor is needed on a scale change.

| Character | Canon | cf | Target px | scale before → after | idle px before → after | Verdict |
|---|---|---|---|---|---|---|
| **maki** | 167 cm | H | 104 | 1.63 → **1.51** | 112 (+8%) → **104** | outlier +8% → FIXED |
| **madara** | 179 cm | H | 112 | 1.8 → **1.89** | 106 (−5%) → **111** | outlier −5% → FIXED |
| **yuji** | 173 cm | H | 108 | 2.10 → **2.16** | 105 (−3%) → **108** | trial → FINALIZED on target |
| miwa | 178 cm | E | 111 | 2.144 (unchanged) | 112 (+1%) | already on target (§7) |
| ghostface | 178 cm | E | 111 | 0.982 (unchanged) | 111 (0%) | already on target (§7) |

Canon: Madara 179cm and Yuji/Itadori 173cm are Naruto/JJK databook figures (H). **3 chars changed**
(maki, madara, yuji); Miwa/Ghostface confirmed still on target and left alone; all other chars untouched.
Test-suite spriteScale assertions updated (madara 1.8→1.89, yuji 2.10→2.16). Suites green: madara 44/0,
maki 30/0, yuji 39/0 (giant forms unaffected). Evidence: `harness/shots/height_roster_before.png` /
`height_roster_after.png` (full 36-char roster, feet-aligned) + `height_5char_zoom_before_after.png`
(zoomed 5-char panel). No `clipped` on any of the five.

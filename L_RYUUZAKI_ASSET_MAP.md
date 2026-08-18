# L "RYUUZAKI" — Asset Map & Content Audit (pre-build)

L Lawliet / "L" / "Ryuuzaki" — Death Note universe. `rosterKey: TBD` (suggest `l_ryuuzaki`;
sibling Death Note char is `light`, see `LIGHT_ASSET_MAP.md` for universe routing).
Slim young detective — messy black hair, white long-sleeve shirt, blue jeans, bare feet,
golden/tan hands+feet, permanent slouch. Capoeira-style kicker in canon.

**This is a CONTENT AUDIT ONLY — no kit designed, no code wired.** Stats/archetype/rosterKey
are deferred to the design Q&A pass.

## SOURCE FORMAT
- Art arrived as **29 individual horizontal sprite strips** (12 named + 17 numbered
  `l_ryuuzaki_row_NN.png`; `row_06` is absent — numbering is 05, 07–22). NOTE: the original
  brief said "28 files / 14 unlabeled rows" — the true counts are **29 strips / 17 numbered rows**.
- Flat **teal (0,102,102)** background, keyed to transparent per-strip by
  `tools/slice_l_ryuuzaki.py` (auto-samples bg from each sheet's own border; row-only slice;
  never guesses fused rows). Raw originals kept in `l_ryuuzaki_sprite_rows/`; keyed 1:1 copies
  in `l_ryuuzaki_sprite_rows_sliced/` (+ `_manifest.tsv`).
- **NO master atlas/spritesheet exists.** Largest file is `bookshelf` (851px). Cross-matching
  was done **frame-by-frame across all 29 strips via exact-pixel hashing** (which produced the
  overlap map below), not against a single sheet.
- Frame counts = measured via alpha-gutter **column** scans (≥2px transparent gutter; debris
  islands <3px dropped). Descriptions: `row_05`,`08`–`12` + all named/legend/Ryuk files were
  **visually confirmed**; `row_14`,`18`–`22` via palette/geometry/dup **signature**; `row_21` and
  `row_22` were then **eyes-on confirmed via subagent** (this session's cumulative image cap was
  worked around with a fresh-context agent).

---

## CONTENT INVENTORY

### L — movement / state
| File | W×H | Frames | Content | Conf |
|---|---|---|---|---|
| `idle_face` | 362×57 | 1 + 4 | **MIXED:** L face-bust portrait (VS/select) **+ 4 stray Ryuk walk frames** | High |
| `walk` | 141×50 | 4 | L slouched **walk cycle** (f2=f4 dup) | High |
| `row_05` | 579×42 | 10 | L **run cycle** → faster dash/lunge tail | High |
| `row_20` | 581×50 | 15 | **Standing neutral IDLE** — ping-pong breathing loop (f1↔f5). f14–15 = dark **debris islands**, not real frames | High |
| `row_22` | 545×49 | 14 | **SEATED IDLE** — L sits on a chair, arms at mid-torso, near-static breathing loop. NOT a guard/block (eyes-on confirmed) | **High** |
| `knockdown` | 1005×49 | ~10 (+1) | Hurt → reel → fall → lie → **getup**. Trailing 3px "frame" = debris sliver | High |

### L — attacks (golden-arc/energy FX family)
| File | W×H | Frames | Content | Conf |
|---|---|---|---|---|
| `row_09` | 203×47 | 4 | Straight **punch** (jab/cross) | High |
| `row_10` | 192×48 | 4 | Heavier **punch/palm** w/ large golden swipe | High |
| `row_08` | 148×60 | 3 | Sweeping **crescent/roundhouse kick**, purple arc-trail | High |
| `row_11` | 239×51 | 5 | Rising **uppercut/hook** w/ upward golden arc (launcher-shaped) | High |
| `row_12` | 251×50 | 5 | Airborne **spin kick** w/ full golden crescent | High |
| `row_14` | 591×48 | 10 | Melee w/ **rising golden energy burst** (f6–7 peak) — launcher/flurry special | Med-High |
| `row_18` | 340×50 | 6 | Melee **strike w/ golden arc burst** (f3–4); no overlap w/ other files | Med-High |
| `row_19` | 226×60 | 4 | Attack w/ **massive golden energy burst** (f3 = gold 41%, fills full 60px) — special/finisher-tier FX; tallest strip | Med-High |

### L — specials / taunts
| File | W×H | Frames | Content | Conf |
|---|---|---|---|---|
| `point` | 258×50 | 5 | **Taunt** — L extends accusing point | High |
| `gun_rocket` | 479×58 | 8 | **ONE move** — bazooka/rocket-launcher special: windup → muzzle-flash → traveling blast → recovery. NOT two merged pieces | High |
| `row_21` | 619×50 | 12 | **Death Note item charge/hold** — L manifests & holds a large red notebook-like object that grows f1–8, held steady f9–12 (eyes-on confirmed). A held-item/charge special, NOT a slash or aura | **High** |
| `bookshelf` | 851×56 | 10 | **Scene/pose** — L settles into his crouched-in-armchair detective pose; bookshelf + red armchair baked into every frame as bg props. NOT a stage hazard | High |

### Ryuk — separate assist entity (own larger scale, 62px vs L's ~50px)
| File | W×H | Frames | Content | Conf |
|---|---|---|---|---|
| `ryuk_monster_row1` | 251×62 | 4 | **Ryuk** idle/hover — gaunt shinigami, feathered wings, yellow eyes, red grin | High |
| `ryuk_monster_row2` | 349×56 | 5 | **Ryuk** action/laugh-lunge | High |

### EXCLUDE — reference/legend (not gameplay)
| File | W×H | Frames | Content | Conf |
|---|---|---|---|---|
| `legend_key1` | 32×26 | 1 | Single dark reference swatch | High |
| `legend_key2` | 393×26 | ~12 | Boxed **dither/noise texture samples + gothic-"L" logo** | High |
| `legend_key3` | 503×33 | ~12 | Same, near-duplicate of key2 | High |

### OUT OF SCOPE
- `light_ryuk_uniform.png` — a **different character** (Light Yagami); see `LIGHT_ASSET_MAP.md`.

---

## DUPLICATE / OVERLAP FINDINGS (exact-pixel confirmed)
The row set is **not disjoint** — several strips are overlapping/fragmented captures of the same
motions. Real distinct-move count is well under 17.

**Merged capoeira-kick sequence** = `row_07` + `row_13` + `row_16` + `row_17` + `row_15` —
one fragmented acrobatic-kick move. **`kick_trail` (8f) is the fullest capture**; treat the rest
as sub-segments, not separate moves.

| Overlap (identical pixels) | Meaning |
|---|---|
| `kick_trail` f1–3 == `row_15` f1–3 | `row_15` is a **subset of `kick_trail`** |
| `row_07` f2 == `row_16` f1 | shared start of the kick sequence |
| `row_07` f3/f7 == `row_17` f4; `row_07` f4/f8 == `row_17` f5 | `row_17` is a sub-segment of `row_07` |
| `row_07` f6 == `row_13` f3 | shared dive/plunge pose |
| `knockdown` f10 == `row_07` f1 | shared getup/stand pose |
| `walk` f3 == `row_20` f2/f10 | walk ↔ standing-idle overlap (1 neutral in-between frame) |
| `idle_face` contains 4 Ryuk frames | mixed content — belongs in Ryuk's pool |

---

## CONFIRMED OPEN ITEMS (for the design pass — logged, NOT resolved)
1. **Guard/block = NO dedicated art (real gap).** The earlier `row_22` candidate is **disproven**
   — `row_22` is a *seated idle*, not a guard. A guard/block will need reused frames or a
   procedural fallback. **Design decision needed.**
2. **No clean standalone jump / air-idle.** The merged capoeira acro (`row_07` sequence) may
   double for this. **Flag as a design decision — do not silently assume.**
3. **No dedicated win-pose.** Two candidates: the `bookshelf` crouch-into-armchair scene, or the
   `row_22` seated idle. **Design decision needed.**
4. **Ryuk assist is content-constrained.** Ryuk has **idle + action/laugh** frames only — **NO
   summon-in and NO attack-specific frames.** Do **not** design an attack-capable Ryuk assist
   without new art; the current art supports a presence/idle/taunt-style assist at most.
5. **`idle_face` must be split.** Keep the L face-bust as the portrait; **reassign its 4 embedded
   Ryuk frames to Ryuk's content pool.**

### Design-relevant asset notes
- Two idles exist: **standing** (`row_20`) and **seated** (`row_22`) — L canonically sits/crouches;
  the seated idle pairs naturally with the `bookshelf` "settle into chair" scene.
- Attack pool is a **golden-arc/energy FX family** (`row_08`–`12`, `14`, `18`, `19`) — differentiate
  by arc direction/size, not by color.
- Two ranged/special options with real art: **`gun_rocket`** (bazooka blast) and **`row_21`**
  (Death Note item charge/hold). Both are distinct, non-overlapping.

---

## DESIGN — CONFIRMED (SCHEMA-EXCEPTION KIT)
Declared a **schema-exception** kit (precedent: Light, Madara, Isshiki, Saitama) — wire the real
content rather than trimming to a standard budget. `rosterKey` still TBD (suggest `l_ryuuzaki`).

### Open-item resolutions (from the design pass)
- **Guard/block** → generic procedural block fallback (row_22 disproven as a guard; it's a seated idle).
- **Jump / air-idle** → reuse the merged-capoeira acrobatic sequence as double-duty air-state where
  visually plausible; generic procedural fallback where it isn't. Confirm case-by-case once the
  merged sequence is assembled/viewable.
- **Win-pose** → seated idle (`row_22`), his signature crouched perch.
- **Ryuk special** → reuse Light Yagami's **`LIGHT_SUMMONS.ryuk`** mechanics (`abilities.js:4351`,
  `fireLightSummon(…, "ryuk")`): cost 30, dmg 66, w62×h92, speed 3, ky -7, life 28, delay 10,
  `launcher:true` — the **phantom-hitbox idiom** (one-shot summon FX, non-persistent), which exactly
  fits the "Ryuk has idle+laugh art only, no attack frames" constraint. Paired with L's OWN Ryuk art
  (`ryuk_monster_row1/2` + the 4 reassigned `idle_face` frames). Ryuk's ONLY offensive move; his idle/
  laugh art elsewhere stays pure cameo/flavor. (Bonus reference: Light's `gunman` long-range rocket,
  `abilities.js:4354`, mirrors the bazooka mechanic.)
- **`idle_face` split** → keep the L face-bust portrait; reassign its 4 Ryuk walk frames to the Ryuk pool.

### TWO idles
- **Standing** (`row_20`) = primary movement-adjacent loop.
- **Seated** (`row_22`) = contextual variant + win-pose. Proposed (optional) flavor trigger: seated
  idle appears after a period of no input (matching L's canon habit of perching when still).

### NORMALS (5) — derived from the confirmed audit
| Slot | Source | Content |
|---|---|---|
| light | `row_09` | straight punch / jab (4f) |
| heavy | `row_10` | heavy punch/palm + golden swipe (4f) |
| up (launcher) | `row_11` | rising uppercut + upward golden arc (5f) |
| air | `row_12` | airborne spin kick + golden crescent (5f) |
| down_air | ⚠ **OPEN** | see decision below |

**down_air — only unresolved decision.** Its natural content (`row_13` downward flame-dive) is
consumed by the command-normal below. Options: (1) `row_13` dive pose **double-serves** as down_air
(shared art — same precedent as `knockdown` f10 == `row_07` f1, already approved) ← **recommended**;
(2) repurpose `row_18` golden-arc strike as a downward air normal; (3) procedural fallback.
`row_08` (crescent kick, 3f) remains free as a command-normal / alt-normal candidate.

### COMMAND-NORMAL (cancelable chain, not a special)
- **Merged capoeira** = `row_07` + `row_13` + `row_16` + `row_17` — ONE continuous cancelable string
  (per confirmed dup frames: row_07 f2==row_16 f1; row_07 f3/f7==row_17 f4; row_07 f4/f8==row_17 f5;
  row_07 f6==row_13 f3). His densest movement-integrated combo content.
- **Get-up reuse:** `knockdown` f10 == `row_07` f1 — reuse directly, do not duplicate art.

### FULL SPECIALS (5 — schema-exception, wire all)
1. **Bazooka** — `gun_rocket` (confirmed ONE move; long-range projectile; ref Light `gunman` mechanics).
2. **Investigation / analysis special** — `row_21` reframed (NOT a lethal Death Note attack — the red
   notebook-manifest art repurposed as a non-lethal analysis/setup move per confirmed design decision).
3. **Ryuk cameo-attack** — Light-borrowed `ryuk` mechanics + real Ryuk art (see resolution above).
4. **Golden rising burst** — `row_14` (rising golden energy burst, launcher/flurry, 10f).
5. **Golden nova** — `row_19` (massive golden energy burst, fills full 60px height, 4f — super/marquee-tier FX).

### EX / COMMAND-NORMAL EXTENSION
- **`kick_trail`** (multi-hit kick flurry, 8f; `row_15` is its subset) — **cancel-only EX extension**
  off the merged-capoeira chain or off a normal (precedent: Vegeta EX Ki Punch), NOT a from-neutral
  special. Reads as a flurry finisher.

### Golden-arc FX family
`row_08/10/11/12/14/18/19` share L's golden-arc/energy visual signature — wire consistently across
whichever normals/specials use them.

## STATUS: AUDIT COMPLETE + DESIGN CONFIRMED
All 29 strips identified (incl. `row_05/08–12/15/18/20` — NOT pending); overlaps mapped; schema-
exception design locked. **One open decision: down_air (recommend option 1).** Next: full build prompt
once down_air is picked.

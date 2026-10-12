# Shisui & Itachi (Kids) — "The Two Prodigies" — BUILD LEDGER

`rosterKey: shisui_itachi_kids` · universe `naruto` · additive. **Kid Shisui is the playable body; Kid Itachi
is an assist only.** Every other character (incl. `itachi`, the `shisui_*` variants, `sasuke`) is READ-ONLY.
`combat.js` UNTOUCHED across all three phases.

Source **K** = `kid_shisui_and_kid_itachi_nzc_by_altair_by_altairframemaker_defojue.png` (734×2303, opaque navy
`(0,64,128)` + noise, **border-floodfill** keyed → `shisui_itachi_kids_*_uniform.png`). Slicer:
`shisui_itachi_kids_work/slice.py` (main = Phase 1, `--phase2` = Phase 2 specials art).

## Commits
- **Phase 1** `cbc1d5b5` — body / normals / flicker dash / intro (both boys) / win / lose / plumbing.
- **Phase 2** `8b3ed7b1` — directional specials + Itachi assist + Blind-Spot deflect + Training Bond accrual
  (+ a one-char repair of a concurrent corruption that had left main's `spritesheets.js` unparseable).
- **Phase 3** `<this commit>` — Training Bond HUD + Twin Flicker ultimate + lines + Move List + this ledger.

## Stats / resources (children = fast, fragile)
HP **940** (lowest band) · Chakra **180** · attack **78** · defense **80** · speed **98** (top-end) ·
jumps 2 · spriteScale **1.15** (idle ~67px native → ~91px on-screen, shorter than the ~108–116px adult band) ·
energy label **"Chakra"** · default skin only · **no voice clips**. CHILD CHARACTER → added to the game.js
`BRUTALITY_ELIGIBLE` HARD-EXCLUSION comment (no gore, no blood FX anywhere).

## K-sheet section ledger (every part USED or UNUSED+reason)
| Sheet region | Disposition |
|---|---|
| Title text / "STANCE/GUARD/CHAKRA/SPECIAL" labels | UNUSED — labels excluded (band y0 raised; cyan "SPECIAL 2" + red/white box chrome scrubbed) |
| Intro 2f (Itachi + Shisui) | USED → `intro` (both boys, one wide frame) + reused as Twin Flicker final-pair |
| Win (streak + Shisui) | USED → `win` (Shisui; streak excluded) |
| Stance / Guard / Chakra 1f | USED → `idle` / `guard` / `charge` (hold-to-charge) |
| Run 6f | USED → `walk` + `run` |
| Jump 3f | USED → `jump` + `fall` (last frame) |
| Taking Damage 2f | USED → `hurt` |
| Dash 3f (flicker streak) | USED → `dash` (Kid Body Flicker) |
| Heavy3 (head-down dive) | USED → `down_air` |
| Knocked Down 4f | USED → `knockdown` (tumble+lying) + `getup` + `lose` (lying frame; no lose art on sheet) |
| Attack Combo row1 / row2 / row3 | USED → `light` / `up` (flurry) / `heavy` (crescents baked) |
| Air Combo row1 5f | USED → `air` |
| Air Combo row2 (Itachi throwing) | USED → **Itachi Assist** throw frames (`itachi_throw`) |
| Special 1 (2 Shisui cast frames) | USED → **Genjutsu Flash** cast (`genjutsu`); the 3 white circles + grey placeholder VICTIM are **never sliced** (flash is code-drawn) |
| Special 2 (flicker-strike box 7f) | USED → **Flicker Rush** (`flicker`); RED blood marks + white box BORDER **scrubbed** |
| Special 3 row2 (Shisui kunai throw 4f) | USED → **Kunai Throw** cast (`kunaicast`) |
| Special 3 kunai FX | USED → `kunai` projectile sprite |
| Special 3 row3 (upside-down Itachi 4f) | USED → **Blind-Spot Shuriken** overhead (`itachi_blindspot`) |
| Special 3 row3 streak | USED → `streak` (flicker in/out + ult after-images) |
| Intro Itachi (standing) | USED → **Itachi Assist** flicker-in pose (`itachi_idle`) |
| Illustration (x415-734) | USED → `portrait` (Shisui face) + `select.png` (Twin Flicker cut-in) |
| Heavy1 2f, Heavy2 2f | UNUSED — extra launch/heavy frames, not needed |
| Spinning Mangekyō icon (black box) | UNUSED — black bg (not navy), would need luminance/additive; not required |
| White scribble doodle | UNUSED — excluded by region |

## Itachi-vs-Shisui frame classification
Discriminators: **Itachi** = indigo/purple jacket + **low ponytail**; **Shisui** = spiky loose hair + **Leaf
headband** + dark-navy shirt + open mouth (both red Sharingan). Intro left = Itachi, right = Shisui ·
Special-3 row3 upside-down 4f = **Itachi** (blind-spot throw) · Special-3 tail final pair = Shisui + Itachi ·
Air-combo row2 = **Itachi** throwing. All body / normals / combos = **Shisui** (the playable body).

## Input table · damage · canon
| Move | Input | Dmg / cost | Canon |
|---|---|---|---|
| Light / Heavy / Up-Attack / Air / Down-Air | Light / Heavy / Up+Light / jump+Light / jump+Heavy | 28 / 54 / 44 / 40 / 50 | ORIGINAL |
| Dash (Body Flicker) | double-tap / Dash | — | **CANON** (Shisui of the Body Flicker) |
| **Kunai Throw** | Special (N / B) | 58 / 14 | ORIGINAL |
| **Blind-Spot Shuriken** | re-press N+Special while a kunai flies | ×1.25 (72) / — | **CANON-ADJACENT** (Itachi's shuriken training) |
| **Flicker Rush** | Forward + Special | 66 / 20 | **CANON** (Body Flicker) |
| **Genjutsu Flash** | Up + Special | 80f freeze / 18 | CANON-ADJACENT (kid Sharingan) |
| **Itachi Assist** | Down + Special | 52 / 26 (cd 150f) | CANON |
| **Twin Flicker** (ultimate) | Ultimate, needs FULL Training Bond | ~142 / bond×5 | ORIGINAL |

**Training Bond** — fills +1 (cap 5) each time an Itachi assist OR a blind-spot deflect kunai LANDS a clean
hit (via `spawnProjectile` `hitFlag:"_sikBondHit"`). A full bond is the Twin Flicker resource (NOT chakra).
5-pip HUD meter renders above Shisui's head (glows when full).

**Blind-spot blocking caveat (reported):** the engine's projectile block is not facing-aware, so the deflected
kunai is a normal blockable hit that merely *approaches* from the blind spot (above/behind) — true side-correct
blocking would require editing `combat.js`, which is forbidden.

## Twin Flicker ultimate (Neutral Ultimate)
Gate: `_sikBond === 5` (full) AND not (`cinematicSafe===false` / `domainFrozen` / `eliminated` / `health≤0`) →
**refused during KO / Domain events / the Rick Prime rewind** (no bond consumed on refusal). On fire: consume
the whole bond, i-frames + cast lock for 142f, a two-prodigies **illustration cut-in** ("TWIN FLICKER"), then
four after-image strike beats around the opponent (22 each), Itachi's blind-spot kunai rain (3 × 18 dropping
from overhead), ending on a back-to-back pair pose (Itachi steps in beside Shisui). Deterministic (scheduled
beats via `schedulePendingSpawn`, no `gameRng`). Never leaves bounds; no softlock (self-cleaning state).

## Lines (original text; wholesome, competitive best friends)
`arcadeRivalLines` (generic) + `matchupLines` for **itachi** ("Is that you, all grown up?"), the Shisui
variants (**shisui_trinity / shisui_blade / shisui_puppeteer / shisui_fallen** — meeting his future selves),
**sasuke** (Itachi's little brother), **kakashi_anbu** (Itachi's future captain), **madara**, **obito**.
Routed automatically via arcade.js (`matchupLines[rivalKey]`). Text only.

## Credits (in-game SOURCED_ART)
ALTAIR · azzi_ibrahim · RBM-kyubi (sheet header "Kid Shisui & Kid Itachi NZC by ALTAIR").

## Tests
- `test`-style live harnesses: `shisui_itachi_kids_phase1_live.mjs` **14/0**, `..._phase2_live.mjs` **11/0**,
  `..._phase3_live.mjs` **9/0** (all re-verified on the ARCHIVED committed tree).
- determinism **9/0** · roster-integrity **PASS** · combo-standard **225/9** (pre-existing baseline;
  fighter intentionally left unclassified like other recent additive fighters) · credits 3 fails PRE-EXISTING
  (kakashi_anbu / ghostface_exe / sasuke_war_susano) · fx-manifest fails PRE-EXISTING (other Shisui variants).
- combat.js UNTOUCHED; every other fighter byte-identical (except a one-char `spritesheets.js` comma repair in P2).

## Concurrency notes (shared-checkout hazard)
Built alongside concurrent `zoldyck` (Killua) + `gon` sessions on a shared checkout. Every commit staged
**mine-only** by reconstructing each shared file as `HEAD + my edits` (extract my blocks by brace-match, insert
at HEAD-stable anchors) via a private `GIT_INDEX_FILE` + `commit-tree` + `update-ref` — never writing the
working tree, preserving the other sessions' in-progress work. **P2 also repaired main's un-bootable
`spritesheets.js`** (zoldyck's manifest entry was missing its trailing comma before mine). Committed trees were
always verified by `git archive <sha> | tar -x` + boot (node --check passes a broken module; only the browser
catches it).

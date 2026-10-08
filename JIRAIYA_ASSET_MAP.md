# Jiraiya — Asset Map & Build Log (Toad Sage, Naruto)

Additive fighter, same discipline as the Jesus / ghostface_exe builds. Branch `jiraiya` off `main`
(NOT merged). Character **body** frames come from the source sheets; every special **effect** is
**procedural** (color/radius projectiles + direct hits + render flags) — identical discipline to Jesus.

## Source sheets
- **T** `jiraiya_sage_mode_sprite_sheet_by_dantewreckmen_999_d93c7xy.png` — 1054×6865 (full kit, two forms).
- **S** `jiraiya_sage_mode_short_sprite_sheet_by_dantewreckmen_999_d93ca2b.png` — 962×1523 (Gamabunta only).

Background keyed as flat green (0,128/129/130,0) with a small tolerance + green de-spill
(`tools/jiraiya_keyed.py` / `jiraiya_slice.py`). Composited on black/white/magenta during slicing to
check for fringing — **no green fringing** on hair strands, smoke, or edges. Label text, the credits
box (top-right of T), REPEAT brackets, and the **EXAMPLE enemy strip** (~y6000–6075, orange-hair/black-
coat enemy) were **excluded** by slicing to explicit row/column bands, not blob detection.

## Pipeline (tools/)
`jiraiya_analyze.py` (row-band profile) → `jiraiya_slice.py` (per-action crop → frame-detect → one
`*_uniform.png` strip, center+bottom-aligned; mirrors `repack_jesus.py`) → `jiraiya_crop1.py` (single-
sprite Gamabunta crops). Previews: `jiraiya_preview.py` / `contact.py` / `zoom.py` / `spreview.py`.
Re-run: `python3 tools/jiraiya_slice.py jiraiya_work/cfg_base.json` (+ `cfg_hermit.json`, `cfg_idle.json`).

## Sheet → engine mapping (AS BUILT)

### Base form (T) — `characters.jiraiya.animationData`
| action    | sheet (`jiraiya_*_uniform.png`) | frames | cell W×H | T region sliced |
|-----------|----------------------------------|:------:|:--------:|-----------------|
| idle      | idle      | 6  | 43×70 | STANCE y50–120 (label cropped) |
| walk      | walk      | 6  | 43×75 | WALK y190–273 |
| run/dash  | run       | 6  | 63×66 | RUN y327–398 |
| jump      | jump      | 4  | 67×87 | JUMP y491–585 x12–298 |
| crouch    | crouch    | 3  | 49×67 | DUCK y491–585 x650–838 |
| teleport  | teleport  | 2  | 42×82 | TELEPORT y491–585 x858–962 |
| guard     | guard     | 1  | 42×73 | GUARD y644–728 x12–102 |
| hurt      | hurt      | 7  | 77×78 | DAMAGE y644–728 x100–688 |
| getup     | getup     | 2  | 57×72 | FAST GET UP y644–728 x778–925 |
| light     | light     | 11 | 72×70 | Y COMBO row 1 y775–865 |
| up        | up        | 5  | 59×90 | Y+UP y1033–1131 x4–415 |
| air       | air       | 4  | 75×70 | Y+JUMP y1033–1131 x416–748 |
| down_air  | down_air  | 5  | 62×83 | Y+JUMP+DOWN y1169–1262 |
| heavy     | heavy     | 9  | 67×83 | X ATTACK y1313–1405 |
| throw     | throw     | 4  | 58×69 | X THROW y1482–1573 x706–952 |
| win       | win       | 10 | 52×85 | WIN y2158–2250 |
| (cast) jiraiyaHermitTransform | hermit_transform | 14 | 67×80 | HERMIT MODE transform y4095–4182 |
| (art) jiraiyaCounter | counter | 10 | 75×84 | X+UP-after-damage Hari Jizo ball y1482–1573 x4–706 |
| walljump  | walljump (sliced, unmapped) | 4 | 73×64 | WALL JUMP y491–585 x298–618 |

### Hermit / Sage form (T) — `characters.jiraiya.hermitAnim` (swapped in via `_skinAnim`)
idle (5, 52×74), walk (9, 52×75), run/dash (6, 64×66), light (8, 72×89) are **distinct sage art**
(sage eye-markings + shoulder toad). jump/crouch/guard/hurt/getup/up/air/down_air/heavy/throw/win
**reuse the base sheets** (same silhouette) — reported, not invented.

### Gamabunta (S only) — procedural summon props
`gama_toad` (412×299, blue-happi toad w/ pipe), `gama_smoke` (397×190, summon puff), `gama_dagger`
(178×32, blade+hand). Rendered as sheet-backed projectiles in the Gamabunta ultimate.

## Forms
Base + Hermit (Sage). Hermit = the neutral Ultimate → shared `activateFormActivationCinematic`
(~1s hold + camera punch-in, form applies at the RESOLVE beat; holdPose = the 14f golden-aura
`jiraiyaHermitTransform` strip). **Time-limited ~20s** (`_jiraiyaHermitTimer`=1200f), energy-gated
(full meter), **deterministic** (timer countdown, no gameRng), **modest buffs** (dmg×1.18 / spd×1.10 /
def×1.12). Auto-reverts on timeout via `updateJiraiyaHermit` (ticked in `updateTransformationState`,
next to Kurapika). Architecture mirrors Kurapika Emperor Time; Kurapika/Goku files untouched.

## Input table (AS BUILT) — P1 keys: Special=L, Ultimate=U, dir = held A/D/W/S
| input | BASE | canon | HERMIT (Sage) | canon |
|-------|------|:-----:|---------------|:-----:|
| Special (neutral) | Rasengan | CANON* | Senpō: Goemon | CANON |
| Fwd + Special | Katon · Gamayu Endan (fire bullet) | CANON | Toad-tongue lash | CANON-ADJACENT |
| Back + Special | Protective Barrier (i-frames) | CANON-ADJACENT | Hari Jizō (needle guard) | CANON |
| Up + Special | Ranjishigami no Jutsu (needle-hair anti-air) | CANON | Frog Song (sound-genjutsu stun) | CANON-ADJACENT |
| Down + Special | Gamayu Endan — big toad flame | CANON | Giant-scroll smash | ORIGINAL |
| Ultimate (neutral) | **enter Hermit/Sage Mode** | CANON | Chō Ōdama Rasengan | CANON-ADJACENT |
| Ultimate (Down) | Summoning: **Gamabunta** | CANON | Summoning: Gamabunta | CANON |

\* Rasengan — Jiraiya is a confirmed canon USER (it was **created by Minato**, not Jiraiya; he taught it to Naruto).
Chō Ōdama — Jiraiya uses an oversized Sage-Mode Rasengan; the "Chō Ōdama" naming leans Naruto → CANON-ADJACENT.

## Stats (reported) — Sannin band near Hiruzen/Orochimaru
`maxHealth 1210, maxEnergy 180, attack 93, defense 89, speed 85` (jumpPower 29, dashSpeed 14,
dashDuration 10, dashCooldownMax 38). Highest HP of the three (bulky sage), strong attack, solid
defense, grounded speed. Energy label = **Chakra** (naruto universe). **NOT brutality-eligible**.
**spriteScale 1.7** → idle content ≈70px × 1.7 ≈ 119px target (canon 191cm × 0.623); taller than
Minato (112) / Sasuke (105). Rendered height measured ~140px. Default skin only. No voice clips (added none).

## Classification / plumbing
- `comboStandard.js` → **ZONER** (summon/ninjutsu, no command-combat driver → single-poke, like Jesus).
  Counts bumped: zoner 20→21, rosterTotal 104→105.
- `spritesheets.js` idle-gate entry; `skins.js` default-skin entry (prevents the spriteScale:1 clobber);
  `credits.js` SOURCED_ART with named artists; `kits.js` Move List panel; `sprite.js` MOVE_TO_ACTION
  identity maps for the cast poses; cache-bust re-stamped (`npm run stamp`).
- NOT locked (absent from UNLOCK_CONDITIONS → available by default). Selectable (isPlayable default true).

## GAPS (reported, not invented)
- **intro / taunt / defeat(lose) / dizzy / Hermit win** — no dedicated art → engine fallbacks
  (idle for intro/taunt; base win reused in Hermit; no lose sheet mapped).
- **Hari Jizō hurt-cancel counter** (the X+UP-after-damage reversal) — the 10f ball art is sliced &
  wired as `jiraiyaCounter`, but the hurt-cancel **reversal mechanic** is **deferred** (conservative:
  no equivalent engine primitive wired rather than invent one). Hari Jizō exists as the Hermit Back+Special.
- **Wall jump** — 4f art sliced (`walljump`) but **unmapped** (engine has no wall-jump primitive).
- **Gamabunta attack frames** — none on the sheets; the strike is built procedurally from the idle toad.
- FX layers (rasengan ball / fire / dust / music notes) on the sheets were **not** imported — specials
  render procedurally (Jesus discipline). The blue-orb Rasengan and orange fire read clearly in-game.

## Verification (real select → real match, real keystrokes)
`harness/jiraiya_shots.mjs` → **19/0**, no JS errors. Every move fired via REAL keys (j/k/i/l/u + a/d/s):
idle/walk/light/up-launcher sheets, Rasengan projectile in flight, Hermit Mode via real Ultimate
(buffs 1.18/1.10/1.12 + 1200f timer + sage idle sheet), Hermit Senpō Goemon projectile, Gamabunta summon.
Regression: determinism 9/0, combo-standard 230/0, roster-integrity verified. (credits.test: pre-existing
`ghostface_exe` gap, HEAD-proven, not jiraiya.) Screenshots in `/tmp/jiraiya_shots/`.

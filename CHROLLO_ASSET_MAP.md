# CHROLLO LUCILFER — ASSET MAP

Fifth Hunter x Hunter character (`rosterKey: "chrollo"`, `universe: "hunter_x_hunter"`).
Built after Netero / Killua / Gon / Hisoka — no new universe setup required.

All source PNGs were **uploaded untracked** (not in git). The reslice tool overwrites
in place, so every raw strip is COPIED to a `*_uniform.png` name and the COPY is resliced,
preserving the untracked originals (samurai-red lesson). Frame counts below are the
alpha-gutter counts reported by `tools/reslice_strip.mjs`.

Master source sheets (full, un-sliced — reference only, not wired directly):
- `chrollo_lucilfer_sprite_sheet__hunter_x_hunter_by_soulfiresprites_dlokozz.png` (1394×3456)
- `chrollo_transparent.png` (1394×3456, transparent version of the same master sheet)

The developer pre-extracted the meaningful actions into the individual strips below; those
are the build inputs.

---

## MOVEMENT / STATE (Stage 1)

| action | raw file | resliced `_uniform.png` | frames | cell (w×h) | notes |
|---|---|---|---|---|---|
| idle  | `chrollo_idle.png` (150×69)  | `chrollo_idle_uniform.png`  | 4  | 28×58 | arms-down neutral sway |
| run   | `chrollo_run.png` (313×63)   | `chrollo_run_uniform.png`   | 6  | 49×50 | forward run cycle; reused for walk/dash |
| jump  | `chrollo_jump.png` (436×79)  | `chrollo_jump_uniform.png`  | 8  | 44×61 | run-jump → tucked cape apex → fists-up airborne; once + hold |
| guard | `chrollo_block.png` (98×67)  | `chrollo_block_uniform.png` | 2  | 36×55 | guard stance; once + hold |
| hurt  | `chrollo_hit.png` (235×47)   | `chrollo_hit_uniform.png`   | 4  | 56×32 | stagger → knockdown sprawl; once + hold. Covers all hitstun/knockdown states |

## INTRO POOL (Stage 1) — random-cycle, ALL four candidates wired

| pool key | raw file | resliced | frames | cell | what it shows |
|---|---|---|---|---|---|
| intro  | `chrollo_intro.png` (316×70)   | `chrollo_intro_uniform.png`  | 7  | 44×58 | arms-spread summoning flare (Bandit's Secret opening) |
| intro2 | `chrollo_intro_2.png` (215×82) | `chrollo_intro2_uniform.png` | 4  | 49×59 | confident front-facing stance (also the portrait source) |
| intro3 | `chrollo_intro_3.png` (174×210) GRID | `chrollo_intro3_uniform.png` | 12 | 38×59 | reading the Skill Hunter book. Source is a 3×3-ish GRID (row bands 11-67/76-132/143-199) flattened row-major into one horizontal strip before reslicing |
| intro4 | `chrollo_intro_4.png` (328×73) | `chrollo_intro4_uniform.png` | 9  | 33×58 | walks in holding the book, turns to face |

`introPool: ["intro", "intro2", "intro3", "intro4"]` — `pickIntroVariant` (game.js) chooses one at random per match.

---

## NORMALS / MELEE (Stage 2 — deliberately plain knife/melee kit)

| candidate | file | dims | content |
|---|---|---|---|
| punch      | `chrollo_punch.png` (168×55)        | ~3 frames | straight jab |
| kick       | `chrollo_kick.png` (258×68)         | ~5 frames | knife-drawn spin kick |
| up attack  | `chrollo_upattack.png` (196×76)     | ~4 frames | rising knife slash (launcher candidate) |
| down attack| `chrollo_downattack.png` (411×92)   | ~7 frames | jumping/aerial arc slash w/ crescent FX |
| punch combo| `chrollo_punch_combo.png` (475×57)  | ~9 frames | multi-hit punch string (Toji-Rekka chain candidate) |
| sidekick combo | `chrollo_sidekick_combo.png` (624×67) | ~8 frames | extended kick string (chain finisher candidate) |

## SPECIAL / BOOK (Stage 3 candidate — Skill Hunter's book "Bandit's Secret")

| file | dims | content |
|---|---|---|
| `chrollo_specialmove_part1.png` (258×97) | ~6 frames | raises the blue BOOK overhead (summon/cast) |
| `chrollo_specialmove_part2.png` (235×66) | ~4 frames | forward stance presenting the book/orb — cast follow-through |

**MANIPULATION (neck-stab/insertion) special — Stage 3 verification (CLOSE MASTER-SHEET PASS DONE):**
The full 1394×3456 master sheet was split into 8 bands + zoomed. VERDICT: **NO neck-stab / pin-
insertion-into-an-opponent gesture exists.** Every Chrollo frame is solo (no two-character
interaction). The only blade-near-a-neck imagery is an embedded ANIME REFERENCE SCREENSHOT (a manga
panel, not sprite frames) — almost certainly what seeded the half-memory, but NOT buildable art.
→ Manipulation special = **ABSENT / SKIPPED. Not fabricated** (per the design instruction).

**UNEXTRACTED REAL ART the close pass DID surface (not in the individual strips; candidates only):**
- `KNIFE THRUST / LUNGE` (~5 frames, master-sheet band 3 ≈ y1290-1380): wind-up → a white blade
  thrust straight forward with a motion streak. A lunging STAB attack (not a control/insertion move).
- `BLUE NEN CONSTRUCT` (~14 frames, band 5 ≈ y2150-2420): a large serpent/beast-like blue energy
  projectile/construct + forward-cast poses + horizontal lunge/"fly" poses. Substantial FX art.
- These are legitimate SPECIAL-move candidates but are NOT the manipulation move and are NOT part of
  the confirmed design (base kit is deliberately plain; identity = the ultimate). Surfaced to the
  user as an OPTIONAL decision at the Stage 3 STOP — not built unilaterally.

The master sheet also contains NON-Chrollo sprites (a red/orange-haired figure; a green-screen
blue/red uniformed "soldier" character) packed into the same file — unrelated, ignored.

## ULTIMATE — SKILL HUNTER transformation cinematic (Stage 5)

| file | dims | content |
|---|---|---|
| `chrollo_ultimate_1.png` (226×70) | ~5 frames | holds/reads the book — activation windup |
| `chrollo_ultimate_2.png` (389×65) | ~7 frames | **purple cloak/robe swirls up and unfurls** — the "robe thing" transformation cast |
| `chrollo_ultimate_3.png` (365×89) | ~5 frames | cloak fully envelops → billows → emerges — transformation body |

This is the freeze-cinematic transformation art for Skill Hunter (copy the live opponent's kit).

## MISC

| file | dims | content |
|---|---|---|
| `chrollo_controller.png` (19×20) | tiny | UI/controller glyph — not a fighter sprite |
| `chrollo_portrait.png` (generated) | 196×168 | select-screen portrait, cropped 4× from intro2 frame 0 (refine in Stage 6) |

## DEFERRED / ABSENT
- No dedicated walk / dash art → reuse `run` (Netero precedent).
- No dedicated fall art → point at a `jump` apex cell (`sourceX`).
- No win / lose / getup art → win/lose use shared end screens; knockdown routes to `hurt`.
- Manipulation special: absent (see Stage 3 note).

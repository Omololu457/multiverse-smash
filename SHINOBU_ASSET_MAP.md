# Shinobu Kocho — Asset Map

Third Demon Slayer sprite character (after Zenitsu, Rengoku). rosterKey `shinobu`, universe
`demon_slayer`. Source art: `shinobu_kocho_jus___kimetsu_no_yaiba_sprite_sheet_by_soulfiresprites_deqo7i3.png`
(master JUS sheet, 908×1876) + `shinobu_transparent.png` (same sheet, alpha-clean) + 25 individually
cropped `shinobu_*.png` strips uploaded 2026-07-29.

Filenames are preserved EXACTLY as uploaded, including the "gaurd" typo — do not correct them.
Raw strips are non-uniform pitch; each Stage-N sheet is copied to a `*_uniform.png` sibling and
re-sliced feet-aligned via `tools/reslice_strip.mjs` (originals recoverable from git). Frame counts
below marked **[measured]** are the reslice output.

## Fighting style (confirmed by visual inspection)
Shinobu wields a thin **piercing/thrusting** blade (canonically a poison-injecting stinger — she is the
physically weakest Hashira and compensates with speed + wisteria poison rather than raw power). Every
melee read as a **fast, narrow-reach thrust or lunge**, NOT a broad slash. Her haori spreads like
butterfly/insect wings during aerial and charge poses. This drove the low-power/high-speed archetype
and the poison-DoT identity (Stage 3).

## Base stats (Stage 1)
`HP 960 · energy 0 (cooldown-gated, Demon Slayer) · atk 82 · def 76 · spd 97 · jumps 2 ·
jumpPower 31 · dashSpeed 21 / dur 8 / cd 34 · spriteScale 2.25`.

Fast, precise, low-raw-power technician — the "poison + speed, not brute force" archetype:
- **HP 960 = new roster floor** (below Netero 980 / Zenitsu 1000) — deliberate: the physically frailest
  Hashira. Documented outlier, internally consistent (offset by nothing defensive).
- **Def 76** = 2nd-lowest (above Zenitsu's deliberate 74 floor, below the shinobi 82–84). Keeps
  Zenitsu's floor intact while still reading fragile.
- **Spd 97** = 2nd-fastest tier (above Zenitsu/Tobirama 96, under Toji/Minato 98) — fastest Demon Slayer.
- **Atk 82** = low (below Killua 84) — reflects limited strength. (Note: base Atk does NOT scale damage
  in this engine — `offenseMult` derives from mode buffs, not the stat — so per-move RAW values carry
  the low-power identity; Atk is archetype flavor.)

## Energy label decision — KEEP "TOTAL CONCENTRATION"
`traits.energyType: "none"` + universe `demon_slayer` → `ui.js` `NO_METER_FLAVOR` renders
**"TOTAL CONCENTRATION"** (same as Zenitsu/Rengoku). Chosen deliberately: Insect Breathing is a
Total-Concentration-Breathing derivative, so the label is canonically accurate for Shinobu too, and
universe consistency beats a bespoke "INSECT BREATHING" per-character override. No override added.

## Movement / State — STAGE 1 (wired) [measured]
| Action | Uniform sheet (`shinobu_*`) | Cell | Notes |
|---|---|---|---|
| idle | `idle_uniform.png` | 4f · 38×57 | breathing loop |
| walk | `walk_uniform.png` | 6f · 45×53 | run cycle, haori trailing; played slower for walk |
| run | `walk_uniform.png` | 6f · 45×53 | same sheet, faster speed |
| dash | `dash_uniform.png` | 2f · 48×38 | ground dash blur |
| jump | `jump_uniform.png` | 5f · 48×58 | crouch→rise→apex, play once + hold |
| fall | `jump_uniform.png` | 1f (cell 4, sourceX 192) | apex/descent pose |
| guard | `guard_uniform.png` | 1f · 54×61 (cell 0) | braced blade stance; later cells are a sway → hold cell 0 |
| hurt | `hit_uniform.png` | 1f · 46×57 (cell 0) | recoil flinch (3 CLEAN single figures — no merged-figure dup-render) |
| knockdown | `hit_uniform.png` | 3f · 46×57 | flinch→recoil→stagger |

## Intro — STAGE 1: camera-tracked glide-in (per confirmed design)
Shinobu starts OFF-SCREEN outside the arena and **glides inward** to her start position while the
CAMERA tracks her — a genuine positional-travel entrance, reusing the Superman/Omni-Man camera-tracked
path (`updateShinobuIntro`/`finalizeShinobuIntroPos`, mirrored on `updateSupermanIntro`). This is a
DELIBERATE per-character choice, explicitly DIFFERENT from Rengoku's stationary intro — not a revert.
| Variant | Uniform sheet | Cell | Notes |
|---|---|---|---|
| introGlide | `intro_glide_uniform.png` (from `shinobu_gliding_down_intro.png`) | 4f · 67×54 | haori spread as butterfly wings, gliding forward; eased off-screen→home |

Reserve (not wired Stage 1): `shinobu_intro_1.png` (diving-glide-to-land, 4f), `shinobu_glide.png`
(air-glide loop 4f — candidate for an air state), `shinobu_back_flips.png` (8f acrobatic backflip —
candidate evasive special), `shinobu_whisper.png` (5f — taunt/flavor candidate),
`shinobu_charge.png` (5f wings-open concentration pose — charge/taunt candidate).

## Normals — STAGE 2 (wired) [measured]
| Slot | Uniform sheet (`shinobu_*`) | Cell | RAW→EFF dmg | Read |
|---|---|---|---|---|
| light | `light_uniform.png` (from move_1) | 5f · 80×54 | 44→26 | quick low forward thrust/lunge — fast narrow poke |
| heavy | `heavy_uniform.png` (from move_2) | 5f · 87×56 | 78→46 | deep committed lunging thrust — signature pierce, long reach |
| up | `up_uniform.png` (from up_attack) | 5f · 55×58 | 62→37 | crouch → rising spin launcher |
| air | `air_uniform.png` | 3f · 45×66 | 52→31 | aerial blade thrust |
| down_air | `down_air_uniform.png` (from down_air_combo) | 5f · 63×63 | 70→42 | spinning descending dive-spike |

`shinobu_down_attack.png` (overhead-chop → low kneeling thrust) is reserved for the Stage-3 chain/specials.

## Command-normal chain + specials — STAGE 3 (wired) [measured]
**"Insect Breathing" ground chain (Toji-Rekka):** Fwd+Heavy opener → re-tap Heavy on a clean hit.
Cancel-on-hit; a whiff/block ENDS the string (shared `rekkaContinue`, requireHit:true = mid-chain interrupt).
`updateShinobuCommandCombat` in abilities.js; registered game.js input loop; no super-branch (focused 3-hit).
| Stage | Uniform sheet (from) | Cell | RAW→EFF | rekkaNext |
|---|---|---|---|---|
| shinobuG1 | `g1_uniform` (move_4, horizontal slash) | 4f · 59×54 | 24→14 | shinobuG2 |
| shinobuG2 | `g2_uniform` (move_3, overhead cut) | 4f · 80×56 | 30→18 | shinobuG3 |
| shinobuG3 | `g3_uniform` (move_5, lunge body-check) | 4f · 57×50 | 40→24 | — (finisher) |

**Specials** (SPECIAL button, direction-branched `_specialHeldDir`; COOLDOWN-gated, maxEnergy 0):
- **Poison Thrust** (Neutral/Fwd) — `shinobuPoison` = `poison_uniform` (5f · 75×60, from down_attack). A
  lunging stinger: 40→24 direct + a **WISTERIA POISON DoT** (`SHINOBU_POISON = {ticks:7, interval:20, dmg:7}`
  = 42–49 over ~2.3s) stamped on a CLEAN hit via the EXISTING game.js `_dot` subsystem (NOT invented). A
  localized on-hit watcher in `updateShinobuCommandCombat` stamps `opp._dot` — no shared resolver edit.
  Gated on `poisonCd` 78f. This attrition is the counterweight to her low burst.
- **Butterfly Flit** (Back) — `shinobuFlit` = `flit_uniform` (8f · 53×59, from back_flips). Acrobatic
  backward evade: 20f i-frames + backward hop, no damage. Spacing/reposition tool. Gated on `flitCd` 66f.

**Reserve after Stage 3:** `air_combo` / `air_combo_2` / `air_kick_combo` (composite air strings — no air
command-chain requested), `whisper` (spin flourish), `charge` (wings-open pose) — taunt/air-chain candidates.

## Ultimate — STAGE 4: spinning-dash finisher — CONFIRMED MATCH
**File: `shinobu_super_move.png`** (627×75, 9 islands). Visual inspection confirms it matches the
"spinning, dash-based finishing move" description: a long forward **thrust-lunge** (frames 3–5, a
committed forward dash) that resolves into a dramatic **spinning slash** with heavy purple+white energy
trails (frames 7–9). The forward lunge = the "dash mechanic similar to Zenitsu"; the trailing frames =
the "spinning" finish. Built as a freeze-cinematic (camera push-in → sequence → pull-back), same pattern
as every other Ultimate. (Rejected candidate: `shinobu_back_flips.png` — spinning but BACKWARD/evasive,
not a forward finisher.)

**WIRED (Stage 4) [measured]:** `shinobuUltimate` = `ultimate_uniform` (9f · 87×59). Dedicated freeze-cinematic
`shinobuButterflyCinematic.js` (mirrors the rengokuFlameExplosionCinematic contract): camera push-in →
she DASHES toward the opponent (x eases in, the "dash-based" read) → spinning slash → camera pull-back.
Guaranteed payoff at the STRIKE beat via onImpact: **300 direct (range-independent, blocked→25%) + a
WISTERIA POISON finisher DoT (6×11=66) on a clean hit** = ~366 total. On-theme: lowest cinematic DIRECT
burst on the roster, with poison attrition making up the rest. COOLDOWN-gated (`ultimateCooldown` 8s, no energy).

## Portrait — STAGE 5
No dedicated portrait/mugshot art was in the batch → **`shinobu_portrait.png` is DERIVED** (idle frame 0,
tight-cropped + 5× nearest upscale = 175×275). Flagged: swap in bespoke portrait art if it arrives later.

## Sprite accounting — STAGE 5 (27 files: 18 wired · 7 reserved · 2 reference · 0 unidentified)
**Wired (18 strips → 21 animationData actions):** idle, walk (walk+run), dash, jump (jump+fall), gaurd
(guard), hit (hurt+knockdown), gliding_down_intro (introGlide), move_1 (light), move_2 (heavy), up_attack
(up), air (air), down_air_combo (down_air), move_4 (shinobuG1), move_3 (shinobuG2), move_5 (shinobuG3),
down_attack (shinobuPoison), back_flips (shinobuFlit), super_move (shinobuUltimate).
**Reserved (7, flagged — not invented into moves):** `shinobu_glide` (air-glide loop → air-state
candidate), `shinobu_intro_1` (alt diving-glide intro), `shinobu_charge` (wings-open concentration →
taunt/buff candidate), `shinobu_whisper` (spin flourish → taunt candidate), `shinobu_air_combo` /
`shinobu_air_combo_2` / `shinobu_air_kick_combo` (composite air strings → future air-command-chain).
**Reference (2):** the JUS master sheet (908×1876) + `shinobu_transparent.png` (alpha-clean twin).

## Deferred / missing content — STAGE 5 (explicit)
- **Voice lines** — none wired (same as Zenitsu/Rengoku at their build; VO can drop in later via a
  `shinobuVoice.js` following the established pattern).
- **win / lose / taunt / dizzy / crouch** states — confirmed ABSENT (no art), NOT invented (fallback sweep
  asserts their absence). A taunt could later ride `shinobu_charge`/`shinobu_whisper` + the universal heal.
- **Air command-chain** — the composite air strings (air_combo/air_combo_2/air_kick_combo) are reserved
  for a future air-rekka pass (Rengoku has one; Shinobu's air game is currently the single air normal).
- **Alt skins** — none (default only), like Rengoku/Zenitsu at build.

## Duplicate-render (known "two copies" bug class) — STAGE 5, CLEAR
Both the symptom-prone paths were tested in `harness/shinobu.test.mjs`: the hit-reaction and the ultimate
cinematic each render at **exactly 1.00 draws-per-frame** (drawImage tally / logic-frame ratio) — never
doubled. The hit strip was also verified as 3 CLEAN single-figure cells at reslice (no merged-figure cause).

## Master sheet
`shinobu_transparent.png` / the JUS sheet (908×1876) are the full reference; all per-action art was
pre-cropped into the `shinobu_*` strips above. No further master-sheet slicing needed for the build.

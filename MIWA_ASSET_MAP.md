# KASUMI MIWA — Asset Map (`rosterKey: "miwa"`, universe `jujutsu_kaisen`)

Katana **battojutsu swordfighter** joining the existing JJK roster (gojo, sukuna, toji, megumi, maki).
Source art = the `kasumi_*` upload set (filenames preserved verbatim, **incl. the `charg` truncation**)
plus a labelled master sheet `kasumi_transparent.png` (1392×1886, real alpha). Non-uniform strips are
re-sliced to feet-aligned `kasumi_*_uniform.png` cells via `tools/reslice_strip.mjs`; originals kept.
Frame boundaries below are the **measured** content-run counts (this map was created during the build —
no pre-existing map existed).

## Master sheet layout (`kasumi_transparent.png`)
2-column labelled grid. Sections: Stand·Crouch / Run·Dash / **Air/Stand Guard·Power Charge** /
Jump·**Drinking** / Win1·Win2 / Attack1·Attack2 / Attack3·Attack4 / Attack5·Attack6 /
AirAttack1·AirAttack2 / AirAttack3·**AirAttack4** / Super1·Super2 / Hurt. Most sections were exported as
individual strips; **Guard + Drinking had no individual export** → cropped straight from the master
(real alpha, no background-distance keying needed): Guard = band y454–523 x31–216; Drinking = band
y571–640 x550–836.

## STAGE 1 — movement/state (WIRED, resliced to `_uniform`)
| action | sheet (`*_uniform.png`) | frames | cell W×H | notes |
|---|---|---|---|---|
| idle | kasumi_idle | 4 | 54×55 | loop |
| walk/run | kasumi_run | 8 | 48×54 | loop |
| dash | kasumi_dash | 2 | 55×57 | lockLast |
| jump | kasumi_jump | 6 | 48×69 | `fall`=frame4 sourceX192 |
| guard | kasumi_guard | 1 | 31×54 | master-crop; kept the clean vertical-sword STAND block (f0); f1=air-guard/f2-3 other stances dropped |
| crouch | kasumi_crouch | 2 | 50×49 | **extracted but unwired-in-practice** — engine maps DOWN→block→`guard`, no separate crouch state |
| hurt | kasumi_hit | 3 | 59×53 | frames 0-2 (stagger), sourceX0 |
| knockdown | kasumi_hit | 3 | 59×53 | frames 4-6 (down→getup), sourceX236 |
| intro1..4 | kasumi_intro_1..4 | 9/6/7/7 | 50×62 / 41×63 | random-cycle `introPool` (§8) |
| Drinking | kasumi_drinking | 6 | 41×63 | master-crop, extracted cleanly — **flavor, deferred** (no gameplay hook yet; candidate taunt) |

Stats (cursed-energy sorcerer, modest pool — power is skill/battojutsu not raw output):
HP 1150 · Energy 160 cursed_energy · ATK 86 · DEF 84 · SPD 93 · spriteScale 1.7 · maxJumps 2.

## STAGE 2 — normals + "Battojutsu Rush" chain (WIRED)
5 cleanest → normal slots; the 3 remaining ground strips → the Fwd+Heavy cancelable chain (§3).
| slot | sheet (`*_uniform`) | frames | cell | source |
|---|---|---|---|---|
| light | kasumi_attack_2 | 5 | 105×73 | fast horizontal slash |
| heavy | kasumi_attack_1 | 6 | 83×75 | committal overhead vertical slash |
| up | kasumi_up_attack | 7 | 79×94 | rising launcher (5 swing + 2 sheathe, §7) |
| air | kasumi_air_attack_1 | 4 | 67×60 | aerial slash (FX debris dropped via `--minw=8`) |
| down_air | kasumi_down_air_attack | 4 | 78×78 | downward aerial slash (§4 trusted) |
| **miwaG1** | kasumi_attack_3 | 5 | 68×65 | chain opener (low lunge) |
| **miwaG2** | kasumi_attack_4 | 5 | 103×61 | chain mid (dash-thrust, extra reach) |
| **miwaG3** | kasumi_up_air_attack | 4 | 105×74 | chain finisher (rising slash launcher) |

Chain = `MIWA_GROUND` + `fireMiwaCommand` + `updateMiwaCommandCombat` (abilities.js, clone of maki/shinobu
Toji-Rekka: Fwd+Heavy opener → re-tap Heavy on a CLEAN hit → cancel-on-hit, whiff/block ends it). Dispatched
in game.js after the ghostface block (`miwa`-gated). NEW `miwaCmd()` harness hook. Damage 28/34/48 (G3
launches). test:miwa-s2 8/0 (5 normals connect + right sheet, chain G1→G2→G3, mid-chain interrupt).
NOTE: maki's own `updateMakiCommandCombat` is defined but NOT dispatched in game.js (pre-existing gap).

## STAGE 3 — specials (WIRED)
Cursed-energy cost (spendEnergy). Grounded Special → Iai Dash; airborne Special → Rapid Slash Vortex; CHARGE
(hold P) → the cursed-energy charge stance (engine charge system via animationData.charge).
| move | sheet | frames | cell | notes |
|---|---|---|---|---|
| **charge** | kasumi_charg_uniform | 5 | 57×72 | raised glowing-sword stance; `animationData.charge` → shown while holding P (builds cursed energy) |
| **iaiDash** | kasumi_ultimate_dash_attack_uniform | 3 | 55×48 | **first 3 frames only** (§6); dmg 66, vx dash-through, cost 28 |
| **airVortex** | kasumi_super_rapid_air_attack_uniform | 2 | 66×74 | CHARACTER slash frames 0-1 only; dmg 58, cost 30 |
| **vortex FX** | kasumi_vortex_fx | 4 | 51×51 | frames 2-5 of super_rapid_air_attack = the spinning vortex, **SEPARATE overlay layer** (§10): game.js `drawMiwaVortex` (sibling of drawGodspeedAura), armed `_miwaVortex{t,max}` by fireMiwaAirSlash, ticked in update, drawn in front of the body |

abilities.js: fireMiwaIaiDash / fireMiwaAirSlash / executeMiwaSpecial + `case "miwa"` in triggerSpecial switch.
game.js: drawMiwaVortex + render-loop call + update-loop tick + NEW `miwaFx()` hook. **RESERVED (unused):**
ultimate_dash_attack tail frames 3-5 (drinking-like), super_rapid_air_attack frame 6 (recovery). test:miwa-s3
11/0 (Iai Dash sheet+cost+connect / air slash sub-clip + vortex overlay armed + auto-expire / charge stance +
energy build). rengoku 41/0 regress clean.

## STAGE 4 — Ultimate "Blade of the Neophyte" (WIRED)
part_1 (windup, sword drawn back) + part_2 (explosive draw-slash) STITCHED (tools/stitch_strips.mjs) →
`kasumi_super_ultimate_uniform.png` = ONE continuous 8-frame clip (§5), 69×48. animationData.ultimate speed 10.
NEW `miwaUltimateCinematic.js` (clone of rengokuFlameExplosionCinematic contract, re-themed azure/cursed-energy:
windup→slash→settle 114f, connect beat +54, guaranteed slash + white/azure flash + horizontal slash-arc streak;
plays Miwa's own ult sprite via `_spriteCastMove:"ultimate"`). abilities.js: MIWA_ULT{cost100,dmg280} +
executeMiwaUltimate/applyMiwaUltimateDamage + `case "miwa"` in the ultimate switch (spendEnergy 100).
game.js: 6 touch points mirrored (import / freeze-block / draw / 3 reset-clears / innerCineActive / NEW
miwaUltCine() status hook). test:miwa-s4 8/0 (activates + real caster + spends 100 + continuous sprite +
struck-once + GUARANTEED 280 dmg at 520px range + clean resume). rengoku 41/0 + ghostface 18/0 regress clean.
BALANCE: 280 dmg mid-band (ghostface 300 / rengoku 340); cost 100 of 160 meter — flag for Stage-5 pass.

## DEFERRED / EXCLUDED
- **random_1 / random_2** (88×61, 94×71): CONFIRMED a DIFFERENT character (blue-helmeted rifle-wielder) →
  EXCLUDED from Miwa's build. Files kept on disk, unused. §9
- **ultimate_dash_attack tail frames 3-5**: reserved, explicitly unused (ambiguous drinking-like gesture). §6
- **Drinking**: extracted cleanly but flavor-only, no gameplay wiring yet. §1-2
- **crouch**: no engine crouch state (DOWN→guard); sheet kept for completeness.

## 3-FILE REGISTRATION (done in Stage 1)
- `characters.js`: `const miwa = {…}` + added `miwa` to the `characters` export registry.
- `spritesheets.js`: `miwa: { actions: { idle: "./kasumi_idle_uniform.png" } }` (spritesReady gate).
- `skins.js`: `miwa: [ { id:"default", … } ]`.
- No ui.js / roster edits needed: `cursed_energy` label is pre-existing; the JJK roster is built dynamically from `universe`.

## STAGE 5 — Portrait + canonical test + balance (DONE)
- **Portrait EXTRACTED from master** (§ attempt): the master header (kasumi_miwa_sprite_sheet…) has a distinct
  anime BUST (blue hair / school uniform / teal bg) at x409-528 y12-151 → cropped to `kasumi_portrait.png`
  (120×140), overwriting the Stage-1 idle placeholder. Real portrait, no flag needed.
- **Canonical `harness/miwa.test.mjs` 25/0** — registration + portrait decode + balance (no outliers) +
  FALLBACK-BOX SWEEP (all 23 wired animationData sheets decode) + 5 normals + chain+interrupt + 3 specials
  (+vortex overlay) + Ultimate (guaranteed 280 at 520px). Full suite miwa 25 + s1 14 + s2 8 + s3 11 + s4 8 = **66/0**.
- **Balance:** NO stat outliers (all in-band); entry added to BALANCE_AUDIT.md. Ult 280 = LOWEST-power of the
  unscaled cinematic-ult band; bread-and-butter fully scaled. Regression clean (toji/ffa/team/rengoku/ghostface/vegeta-ssj).
- **Guard/Drinking OUTCOME:** BOTH extracted cleanly from the real-alpha master (no bg-keying needed). Guard
  WIRED (down→block, kept the clean vertical-sword stand frame). Drinking extracted + on disk (kasumi_drinking_uniform,
  6f) but LEFT UNWIRED (flavor-only, as allowed) — candidate future taunt.
- **DEFERRED / UNUSED (explicit):** random_1/2 (different char, rifle-wielder — excluded, kept on disk) ·
  ultimate_dash_attack tail frames 3-5 (reserved drinking-like gesture) · super_rapid_air_attack frame 6
  (recovery, dropped from the sub-clip) · Drinking pose (flavor, unwired) · crouch sheet (no engine crouch state).

# HASHIRAMA SENJU — Asset Utilization Map

First Hokage, "God of Shinobi". Naruto universe, rosterKey `hashirama`. Large versatile
Mokuton kit (BALANCE_AUDIT schema exception, like Madara). Source strips are RE-SLICED into
clean uniform, feet-aligned cells via `tools/reslice_strip.mjs` → `*_uniform.png` COPIES; the
exact-as-uploaded originals (incl. the "treee"/"rellese"/"gaint"/"chang_land_scape" misspellings)
are kept untouched per the build mandate.

## Stage 0 — resolved investigations (see conversation)
- **Tree ladder** = 4 clean tiers by measured peak-tree size (user-confirmed):
  1. `treee_summon_1` (+`_tree`) — sprout / low roots (peak 96×38)
  2. `treee_summon_2` (+`_tree`) — spreading root-burst (peak 146×60)
  3. `tree_summon_level_2` caster + `tree_level_2_tree` — iconic full canopy tree (peak 217×230)
  4. `tree_level_3` caster + `tree_level_3_tree` — forest grove (grandest); binds the
     `trees_meant_to_chang_land_scape` terrain overlay.
- **Gracious Deity Gates** = BOTH its own special (drop torii gates → immobilize) AND reused as the
  Sealing-Jutsu ultimate's lock-phase. Caster anim `Gracious_Deity_Gates.png` (3f) + static torii
  `Gracious_Deity_Gates_wood.png`.
- **Landscape** file `trees_meant_to_chang_land_scape.png` → bound to top tree tier (forest grove).
- **Sealing ult** cameos (`sealing_assist.png`, 4×3f) = Naruto (Kurama mode) / Minato / Tobirama /
  Hashirama; `sealing_box.png` = red barrier cube; `combo_into_sealing_justu.png` = combo-ender.

## Unused-scheme note
The two naming schemes reconcile to ONE ladder. The 2 leftover pairs NOT used as tiers:
`treee_summon_3` (+`_tree`, thin vertical wood spikes) and `tree_summon_level_1` (+`_tree`, curled
tendril sprout) — held for possible reuse (spikes → a Down-special candidate). Tracked as HELD.

---

## File utilization (updated per stage)

### Stage 1 — Registration + movement/state + intro pool  ✅ (test:hashirama-s1 22/0)
| Original file | Resliced `_uniform` | animationData key | frames · cell |
|---|---|---|---|
| hashirama_idle.png | hashirama_idle_uniform.png | idle | 6 · 56×70 |
| hashirama_run.png | hashirama_run_uniform.png | run + walk (reused) | 6 · 74×66 |
| hashirama_dash.png | hashirama_dash_uniform.png | dash | 3 · 50×77 |
| hashirama_jump.png | hashirama_jump_uniform.png | jump + fall(sourceX 124) | 3 · 62×97 |
| hashirama_hit.png | hashirama_hit_uniform.png | hurt + knockdown (reused) | 2 · 59×74 |
| hashirama_hand_signs.png | hashirama_hand_signs_uniform.png | handSigns (cast startup) | 7 · 55×76 |
| hashirama_intro_part_1.png | hashirama_intro_part_1_uniform.png | introPillarRise | 24 · 50×100 |
| hashirama_intro_part_2.png | hashirama_intro_part_2_uniform.png | introPillarOpen | 12 · 56×98 |
| hashirama_intro_2.png | hashirama_intro_2_uniform.png | introShunshin | 8 · 56×79 |
| hashirama_wood_clone_intro.png | hashirama_wood_clone_intro_uniform.png | introWoodClone | 12 · 102×81 |

Registration sites: `characters.js` (full def + export list), `spritesheets.js` (idle gate),
`skins.js` (default skin → spriteScale 1.7), `credits.js` (PROJECT_ART_KEYS).
Stats: HP 1220 / EN 220 / atk 94 / def 92 / spd 88 / spriteScale 1.7.
introSequencePool: `[[introPillarRise, introPillarOpen], [introShunshin], [introWoodClone]]`.
**Gaps:** no dedicated guard art (falls back to idle); knockdown reuses the 2f hit flinch.

### Stage 2 — Normals + combos  ✅ (test:hashirama-s2 22/0, 8/8 stable)
| Original file | Resliced `_uniform` | animationData key | role | frames · cell |
|---|---|---|---|---|
| hashirama_foward_punch.png | _uniform | light | jab (wood-fist) | 5 · 76×79 |
| hashirama_kick.png | _uniform | heavy | roundhouse | 6 · 79×75 |
| hashirama_up_attack.png | _uniform | up | launcher | 5 · 71×82 |
| hashirama_air_combo_1.png | _uniform | air + hashiComboB | neutral aerial + chain-2 | 10 · 74×82 |
| hashirama_down_air_attack.png | _uniform | down_air | diving wood-spike | 5 · 126×70 |
| hashirama_punch_combo_1.png | _uniform | hashiComboA | chain-1 opener | 9 · 73×74 |
| hashirama_air_combo_2.png | _uniform | hashiComboFin | chain-3 LAUNCHER finisher | 10 · 154×84 |
| hashirama_punch_2.png | _uniform | hashiWoodStraight | Fwd+Light poke (long reach) | 3 · 76×75 |

Command chain (`abilities.js` HASHIRAMA_CMD + updateHashiramaCommandCombat, dispatched in game.js):
Fwd+Heavy → hashiComboA → (cancel-on-hit) hashiComboB → hashiComboFin (launcher). Fwd+Light poke =
hashiWoodStraight (HASHIRAMA_POKE, free/cooldown-gated). Damage: A 40 / B 46 / Fin 86 / poke 64 (pre-scale).

### Stage 3 — Kunai specials  ✅ (test:hashirama-s3 11/0, 3/3 stable)
| Original file | Resliced `_uniform` | role | frames · cell |
|---|---|---|---|
| hashirama_kunai_throw.png | _uniform | kunaiThrow cast pose (ground Special) | 3 · 68×69 |
| hashirama_kunai_throw_air.png | _uniform | kunaiThrowAir cast pose (airborne Special) | 3 · 55×84 |
| hashirama_kunai_throw_projectile.png | _uniform | shared spinning-shuriken projectile | 8 · 60×45 |

`abilities.js` executeHashiramaSpecial (dispatched in the executeSpecial switch, case "hashirama") →
fireHashiramaKunai(air): _spriteCastMove cast pose + schedulePendingSpawn → spawnProjectile with the
shuriken sheet. Neutral/ground vs airborne branch on `grounded`. Cost 15 chakra, dmg 52 (ground)/46
(air, angled down vy 3). Directional Special branches (F/U/D/B) reserved for Stages 4-6.

### Stage 4 — Wood Release Punch (tap/hold) + Mokuton arm  ✅ (test:hashirama-s4 10/0, 4/4 stable)
| Original file | Resliced `_uniform` | key / role | frames · cell |
|---|---|---|---|
| hashirama_wood_rellese_punch.png | _uniform | woodPunch (CHARGE TAP, base spear) | 9 · 210×79 |
| hashirama_wood_rellese_punch_super.png | _uniform | woodPunchSuper (CHARGE HOLD, big eruption) | 10 · 185×112 |
| hashirama__Mokuton lul_4.png | hashirama_mokuton_lul_4_uniform.png | mokutonArm (Fwd+Special) | 8 · 57×76 |
| hashirama_hand_signs.png (reused) | _uniform | charge (CHARGE-hold wind-up pose) | 7 · 55×76 |

Wood Release Punch = CHARGE key (P) tap/hold, fired from game.js handleChargeRelease → abilities.js
fireHashiramaWoodPunch(strong): tap=woodPunch (dmg 82, reach 158) / hold=woodPunchSuper (dmg 124, reach
210). Cooldown-gated (woodPunchCd 55, ticks in game.js), NO energy (P-hold builds chakra via doEnergyCharge).
Clears fighter.isCharging on fire so the punch sprite renders (sprite.js prioritizes the charge pose).
Mokuton arm = executeHashiramaSpecial Fwd branch → fireHashiramaMokutonArm (dmg 70, 30 chakra).
**GOTCHA (reusable):** sprite.js renders the `charge` pose whenever isCharging — a charge-release attack
must set isCharging=false or the charge pose overlays the attack's first frames.
**HELD:** hashirama_wood_clone_release.png (resliced poorly → 80×27; not a Stage-4 deliverable, deferred).

### Stage 5 — Tree Summon 4-tier ladder  ✅ (test:hashirama-s5 19/0, 3/3 stable)
Down+Special, **successive-cast escalation** (each cast = next tier 1→2→3→4, wraps after 4; ~2.6s lull
resets to 1). Escalating chakra 16→54. Each tier = caster pose + a stationary growing tree-hazard
(spawnProjectile, `spriteOnce` growth + `persist` = grow-to-full then linger). rendered heights 68/99/267/291px.
| Tier | Caster file → key | Tree file (growth strip) | frames · cell | dmg |
|---|---|---|---|---|
| 1 | treee_summon_1 → treeSummon1 | treee_summon_1_tree | 3 · 98×40 | 42 |
| 2 | treee_summon_2 → treeSummon2 | treee_summon_2_tree | 5 · 148×62 | 60 |
| 3 | tree_summon_level_2 → treeSummon3 | tree_level_2_tree (iconic) | 4 · 219×232 | 86 |
| 4 | tree_level_3 → treeSummon4 | tree_level_3_tree (forest) | 7 · 257×171 | 112 |

Tier 4 also drops `hashirama_landscape_overlay_uniform.png` (NEW — largest branch-with-foliage island
cropped from `trees_meant_to_chang_land_scape.png`) as a wide visualOnly terrain overlay.
**NEW engine hooks (additive, flag-gated, reusable):** `spriteOnce` (ui.js — play growth strip once + hold
last frame, no loop) + `persist`/`_struck` (combat.js — hazard strikes once then stands for its lifetime).
Precedent: Madara Wood Spike (vx 0, hitDelay). Regression: madara 44/0, tobirama 31/0.

### Stage 6 — Wood Golem + Gracious Deity Gates  ✅ (test:hashirama-s6 12/0, 3/3 stable)
**Wood Golem** = Up+Special (buffer.jump withheld → grounded cast). fireHashiramaWoodGolem: caster pose
woodGolemSummon → schedulePendingSpawn 2-hit combo: combo_part_1 (dmg 84) then combo_part_2 (dmg 106,
LAUNCHER). Each = giant persist-one-hit golem-punch sprite (scale 1.45). Cost 50, long recovery.
**Gracious Deity Gates** = Back+Special. fireHashiramaGates: seal pose gatesCaster → TWO torii gates
(visualOnly) flank the foe + PIN it (hitstun 70 = immobilize; `stun` is NOT self-clearing in this engine
so hitstun is the immobilize primitive). Cost 40. Stores `_gatesPinnedTarget` — Stage-7 ult reuses the pin.
| Original file | Resliced | key / role | frames · cell |
|---|---|---|---|
| hashirama_gaint_wood_statue_summon.png | _uniform | woodGolemSummon caster | 3 · 55×76 |
| hashirama_gaint_wood_statue_summon_combo.png | hashirama_wood_golem_combo1_uniform.png (FIXED-width 3-slice, no gutters) | golem hit 1 | 3 · 241×198 |
| hashirama_gaint_wood_statue_summon_combo_part_2.png | hashirama_wood_golem_combo2_uniform.png | golem hit 2 (launcher) | 3 · 241×194 |
| hashirama_Gracious_Deity_Gates.png | hashirama_gracious_deity_gates_uniform.png | gatesCaster seal | 3 · 55×76 |
| hashirama_Gracious_Deity_Gates_wood.png | hashirama_gracious_deity_gates_wood_uniform.png | torii gate (×2 dropped) | 1 · 140×244 |

**GOTCHA (reusable):** giant-golem combo sheets have NO alpha gutters between frames → reslice_strip merges
to 1 frame; must FIXED-width slice (W/nframes). Also: spawnProjectile defaults w→16 if cfg omits w/h → a
big hazard silently gets a tiny hitbox (golem missed until w/h added).

### Stage 7 — Sealing Jutsu ultimate  ✅ (test:hashirama-s7 10/0, 3/3 stable)
NEW `hashiramaSealingJutsuCinematic.js` (freeze cinematic, mirrors madaraTengaiShinseiCinematic contract).
Ultimate key (U) → executeHashiramaUltimate (100 chakra) → activate cinematic. Timeline 196f:
combo(44) → gates(36, slam+PIN foe) → cameos(60, Naruto→Minato→Tobirama 20f each) → seal(40, red barrier
+ guaranteed 340→204 dmg via applyHashiramaSealDamage/applyScaledDamage) → settle(16). Per Stage 0, the
Gracious Deity Gates immobilize IS the ult's lock-phase (opponent pinned via hitstun at the gate beat).
| Original file | Resliced | role |
|---|---|---|
| hashirama_combo_into_sealing_justu.png | _uniform (11f 76×79) | caster combo-into-seal pose (sealingCombo, _spriteCastMove through freeze) |
| hashirama_sealing_assist.png | _uniform (12f 55×88 = 4 allies×3f) | Naruto(0-2)/Minato(3-5)/Tobirama(6-8)/Hashirama(9-11) cameo overlay |
| hashirama_sealing_box.png | (890×425, drawn directly) | red sealing-barrier box overlay |
| hashirama_Gracious_Deity_Gates_wood.png (reuse) | — | torii gates drawn falling in the lock-phase |

Wiring: abilities.js (import + executeHashiramaUltimate + applyHashiramaSealDamage + dispatch case) +
game.js (import, updateBattle freeze-gate, drawBattle overlay, 3 clear sites, innerCineActive list,
sealingCine() harness accessor). DUP-RENDER GUARD in test: seal damage lands EXACTLY once (single-hit band).
Regression: madara 44/0, pain 42/0, hashirama s1-s6 green.

### Stage 8 — Portrait + harness + balance  ✅ (test:hashirama 32/0, 4/4 stable)
- **Portrait** = NEW `hashirama_portrait.png` (165×168) — the "SPECIAL MOVE PORTRAITS" head-and-shoulders
  crop from the master sheet `hashirama_transparent.png` (scipy.ndimage largest-island in the labelled region).
  Matches the Stage-1 `portrait: "./hashirama_portrait.png"` path; loads in-game (test asserts decode).
- **Canonical test** `harness/hashirama.test.mjs` (`test:hashirama`, 32/0): registration/portrait/stats/sprite-gate ·
  5 normals + chain opener · Kunai · Wood Punch tap/hold · Mokuton arm · Tree ladder (escalating scale + growth) ·
  Wood Golem · Gates pin · Sealing Jutsu ult with EXPLICIT duplicate-render guard (seal dmg lands once, band 120–320).
  Directional specials fire via `p1SpecialDir(dir)`; each section `settle()`s to avoid state-bleed.
- **Balance** = `BALANCE_AUDIT.md` entry appended. Verdict: **VERSATILITY outlier (Madara-class scope exception),
  honest ×0.60 pipeline (zero bypass), NOT a power outlier.** 2 watch-items (diagnosis-only, no change): Def 92×HP 1220
  tankiness (Def ties Superman's record), Gates 70f immobilize CC. Ult 340→204 EFF = Madara Tengai / Red Ranger tier.

---

## FILE UTILIZATION — all 47 source files (WIRED 41 · portrait-source 1 · HELD 5)
Reslice pipeline: raw strip → COPY `*_uniform.png` (or fixed-width slice for gutterless golem sheets) via
`tools/reslice_strip.mjs`; originals kept untouched (incl. "treee"/"rellese"/"gaint"/"chang_land_scape" misspellings).

**WIRED (41):** idle · run · dash · jump · hit · hand_signs · intro_part_1 · intro_part_2 · intro_2 ·
wood_clone_intro (S1) · foward_punch · kick · up_attack · air_combo_1 · down_air_attack · punch_combo_1 ·
air_combo_2 · punch_2 (S2) · kunai_throw · kunai_throw_air · kunai_throw_projectile (S3) · wood_rellese_punch ·
wood_rellese_punch_super · __Mokuton lul_4 (S4) · treee_summon_1(+_tree) · treee_summon_2(+_tree) ·
tree_summon_level_2 · tree_level_2_tree · tree_level_3 · tree_level_3_tree · trees_meant_to_chang_land_scape (S5) ·
gaint_wood_statue_summon · gaint_wood_statue_summon_combo · gaint_wood_statue_summon_combo_part_2 ·
Gracious_Deity_Gates · Gracious_Deity_Gates_wood (S6) · combo_into_sealing_justu · sealing_assist · sealing_box (S7).

**PORTRAIT SOURCE (1):** hashirama_transparent.png → cropped to `hashirama_portrait.png` (S8).

**HELD (5) — deliberately not wired:**
- `hashirama_normal_nzc_..._d9bm5qa.png` — the non-transparent master sheet (redundant with transparent; kept as reference).
- `hashirama_treee_summon_3(+_tree)` — thin vertical wood-spikes pair; Stage-0 reconciliation left it OUT of the 4-tier ladder (candidate for a future Down-poke).
- `hashirama_tree_summon_level_1(+_tree)` — curled-tendril sprout pair; also excess to the 4-tier ladder.
- `hashirama_wood_clone_release.png` — resliced poorly (80×27 flat); not a build deliverable, deferred.

Every gameplay/art file that maps to a real move is wired; the 5 HELD are the two Stage-0-excess tree pairs,
the redundant master, and the one deferred clone-release strip — none are silent drops.

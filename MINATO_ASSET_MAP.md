# MINATO NAMIKAZE — Asset Map & Build Plan

Fourth Hokage, "Konoha's Yellow Flash." 4th Naruto-universe character
(after Naruto, Sasuke, Itachi, Tobirama). `rosterKey: "minato"`, no new
universe setup. Staged build; every uploaded sprite must be accounted
for by the Stage 7 utilization report — this doc is the plan-of-record.

## Slicing convention
Source strips are non-uniform. Each is copied to a `*_uniform.png`
sibling and re-sliced with `tools/reslice_strip.mjs` (frames detected by
alpha gutters, repacked into uniform bottom-aligned cells). **The
exact-as-uploaded originals are kept untouched** — the engine reads the
`_uniform` copies. `spriteScale: 1.7` (idle ~64px → ~109px on-screen,
matching the ~112px Naruto/Sasuke/Itachi tier).

## Stats identity
Fast / precise / balanced. Speed **98** = fastest shinobi on the roster
(Tobirama 96) — the Yellow Flash — but HP **1150** keeps him off the
glass-cannon extreme (near Naruto/Sasuke's 1180). Attack 92 (precise),
maxEnergy 200 (ultimate + Flying Raijin + Reaper Death Seal all draw on
a healthy chakra pool).

---

## FILE → DESTINATION

### Stage 1 — movement/state  ✅ WIRED
| file | destination |
|---|---|
| `minato_idle.png` | idle (4f) — also doubles as `intro` (no dedicated entrance strip uploaded) |
| `minato_run.png` | walk + run (only locomotion strip; both read it — he's the fast ninja) |
| `minato_jump.png` | jump + fall (4f arc, last cell = fall) |
| `minato_block.png` | guard (1f braced pose) |
| `minato_hit.png` | hurt (frame 0 recoil) + knockdown (3f) |
| `minato_dash.png` | dash — Flying-Raijin flash-ring blink (`movement.dashTeleport`) |

### Stage 2 — normals + command-normal chain
| file | planned destination |
|---|---|
| `minato_foward_kick.png` | a normal (light or forward poke) |
| `minato_up_attack.png` | up-attack (launcher) |
| `minato_down_air_attack.png` | down-air |
| `minato_twornado_kick.png` | a normal / spin kick |
| `minato_super_up_attack_1.png` | up-heavy / chain node |
| `minato_super_down_attack.png` | chain finisher (downward slam) |
| `minato_melee_combo_1.png` | chain opener |
| `minato_melee_combo_2_part_1.png` | chain node |
| `minato_melee_combo_2_part_2.png` | chain node |
| `minato_melee_combo_2_part_3.png` | chain node |
| `minato_yellow_falsh_combo_2.png` | chain / command-normal (yellow-flash flurry) |
| `minato_yellow_fash_floor_combo.png` | chain / command-normal (floor combo) |

### Stage 3 — Shadow Clone system (ported from Naruto)
| file | planned destination |
|---|---|
| `minato_shadow_clone_justu.png` | the CASTER's summon HAND-SIGN gesture — plays on Minato at D→F spawn via `minatoCloneCast` (characters.js animationData). NOT the clone body: it depicts Minato forming the seal, so the spawned clones use `minato_idle_uniform` (standing) instead — mirrors Naruto (kcm_stance body + no caster gesture). Corrected 2026-07-28 (was wrongly wired as the clone body → clones performed the gesture, caster did nothing). |
| `minato_idle_uniform.png` (reuse) | clone BODY (idle standing) for `CLONE_BODY_SETS.minato` + `minatoCloneRush` rushers — the clones are copies of Minato standing, not performing his cast. |

### Stage 4 — Flying Raijin
| file | planned destination |
|---|---|
| `minato_kunai_projectile.png` | thrown Flying-Raijin kunai projectile |
| `minato_kuni_knife_baragge.png` | multi-kunai barrage variant |
| `minato_yellow_flash_dash:teleport.png` | teleport-execution FX (portal ellipses). **NOTE: colon in filename — will be copied to a safe name before wiring.** |

### Stage 5 — Reaper Death Seal + Rasengan specials
| file | planned destination |
|---|---|
| `minato_reaper_death_seal.png` | Reaper Death Seal cast pose |
| `minato_reaper_death_seal_fire.png` | seal fire/impact FX |
| `minato_reaper_death_seal_summoning.png` | the Reaper (Shinigami) summon |
| `minato_reaper_death_seal_summoning_arm.png` | the Reaper's reaching arm |
| `minato_basic_big_ball_rasengan.png` | large-scale Rasengan variant |
| `minato_basic_rasengan_combo.png` | Rasengan combo cast |
| `minato_basic_rasengan_combo_effect_part_1.png` | Rasengan combo FX |
| `minato_basic_rasengan_combo_effect_part_2.png` | Rasengan combo FX |
| `minato_basic_rasengan_combo_effect_part_3.png` | Rasengan combo FX |
| `minato_basic_rasengan_effect.png` | Rasengan orb FX |
| `minato_basic_rasengan_effect_2.pn.png` | Rasengan orb FX (alt) — note doubled `.pn.png` ext |
| `minato_basic_rasengan_version_1.png` | Rasengan cast v1 |
| `minato_basic_rasengan_version_2_part_1.png` | Rasengan cast v2 |
| `minato_basic_rasengan_version_2_part_2.png` | Rasengan cast v2 |
| `minato_basic_rassenganeffect_prjectile.png` | Rasengan projectile |
| `minato_rasengan_ultimate_special_combo_part_1.png` | Rasengan super-combo |
| `minato_rasengan_ultimate_special_combo_part_2.png` | Rasengan super-combo |

### Stage 6 — Kurama (half-form) Ultimate
| file | planned destination |
|---|---|
| `minato_kurama_ultimate_intro.png` | chakra-mode activation |
| `minato_kurama_ultimate_effect_part_1.png` | half-fox avatar emergence |
| `minato_kurama_ultimate_effect_part_1_projectile.png` | avatar / TBB projectile |
| `minato_kurama_ultimate_effect_part_2.png` | avatar frames |
| `minato_kurama_ultimate_effect_part_2_projectile.png` | TBB projectile |
| `minato_kurama_ultimate_effect_part_3.png` | avatar frames |

### Stage 7 — Portrait
| file | planned destination |
|---|---|
| `minato_copy2_transparent.png` | **master reference sheet** — portrait/mugshot cropped from its top-left → `minato_portrait.png` |
| `minato_copy_transparent.png` | **master reference sheet** — the raw dump every individual slice derives from; reserved as source reference |

---

## Deferred / flagged
- **`minato_copy_transparent.png` / `minato_copy2_transparent.png`** — original master sheets. All individual slices derive from these; retained as source reference (portrait comes from copy2). Not wired as gameplay actions.
- **`minato_yellow_flash_dash:teleport.png`** — colon in filename is path-hostile; copy to a safe name before wiring in Stage 4.
- **`minato_basic_rasengan_effect_2.pn.png`** — malformed doubled extension `.pn.png` (as uploaded); use as-is.
- No dedicated **intro** strip was uploaded → idle doubles as the intro pose (may be upgraded to a Flying-Raijin flash-in later).
</content>
</invoke>

---

## STAGE 7 — FINAL SPRITE-UTILIZATION AUDIT
Build COMPLETE (Stages 1-7). Every uploaded `minato_*.png` original is accounted for below.
**47 uploaded originals → 36 WIRED · 11 RESERVED (documented). 0 unidentified.**
Convention: originals kept exact-as-uploaded; the engine reads re-sliced `*_uniform.png` copies (+ two cropped derivatives: `minato_big_ball_uniform.png`, `minato_portrait.png`, and one path-safe copy `minato_yellow_flash_teleport.png`).

### WIRED (36)
| original | destination |
|---|---|
| minato_idle.png | idle + intro (S1) |
| minato_run.png | walk + run (S1) |
| minato_jump.png | jump + fall (S1) |
| minato_block.png | guard (S1) |
| minato_hit.png | hurt + knockdown (S1) |
| minato_dash.png | dash — Flying-Raijin blink (S1) |
| minato_foward_kick.png | light normal (S2) |
| minato_twornado_kick.png | heavy normal (S2) |
| minato_up_attack.png | up-attack launcher (S2) |
| minato_super_up_attack_1.png | air normal (S2) |
| minato_down_air_attack.png | down-air normal (S2) |
| minato_melee_combo_1.png | minatoRush1 — chain opener (S2) |
| minato_yellow_falsh_combo_2.png | minatoRush2 — chain 2 (S2) |
| minato_super_down_attack.png | minatoRushFin — chain finisher (S2) |
| minato_yellow_fash_floor_combo.png | minatoFloorCombo — Fwd+Light poke (S2) |
| minato_melee_combo_2_part_1.png | minatoMeleeRush — Back+Heavy poke (stitched) (S2) |
| minato_melee_combo_2_part_2.png | minatoMeleeRush (stitched) (S2) |
| minato_melee_combo_2_part_3.png | minatoMeleeRush (stitched) (S2) |
| minato_shadow_clone_justu.png | clone body (CLONE_BODY_SETS) + minatoCloneRush rushers (S3) |
| minato_kunai_projectile.png | Flying-Raijin kunai + clone-combo hit FX (S3/S4) |
| minato_kuni_knife_baragge.png | Flying-Raijin world-space mark glyph (S4) |
| minato_yellow_flash_dash:teleport.png | teleport portal FX — SOURCE (colon in name → copied to the path-safe minato_yellow_flash_teleport.png which is wired) (S4) |
| minato_basic_rasengan_version_1.png | minatoRasengan + minatoBigBall cast pose (S5) |
| minato_basic_rasengan_effect.png | Rasengan orb FX (S5) |
| minato_basic_big_ball_rasengan.png | Big Ball FX — top row cropped → minato_big_ball_uniform (S5) |
| minato_reaper_death_seal.png | minatoReaperCast — hand-seal pose (S5) |
| minato_reaper_death_seal_summoning.png | Shinigami manifest FX (S5) |
| minato_reaper_death_seal_summoning_arm.png | reaching-arm FX (S5) |
| minato_reaper_death_seal_fire.png | soul-flame FX (S5) |
| minato_kurama_ultimate_intro.png | chakra-mode activation (S6) |
| minato_kurama_ultimate_effect_part_1.png | fox rise — silhouette→reveal (S6) |
| minato_kurama_ultimate_effect_part_2.png | fox howl / charge (S6) |
| minato_kurama_ultimate_effect_part_3.png | fox lunge — fire/settle (S6) |
| minato_kurama_ultimate_effect_part_1_projectile.png | TBB condensing orbs (S6) |
| minato_kurama_ultimate_effect_part_2_projectile.png | TBB orb streaking + detonation (S6) |
| minato_copy2_transparent.png | portrait source — mugshot cropped → minato_portrait.png (S7) |

### RESERVED — documented, not wired (11)
All redundant alternate-FX for the SAME Rasengan the wired primaries already cover (a 4-move kit does not need 12 Rasengan FX variants), plus one master sheet. No new art needed; can be swapped in for polish later.
| original | reason reserved |
|---|---|
| minato_basic_rasengan_combo.png | alt Rasengan cast — superseded by version_1 |
| minato_basic_rasengan_combo_effect_part_1.png | alt Rasengan combo FX — redundant with rasengan_effect |
| minato_basic_rasengan_combo_effect_part_2.png | alt Rasengan combo FX — redundant |
| minato_basic_rasengan_combo_effect_part_3.png | alt Rasengan combo FX — redundant |
| minato_basic_rasengan_effect_2.pn.png | alt orb FX (note the malformed doubled `.pn.png` ext, as uploaded) — redundant with rasengan_effect |
| minato_basic_rasengan_version_2_part_1.png | alt Rasengan cast v2 — superseded by version_1 |
| minato_basic_rasengan_version_2_part_2.png | alt Rasengan cast v2 — superseded |
| minato_basic_rassenganeffect_prjectile.png | alt orb-forming FX — the wired rasengan_effect covers the orb |
| minato_rasengan_ultimate_special_combo_part_1.png | Rasengan super-combo pose — no distinct input (kit has 2 Rasengan moves) |
| minato_rasengan_ultimate_special_combo_part_2.png | Rasengan super-combo pose — no distinct input |
| minato_copy_transparent.png | ORIGINAL master reference sheet — every individual slice derives from it; retained as source reference |

**Unidentified: none.**

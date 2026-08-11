# PAIN / NAGATO'S DEVA PATH — Asset Utilization Map

Naruto universe, rosterKey `pain`, 9th Naruto sprite char. Confirmed **schema exception** (Madara precedent):
4 separate specials + a 5-option "Six Paths Summon" assist system + a freeze-cinematic ultimate. Raw uploads
are resliced to uniform equal-cell `_uniform.png` strips via `tools/reslice_pain.py` (stages 1–7).

**40 source files** — 34 wired, 3 held (drawn but unused, reserved for a later polish pass), 3 reference/portrait.

## Wired (34)

### Stage 1 — movement / state (7)
| Source | Uniform | Use |
|---|---|---|
| `pain_idle.png` | `pain_idle_uniform.png` | idle (also the SPRITE_MANIFEST gate) |
| `pain_run.png` | `pain_run_uniform.png` | run + walk (split-wide reslice → 8f) |
| `pain_dash.png` | `pain_dash_uniform.png` | dash |
| `pain_jump.png` | `pain_jump_uniform.png` | jump + fall (last cell) |
| `pain_block.png` | `pain_block_uniform.png` | guard |
| `pain_hit.png` | `pain_hit_uniform.png` | hurt |
| `pain_stand_up.png` | `pain_stand_up_uniform.png` | knockdown / get-up |

### Stage 2 — normals + command chain (8)
| Source | Uniform | Use |
|---|---|---|
| `pain_light_attack.png` | `pain_light_uniform.png` | light (spin kick) |
| `pain_black_neddle_attack.png` | `pain_heavy_uniform.png` | heavy (black-rod thrust, long reach) |
| `pain_up_attack.png` | `pain_up_uniform.png` | upAttack (launcher) |
| `pain_air_light.png` | `pain_air_uniform.png` | airAttack |
| `pain_air_hard_attack.png` | `pain_airheavy_uniform.png` | airHeavy |
| `pain_down_air_attack.png` | `pain_downair_uniform.png` | downAir (spike) |
| `pain_light_attack_2.png` | `pain_jab_uniform.png` | Fwd+Light command normal (painJab) |
| `pain_ground_combo.png` | `pain_combo1/2/3_uniform.png` | Fwd+Heavy 3-stage rekka (grid sliced by row: spin → launcher → unique finisher) |

### Stage 3 — gravity specials (4)
| Source | Uniform | Use |
|---|---|---|
| `pain_almighty_push.png` | `pain_almighty_push_uniform.png` | Almighty Push cast (neutral Special) |
| `pain_almighty_pull.pngpng.png` | `pain_almighty_pull_uniform.png` | Almighty Pull cast (Back Special) |
| `pain_super_almighty_push.png` | `pain_super_push_uniform.png` | Super Push cast (Down Special) |
| `pain_super_almighty_push_ground_effect_under_pain.png` | `pain_super_push_ground_uniform.png` | Super Push debris ground shockwave |

### Stage 4 — Dedera Double Attack (4) — Fwd+Special sequence
| Source | Uniform | Use |
|---|---|---|
| `pain_dedera_double_attack.png` | `pain_dedera_cast_uniform.png` | cast (Deidara-cameo homage) |
| `pain_dedera_double_attack_upper_attack.png` | `pain_dedera_rise_uniform.png` | rising follow-up |
| `pain_dedera_double_attack_projectile.png` | `pain_dedera_bird_uniform.png` | clay-bird projectile |
| `pain_dedera_double_attack_effect.png` | `pain_dedera_explosion_uniform.png` | star-flash/fireball explosion (projectile `impact`) |

### Stage 6 — Six Paths Summon assists (8)
| Source | Uniform | Use |
|---|---|---|
| `pain_itatchi_support.png` | `pain_assist_itachi_uniform.png` | Itachi (Charge+↑) — crow murder |
| `pain_konan_support.png` | `pain_assist_konan_uniform.png` | Konan (Charge+←) — companion |
| `pain_konan_support_paper_trap_efffect.png` | `pain_assist_konan_trap_uniform.png` | Konan paper-trap `fx` bloom |
| `pain_sasori_support.png` | `pain_assist_sasori_uniform.png` | Sasori (Charge+→) — puppet + scorpion tail |
| `pain_saske_assist.png` | `pain_assist_sasuke_uniform.png` | Sasuke (Charge+↓) — chidori |
| `pain_saske_lighnig_rod.png` | `pain_assist_sasuke_rod_uniform.png` | Sasuke lightning-rod `fx` bloom |
| `pain_tobi_assist_effect.png` | `pain_assist_tobi_uniform.png` | Tobi (Charge+Light) — masked figure |
| `pain_tobi_effects.png` | `pain_assist_tobi_vortex_uniform.png` | Tobi Kamui-vortex `fx` bloom (the combined Tobi sequence) |

### Stage 7 — Chibaku Tensei ultimate (2 wired)
| Source | Uniform | Use |
|---|---|---|
| `pain_chibaku_tensei.png` | `pain_chibaku_cast_uniform.png` | cast (arms raised) — `painChibakuCast` |
| `chibaku_tensei_projectile.png` | `pain_chibaku_sphere_uniform.png` | black-sphere growth + debris (source lacks the `pain_` prefix — preserved) |
| ~~`chibaku_tensei_grouf_effects.png`~~ | ~~`pain_chibaku_ground_uniform.png`~~ | **REMOVED (both PNGs DELETED)** — ground "explosion" (flat → dome → flame pillar). Source art had baked-in green separator lines running through the dome (x≈84) / pillar (x≈138) frames + a split-colour dome, and it drew ~136px right / ~77px below the opponent. Unfixable in-code → dropped from `painChibakuTenseiCinematic.js` + its `reslice_pain.py` job pruned; the sphere slam + impact flash is the payoff. |

## Held (3) — drawn but not yet wired (reserved for a polish pass)
| Source | Reason |
|---|---|
| `pain_air_combo.png` | COMPILATION montage — its 3 rows are byte-for-byte the individual `air_light`+`air_hard_attack`+`down_air_attack` sheets (all-duplicate). Wiring it would just re-render the native air normals. Held as reference. |
| `pain_konan_support_rod_attack.png` | Konan's alternate rod-attack pose; the paper-trap `fx` was chosen as her secondary bloom. Reserved. |
| `pain_tobi_assist_effect_sharingan.png` | 1-frame sharingan eye icon; the Kamui vortex was chosen as Tobi's secondary bloom. Reserved for an eye-flash accent. |

## Reference / portrait-source (3)
| Source | Role |
|---|---|
| `pain_transparent.png` | The confirmed **cutting reference** (all sheets cut from it) **+ the portrait source** — `pain_portrait.png` is the bust extracted from its top-left "PORTRAITS" region. |
| `pain_sprite_sheet_jus_by_angi1997_d48lwjr.png` | Labels/credits copy of the master (per the inventory note) — reference only. |
| `pain_exampls.png` | Reference mockups (arena scenes), explicitly NOT a frame sheet — excluded from slicing. |

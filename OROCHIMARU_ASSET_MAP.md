# Orochimaru — Asset Map

Naruto Sannin (rosterKey `orochimaru`, universe `naruto`). Schema-exception VERSATILITY build (Madara/
Ichigo/Pain/Saitama class): 5 normals + throw-weapon grab + Forward/Aerial strongs + 3-stage command chain
+ 8 specials + 3 alternate forms + a Summon ultimate. All art re-sliced by `tools/reslice_orochimaru.py`
(+ `tools/gen_orochimaru_forms.py` for the 2 recolored form palettes). Provenance: NZC-style fan sheet,
generic `p1_*`/`p2_*` filenames, no baked artist text → `credits.js` PROJECT_ART_KEYS.

## Raw source sheets → resliced uniform sheets
| Raw | Uniform output(s) | Use |
|---|---|---|
| `p1_stance_1_2_3.png` | `orochimaru_idle_uniform` | idle (stance-1, 4f; label row cut) |
| `p1_run_1_and_3.png` | `orochimaru_run_uniform` | run/walk/dash (cycle-1, 6f; run-2 is a real gap) |
| `p1_jump_guard_guardair_throwweapon.png` | `orochimaru_jump/guard/guardair/throw/kunai_proj` | jump 5f · guard 2f · guardAir 1f · throw-weapon 4f · kunai proj 2f |
| `p1_taking_damage_special_heavy1_heavy2.png` | `orochimaru_hurt/hurt_special/hurt_heavy1/hurt_heavy2/grab` | 4 hit tiers + grab pose (cyan label rows band-cut) |
| `p1_knocked_down_normal.png` | `orochimaru_knockdown_uniform` | knockdown → getup (8f) |
| `p1_knocked_down_against.png` | `orochimaru_knockdown_against_uniform` | knockdown → green regen getup (11f) |
| `p1_introduction_1_and_2.png` | `orochimaru_intro1/intro2` | intro part 1 (gesture 2f) + part 2 (coil→serpent 9f) |
| `p1_introduction_3.png` | `orochimaru_intro3_uniform` | intro part 3 (snake head → expelled → stand, 8f) |
| `p1_attack_combo.png` | `orochimaru_light_uniform` | light snake-whip flurry (11f) |
| `p1_strong_attack.png` | `orochimaru_heavy_uniform` | neutral heavy Kusanagi thrust (char f0-5) |
| `p1_strong_attack_up/down.png` | `orochimaru_up/downair_uniform` | up launcher / down strike |
| `p1_attack_combo_air.png` | `orochimaru_air_uniform` | air normal |
| `p1_strong_attack_air.png` | `orochimaru_airstrong_uniform` | Aerial Strong (air+Heavy) |
| `p1_strong_attack_forward.png` | `orochimaru_fwdstrong_uniform` | Forward Strong (Fwd+Heavy). **`p2_special_move_01` = confirmed duplicate → NOT imported.** |
| `p2_special_move_05` | `orochimaru_chain2/chain3` | 3-stage command chain stages 2-3 |
| `p2_special_move_03` | `orochimaru_snakespit` + `orochimaru_snake_proj` | GROUND-neutral Snake Spit (ranged) |
| `p2_special_move_07` | `orochimaru_swordlunge` | GROUND-Fwd Kusanagi Sword Lunge (melee) |
| `p2_special_move_06` | `orochimaru_swordthrow` + `orochimaru_sword_proj` | GROUND-Back Kusanagi Sword Throw (ranged) |
| `p2_special_move_02` | `orochimaru_tailsweep` | GROUND-Up Snake-Tail Sweep (launcher) |
| `p2_special_move_08` | `orochimaru_slam` | GROUND-Down Slam (spike) |
| `p2_special_move_04` | `orochimaru_snakelunge` | AIR-neutral Striking Shadow Snake (melee dive) |
| `p2_special_move_09` | `orochimaru_snakebarrage` + `orochimaru_snakeswarm_proj` | AIR-Fwd Hidden Shadow Snakes (ranged barrage) |
| `p2_special_move_10` | `orochimaru_coil` + `orochimaru_shed` | AIR-Back Coil + the shared form shed-skin transition |
| `p2_second_char_stance_1/run/dash` | `orochimaru_form_idle/run/dash` (+ white/serpent recolors) | 3 alternate-form host-body art |
| `p2_special_move_11` | `orochimaru_ult_cast` + `orochimaru_ult_snake` | Summon ULT: cast gesture + giant serpent FX |
| `p1_credits_and_portrait.png` | `orochimaru_portrait.png` | select portrait (blue-framed mugshot, blue bg keyed out) |

## Kusanagi 04-vs-09 decision
Two **independent** snake moves (04 = melee lunge, 09 = ranged barrage), NOT one tap/hold technique. The
`[PATTERN-MATCH]` "Kusanagi"(sword) label for 04/09 was wrong — they are snakes; the real Kusanagi *sword*
moves are 06 (throw) + 07 (lunge).

## Reserved / unused
- `p2_second_char_punch.png` — a DIFFERENT character (blonde swordsman), NOT the host body → dropped from the forms.
- `p2_special_move_12` — a two-figure assist frame → reserved (no move built).
- The blue/gold/purple palette-swatch mugshots in `p1_credits_and_portrait.png` — reserved for a future skin batch.

## Gaps by design
No skins batch, no voice (art/audio not exported). Forms are cosmetic (no stat buff).

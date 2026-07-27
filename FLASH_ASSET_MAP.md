# FLASH_ASSET_MAP.md

Asset inventory + build plan for **The Flash** (rosterKey `flash`, universe `dc`
— first DC character, 14th sprite char overall).

Frame boundaries **measured** via `harness/slice_scan.mjs` (alpha-gutter scan),
cross-matched against the master reference sheet `flash_transparent.png`
(1179×916 atlas). Filenames preserved **exactly** as uploaded (note the typos:
`flash_fowars_kick`, `flash_towrnado_attack`, `flash_foward_*`). Non-uniform
strips RE-SLICED to uniform cells (`harness/reslice.mjs → *_uniform.png`); the
two single-pose run sheets COMPOSITED into one body-centered 2-frame sheet
(PIL, since reslice can't combine files).

Structural precedent throughout: **Killua Zoldyck** (rushdown assassin, overlay
ultimate). Flash Time (Stage 4) reuses **Killua's Godspeed cinematic + time-scale**
architecture directly.

---

## STEP 1 — Raw inventory (measured)

### Movement / state (Stage 1 — WIRED)
| file | dims | islands | role |
|---|---|---|---|
| `flash_idle.png` | 509×93 | 7 | idle ✅ → `flash_idle_uniform.png` (7f, 80×93, botGap 1) |
| `flash_run.png` | 159×99 | 1 | dynamic sprint pose (body + speed-line tail) |
| `flash_run_part_2.png` | 156×87 | 1 | 2nd sprint pose → COMPOSITED w/ above → `flash_run_uniform.png` (2f, 194×99, body-centered) |
| `flash_jump.png` | 196×104 | 3 | jump ✅ → `flash_jump_uniform.png` (3f, 66×104, botGap 0) |
| `flash_double_jump.png` | 319×82 | 5 | 2nd-jump spin (Stage 1 spare / air candidate) |
| `flash_hit.png` | 443×104 | 5 | hurt ✅ → `flash_hit_uniform.png` (5f, 115×104, botGap 4) — real recoil→knockdown strip |
| `flash_intro.png` | 567×104 | 8 | intro ✅ (dedicated) → `flash_intro_uniform.png` (8f, 80×104, botGap 2) |
| `flash_intro_2.png` | 677×119 | ~10 real | running-entrance intro (speed-line slivers; messy — deferred, intro.png is cleaner) |
| **guard** | — | — | **NO dedicated block art in the batch or atlas** → FALLBACK to idle frame 0 (flagged) |
| `flash_portrait.png` | 121×118 | — | select portrait — CROPPED from atlas bottom-left head profile (real dedicated art) |

### Melee normals + command-normal chain (Stage 2)
| file | dims | islands | likely slot |
|---|---|---|---|
| `flash_foward_punch.png` | 374×95 | 4 | **light** (fast jab) |
| `flash_foward_punch_2.png` | 317×105 | 3 | chain / alt punch |
| `flash_foward_kick_2.png` | 241×117 | 3 | **heavy** (committed kick) |
| `flash_fowars_kick.png` | 186×107 | 2 | chain / poke |
| `flash_upper_attack.png` | 292×121 | 3 | **up** (launcher) |
| `flash_air_kick.png` | 352×94 | 4 | **air** |
| `flash_down_air_attack.png` | 242×105 | 3 | **down_air** (dive) |

> 5 normal slots + ~2 overflow (foward_punch_2 / fowars_kick) → cancelable
> command-normal chain (Toji-Rekka architecture), per prior chars. Stage 2 finalizes.

### Melee-range specials (Stage 3)
| file | dims | islands | role |
|---|---|---|---|
| `flash_spin_attack.png` | 362×119 | 3 (2 sliver edges) | Spin Attack — multi-hit whirl (melee) |
| `flash_towrnado_attack.png` | 396×112 | 4 | Tornado — advancing multi-hit vortex (melee) |
| `flash_teleportation_effect.png` | 552×96 | ~7 | blink/afterimage FX (special + Flash-Time overlay) |
| `flash_run_effect.png` | 39×82 | 1 | speed-line FX tile (run/overlay dressing) |

### Flash Time (Ultimate — Stage 4)
| file | dims | islands | role |
|---|---|---|---|
| `flash_flash_time_foward_punch.png` | 230×97 | 2 | enhanced FT punch |
| `flash_flash_time_foward_punch_2.png` | 366×102 | 3 | enhanced FT punch alt |
| `flash_flash_time_upper_attack.png` | 529×113 | 5 | enhanced FT upper |
| (reuse `flash_teleportation_effect` + `flash_run_effect`) | | | afterimage overlay |

### Master sheet
| file | dims | notes |
|---|---|---|
| `flash_transparent.png` | 1179×916 | full reference atlas (all rows + portrait head + "Player 2"/"Frozen" palette variants + legend). Source of the portrait crop; individual files are the extracted rows. |

---

## STEP 2/3 — Cross-connection notes

- **NO ranged/projectile content** anywhere in the batch — every attack (incl.
  spin/tornado) is body-attached melee. Confirmed re-checked in Stage 2. This
  matches the extreme-speed **pure-melee rushdown** archetype in the brief.
- Run sheets are single-island because the speed-line tail connects to the body
  (no alpha gutter). Composited body-centered so the body sits over the hitbox
  and the tail trails as transparent padding (correct when facing either way).

---

## FLASH TIME (Ultimate) — reuse decision ★

**DECISION: reuse Killua's Godspeed architecture directly** (per brief):
1. **Cinematic** = `killuaGodspeedCinematic.js` pattern (camera push-in → hold →
   burst → pull-back, self-buff single-fighter framing).
2. **Time-scale** = the SAME opponent-slow mechanism Killua's build established —
   Flash at 3× / opponent at ~⅓× — NOT a reimplementation.
3. Opponent **retains block** during the slow.
4. Flash gets movement **overshoot/skid** (momentum imprecision on stop).
5. Flash **cannot block at all** while active.

Meter cost near-max (Speed Force pool). Dedicated FT attack art
(`flash_flash_time_*`) swaps in for his normals during the window.

Stage 4 wires this against Killua's existing time-scale system and runs the FULL
suite to confirm no Godspeed regression.

---

## BUILD STATUS — COMPLETE (Stages 1–5)

- **S1** movement/state (idle/run-composite/jump/hurt/intro + idle-frame guard fallback) — 3-file gate + `speed_force` energy label.
- **S2** 5 normals + "Speed Rush" Down+Heavy 2-hit rekka (`updateFlashCommandCombat`).
- **S3** melee multi-hit whirls: neutral Special = Spin Attack, forward Special = Tornado (launches). NO projectile content — confirmed.
- **S4** Flash Time ultimate: `flashTimeCinematic.js` (mirrors Godspeed) + generalized opponent time-slow (`_ftOppTimeScale` ⅓×) + NEW overshoot/skid physics + block-lockout. Reuses Killua's time-slow, not a reimplementation.
- **S5** portrait wired (`flash_portrait.png`), canonical `harness/flash.test.mjs` (29/29), balance pass.

**Deferred / not in the batch (flagged honestly):**
- **Guard/block** — no dedicated art anywhere; uses an idle-frame fallback.
- **`flash_double_jump.png`** (5f) — spare air art, unused (base double-jump uses the jump strip).
- **`flash_intro_2.png`** — messy running-entrance intro; `flash_intro.png` used instead.
- **Voice/taunt/win-lose** — no such assets in the batch (matches Killua's deferrals).
- Command chain is **2-stage** (honest overflow-art count; extend if more art arrives).

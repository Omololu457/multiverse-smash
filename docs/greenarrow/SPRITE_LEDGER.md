# Green Arrow — Sprite Ledger

Every extracted frame → animation strip → move/state that triggers it. Built by
`green_arrow_work/build_ga.py` (GA, alpha-keyed) and `green_arrow_work/drone_slice.py`
(drones, JPEG → native-grid mode-downsample + palette snap + lavender chroma-key).
Nearest-neighbour only; no art invented. Contact sheets:
`docs/greenarrow/contact_ga.png`, `docs/greenarrow/contact_drones.png`.

## GREEN ARROW sheet — real row counts (spec counts in parens)
`SNES - Justice League Task Force - Fighters - Green Arrow.png` splits into 16 sprite rows
(plus the wordmark on its own thin band).

| Row (y-band) | Real count | Frames → strip → move/state |
|---|---|---|
| R1 idle+portrait+logo (11–114) | 5 (spec 3+portrait+logo) | fr0-2 → `idle` (idle stance). fr3 → `portrait` (char-select + win 1). fr4 → `logo` (roster/select icon **and** HUD Tech-meter badge). |
| wordmark (126–141) | 2 words | "GREEN ARROW" → `wordmark` (intro title card, nearest-neighbour scaled). |
| R2 walk (158–238) | 6 (6) | fr0-5 → `walk` (walk cycle; `run`/`dash` reuse it). |
| R3 jump+flip (282–372) | 7 (3+4) | fr0-2 → `jump` (crouch/rise/arc; fr2 → `fall`). fr3-6 → `flip` (somersault / back-flip evasion, 10 invuln f, double-tap ←). |
| R4 punches (379–466) | 8 (8) | fr0-1 → `light` (jab, quiver-side straight). fr4-6 → `heavy` (elbow/turn straight). (fr2,3,7 held in reserve.) |
| R5 kicks (479–568) | 9 (9) | fr0-2 → `highkick` (high kick, anti-air angle). fr3-5 → `up` (spinning back kick, launcher). |
| R6 crouch (591–659) | 7 (7) | fr0 → `crouch`. fr1-2 → `crouchatk` (crouch jab/kick, low). fr3-6 → `lowarrow` (crouch low-arrow release). |
| R7 ground (696–748) | 4 (4) | fr0-1 → `slide` (slide/sweep, 15% screen, knockdown). fr2-3 → `rising` (wake-up rising kick, 6 invuln f). |
| R8 dash/roll/guard/back-step (757–848) | 9 (9) | fr0-2 → `dash` (dash/roll). fr5 → `guard`/`block`. (back-step frames in reserve.) |
| R9 lunge/bow-slash (871–957) | 8 (spec 7) | fr2-4 → `bowslash` (→+H, bow-as-melee swing, long reach). (lunge/recovery stance frames in reserve.) |
| R10 standing draw→aim→release (985–1092) | 7 (7) | fr0-6 → `draw` (plain shot ↓↘→+L). fr2-3 → `aim` (charge-hold pose). fr1,2,5 reused by `firecast`/`icecast` (cast pose; projectile differs). |
| R11 anti-air + fire + ice (1117–1232) | 4 poses + 5 + 5 | Left poses → `antiair` (↓↘→+M high release 60°). FIRE ARROW (orange ×5) → `firearrow` projectile. ICE ARROW (blue ×5) → `icearrow` projectile. |
| R12 air draw/release (1236–1322) | 4 (4) | fr0-3 → `airdraw` (air shot R12 / TRICK SHOT fan). fr1-2 → `air` (air normal). |
| R13 explosive dive + explosion (1345–1397) | 8 (4+4) | fr0-3 → `dive` (EXPLOSIVE ARROW diving, flame trail). fr4-7 → `explosion` (puff → mushroom → bigger → shockwave dome) — impact FX for explosive/fire arrows + Super bombs. |
| R14 hit reactions (1437–1522) | 9 (9) | fr0-1 → `hurt`. fr0-8 → `stagger` (stagger / block-stun). |
| R15 knockdown (1542–1609) | 7 (7) | fr0-6 → `knockdown` (hit/fall/bounce/lying/roll/get-up) — LOSE pose. |
| R16 win + superman + credit (1630–1734) | 5 | fr0-1 → `win` (fist-raise ×2). fr2 → `skyward` (bow-aimed-skyward, Super pose + win 2). fr3 → **EXCLUDED — other character (Superman mini).** fr4 → **EXCLUDED — credit (ripper text).** |

### Derived / tinted GA assets (ledger-flagged)
- `green_arrow_plainarrow.png` — **derived crop** of FIRE ARROW frame 0 shaft+fletch (warm flame pixels recoloured to wood/steel), per spec "no standalone plain arrow".
- `green_arrow_emparrow_uniform.png` (5f) — **tint** of the ICE ARROW frames to electric yellow-white (EMP ARROW).

**Exclusions:** exactly two — the Superman mini-sprite (R16 fr3) and the ripper credit text (R16 fr4). Every other GA frame is used.

## DRONE sheets — real counts (spec counts in parens)
"Free Drones Pack Pixel Art" (3 JPEGs). 142 drone frames total across 24 strips.

### Overwatch recon saucer (`Free-Drones-Pack-Pixel-Art2.jpg`, top half)
| Row | Real | Strip | Used by |
|---|---|---|---|
| DEATH | 6 (6) | `ga_overwatch_death_sheet` | destroyed / LOSE / killed-by-Super |
| IDLE | 4 (4) | `ga_overwatch_idle_sheet` | hover above+behind Oliver; fr1 = HUD pip icon |
| SCAN | 8 (8) | `ga_overwatch_scan_sheet` | periodic 3 s scan sweep |
| WALK | 4 (4) | `ga_overwatch_walk_sheet` | fly-in + ALERT (orange ring) reposition |
| WALK_SCAN | 8 (8) | `ga_overwatch_walkscan_sheet` | active tagging sweep |

### Bulwark sentry turret (`...Art2.jpg`, bottom half)
| CAPSULE | 6 (6) | `ga_bulwark_capsule_sheet` | lobbed canister lands/sparks/compresses |
| DROP | 6 (6) | `ga_bulwark_drop_sheet` | turret materialises (thruster lines) |
| WALK | 4 (4) | `ga_bulwark_walk_sheet` | creep toward ideal range |
| WALK2 | 4 (4) | `ga_bulwark_walk2_sheet` | lowered = **firing stance** |

### Aegis shield drone (`Free-Drones-Pack-Pixel-Art3.jpg`, top)
| DEATH | 6 (6) | `ga_aegis_death_sheet` | shatter (+ white flash FX) |
| IDLE | 4 (4) | `ga_aegis_idle_sheet` | sit in front of Oliver; fr1 = HUD pip |
| WALK | 5 (spec 4) | `ga_aegis_walk_sheet` | move to guard position |

### Kestrel gunship (`...Art3.jpg`, bottom)
| BACK | 4 (4) | `ga_kestrel_back_sheet` | turn / return pass |
| DEATH | 9 (spec 8) | `ga_kestrel_death_sheet` | destroyed |
| FIRE1 | 11 (11) | `ga_kestrel_fire1_sheet` | 5-shot strafe burst (angled down) |
| FIRE2 | 11 (11) | `ga_kestrel_fire2_sheet` | sustained suppression stream (cyan, hold-Special) |
| FORWARD | 4 (4) | `ga_kestrel_forward_sheet` | enter strafe run |
| IDLE | 4 (4) | `ga_kestrel_idle_sheet` | HUD pip |

### Skyhook heli-crane (`Free-Drones-Pack-Pixel-Art6.jpg`, top)
| DEATH | 6 (6) | `ga_skyhook_death_sheet` | fr0 = white-flash silhouette → debris; also reused as hit-flash frame |
| IDLE | 4 (4) | `ga_skyhook_idle_sheet` | hover over Oliver; HUD pip |
| LANDING | 8 (spec 7) | `ga_skyhook_landing_sheet` | descend to hook |
| WALK | 4 (4) | `ga_skyhook_walk_sheet` | move toward target |

### Payload bomber (`...Art6.jpg`, bottom)
| DROP | 6 (6) | `ga_payload_drop_sheet` | Super flyover (flight frames) |
| BOMBS | 6 (6) | `ga_payload_bombs_sheet` | munition rotating horizontal→vertical as it falls (Super) |

**Off-by-one notes (reported, not errors):** aegis WALK detected 5 (spec 4 — one extra inter-frame), kestrel DEATH 9 (spec 8 — extra debris blob), skyhook LANDING 8 (spec 7 — extra inter-frame). GA R9 lunge detected 8 (spec 7). All are valid frames; the spec warned counts could be ±1.

**Judgment calls:** (1) GA background was white alpha-0 (already keyed) → alpha-threshold, not chroma-key. (2) Fire/Ice projectiles are stacked vertically in R11's right side → separated by colour (orange/blue). (3) Skyhook DEATH + Payload BOMBS scatter/merge under connected-component → split into equal frames. (4) Faithful white hover/thruster lines beneath several drones are kept (present in source).

---

## PASS 2 — new tints / derived copies / procedural effects

**Derived copies (scaled / reused existing frames — no new art):**
- **Swarm mini-scouts** → `ga_overwatch_idle_sheet.png` drawn at **0.5× scale** in up-to-4 deterministic orbit positions. *derived copy (scaled 0.5).*
- **Strike / kamikaze / mine explosions** → `green_arrow_explosion_uniform.png` (the R13 explosion frames) drawn via a `visualOnly` projectile at **0.5×–1.2×** scale (stun-drone 0.7, mine 1.1, kamikaze 1.2, swarm-ram 0.5). *derived copy (scaled).*
- **Net / Flash / Beacon / Grapple arrow projectiles** → `green_arrow_plainarrow.png` drawn at **1.8×–2.4×** scale (the control arrows reuse the plain-arrow shaft; their type reads from colour + the HUD chip, no unique art). *derived copy (scaled).*
- **Plain / anti-air / trick arrows** bumped to **2.3×–2.6×** scale so the 15×17 plain-arrow reads clearly. *derived copy (scaled).*
- **EMP arrow** (`green_arrow_emparrow_uniform.png`) — already a **tint** of the ice arrow (pass 1).

**Procedural effects (render-only, NOT sprite art):**
- **Net mesh** — a pixel-style grid of lines drawn over a netted fighter (`_drawNet`). *procedural effect, not sprite art.*
- **Flash burst** — expanding white circle on a flashed fighter. *procedural effect, not sprite art.*
- **Shock-stun ring / Sentinel guard-ping ring** — orange rings around the stunned/guarded fighter. *procedural effect, not sprite art.*
- **Aegis shield-flash** — additive white overlay on the drone during an intercept/bash. *procedural effect, not sprite art.*
- **Quiver HUD chip** — N/F/B/G letter + colour chip beside the Tech bar. *procedural effect, not sprite art.*
- **Drone facing-debug arrow** — cyan arrow + `[nativeFacing]` text in training mode. *procedural effect, not sprite art.*

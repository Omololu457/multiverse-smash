# GREEN LANTERN (HAL JORDAN) — Stage 0 Asset Map & Investigation Report

**Source sheet:** `green lanterm/green_lantern__hal__sprite_sheet__originalbyenzo__by_cf2364_dfirpm7.png`
**Pre-sliced frames:** `hal_sprite_001.png … hal_sprite_624.png` (624 frames)
**Audit method:** All 624 frames rendered into 13 labeled contact sheets (`hal_montage.py` → `hal_contact/`), visually inspected frame-by-frame (3 parallel sub-audits + owner-critical frames re-verified directly). NO gameplay code written — this is the Stage-0 report only.

**Status:** STOP GATE. Multiple architecture decisions below require owner sign-off before Stage 1+.

---

## 1. Frame inventory (what the art ACTUALLY shows)

### Character poses — suited Green Lantern
| Frames | Content |
|---|---|
| 005–016 | Idle / ready / neutral stances (suited) |
| 070, 105–108 | Flying dive / airborne tumble & spin |
| 078–088 | Ground combat poses (kick/punch/strike) |
| 121–136 | Aerial combo sequence (kick/punch/spin mix) |
| 235–240, 263–270, 279–304, 321–328 | Combat/movement poses ("General Combat Pose Library" — see §4) |
| 337–339, 361–376, 385–392, 411–414 | More movement / kick / recovery poses |
| 176–181 | Suited idle/ready stances |
| 583–602 | Assorted stance/transition frames |

### Character poses — plainclothes Hal (civilian, orange/tan shirt, red-brown hair)
| Frames | Content |
|---|---|
| 156 | Plainclothes prone/downed |
| **182–194** | **Plainclothes standing/ready stances** (interleaved with the suited idles at 176–181) |

### Hit reactions / knockdown
| Frames | Content |
|---|---|
| 415–421, 442, 448 | Hit-reaction / knockback stumble |
| 549–555, 561–567, 581–582 | Knockback / tumble / recovery |
| 156, 268 | Downed / prone |

### Ranged FX (projectiles)
| Frames | Content |
|---|---|
| 017–018 | Small energy orbs in flight |
| 019–024 | **Small ring-orb charge/launch** (compact, sparkle — lighter than the beam) |
| 025–047, 049–069, 077, 097–104 | **Energy beam / blast** streaks (the primary ranged FX) |

### Constructs (green willpower shapes)
| Construct | Frames (forming / solid / active) | Notes |
|---|---|---|
| **Fist** | 202–213 forming, 214 solid, 270–271 punch, 278 solid, 544 forming, 545 solid | Best-supported construct — full forming→solid→punch coverage |
| **Lion-Head Ram** | 145–152 charging, 329–332 static/chomp | Confirmed both clusters |
| **Blade / Spear / Sliver** | 259–262, 502–505, 529–533, 546–548 | Fast poke shapes (includes former "jaw" frame 261 — see §3) |
| **Tentacle / Claw** | 109–120, 137–140, 165–174, 217–227, 234, 345–348, 444–445, 461, 463 | Reach/grab shapes |
| **Helmet / Head** | 195, 399–405, 508–511 | Rounded dome/helm — attack property UNCLEAR |
| **Spike Ring / Crown** | 159, 569–570 | Radiating spikes — barrier/spin candidate |
| **Sphere / Orb** *(NEW — not in audit roster)* | 250–258, 305–312, 349–352, 468–476 | Large solid green spheres/discs — wrecking-ball / shield candidate |
| **Cracked / Deformed (shared broken-state)** | **175, 460, 542** only | Reusable construct-shatter reaction (see §3 correction) |

### Special mechanics content
| Frames | Content |
|---|---|
| 500, 538–541 | **Horse construct** — 538–541 clear galloping horse (muscular legs, mane); 500 faint/forming. Standalone summon, NOT a ridden mount. |
| 603–619 | **Muscle-transformation** — Hal visibly bulks into a hulking muscular green brute, frame by frame. Dramatic. (Canonicity flagged — §Decision 2) |
| 576 | Single dark silhouette figure — purpose unclear |

### Reference / HUD / excluded
| Frames | Content |
|---|---|
| 001–004 | **Red-haired NPC run cycle — NOT Hal. EXCLUDE.** |
| 141–144 | Lantern-ring symbol / bright orb render — HUD charge-indicator, not a move |
| 623 | Skeletal wireframe reference — EXCLUDE from runtime atlas |
| 624 | Character portrait/bust — reusable for select-screen/HUD portrait |
| 340–344, 377–384, 406–410, 422–432 (+ scattered) | Sparse / debris / leftover FX pixels — EXCLUDE |

---

## 2. Audit claims — CONFIRMED

- ✅ 001–004 = red-haired NPC, not Hal (exclude)
- ✅ 019–024 = small ring-orb charge/launch, distinct from the beam
- ✅ 025–047 / 049–069 / 077 / 097–104 = beam/blast FX
- ✅ 070, 105–108 = airborne dive/tumble
- ✅ 121–136 = aerial combo
- ✅ 141–144 = Lantern-ring symbol/HUD (not a move)
- ✅ 145–152 + 329–332 = Lion-Head Ram construct
- ✅ 156, 268 = downed/prone
- ✅ 159, 569–570 = spike ring/crown construct
- ✅ 165–174 + 217–227 + 234 (+ 345–348, 444–445, 461, 463) = tentacle/claw
- ✅ 176–194 idle set alternates suited (176–181) + **plainclothes (182–194)**
- ✅ 195 + 399–405 + 508–511 = helmet/head construct
- ✅ 202–213 forming / 214 solid = fist construct; 544 forming / 545 solid
- ✅ 175, 460, 542 = cracked/deformed broken-state
- ✅ 415–421, 442, 448, 549–555, 561–567, 581–582 = hit-reaction/knockback/tumble
- ✅ 502–505 + 529–533 + 546–548 = blade/spear/sliver construct
- ✅ 500 + 538–541 = horse construct (standalone summon)
- ✅ 603–619 muscle-transformation; 576 dark silhouette
- ✅ 623 skeletal reference; 624 portrait

## 3. Audit claims — CORRECTED (art does NOT match)

- ❌ **Frame 261 "Chomping Jaw"** → it is a **blade/crescent**, same family as 259–262. **There is no clear dedicated Chomping-Jaw construct art.** The large dark-green ovals at 250–256 *could* be read as an opening maw but are ambiguous and read more as flat sphere/disc constructs. → **Recommend dropping "Jaw" from the construct roster** (or fold into Sphere/Blade) unless owner wants to gamble on 250–256.
- ❌ **Frames 276, 322, 339 "deformed/cracked construct"** → these are **character combat poses**, not broken constructs. The shared broken-state pool is **only 175, 460, 542**.
- ❌ **Frame 409 "solid fist"** → sparse/near-empty frame, no clear fist.
- ❌ **Frame 390 "tentacle"** → character pose.
- ❌ **Frames 352–353 "tentacle"** → sphere/palm construct, not tentacle.

## 4. The "General Combat Pose Library" (blocks Stages 1–3)

Confirmed: frames ~241–432 are a large interleaved pool of suited-GL punch/kick/movement/recovery poses mixed with constructs and FX — an **unsliced shared pose pool, not finished per-move animations**. Character-pose clusters sit roughly at 241–249, 263–270, 279–304, 321–328, 337–339, 361–376, 385–392, 411–421 (with constructs/FX interleaved between). A real per-move slicing pass is still required to cut idle/walk/normals/chains out of this pool before Stages 1–3 can be finalized. Estimated split of 241–432: ~40% character poses, ~35% constructs, ~25% sparse/debris.

---

## 5. OPEN DECISIONS — ✅ RESOLVED (owner sign-off 2026-08-18)

1. **Construct architecture → OPTION B: fixed special slots.** No Construct-Select stance. Each construct is its own fixed special. Provisional map (final layout tuned in Stage 4/5): **N = Fist** (heavy single-hit), **F = Lion-Head Ram** (charge armor-break), **B = Blade poke** (fast), **D = Tentacle grab** (reach), **U = Spike Crown** (barrier/spin), **air = Sphere** (wrecking-ball). Large-kit schema exception (Byakuya/Zaraki/Sukuna class).
2. **Ultimate → MULTI-CONSTRUCT FINISHER** (lore-accurate). Summon several constructs at once (Fist+Lion+Blade+Sphere) or a giant-scale Fist, freeze/camera-focus cinematic. **Muscle-transformation art (603–619) is DROPPED / UNUSED** (non-canonical bulking rejected).
3. **Horse construct → MOVEMENT/DASH MODE.** Temporary mount/rush movement mode. Art is a standalone gallop (not ridden) → needs creative framing (Hal rides/steers a summoned horse-construct, or the horse is the dash avatar). Flag framing at build time.
4. **Plainclothes Hal → IDLE-POSE VARIETY ONLY.** 182–194 (+ prone 156) treated as interchangeable idle variety with suited poses. No taunt / no pre-transformation state.
5. *(Deferred to Stage 5, recommended defaults)* Jaw construct → **drop** (no dedicated art, §3); Helmet/Head attack property → TBD; small orb (019–024) vs beam (025–069) → build both as light/heavy ranged (visually distinct, low redundancy risk).

## 6. Known gaps (deferred, not invented)

- **No win-pose and no intro content** found anywhere in the sheet (same gap pattern as several other chars here).
- Chomping-Jaw construct has no dedicated art (§3).
- Helmet/Head construct has art but no obvious attack semantics.
- Frame 576 dark silhouette purpose unresolved.

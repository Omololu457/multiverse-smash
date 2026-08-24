# IPPO MAKUNOUCHI — Sprite Build — STAGE 0 Asset Map & Investigation Report

**Character:** ONE roster entry (`ippo`), single character, single form. A pure boxer.

**Source:** Fan-made JUS-style sprite sheet, **1920 × 2062 RGBA**, credited to **srchimuelo**
(`ippo_makunouchi_jus_sprite_sheet_by_srchimuelo_dfv5jdo.png`). NOT an official game rip.
Green-keyed background `(0,128,0)`; every frame sits directly on the green field (no per-cell
grid). Real on-sheet text labels above every animation row — second-most self-documented sheet
in the project after Kakashi's. Every category below was checked against actual pixels.

**Status:** ✅ **CHARACTER FULLY COMPLETE (Stages 0–6)** — canonical `test:ippo` **34/0**. (This header
block dates from Stage 0; the per-stage sections below are the current record.)

**Status (original Stage 0):** STAGE 0 COMPLETE — investigation + report only. **NO gameplay code written.** Verified
2026-08-24 by first-hand pixel pass: green→white re-key + 10 zoomed full-res label/row strips
(`/tmp/ippo/strip_A..J.png`, ~1.7×) read directly, plus a programmatic band/component scan.

**Roster reconciliation:** No existing `ippo`/`makunouchi` entry in `characters.js`,
`spritesheets.js`, `skins.js`, or `credits.js`, and no other Ippo sheet on disk — this is a
clean NEW character. Nothing to reconcile.

**Credits:** artist **srchimuelo** is known from the filename → attribution is resolvable at
Stage 1. **No credits blocker** (contrast Piccolo/Gohan/Genos, whose rip-authors were unknown).
Note it is a fan sheet, not a commercial rip — credit the pixel artist, not a publisher.

---

## THE THREE FLAGGED STAGE-0 ITEMS — all resolved by first-hand pixel pass

### Item 1 — "(Heart Stopped)" has NO distinguishing artwork → CONFIRMED ✅
The bottom-most labelled row `(Heart Stopped)` is **4 frames that are pixel-for-pixel the same
guard-up boxing stance as Idle/Stance** — same posture, same glove height, **no sweat, no pallor,
no drooping/knees-buckling detail**. Nothing on the sheet depicts the canonical critical-condition
moment. This is reused placeholder art, exactly as the prompt warned. **→ Do NOT build "(Heart
Stopped)" as a real distinct visual state. Do not fabricate pallor/sweat details that aren't drawn.**
It is the one genuine open item (drop / repurpose / await new art — owner call).

### Item 2 — No projectile / ranged attack anywhere → CONFIRMED (correct, not a gap) ✅
Full scan of all 12 attack rows: **every offensive frame is a punch.** The only "energy" marks are
**red / white motion-blur swirl arcs attached to the fist** (jab streak, hook swirl, Gazelle trail,
Dempsey arcs) — there is **no free-flying energy sprite, no beam, no thrown object, nothing that
leaves the hand.** This is a boxer with no ranged techniques in the source material. **→ Melee-only
kit is accurate. Do NOT flag as missing content and do NOT invent a projectile.**

### Item 3 — "Failed" is genuinely distinct from Walk → CONFIRMED ✅
The `Failed` row (4 frames) is an **off-balance stumble** — torso pitched back, gloves flailing up,
no forward locomotion — clearly the whiffed-consequence of a Dodge/Parry that caught air. It is
**visually distinct** from `Walk`, which is a real alternating-leg forward boxing shuffle. **→ Build
`Failed` as its own state, wired specifically to a whiffed dodge attempt — do NOT collapse it into
Walk for convenience.**

---

## CONTENT CATALOGUE (labels read directly off the sheet; frame counts approximate — exact
## slicing is Stage 1's job. "★" = confirmed present by zoomed pixel read)

### Movement / defensive (Stage 1)
| Label (on sheet) | Frames | Content confirmed |
|---|---|---|
| **Idle - Stance** | 4 | ★ boxer's guard-up ready loop |
| **Walk - Movement** | 4 | ★ real alternating-leg boxing shuffle |
| **Jump - Fall** | ~8 | ★ full rise → apex → fall arc |
| **Guard** | 2 | ★ tighter block, gloves raised HIGHER than idle — a real distinct pose |
| **Dodge / Parry** | 4 | ★ weaving "peekaboo" bob (frame 2 shows a body-lean); a weave-motion ref photo sits beside it |
| **Failed** | 4 | ★ off-balance stumble — distinct from Walk (Item 3) |

### Normals (Stage 2) — all melee
| Label | Frames | Content |
|---|---|---|
| **B** | 4 | ★ straight jab (frame 3 = red motion-blur extend) |
| **Foward + B** *(sheet's spelling)* | ~5 | ★ lunging step-in punch, red motion-blur arc |
| **Up + B** | 4 | ★ rising uppercut, vertical motion streak |
| **Down + B** | ~5 | ★ low crouching body-blow, curved arc |
| **Aerial B** | 4 | ★ airborne punch |

### Command chain (Stage 3)
| Label | Frames | Content |
|---|---|---|
| **Y - Jabs** | long row, **two segments split by an on-sheet `/` marker** | ★ rapid multi-jab combo — fast alternating punches, cancelable chain, NOT a single move. The `/` is the segment-transition marker (build the two segments as a real rekka). |

### Specials — heavier Y variants (Stage 4)
| Label | Frames | Content |
|---|---|---|
| **Foward + Y** | ~7 | ★ spinning hook punch, large white/red swirl trail (heavy variant of Fwd+B); fiery-punch ref photo beside it |
| **Up + Y** | ~6 | ★ heavy rising uppercut, wide circular swing-arc (blue arc streak); full-body render beside it |
| **Down + Y** | ~6 | ★ heavy body-blow, curved swing trail |
| **Aerial Y** | ~6 | ★ aerial hook punch, swirl trail |
| **Special Move - Gazelle Punch** | ~14, **two segments split by on-sheet `/` marker** | ★ leaping windup (blue-glow charge frames) → swirling-trailed counter-strike. Matches the real canon Gazelle Punch — build with confidence; use the `/` marker for the segment transition. Anime ref photo beside it. |

### Ultimate (Stage 5)
| Label | Frames | Content |
|---|---|---|
| **Ultimate - Dempsey Roll** | **4 + `→` + 6** | ★ two segments joined by an on-sheet **arrow (`→`) marker**: (1) rapid side-to-side weaving bob (4f) → (2) continuous flurry of alternating punches with red motion-arc trails (6f). Weave-first-then-barrage, exactly matching the canon technique. Dempsey-Roll ref photo beside it. |

### Portrait / win / lose / hurt (Stage 6)
| Label | Frames | Content |
|---|---|---|
| **Win** | 4 | ★ victory pose ending gloves-raised overhead (last 2 frames arms up) |
| **Lose** | ~7 | ★ dejected slumping stance (~5f) → collapse (1f) → lying flat (1f) |
| **Hurt, Fall and Get Up** | ~9 | ★ flinch (4f) → stumble (2f) → lying-flat KO'd → rising recovery (4f) — one connected chain |
| **(Heart Stopped)** | 4 | ⚠ identical to Idle — reused placeholder, see Item 1 |

### Non-gameplay reference art (top-right of sheet — NOT animation frames)
- A strip of **manga/anime screencap photo panels** (labelled "KOMB") — reference only, exclude.
- A **colored chibi full-body render** — candidate for a select/roster render at Stage 6.
- A large **angry-shout face bust** (top-right) — candidate for the **portrait** at Stage 6.
- Several individual technique reference photos are tucked beside the special rows — exclude from slicing.

---

## CLAIM VERIFICATION SUMMARY
| # | Claim (from prompt) | Result |
|---|---|---|
| S0-1 | "(Heart Stopped)" has no art distinct from Idle | ✅ CONFIRMED — reused placeholder; do not build as distinct state |
| S0-2 | No projectile/ranged anywhere — correct, not a gap | ✅ CONFIRMED — all attacks are punches; only fist-attached motion arcs |
| S0-3 | "Failed" genuinely distinct from Walk | ✅ CONFIRMED — off-balance stumble ≠ forward shuffle |
| — | Idle/Walk/Jump-Fall/Guard/Dodge-Parry all real distinct poses | ✅ CONFIRMED |
| — | Guard gloves raised higher than idle (not idle reused) | ✅ CONFIRMED |
| — | 5 normals (B / Fwd+B / Up+B / Down+B / Aerial B) | ✅ CONFIRMED, melee, with motion arcs |
| — | Y-Jabs = two-segment cancelable chain (`/` marker) | ✅ CONFIRMED |
| — | 5 heavy Y specials incl. Gazelle Punch (2-segment) | ✅ CONFIRMED |
| — | Dempsey Roll = weave (4f) `→` flurry (6f), arrow marker | ✅ CONFIRMED |
| — | Win / Lose / Hurt-Fall-GetUp full sequences | ✅ CONFIRMED |
| — | Artist attribution | ✅ srchimuelo (known — no credits blocker) |

---

## LOCKED CUTS / DECISIONS (per prompt, corroborated by audit)
1. **Melee-only, no ranged special** — accurate to the character; do NOT invent a projectile.
2. **"(Heart Stopped)" NOT built as a distinct visual state** — reused idle art; drop/repurpose is an
   owner decision (the one real open item).
3. **Single character, single form** — one roster entry, no transform, no alt form.
4. **Two signature techniques** faithfully represented: **Gazelle Punch** (Stage 4) and
   **Dempsey Roll** (Stage 5 ultimate) — both are direct structural matches to canon; build with confidence.

---

## DEFERRED / OPEN (confirm before wiring the relevant stage)
- **"(Heart Stopped)" state** — needs new distinguishing artwork OR an owner decision to drop /
  repurpose it. The one genuine open item on an otherwise complete, accurately-labelled sheet. (Item 1)
- **Balance (Stage 6):** a pure-boxer, no-ranged kit with two signature techniques. Open question to
  flag at Stage 6 — does the total lack of a ranged option need compensation (mobility / frame-data /
  the two signature moves), or is it an accurate & acceptable trade-off for a boxer? Regress vs
  `BALANCE_AUDIT.md`. (Same shape as the Gohan/Goku melee-only compensation question.)
- **Portrait source** — angry-shout face bust vs chibi render: pick at Stage 6.
- **Frame counts above are approximate** (green-keyed component scan + zoomed visual reads); exact
  per-move indices are resolved at each move's stage during slicing.

---

## STAGE 1 — REGISTRATION + MOVEMENT (DONE — `test:ippo-stage1` 24/0)

Clean NEW character `ippo` (universe `hajime_no_ippo`). Melee-only boxer. **Idle renders 109px**
(measureSprite) — mid-roster band (Naruto/Gojo ~112).

- **Tool:** `tools/reslice_ippo.py` — green-key JUS slicer (mirrors `reslice_miles.py`): keys any
  GREEN-DOMINANT pixel (bg `(0,128,0)` + anti-alias fringe; safe — Ippo has no green in his palette),
  carves each frame by an explicit xrect within a measured y-band, content-bboxes + repacks
  centered-X / BOTTOM-aligned into one uniform cell (anchorY 0 plants feet). **FLIP_H = False** — the
  rip faces RIGHT (verified by pixel zoom: jab extends right, nose points right).
- **Registered:** `characters.js` (full `ippo` object + roster entry), `spritesheets.js` (idle gate),
  `skins.js` (default only), `credits.js` (**srchimuelo** — attribution RESOLVED, no blocker),
  `ui.js` (`ENERGY_TYPE_LABELS.guts = "Guts"`). **HP 1160 / EN 100 / Atk 88 / Def 84 / Spd 90 /
  scale 2.1 / energyType "guts" / melee-only.**
- **Frame picks (sheet coords, reslice_ippo.py):** idle `[y25-80]` 4f · walk `[y100-155]` 4f (real
  shuffle) · jump `[y163-251]` ascent 4f · fall `[y163-251]` descent 4f (REAL descent, not a jump
  reuse) · guard `[y285-336]` 2f (gloves higher than idle) · dodge `[y386-437]` 4f (weave; frame 2
  carries the motion-streak) · failed `[y464-516]` 4f (distinct stumble) · hurt/knockdown/getup from
  the `[y1702-1762]` "Hurt, Fall and Get Up" chain (2/4/4f, real art sliced now for playability).
  **Reuses (flagged):** run = walk, dash = walk, crouch = guard (no separate stride/crouch on sheet).
- **★ SLICING PITFALL LOG — on-sheet TEXT LABELS hug their rows and bled into two bands:**
  1. **jump** — the "Jump - Fall" label (y168-190, x0-90) overlapped the low ascent frames' x-range;
     AND the first band wrongly ran to y301, swallowing the "Guard" label (y264-274) + guard-sprite
     tops. Fixed: band tightened to the true arc extent **(163,251)** + a `clear_rect(0,166,92,191)`
     label-mask (label-only pixels; apex frames are at x≥117 and crouch heads at y≥199, both clear).
  2. **dodge** — a white bracket-line (y439) and the "Failed" label (y444-454) sat just below the
     feet (y~436); the original y1=455 captured them. Fixed: band tightened to **(386,437)**.
  Root-caused by ASCII-dumping the cell alpha (a checkerboard visual read had *false-positived*
  "Failed" on dodge before the fix, and *missed* that the real bug was the band running long).
  **Lesson: for label/decoration contamination, per-frame bbox debug + ASCII alpha dumps are ground
  truth; small-scale visual reads mislead both ways.**
- **Verification:** `test:ippo-stage1` **24/0** (sprite gate, scale 2.1, HP 1160/EN 100, Guts label,
  idle 109px in-band + unclipped, every movement/state action resolves a real `ippo_` sheet, dodge≠
  failed≠walk distinct, no 128×128 fallback box, no JS errors). **In-engine shots** (harness/shots/
  ippo_stage1_*.png) confirm clean render — faces RIGHT, feet planted, human-scale, poses match names
  (idle guard-up / walk shuffle / fall descent / guard tighter-block / dodge weave / failed stumble).
  Regression: `miles-stage1` 21/0, `credits` 12/2 (2 PRE-EXISTING; ippo properly attributed, not
  added to the debt).
- **Deferred to later stages:** Y-Jabs chain (S3) · heavy-Y specials + Gazelle Punch (S4) · Dempsey
  Roll ultimate (S5) · win/lose + final KO polish + portrait swap + balance (S6) · "(Heart Stopped)"
  decision (open item).

---

## STAGE 2 — NORMALS (DONE — `test:ippo-stage2` 21/0)

The sheet's **5 button-normals map 1:1** to engine slots (melee-only, all dmg ×0.60 GLOBAL_DAMAGE_SCALE).
Ippo does NOT flip (FLIP_H=False) → **every strike reaches RIGHT by construction** (no per-frame facing
audit needed, unlike the flipped EB rips). Frames chosen by HEAD-cluster detection — the figures
physically touch in these dense rows, so column-gap slicing merges them; head centers gave clean counts
(B=4, Fwd+B=5, Up+B=4, Down+B=6, Aerial B=4). windup→strike kept so the swing reads.

| Slot | Source (Down/Up etc.) | Sheet band → frames | Dmg raw→eff | Notes |
|---|---|---|---|---|
| **light** | B | `[547-599]` `[(4,36)(43,86)(91,134)(143,175)]` 4f | 40 → 24 | straight jab, extends right |
| **heavy** | Forward+B | `[634-686]` `[(4,40)(43,74)(77,135)(138,180)]` 4f | 78 → 47 | lunging hook — guard→wind→**RED ARC**→follow |
| **up** | Up+B | `[715-768]` `[(3,35)(38,80)(83,125)(132,164)]` 4f | 60 → 36 | rising uppercut **LAUNCHER** (own art, not a heavy reuse) |
| **air** | Aerial B | `[885-940]` `[(8,31)(43,74)(90,118)(129,152)]` 4f | 52 → 31 | airborne punch (red down-arc) |
| **down_air** | — | REUSE air sheet | 66 → 40 | no dedicated down-aerial art on sheet — honest reuse, FLAG |
| **crouchLight** | Down+B | `[802-853]` `[(46,86)(87,130)(131,178)]` 3f | 44 → 26 | low body-blow (auto-swapped from light while crouching by `_setCrouchVariant`) |

- **Wiring:** `characters.js` animationData (6 new entries) + `basic_attacks.crouchLight`. reslice_ippo.py
  Stage-2 block emits `ippo_{light,heavy,up,air,crouchlight}_uniform.png`.
- **Verification:** `test:ippo-stage2` **21/0** — every normal wired to a real `ippo_` sheet (no box),
  up ≠ heavy (own launcher art), down_air = air (intentional reuse), **melee-only proven (no beam/
  projectile action wired)**, light/heavy/up CONNECT damage on P2 (48/46/36) + render their sheet, air +
  down_air render airborne, crouch+light auto-swaps to crouchlight, guard holds. **In-engine shots:**
  all ground strikes reach RIGHT and connect on P2 (light jab / heavy hook / up uppercut [P2 −36] /
  crouchlight body-blow); air gate passed (screenshot missed — airborne capture timing).
- **Regression:** `ippo-stage1` 24/0, `gohan-stage2` 17/0, `up-attack-roster` 77/2 (pre-existing; ippo
  not in that test's fixed roster). Minor cosmetic: a few edge-slivers (adjacent-frame feet/gloves) in
  the dense heavy/crouchLight cells — small, at cell edges, do not affect the strike read.
- **Reserved for later stages:** heavy-Y specials + Gazelle Punch (S4); Dempsey Roll (S5).

---

## STAGE 3 — COMMAND CHAIN "Y-Jabs" (DONE — `test:ippo-stage3` 8/0)

**Fwd+Heavy 2-stage rekka**, cancel-on-HIT, mirrors `updateGohanCommandCombat`. Faithful to the sheet's
`/`-split two-segment "Y - Jabs" row (`[y964-1024]`): **segment 1 = rapid jab flurry** (red jab-trails) →
**segment 2 = committed straight-punch flurry** (big forward thrust). Wiring: `IPPO_CMD` +
`updateIppoCommandCombat` in `abilities.js`, dispatch + `ippoCmd` probe in `game.js`, `ippoJab1/ippoJab2`
animationData in `characters.js`.

- **ippoJab1** `[(48,128)(135,215)(218,300)]` 3f — rapid jab flurry opener (dmg 34 → 20, `rekkaNext`).
- **ippoJab2** `[(515,605)(605,695)(700,792)]` 3f — committed straight-punch flurry finisher (dmg 56 → 34,
  `knockbackX 9` hard pushback). **★NO launcher** — a boxer's jabs don't launch; Ippo's launcher is Up+B
  (S2) and his finishers are the Gazelle Punch / Dempsey Roll (S4/S5).

Chain: Fwd+Heavy opens ippoJab1 → re-tap Heavy during recovery-after-connect cancels into ippoJab2. Whiff/
block ends it. Neutral Heavy stays the normal `heavy` lunging hook. Cumulative **~53 dmg** (in-engine),
P2 pushed back but **stays grounded (no launch)**. A deliberately SHORT 2-hit chain (vs the 3-stage
launcher rekkas) — right for a jab pressure tool.

- **★ Frame picks:** figures physically touch in this dense row → HEAD-cluster detection gave frame
  centers; the `/` marker sits ~x460 (splits the two segments), and a full-width **white segment-bracket
  line at y1031** is excluded by ending the band at 1024 (feet ~1023). All strikes reach RIGHT (FLIP_H=False).
- **Verification:** `test:ippo-stage3` **8/0** — both stages wired to real `ippo_` sheets, chain opens
  jab1 → cancels into jab2, cumulative damage, **finisher does NOT launch** (P2 grounded — proves the
  boxer-jab design), neutral Heavy ≠ chain, no JS errors. In-engine chain shot connects on P2 (−20 shown).
  ★Harness runs `p2=goku` (P2-mirror default would auto-block; explicit P2 avoids it).
- **Regression:** `ippo-stage1` 24/0, `ippo-stage2` 21/0, `gohan-stage3` 10/0, `gotenks` 47/0 (shared
  game.js dispatch + probe edits clean).

---

## STAGE 4 — SPECIALS (DONE — `test:ippo-stage4` 24/0)

**★ MELEE-ONLY fixed-slot kit** — Ippo is a boxer, so EVERY special is a physical punch. **The ranged
gap is FLAGGED, not faked** (IPPO_ASSET_MAP.md item 2): NO beam/projectile is invented; the harness
proves no special spawns a projectile. Mirrors `executePiccoloSpecial` (routes on `_specialHeldDir` +
grounded). Each spends "Guts" energy; damage ×0.60 GLOBAL_DAMAGE_SCALE.

| Slot | Special | Source row | Frames | Dmg raw→eff | Cost | Notes |
|---|---|---|---|---|---|---|
| **N** (ground) | **Gazelle Punch** | `[1454-1523]` seg1+seg2 | 4f | 108 → 65 | 34 | ★signature leaping counter — springs up-and-forward (vy −9), blue swing-arc, **LAUNCHER** |
| **F** | Spinning Hook | `[1064-1120]` | 2f | 92 → 55 | 24 | white/red swirl, lunges in (vx +6), long reach |
| **U** | Heavy Uppercut | `[1131-1216]` | 2f | 84 → 50 | 24 | wide blue circular arc, **LAUNCHER** (anti-air) |
| **D** | Heavy Body-Blow | `[1233-1318]` | 2f | 90 → 54 | 22 | curved swing trail |
| **air** | Aerial Hook | `[1342-1400]` | 2f | 80 → 48 | 20 | swirl trail; tall active area (rangeY 84) so a low jump-in reaches |

- **Wiring:** `IPPO_SPECIALS` + `fireIppoSpecial` + `executeIppoSpecial` in `abilities.js`, `case "ippo"`
  in the special dispatch switch. Art in `characters.js` animationData (rendered by move name). reslice_ippo.py
  Stage-4 block emits `ippo_{gazelle,hook,upper,body,airhook}_uniform.png`. `_specialHeldDir` is set
  generically in game.js (no per-char edit needed).
- **Verification:** `test:ippo-stage4` **24/0** — every special wired to a real `ippo_` sheet, fires from
  its slot, renders + connects on P2 (Gazelle 64 / Hook 55 / Uppercut 50 / Body-Blow 54 / Aerial 48),
  **Gazelle leaps** (vy<0), **Uppercut LAUNCHES**, and **no special spawns any projectile (melee-only
  proven)**. In-engine shots confirm all five connect on Goku, right-facing. ★Aerial-hook connect is
  air-to-air (jumpP1 rockets Ippo far above a grounded dummy → harness snaps P2 up beside him for the
  active window). ★Harness runs `p2=goku` (P2-mirror default auto-blocks).
- **Regression:** `piccolo` 38/0 (shared dispatch switch — an initial 37/1 was a pre-existing flaky
  projectile-timing check, 38/0 on rerun), `ippo-stage1/2/3` 24/21/8.
- **Two launchers now** (Up+B normal in S2, Heavy Uppercut + Gazelle in S4) — flag for the Stage-6 balance
  pass alongside the melee-only-compensation question.

---

## STAGE 5 — ULTIMATE "Dempsey Roll" (DONE — `test:ippo-stage5` 13/0)

The signature finisher. **INLINE freeze-cinematic** on the live fighter (mirrors `executeGotenksUltimate`
/ Iron Man 2), **MELEE — no projectiles**. Faithful to the canon technique's structure & sequence
(weave FIRST, then flurry — the sheet's own arrow-marker confirms the transition):

- **Segment 1 — WEAVE** `[1594-1650]` `[(19,58)(60,103)(106,148)(150,190)]` 4f — rapid side-to-side
  bobbing (pose `ippoDempseyWeave`, loops during the ~24-frame windup).
- **Segment 2 — FLURRY** `[1590-1650]` `[(275,320)(325,417)(432,478)(483,525)]` 4f — continuous
  alternating hooks with red motion-arcs (pose `ippoDempseyFlurry`, re-latched across the beats).

- **Damage:** 5 guaranteed range-independent beats (50+50+50+50 flurry + 130 haymaker payoff =
  **330 raw → EXACTLY −198 EFF** ×0.60), foe frozen (`hitstop = cinematic−8`) through the barrage.
  Cost 100 meter.
- **Wiring:** `IPPO_ULT` + `applyIppoUltHit` + `executeIppoUltimate` in `abilities.js`, `case "ippo"`
  in the `triggerUltimate` switch. Pose art in `characters.js` animationData. reslice_ippo.py Stage-5
  block emits `ippo_dempsey_{weave,flurry}_uniform.png`. Label (y1555-1565) + white bracket (y1654)
  both excluded.
- **Verification:** `test:ippo-stage5` **13/0** — casts + spends 100 meter, **cast pose = weave FIRST**
  then swaps to the flurry sheet, **NO projectile spawns (melee-only proven)**, foe frozen (hitstop 68),
  guaranteed **−198 EFF from OUT of melee range** (sure-hit), data contract (pose sheets + ult name/cost).
  In-engine shots confirm the weave-bob → red-arc flurry with Goku frozen.
- **Regression:** `gotenks` 47/0, `vegito` 46/0 (shared ult switch clean), `ippo-stage1/2/3/4`
  24/21/8/24.

---

## STAGE 6 — PORTRAIT / WIN / LOSE + HARNESS + BALANCE (DONE — canonical `test:ippo` 34/0)

**★ CHARACTER FULLY COMPLETE (Stages 0–6).**

- **WIN** `[1798-1856]` `[(10,42)(49,73)(81,116)(120,155)]` 4f — REAL victory pose ending **gloves raised
  OVERHEAD** (on-sheet, no borrow).
- **LOSE** `[1896-1955]` 7f `[(11,43)(48,74)(78,110)(114,150)(154,190)(195,226)(232,287)]` — a REAL DEDICATED
  defeat sequence: dejected slumping stance (5f) → collapse (1f) → lying flat (1f). ★NOT a knockdown
  reuse (unlike goku/gohan/piccolo) — Ippo has its own lose art.
- **HURT / KNOCKDOWN / GETUP** — the "Hurt, Fall and Get Up" chain, already sliced in Stage 1 (flinch 2f /
  stumble→lying 4f / rising 4f).
- **PORTRAIT** = the Stage-1 idle-bust (pixel-consistent). The top-right painterly angry-shout FACE render
  is a DEFERRED optional upgrade (style-mismatch with the pixel sprites — Miles/Iron-Man precedent).
- **"(Heart Stopped)" → RESOLVED (repurposed as a LOW-HP STAGGER, 2026-08-24).** Owner chose "repurpose
  as a low-HP stagger, triggered below a health threshold, not tied to a hit/move." Wired via the engine's
  GENERIC `_lowHealthIdle` mechanism (same as Zaraki): the frames ship as `ippo_idlelow_uniform.png` +
  `animationData.idleLow`, and game.js swaps the neutral idle → idleLow **at/below 30% max HP**
  (`LOW_HEALTH_IDLE_FRAC = 0.30`; for HP 1160 that's ≤ 348 HP). ★**Stage-0's "pixel-identical to idle" was
  an OVER-READ** — a pixel-diff shows mean 31-60 + different frame widths: same guard-up pose FAMILY but a
  distinctly **lower/hunched/wearier stance** that reads as "on the ropes." Purely COSMETIC (no stat/hitbox
  change), threshold-gated, and LIVE (re-evaluated every frame — engages crossing below 30%, reverts on
  heal-back-above). **★THRESHOLD = 30%, chosen because:** (1) it's the roster's existing shared low-health
  threshold (Zaraki) → no bespoke constant, reuses a proven cosmetic system; (2) 30% is the "one combo from
  a KO" danger zone — low enough that the wearier guard reads as a genuine near-defeat tell (fitting
  "Heart Stopped"), high enough that it actually appears in real matches (not a sub-10% never-seen edge).
  Verified in-engine (HP 1000 → normal idle / HP 200 → stagger, side-by-side clip) + 4 canonical assertions.
- **Canonical harness** `harness/ippo.test.mjs` (`test:ippo` **34/0**) — sweeps S1 gate/stats + movement
  sheets, S2 normals connect (24/46/36), S3 Y-Jab chain, S4 4 specials dispatch+connect + melee-only,
  S5 Dempsey Roll ult 198 + weave→flurry + melee-only, S6 win/lose real art, a 30-action fallback-box
  sweep, no JS errors. **(38/0 after the low-HP stagger section — see the "(Heart Stopped)" resolution above.)**
- **BALANCE_AUDIT.md** — full entry appended: **FAIR — melee-only in-fighting boxer; the melee-only
  compensation question is answered NONE-needed** (the compensation is the boxer's DEFENSIVE mini-game —
  real guard/weave-dodge/whiff-punish — plus two signature techniques + the tight 100-Guts economy, NOT a
  ranged bolt-on; consistent with Gohan/Bardock). Watch-items: launcher density (3 launchers, but the
  strong two are Guts-costed), Gazelle 65 EFF, and the (not-yet-i-frame) weave-dodge layer.
- **Regression:** `test:ippo` 34/0, `ippo-stage1/2/3/4/5` 24/21/8/24/13, `gohan-stage3` 10/0,
  `gotenks` 47/0, `piccolo` 38/0, `vegito` 46/0, `miles-stage1` 21/0, `credits` 12/2 (2 PRE-EXISTING;
  ippo attributed to srchimuelo, not added to the debt).

## OPEN ITEMS — NONE. ✅ Character fully resolved.
The one pending decision ("(Heart Stopped)") is RESOLVED (low-HP stagger, above). Credits RESOLVED
(srchimuelo). No blockers remain.

## FOLLOW-UPS (optional polish — NOT open items / NOT blockers)
- Portrait upgrade to the angry-shout face render (style pass — the idle-bust ships and works).
- Dedicated down-aerial art (none on sheet — honest air reuse, flagged).
- A real i-frame dodge/parry evasion resource (the dodge is an animation state today; making it an
  i-frame resource is a NEW design lever that would need costing — an enhancement, not a gap).
- Skins; voice (blocked — no clips).
- Minor cosmetic edge-slivers in a few dense normal/special cells (adjacent-frame feet/gloves) — harmless.

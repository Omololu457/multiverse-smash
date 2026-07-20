# Goku Black / SSJ Rose — Asset Map & Design Doc

**Status:** DOCUMENTATION ONLY — no gameplay code wired this pass.
**Date:** 2026-07-20
**Scope:** Asset→role mapping, ambiguity resolution, and a locked-down design for a
**separate roster character** (own `rosterKey`, own full kit). Numbers marked **PROPOSED**
are recommendations with reasoning; everything under "CONFIRMED DESIGN" in the brief is
treated as final and is not re-litigated here.

All file:line references below were verified against the current tree and are provided so the
eventual wiring pass has exact precedents to copy.

---

## 0. TL;DR for the wiring pass

- New character, `rosterKey: "goku_black"`. **Not** a skin/variant of `goku`. His Kamehameha
  and Spirit Bomb are HIS OWN moves (own `executeGokuBlackSpecial`, own projectiles).
- Sprite character → must clear the **3-file gate**: `characters.js` entry (`hasSprites: true` +
  `animationData`), `skins.js` default-skin entry, `spritesheets.js` manifest entry.
- **5 normals.** Ki Slash occupies **heavy** and (uniquely) **costs energy** (PROPOSED 8).
- **4 specials:** Kamehameha (charge/release beam), Spirit Bomb (charge/release lob),
  Explosion (Rick Self-Destruct mirror — **art pending**), Sword Slash (Kurama-mirror sure-hit
  **with real caster windup vulnerability**).
- **SSJ Rose transform:** energy-max-gated activation, **continuous per-frame energy drain**,
  auto-revert the instant energy hits 0. See §5 — including an important **correction** to the
  brief's premise that "no character currently has a continuous-drain sustained state."

---

## 1. Character identity & registration

### 1.1 Roster key & separation
- `rosterKey: "goku_black"` — fully independent selectable character.
- Existing Goku (`characters.js:20–57`, `rosterKey:"goku"`) shares NOTHING with Goku Black at
  runtime. His specials live in `executeGokuSpecial` (`abilities.js:365–398`); Goku Black gets a
  parallel `executeGokuBlackSpecial`. Kamehameha/Spirit Bomb art, damage, and projectiles are his own.

### 1.2 The 3-file sprite gate (every sprite char needs all three)
Verified precedent = Sasuke / Rick.

1. **`characters.js`** — the character object with `hasSprites: true`, `spriteScale: <n>`, and an
   `animationData: { <action>: { frames, width, height, speed, anchorY, sheet, [actionScale], [loop], [lockLastFrame] } }` block.
   Example shape (Rick, `characters.js:940–1009`):
   ```js
   rick = {
     rosterKey: "rick", hasSprites: true, spriteScale: 1.85,
     animationData: {
       idle:  { frames: 17, width: 30, height: 78, speed: 6, anchorY: -15, sheet: "./rick_stand.png" },
       heavy: { frames: 5,  width: 61, height: 89, speed: 3, anchorY: -34, sheet: "./rick_kick.png" },
       selfDestruct: { frames: 6, width: 92, height: 92, speed: 4, anchorY: 0, loop:false, lockLastFrame:true, sheet:"./rick_speacial.png" }
     }
   }
   ```
2. **`skins.js`** — default skin entry pulling scale from the character (`skins.js:147–149`):
   ```js
   goku_black: [{ id:"default", name:"Default", unlockLevel:0,
     portrait: characters.gokuBlack?.portrait,
     spriteScale: characters.gokuBlack?.spriteScale, animationData: null }]
   ```
   ⚠️ **Gotcha (from prior chars):** `spriteScale` is effectively read from the **skins.js** entry,
   not only characters.js — set it in both.
3. **`spritesheets.js`** — manifest gate for the box→sprite flip (`spritesheets.js:99–108`):
   ```js
   goku_black: { actions: { idle: "./black_goku_idle.png" } }
   ```

Per-action oversize art is corrected with an `actionScale` field on that action's animationData
(Toji/Sasuke precedent), NOT by touching global `spriteScale`.

### 1.3 Proposed base stats (PROPOSED — mirror existing Goku's "clean all-rounder" profile)
| Field | Value | Reasoning |
|---|---|---|
| `maxHealth` | 1200 | Same class as Goku (`characters.js:25`). |
| `maxEnergy` | 200 | Same as Goku. Drives the transform threshold + Ki-Slash economy below. |
| attack / defense / speed | 90 / 86 / 90 | Balanced all-rounder; a hair faster than Goku, no gimmick. |
| passive regen | 0.08/frame | Requires adding `"goku_black"` to the Goku/Naruto branch of `regenEnergy` (`abilities.js:2737–2751`), else he defaults to base 0.06. **Flagged as a required 1-line edit at wire time.** |

---

## 2. Full asset inventory

### 2.1 BASE FORM (`black_goku_*`)
| File | Frames (approx) | Visual content (inspected) | Mapped role | Confidence |
|---|---|---|---|---|
| `black_goku_idle.png` | 8 (2×4) | **Two 4-frame idle variants concatenated** (see §3.1) | idle | high |
| `black_goku_run.png` | — | run cycle | run/walk | high |
| `black_goku_dash.png` | 2 | dash | dash | high |
| `black_goku_jump.png` | 6 | full jump arc (crouch→launch→tuck→apex) | jump (takeoff) | high |
| `black_goku_jump_2.png` | 5 | airborne/descent poses only | fall / air-hold (see §3.2) | med |
| `black_goku_block.png` | — | guard | block | high |
| `black_goku_hit.png` | — | hurt | hurt | high |
| `black_goku_get_up.png` | — | wakeup | getup | high |
| `black_goku_power_up.png` | — | charging aura | charge (P-hold) FX | high |
| `black_goku_base_attack.png` | 4 | subtle, near-idle short jab (minimal extension) | LIGHT (alt) / neutral poke — **see §3.3** | LOW |
| `black_goku_front_attack.png` | 6 | committed forward straight punch w/ step-in | **light** (primary) | med-high |
| `black_goku_bumb_attack.png` | 5 | lunging shoulder/body "bump" ram w/ dash blur | command/dash normal or alt-heavy | LOW |
| `black_goku_kick_attack.png` | 9 | spinning/rising kick, big sweep arcs | **up** (launcher) | med |
| `black_goku_air_attack.png` | 5 | airborne downward diagonal slash arc | **air / down_air** | high |
| `black_goku_up_air_ki_blast.png` | 5 | **effect-only** (no character): upward ki blast | up-air FX / air ki-blast effect | high (as FX, not a standalone normal) |
| `black_goku_ki_slash.png` | 9 | committed purple ki-blade melee slash | **heavy (COSTS ENERGY)** | high |
| `black_goku_kamehameha.png` | 11 | cupped-hand charge (hold) → thrust release | Kamehameha (char) | high |
| `black_goku_kamehameha_effect.png` | — | beam FX | Kamehameha (effect) | high |
| `black_goku_spirit_bomb.png` | 6 | arms raised → gather → overhead throw | Spirit Bomb (char) | high |
| `black_goku_spirit_bomb_effect.png` | — | orb/blast FX | Spirit Bomb (effect) | high |
| `black_goku_transformation_to_ssj_rose.png` | 8 | base→Rose transition (hair blackens→pink) | transform sequence FX | high |
| `black_goku_transparent.png` | — | large single ref art | portrait / reference | n/a |

### 2.2 SSJ ROSE FORM (`goku_black_ssj_rose_*`)
| File | Content (inspected where noted) | Mapped role | Confidence |
|---|---|---|---|
| `goku_black_ssj_rose_idle.png` / `_idle_2.png` | two idle variants | idle (Rose) | high |
| `goku_black_ssj_rose_run.png` / `_dash.png` | locomotion | run/dash (Rose) | high |
| `goku_black_ssj_rose_jump.pmg.png` | jump (note the `.pmg.` typo in name) | jump (Rose) | high |
| `goku_black_ssj_rose_gaurd.png` | guard (sic) | block (Rose) | high |
| `goku_black_ssj_rose_hit.png` / `_get_up.png` | hurt / wakeup | hurt/getup (Rose) | high |
| `goku_black_ssj_rose_charge.png` | charge aura | charge FX (Rose) | high |
| `goku_black_ssj_rose_ki_effects.png` | misc ki FX | shared FX | med |
| `goku_black_ssj_rose_foward_attack.png` | forward punch | light (Rose) | high |
| `goku_black_ssj_rose_foward_kick.png` | forward kick | heavy/kick normal (Rose) | med |
| `goku_black_ssj_rose_up_attack.png` | up attack | **up (Rose)** | high |
| `goku_black_ssj_rose_down_attack.png` | down attack | **down_air (Rose)** | high |
| `goku_black_ssj_rose_up_down_kick.png` | up/down kick | up or down_air alt (Rose) | med |
| `goku_black_ssj_rose_ki_slash.png` / `_foward_ki_slash.png` | Rose ki-blade slash | heavy / Ki Slash (Rose) | high |
| `goku_black_ssj_rose_kamehameha.png` / `_kamehameha_2.png` / `_kamehameha_effect.png` | Rose beam (2 char frames + FX) | Kamehameha (Rose) | high |
| `goku_black_ssj_rose_spirit_bomb.png` / `_spirit_bomb_effect.png` | Rose lob + FX | Spirit Bomb (Rose) | high |
| `goku_black_ssj_rose_sword_slahs_Special.png` | **13-frame combined char+FX**: aura-charge windup → energy sword draw → pink slash arcs (keep typo filename) | **Sword Slash Special** | high |
| `goku_black_ssj_rose_foward_special_ki_slash.png` | 6f: dash-in + big purple ki-blade sweep | Sword Slash (Rose alt) OR Ki-Slash special variant — **see Open Questions** | med |
| `goku_black_ssj_rose_foward_special_kick.png` | forward "special" kick | special kick variant — unassigned | LOW |
| `goku_black_ssj_rose_bomb_special.png` | **has "Unused!" baked into the art**: Rose charge → growing pink sphere → projectile | Spirit Bomb (Rose) candidate — **flagged unused, see Open Questions** | LOW |
| `goku_black_ssj_rose_electric_ki_push.png` / `_electric_ki_push_effect.png` | 4f ki-push/shove w/ electric aura + FX | **UNASSIGNED** (see §7) | — |
| `goku_black_ssj_rose_electric_slash.png` | 6f electric-aura charge → yellow crescent slash | **UNASSIGNED** (see §7) | — |
| `goku_black_ssj_rose_super_ki_slash.png` | 9f amped multi-crescent purple ki slashes | **UNASSIGNED** (see §7) | — |
| `goku_black_ssj_rose_transparent_hq.png` (+ ` copy 31`) | large ref art (duplicate pair) | portrait / reference | n/a |

---

## 3. Ambiguity resolutions (as requested — inspected, not guessed)

### 3.1 `black_goku_idle.png` two-variant split — CONFIRMED
The sheet is **8 frames = two distinct 4-frame idle variants concatenated** (left group vs right
group differ in shading/saturation — reads as two breathing-idle takes). **Recommendation:** wire
the **first 4 frames** as the canonical idle (`frames:4, sourceX:0`); keep the second 4 as an
optional alt-idle (`sourceX` offset). Do not feed all 8 into one loop or the idle will visibly hitch.

### 3.2 `jump.png` vs `jump_2.png` — complementary, NOT duplicates
- `black_goku_jump.png` (6f) = the **takeoff/full arc** (crouch→launch→tuck→apex).
- `black_goku_jump_2.png` (5f) = **airborne/descent-only** poses.
- **Recommendation:** `jump` action ← `jump.png`, `fall` action ← `jump_2.png` (the Sasuke
  precedent already splits jump/fall across one sheet via `sourceX`; here they're two files, cleaner).

### 3.3 `base_attack.png` vs `front_attack.png` — DIFFERENT moves, not a miscount
Content genuinely differs: `base_attack` is a **short, minimal, near-idle jab** (arms barely leave
the body across 4 frames); `front_attack` is a **committed forward straight with a step-in** (6f).
They are **not the same move miscounted.** Because `base_attack` reads so subtly it risks not
registering as an attack on screen, the recommendation is:
- **light ← `front_attack.png`** (clear, readable jab/straight).
- `base_attack.png` → alternate light / idle-poke / hold in reserve. Flag: may be unusable as a
  standalone normal without touch-up.

### 3.4 `kick_attack` / `air_attack` — launcher & aerial
- `kick_attack.png` (9f spinning/rising kick) → **up (launcher)** candidate — best rising read.
  Alternate: `bumb_attack.png` (lunging ram) if a horizontal launcher is preferred.
- `air_attack.png` (5f airborne downward slash) → **air**, and doubles as **down_air** (see gap below).

### 3.5 ⚠️ BASE-FORM up/down normal GAP — FLAGGED
The catalog has **no dedicated base-form `up_attack` or `down_attack` character sheet.** Only SSJ
Rose ships `goku_black_ssj_rose_up_attack.png` and `goku_black_ssj_rose_down_attack.png`.
**Consequences / options (decision needed at wire time):**
- **up (base):** improvise from `kick_attack.png` (recommended) — it reads as a rising kick.
- **down_air (base):** reuse `air_attack.png` (its downward arc suits down_air) — recommended — OR
  leave `down_air` incomplete until dedicated base art exists.
- Base form **cannot borrow the Rose up/down sheets** without a palette mismatch (pink-haired
  frames on a black-haired base fighter). Do not cross-wire them.
- **Net:** base form's up + down_air are the two soft spots; both are improvised, not native.

---

## 4. Normals (5 slots)

| Slot | Base sheet | Rose sheet | Energy cost | Damage (PROPOSED) | Notes |
|---|---|---|---|---|---|
| light | `front_attack` | `foward_attack` | 0 | 45 | Clean straight; free like every other char's normals. |
| **heavy** | **`ki_slash`** | `ki_slash`/`foward_ki_slash` | **8 (PROPOSED)** | 80 | **Ki Slash — the one normal that costs energy.** |
| up (launcher) | `kick_attack` | `up_attack` | 0 | 70 | Base = improvised (see §3.5). |
| air | `air_attack` | (Rose air TBD) | 0 | 60 | Airborne. |
| down_air | `air_attack` (reuse) / GAP | `down_attack` | 0 | 80 | Base slot is the gap (see §3.5). |

### 4.1 Ki Slash costs energy — cost reasoning (PROPOSED 8)
- Goku Black's identity twist = a normal that spends meter. It must stay **cheap relative to his
  specials** or it stops behaving like a normal: Kamehameha 30, Spirit Bomb 40, Sword Slash 40,
  Explosion ~120 (below). **8** is ~4% of the 200 pool — spammable as a poke but with a real,
  compounding tax.
- Interaction with SSJ Rose: while transformed the passive drain is already eating meter, so
  leaning on Ki Slash **accelerates de-transformation** — a natural, emergent risk/reward with no
  extra code. This is the reason to keep it small-but-nonzero rather than free.
- Gate the cost through the existing `spendEnergy(fighter, 8)` (`abilities.js:81–86`) at the point
  the heavy's active frames spawn; if `canSpendEnergy` fails, fall back to a whiff/no-hit (do NOT
  hard-block the animation — decide at wire time whether a broke Ki Slash still animates).

---

## 5. Transformation — SSJ Rose (the genuinely-new sustained state)

### 5.1 ⚠️ CORRECTION to the brief's premise (surfaced, not silently accepted)
The brief states "no character currently has a continuous-drain sustained state / this is new
engine capability." **That is not accurate as written** — the engine already has TWO working
precedents for exactly this shape:
- **Gojo "Infinity"** (`abilities.js:2659–2684`, hooked every frame from
  `updateFighterState`→`applyGojoPassiveSystems`, `game.js:2205`): drains **0.14 energy/frame**,
  and **auto-drops the instant energy can't cover the tick** (`if (energy >= drain) … else { energy=0; infinityActive=false }`). That is a continuous per-frame drain with auto-revert-at-zero.
- **`transformations.js`** already supports declarative per-frame drain: form fields
  `kiDrainPerSecond` + `revertOnEmpty`, drained/checked every frame in
  `updateTransformations` (`transformations.js:114–144`), dispatched via
  `updateTransformationState` (`game.js:2204`).

**What IS new** is combining them into a *transformation* (sprite/stat body-swap) that is
**purely energy-gated with no fixed timer at all** — Susanoo is a fixed 1200f timer
(`SUSANOO_DURATION_FRAMES`, `abilities.js:1666`); Absolute Defense is per-*block* not per-*frame*
(`SASUKE_ABSOLUTE_DEFENSE_COST=12`, `combat.js:312`); Infinity drains-per-frame but isn't a
form/body-swap. SSJ Rose = "body-swap form + per-frame drain + revert-only-on-empty, no timer."

### 5.2 Recommended implementation pattern (clean & reusable)
Reuse the **existing `transformations.js` declarative path** rather than a Gojo-style hardcoded
per-character block — it already does everything and is the reusable primitive the brief asks for:

```js
// characters.js — on gokuBlack
transformations: {
  ssjRose: {
    damageMultiplier: 1.25, speedMultiplier: 1.15, defenseMultiplier: 1.05,
    energyDrainPerFrame: 0.30,   // NEW field — see note; OR kiDrainPerSecond: 18
    revertOnEmpty: true,          // auto-revert the instant energy hits 0 (already supported)
    duration: 0                   // NO fixed timer — energy is the only clock
  }
},
transformationOrder: ["ssjRose"]
```

- `updateTransformations` (`transformations.js:114–144`) already: drains, clamps energy≥0, and
  force-reverts when `revertOnEmpty && energy<=0`. **The only engine gap** is that it currently
  drains via `kiDrainPerSecond * deltaTime/1000` (real-time ms). Given the game loop is
  **frame-rate-dependent with no dt cap** (documented pitfall — high-refresh runs 2–3× fast), a
  ms-based drain will drain 2–3× faster on a 144Hz display. **Recommendation:** add a
  frame-count drain path (`energyDrainPerFrame`) alongside `kiDrainPerSecond`, mirroring how
  Gojo Infinity uses a flat per-frame constant. This keeps SSJ Rose duration identical across
  refresh rates. Flagged as the one real engine change this feature needs.
- Body/sprite swap: assign `fighter._skinAnim = <Rose animationData>` on enter and `null` on
  revert — identical to Susanoo's `_skinAnim` swap (`abilities.js:1724`/`1741`). This flips the
  whole fighter to the `goku_black_ssj_rose_*` sheets (fuller normal set, Rose special variants).

### 5.3 Confirmed-design parameters (PROPOSED values + reasoning)
| Parameter | PROPOSED | Reasoning |
|---|---|---|
| **Activation threshold** | energy **≥ 180 (90% of 200)** | "at or near max." 90% leaves a small tolerance so a player charging up doesn't have to hit the ceiling to the exact frame. Gate via `canSpendEnergy`-style check; do NOT zero the meter on activation (it's drained continuously, not spent up-front). |
| **Activation input** | **Charge/transform button (P-tap)** via `triggerTransformation` (`game.js:1775`) | P-tap is already the universal transform lever (Gojo/Sasuke/`transformationOrder` chars all use it). P-**hold** still charges energy — which is exactly the "top up to stay transformed longer" affordance. |
| **Drain rate** | **0.30 energy/frame (~18/s @60fps)** | Net of the 0.08/frame passive regen → **~0.22/frame net → ~13–14s** of idle uptime from a 180 start; less if he throws energy moves. Sits above Gojo Infinity's 0.14/frame (Infinity is defensive/cheaper) and well above SSJ3's `kiDrainPerSecond:5` (≈0.083/frame) — appropriate for a full offensive power state. Tunable. |
| **Regen while transformed** | passive 0.08/frame **+ optional P-hold charge** | Staying in form longer = actively topping up (P-hold charge and/or not spending on Ki Slash/specials). Matches the confirmed "actively manage energy" design. |
| **Revert** | **instant at energy == 0** | `revertOnEmpty` already does this the same frame the drain can't be covered. Clears `_skinAnim`, restores base sheets/stats. |
| **Buffs** | +25% dmg / +15% speed / +5% def | Modest, all-rounder — a power spike, not a gimmick. Also unlocks the fuller Rose normal set (native up/down attacks) + Rose special art. |

⚠️ **Note on visuals:** if giant/aura scaling is ever added, respect the canvas-relative sizing
pattern (`sprite.js _canvasHeightFrac`) — but SSJ Rose is same-scale, so no special sizing needed.

---

## 6. Specials — the confirmed 4 (+ input map)

Recommended input layout (avoids all collisions; flagged as PROPOSED):

| Move | Input | Architecture reused | Sprite |
|---|---|---|---|
| Kamehameha | **SPECIAL + QCF (`["D","F"]`)** | charge/release beam projectile | `black_goku_kamehameha(+_effect)` / Rose pair |
| Spirit Bomb | **SPECIAL + QCB (`["D","B"]`)** | charge/release lobbed AOE | `black_goku_spirit_bomb(+_effect)` / Rose pair |
| Explosion | **neutral SPECIAL (no direction)** | Rick Self-Destruct (`executeRickUltimate`, `abilities.js:2450–2499`) | **ART PENDING** |
| Sword Slash | **ULTIMATE button** | Kurama Avatar sure-hit (`kurama.js`) + Sasuke-lightning windup risk | `goku_black_ssj_rose_sword_slahs_Special.png` |
| SSJ Rose transform | **CHARGE (P-tap)** | `transformations.js` per-frame drain (§5) | `black_goku_transformation_to_ssj_rose.png` |

**✅ INPUT LAYOUT FINALIZED (2026-07-20):** Explosion = neutral Special; Spirit Bomb = QCB
(`["D","B"]`); Sword Slash keeps the ULTIMATE button. Open Question #4 is resolved.

Motion strings follow the existing `BETA_SPECIAL_MOTIONS` map + `endsWithPattern`/
`getRelativeDirections` (`abilities.js:175–258`). Add a `goku_black` row:
`goku_black: { F: ["D","F"], B: ["D","B"] }` (F=Kamehameha · B=Spirit Bomb · neutral=Explosion).

> **Why this layout:** both Explosion (Rick) and Sword Slash (Kurama) reuse *ultimate-tier*
> architectures, but there is only one ULTIMATE button. Sword Slash is the dramatic cinematic
> sure-hit → it takes the ULTIMATE button. Explosion is literally "manual button press, no motion"
> → mapped to **neutral special** (special with no direction), the closest motionless special input.
> Spirit Bomb uses **QCB (`["D","B"]`)**, cleanly mirroring Kamehameha's QCF beam on the opposite arc.

### 6.1 Kamehameha (HIS OWN move) — charge/release beam
- **Input:** SPECIAL + QCF `["D","F"]`. (Same motion as base Goku's, but a wholly separate
  `executeGokuBlackSpecial` branch + own projectile — not shared code.)
- **Mechanic:** hold SPECIAL after the motion to charge (damage/speed scale with hold), release to
  fire. Precedent: `spawnProjectile(fighter,"kamehameha",{…})` (`abilities.js:369–380`) — clone as
  `"goku_black_kamehameha"`.
- **PROPOSED numbers:** cost **30**, damage **120 (uncharged) → ~180 (full charge)**, projectile
  beam, hitstun ~22, knockbackX ~8. Reasoning: mirrors Goku's tuning as a known-good baseline for a
  balanced beam, but is its own move/asset.

### 6.2 Spirit Bomb (HIS OWN move) — charge/release lob
- **Input:** SPECIAL + **QCB `["D","B"]`** (down→back). Mirrors the Kamehameha QCF beam on the
  opposite arc, keeping the two charge/release projectiles on symmetric, easy-to-recall motions.
- **Mechanic:** charge/release; slower, arcing/lobbed projectile with a **larger** hitbox and AOE
  on arrival — his big-commitment nuke.
- **PROPOSED numbers:** cost **40**, damage **140 → ~200 (full charge)**, slower travel, bigger `w/h`
  than Kamehameha. Reasoning: costs and hits harder than the beam to justify the slower, telegraphed
  delivery.

### 6.3 Explosion Special — Rick Self-Destruct mirror (**ART PENDING**)
- **Reuse exactly:** `executeRickUltimate` (`abilities.js:2450–2499`):
  - **Proximity gate:** `Math.hypot(tcx-rcx, tcy-rcy) <= RADIUS` — only hits if opponent is inside
    the radius, else clean whiff (Rick uses `RADIUS=220`).
  - **No self-harm:** only `target` is read/damaged; caster is never touched.
  - **No startup-vulnerability window:** instant resolve; the pose is purely visual
    (`_spriteCastTimer`), `attackCooldown` only prevents an accidental instant re-press. Confirmed
    accurate to the brief.
  - **Energy = the balance lever:** `spendEnergy(fighter, COST)`.
- **PROPOSED numbers:** cost **120** (60% of 200 — Rick spends 140/160≈88%; scaled to Goku Black's
  larger pool this is a comparable "near-ultimate tax"), damage **~150 direct/unscaled** (Rick 180),
  radius **~200**, hitstun ~42, blocked→20% chip. Reasoning: a defensive-panic / spacing-punish
  nuke whose only cost is meter, exactly like Rick.
- **THIS PASS:** reserve the **neutral-special** slot + document only. **Do NOT** borrow a
  placeholder sprite from elsewhere in the catalog — the dedicated art will be uploaded separately.

### 6.4 Sword Slash Special — Kurama sure-hit + Sasuke-style caster risk
- **Sprite:** `goku_black_ssj_rose_sword_slahs_Special.png` (13-frame combined char+FX; keep typo).
  Sequence read: aura-charge windup frames → energy-sword draw → committed pink slash arcs.
- **Reuse:** the guaranteed-connect intent of Kurama Avatar (`kurama.js`), **but** unlike Kurama
  (which freezes combat and is totally safe for the caster — `game.js:2510–2514`), Goku Black gets a
  **real, interruptible windup** modeled on Sasuke's lightning handseal
  (`abilities.js:1988–2064`): during startup he is rooted + hittable, and a hit that lands
  hitstun/stun/knockdown **aborts the cast** (the `_lightningPhase` abort check, `abilities.js:2039–2043`).
- **Design shape (per confirmed brief):**
  1. **Caster windup (VULNERABLE, interruptible):** ~24f — can be hit out of it.
  2. **Opponent reaction window:** ~18f — defender may block/dodge to mitigate.
  3. If not blocked/dodged → **guaranteed connect** + brief **paralysis/hitstun** beat.
- **PROPOSED numbers & reasoning:**
  | Param | Value | Reasoning |
  |---|---|---|
  | Energy cost | **40** | Strong special, not a full ultimate; between Kamehameha (30) and Explosion (120). |
  | Startup (caster-vulnerable) | **24f (~0.4s)** | Long enough to be a genuine, punishable commitment (Sasuke handseal is 30f); the 13-frame art's charge frames cover this. |
  | Opponent reaction/dodge window | **18f (~0.3s)** | Real but tight counterplay — reactable on prediction, not on pure reflex. |
  | Damage (clean) | **110**, blocked→**~22 (20%)** | Rewarding but below Kurama's 600 ultimate; it's a special. |
  | Paralysis/hitstun on connect | **30f (~0.5s)** | The "brief paralysis beat" — enough to confirm a follow-up, not a full stun-lock. |
  - Net identity: a **high-risk / high-reward sure-hit** — risky on both ends (interruptible windup
    for the caster, a counterplay window for the defender), which differentiates it from Kurama's
    unconditionally-safe cinematic.

---

## 7. OPEN QUESTIONS (decisions still needed — NOT dropped, NOT wired)

1. **Unassigned Rose-exclusive art (explicitly flagged in brief).** Real, mapped, but **NOT** part
   of the confirmed 4-special list. Awaiting a decision: 5th+ special? future addition? or cut?
   - `goku_black_ssj_rose_electric_ki_push.png` (+ `_electric_ki_push_effect.png`) — 4f electric ki
     shove/push. Natural fit as a *zoning pushback special* if a 5th slot ever opens.
   - `goku_black_ssj_rose_electric_slash.png` — 6f electric-aura crescent slash.
   - `goku_black_ssj_rose_super_ki_slash.png` — 9f amped multi-crescent ki slash (a "super" Ki Slash;
     could be the Rose-form upgrade of the Ki Slash heavy, OR a distinct special).
   → **Recommendation:** hold all three as **UNASSIGNED**. Most likely future use: `super_ki_slash`
     as a Rose-form Ki-Slash upgrade, and the two electric moves as a candidate 5th special. **No
     wiring until confirmed.**

2. **`goku_black_ssj_rose_bomb_special.png` is labeled "Unused!" in the art itself.** Content is a
   Rose charge → growing pink sphere → projectile. Is it (a) the intended Rose **Spirit Bomb**
   variant (making `spirit_bomb`+`spirit_bomb_effect` redundant), (b) a distinct bomb, or (c) truly
   scrap? Decision needed. Recommendation: treat `spirit_bomb(+_effect)` as canonical Spirit Bomb;
   leave `bomb_special` unassigned pending confirmation.

3. **`goku_black_ssj_rose_foward_special_ki_slash.png` vs the Sword Slash sheet.** Both are
   forward ki-blade "special" slashes. Is `foward_special_ki_slash` (a) the Rose-form animation of
   the **Sword Slash Special**, (b) a separate Ki-Slash-special, or (c) alt art for the same move?
   Recommendation: use the 13-frame `sword_slahs_Special` sheet as Sword Slash; hold
   `foward_special_ki_slash` (and `foward_special_kick`) as unassigned Rose alt/candidate art.

4. ~~**Input-map collisions / choices.**~~ **✅ RESOLVED (2026-07-20):** Explosion =
   **neutral Special** (NOT the ultimate button); Spirit Bomb = **QCB `["D","B"]`**; Sword Slash =
   **ULTIMATE button** (as originally proposed). See §6 input-map table.

5. **Base-form up/down normal gap (§3.5):** confirm the improvise-from-`kick_attack`/`air_attack`
   plan vs leaving those slots incomplete until dedicated base art exists.

6. **Ki Slash on empty meter:** does a broke Ki Slash still animate (whiff) or is the input
   swallowed? (Affects feel; needs a call at wire time.)

---

## 8. DEFERRED (explicitly NOT this pass)

- **All gameplay wiring** — characters.js entry, skins.js, spritesheets.js manifest, the
  `executeGokuBlackSpecial` branch, projectile registrations, the SSJ Rose transform hook, input-map
  rows. None written this pass.
- **The one required engine change** for frame-rate-independent drain (`energyDrainPerFrame` path in
  `transformations.js`, §5.2) — designed, not implemented.
- **The `regenEnergy` 1-line edit** to give `goku_black` the 0.08/frame Goku-family regen (§1.3).
- **Explosion Special art** — pending separate upload; slot reserved, no placeholder substituted.
- **Sprite frame-data measurement** — exact `frames/width/height/anchorY/speed`/`actionScale` per
  sheet must be measured at wire time (this doc records roles & counts, not pixel geometry).
- **Rose-form normal completeness** — Rose ships native up/down/kick sheets; base does not (§3.5).
- **Harness test suite** (`harness/goku_black.test.mjs`) — deferred to the wiring pass, following the
  Rick/Sasuke/Toji precedent (serve over HTTP, keys→document, HOLD frame-polled inputs).
- **Portrait/select-screen** (`black_goku_transparent.png` / `goku_black_ssj_rose_transparent_hq.png`
  as portrait sources) — deferred.
- **Duplicate cleanup:** `goku_black_ssj_rose_transparent_hq copy 31.png` is a byte-identical dup of
  `_transparent_hq.png` — delete at wire time.

---

## 9. Precedent index (file:line, for the wiring pass)

| Need | Reuse from | Location |
|---|---|---|
| Character entry + `animationData` shape | Sasuke / Rick | `characters.js:676–779` / `940–1009` |
| skins.js default entry | Rick | `skins.js:147–149` |
| spritesheets.js manifest | Rick | `spritesheets.js:103–108` |
| Special dispatch + projectile spawn | Goku | `abilities.js:365–398` |
| Motion input map + matcher | BETA map | `abilities.js:175–258` |
| Passive energy regen | `regenEnergy` | `abilities.js:2737–2751` |
| Per-frame drain + auto-revert | Gojo Infinity | `abilities.js:2659–2684` |
| Declarative form drain/revert | transformations | `transformations.js:114–144` |
| Per-frame fighter update hook (insertion point) | `updateFighterState` | `game.js:2202–2217` (transform entry `:2204`) |
| Body/sheet swap on transform | Susanoo `_skinAnim` | `abilities.js:1724`, `1741` |
| Proximity AOE / no-self-harm / instant | Rick Self-Destruct | `abilities.js:2450–2499` |
| Sure-hit design | Kurama Avatar | `kurama.js` (impact `:217–270`) |
| Interruptible caster windup | Sasuke lightning | `abilities.js:1988–2064` (abort `:2039–2043`) |
| Per-block (not per-frame) cost contrast | Absolute Defense | `combat.js:312–320` |
| Fixed-timer form contrast | Susanoo | `abilities.js:1666` |

---
*End of doc — mapping & design only. No gameplay code was modified this pass.*

# Uchiha Susanoo — Shared 3-Tier Reference Model

**Standing reference for EVERY Uchiha character with a Susanoo.** Build any future Uchiha
(Itachi, Shisui, …) against this model from the start instead of re-deriving it per character.
Same discipline as the Edo Tensei reanimation palette: prove one system, apply it consistently.

Established 2026-08-04 after unifying Madara + Sasuke, whose Susanoo tiers had drifted into
separate ad-hoc implementations.

---

## The model

| Tier | Name | What it is | Mechanic (canonical) |
|------|------|-----------|----------------------|
| **1** | Skeletal / Base Susanoo | Minimal partial form — ribcage + one extending arm | **Command-GRAB** — a real throw via the shared `resolveGrab` pipeline, NOT a strike/punch |
| **2** | Full-Body Armored Susanoo | Complete spectral armor | Sustained special / mode-tier form (buff + armored normals) |
| **3** | Perfect / Complete Susanoo | Giant full-avatar | Ultimate-tier (giant body or freeze-cinematic) |

### Why Tier 1 is a GRAB (the load-bearing invariant)
The skeletal Susanoo's signature is the ribcage **arm that reaches out and seizes** the opponent.
Mechanically that must be a genuine **command-grab**: it beats block, is escapable via the shared
tech window, and throws with a pop-up-and-drop — NOT a strike hitbox that merely draws an arm.
A strike-shaped-as-a-grab is the exact drift this model exists to prevent.

### Tier 1 is a STANDALONE special — NOT part of the Ultimate (invariant #2)
Tiers 1 and 3 are **two separate systems** that merely share the "Susanoo" theme. The Tier-1
skeletal grab is its own independent move, pullable from neutral any time a normal special is
usable, on its **own input** — it must NOT be a stage/step *inside* the tiered Ultimate, and using
it must have **no effect on Ultimate availability/state** (and never appear as a phase in the
Ultimate cinematic). Verified by `harness/uchiha_tier1_standalone.test.mjs` for both characters.

---

## Shared architecture (both characters route through this)

- **Grab state + throw:** `combat.resolveGrab(attacker, defender, context, range)` → `combat.updateGrab`
  (run every frame in `game.js`). Sets `isGrabbed`, applies the shared tech window, then the
  pop-up-and-drop throw. Extended reach is just a larger `range` argument — same precedent as
  Naruto's Chakra Arm Grab (`170`) and Minato's Reaper (`250`).
- **Tuned throw damage:** `updateGrab`'s throw is normally a flat `90`. A themed grab stamps
  `attacker._grabThrowDmg` (cleared right after the throw so it never leaks into the attacker's
  next generic grab) to deal its own amount. All damage passes through `GLOBAL_DAMAGE_SCALE` (0.60),
  so a tuned `120` lands as `72` on-screen.
- **Visual:** the extending arm is a `visualOnly` FX (projectile / `_spawnSusanooFx`) — the
  `resolveGrab` state does the actual catch, the art is just the reach.

---

## Per-character mapping

### Madara Uchiha  (`abilities.js` · `updateMadaraCommandCombat`)
| Tier | Input | Move | Notes |
|------|-------|------|-------|
| 1 | **Fwd + Heavy** | `fireMadaraSusanooGrab` → `resolveGrab` (reach 150, throw 120) | Extending-arm FX = `madara2_susanoo_grab_air_uniform.png`. **Replaces** the old `madaraSusanooPunch` strike (that move-def/art stay on disk, retired). |
| 2 | **Back + Heavy** (toggle) | `enterMadaraSusanoo` — armored form, ×1.35 dmg / ×1.2 def, ~6s | Every action renders the armored sword-warrior; light/heavy = armored slashes. |
| 3 | **Ultimate** (tap / hold) | TAP = Tengai Shinsei meteor freeze-cinematic (340); HOLD ≥180 energy = Complete Susanoo GIANT (×1.9 dmg, giant sword swings) | Release-gated tap/hold split. |

### Sasuke Uchiha  (`abilities.js` · `executeSasukeSpecial` + `SUSANOO_STAGE`)
Staged **Ultimate** (one button escalates the tiers), not spread across special+ult like Madara.
| Tier | Input | Move | Notes |
|------|-------|------|-------|
| **1 (standalone)** | **Grab button** (Down+Light) from neutral | `updateSasukeCommandCombat` → `fireSasukeSkeletalGrab` → `resolveGrab` (reach 210, throw 120) | The Tier-1 grab **as its own special**, independent of the Ultimate — mirrors Madara's Fwd+Heavy. Base-form skeletal ribcage-arm FX = `sasuke_susanoo_grab.png`. Generic grab is suppressed for Sasuke (`game.js` zeroes `ctrlState.grab`) so this owns the button. Active in base form (stage 0). |
| 2 | Ultimate press #1 → Lv1, press #2 → Lv2 (after Sharingan cinematic) | Staged Susanoo body: Lv1 grab-only; Lv2 full-body armor, Special = grab (throw 210) / sword (265) / arrow (230) | Sasuke's **Ultimate IS his staged Susanoo** (Lv1→Lv2). The in-Susanoo grab uses the same `resolveGrab` pipeline. Note: the Lv1/Lv2 stages are the armor/escalation tier of the model; the Tier-1 *grab* now also stands alone above. |
| 3 | — | **NONE** | See content gap below. |

> Sasuke's Tier-1 grab was originally reachable ONLY as a step inside the staged Ultimate. It is now
> **decoupled** into a standalone grab-button special (2026-08-04), so entering the Ultimate is no
> longer required to use it and the two systems don't interfere.

---

## Content gap (needs supplementary art — NOT to be faked)

- **Sasuke Tier 3 (Perfect/giant Susanoo):** no source art exists on disk (no
  `sasuke_susanoo_lvl_3*` / `_perfect*` / `_complete*` sheet). `SUSANOO_STAGE` stops at `{1,2}`.
  Sasuke is a **2-tier** Susanoo until a giant/Perfect sprite sheet is supplied. Do not
  scale-up Lv2 as a stand-in. When art arrives, wire it as a third stage mirroring Madara's
  Complete Susanoo giant (canvas-height frac + camera snap + giant-reach normals).

---

## Verification

- `npm run test:madara` — 44/0. Test #6 asserts Tier-1 fires the **real grab** (`isGrabbed`
  state inside the grab window) + tuned throw damage.
- `npm run test:susanoo` — 26/0. TEST 1b asserts Sasuke's Lv1 special is the **real grab**
  (`isGrabbed`) + tuned throw.
- `node harness/uchiha_susanoo_tiers_shots.mjs` — 6/0. Captures all firing demonstrations:
  `uchiha_{madara,sasuke}_t{1,2,3}_*.png` under `harness/shots/` (Sasuke T3 = documented gap, no shot).
- `node harness/uchiha_tier1_standalone.test.mjs` — 9/0. Proves **Tier-1 grab is standalone &
  independent of the Ultimate** on both: grab fires with no ultimate input, doesn't start/consume
  the ultimate, and never appears as a cinematic phase; the ultimate fires separately afterward.

Harness snapshot exposes `isGrabbed` / `grabTimer` (`game.js`) so grab-vs-strike is testable.

---

## Building the next Uchiha
1. **Tier 1 = a STANDALONE grab.** Route it through `resolveGrab` with an extended `range` and stamp
   `_grabThrowDmg`. Never a strike. Its own input, pullable from neutral, with NO tie to the Ultimate.
   Use the character's own extending-arm sprite as `visualOnly` FX.
2. **Tier 2 = armored form.** A sustained `_skinAnim` swap + dmg/def multipliers; normals render
   as armored attacks.
3. **Tier 3 = giant Ultimate.** Only if giant/Perfect source art exists — otherwise ship 2 tiers
   and log the content gap here rather than faking it.

# Green Arrow — PASS 2 Audit (before any change)

Undo point: `feat/green-arrow` tip **9b925e32** (see PASS2_START.txt). The branch is built on
`e67ba2a8`; `main` has since advanced to `5f89cc8d` (concurrent Zoro + other work). The **worktree**
(= current main + my pass-1 GA code in abilities/characters/game/combat/ui/spritesheets + Zoro) is what
actually boots and what the player sees — it render-checks **PASS, 0 JS errors**. The stale branch does
not boot standalone against the newer shared modules, so all pass-2 work is developed/tested against the
live worktree and committed as clean GA deltas onto feat/green-arrow (private-index from branch-tip copies).

## A. ARROWS — do they fire? **YES, mechanically.** (reproduced live, keyboard input)
Boot Green Arrow, inject a real **qcf+Light** (`s → d → j`): a `gaPlainArrow` spawns
(`x≈1471, vx=20, dmg=45, sheet green_arrow_plainarrow.png`). A real **qcf+Heavy** (`s → d → k`) spawns a
`gaFireArrow` (`dmg=60, sheet green_arrow_firearrow_uniform.png, 5 frames`). So:
1. **Inputs ARE bound** — `updateGreenArrowCommandCombat` (abilities.js) hooks the command-normal
   interception; qcf/qcb/↓↓ + Light/Heavy/Up map to plain/anti-air/fire/ice/EMP/explosive, air-qcf+Heavy = trick.
2. **Spawn is correct** — right position (bow height), velocity, facing, hitbox, sheet. Fire carries its burn `dot`.
3. **Sprites load + draw** — ui.js `drawProjectiles` has a sprite hook (`_projImg(p.sheet)`) that draws the
   strip flipped to travel direction. All arrow sheets exist and are non-empty.
4. **Tech cost does NOT silently block** — plain shot is free; fire spends 15 and still fired.

**So why "no arrows in play"?** Two real problems, not a hard break:
- **The plain arrow sprite is tiny** — `green_arrow_plainarrow.png` is **15×17** (84 opaque px) drawn at
  `spriteScale 1` → a ~15 px dot moving at vx 20. Easy to miss. (Fire/ice are 205×35 strips, more visible.)
- **The input is finicky/undiscoverable** — the engine has **no native quarter-circle+attack-button path**;
  arrows ride the command-normal interception, so in live play the ↓↘→ then attack-button timing is hard to
  land, and there is no on-screen hint of what's selected. **Fix:** scale the plain arrow up, and add the
  **Quiver** (Phase 3) so the selected special arrow fires on one accessible, discoverable button.
- One global gotcha: `drawProjectiles` early-returns if `juiceSettings.hitEffectsOn()` is false — if a player
  turned hit-effects off, NO projectile (anyone's) renders. Default is on; noted, not GA-specific.

## B. DRONE FACING — **confirmed backwards.** Root cause: native-facing assumption.
`drones.js drawDrones` flips with `flip = !profile.frontFacing && d.facing === -1`, which **assumes every
non-front drone sprite is drawn facing RIGHT**. The actual sprites:

| Drone | Native facing (from sprite) | frontFacing (pass-1) | Result |
|---|---|---|---|
| Overwatch (recon saucer) | **front** (symmetric, horizontal ring) | true | ok (never flips) |
| Aegis (shield box) | **front** (symmetric) | true | ok |
| Skyhook (heli-crane) | **front** (symmetric rotor+hook) | true | ok |
| Kestrel (gunship) | **LEFT** (orange cockpit/nose on the left) | false | **backwards** |
| Bulwark (sentry turret) | **LEFT** (gun barrel points left) | false | **backwards** |
| Payload (bomber) | **LEFT** (nose left — judgment call) | false | **backwards** |

Because the three side-facing sprites are native-**left** but the flip code assumes native-right, they draw
reversed at BOTH facings: facing-right → no flip → shows left-native (wrong); facing-left → flip → shows
right (wrong). Also `d.facing` is derived from velocity/owner only, not from the target when firing.
**Phase 1 fix:** add `nativeFacing` to every profile; `flip = (desiredFacing !== nativeFacing)`, `front`
never flips; `desiredFacing` comes from sim state (velocity when travelling, target when firing/guarding),
stored per-drone in GAME_STATE; Kestrel BACK = thrust-backward-while-still-facing-target (no flip).

## C. What is already in place (from pass 1)
- All **6 drones** spawn and update: Overwatch (recon/tag), Bulwark (planted turret + micro-missiles),
  Aegis (guard + projectile absorb), Kestrel (strafe + FIRE1/FIRE2), Skyhook (hook foe / self-escape),
  Payload (super-only bomber). Generic `drones.js` module (profiles + behaviour registry + `activeDrones`
  in GAME_STATE), deterministic via flight.js `hashRandom`.
- **Tech meter** ("Tech", +3/s, +4/arrow, +2/drone, capped +12/s) and **HUD drone pips** (greyed + cooldown
  arc) work; GA-logo badge on the bar.
- **Super** ARROWSTORM (drone volley + Payload bomber + closing explosive volley), recall, Emergency
  Extraction (↑+Special reversal), somersault, Ice-Hook / Ignition / Aegis-charge / Bulwark-salvo synergies.
- Single drone mode only (no Protector/Strike split yet). Arrows exist but are tiny/finicky (see A).
- Drone render scale ≈ 1.9–2.2; no `nativeFacing` field yet (pass-2 adds it).

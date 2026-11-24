# MSV1-MEGAZORD — Phase 0 audit (2026-11-24, start 26568a4fe)

## Sheet
`assets/incoming/megazord/thunder_megazord.png` — 985×1767 RGB, copied from the owner's Downloads
(`new/new power/obj_14005_1787367694.png`; Thunder Megazord, MMPR: The Fighting Edition (SNES), ripped by Grim).
Background = ONE exact colour (41,81,66); no near-shades exist (0 pixels within ΔRGB 40), so the key is exact (tolerance 0).

## The MMPR character
- id **`mmpr_rangers`** "Mighty Morphin Rangers" (mmprSquad.js on squadCore.js — one fighter, Ben-style dial ↓↓ then
  J Red (`red_ranger_mmpr`) · K Black (`mmpr_black`) · L Pink (`mmpr_pink`) · O Green (`green_ranger`) · P White (`mmpr_white`)).
  Live `f.rosterKey` = the active form id; health 1320, meter (`f.energy`, 100 = full) shared. State on `f._squad` (replay / LAN snapshot).
- Existing ultimates: **U** = the active Ranger's OWN ultimate (all cost 100): Red "Power Sword: Overhead Strike", Black "Falcon
  Formation", Pink "Thunderstring — Heaven's Final Arrow" (calls the Genesis-art Thunder Megazord as a summon), Green "Ranger Zord
  Assault", White "White Light — Ninja Grand Formation". **W + U** = the squad TEAM ULTIMATE "Five-Point Star" (squadUlt.js).
  Nothing is on U + L → nothing moves; the Megazord takes U + L.
- **U alone** = that Ranger's ultimate (full meter). **L alone** = the Ranger's Special (directional specials).
- Call / pose frames per Ranger (for the cinematic): Red `morphFlash`, Black `bCall`, Pink `pCall`, Green `gCall`, White `wCall`.
- Skins: Start-as ×5 + 6 squad themes (mmprSquadSkins.js hook keyed by form). A form with no themed art falls back to its own
  sheets → the Megazord keeps its original colours under every team skin with no extra work.

## Input — U + L
- The squad dial already reads the REAL raw controls (`readRawControlsUnmasked` → in replay / LAN the recorded input frame) at the
  top of `updateMovementInput`, before any kit, and swallows presses with `f._squadEat` (input.js mask). The chord rides there:
  U and L press edges within **3 frames** of each other with the other still held. Same-frame presses are swallowed before
  anything fires. If one landed 1–3 frames earlier and already started its move (the ult or the special), that move is cancelled
  in its startup (the Ranger kit's own clear, as on a swap) and the meter it took is restored — so **U alone and L alone are
  unchanged** (no added delay).
- P2 keyboard: **5 + 4**. Gamepad (PAD_LAYOUT): **R2 + R1** (Ultimate + Special).

## Frameworks used
- Cinematic: `cineRegistry.js registerFreezeCine` (game.js freezes combat / physics / input and calls update(ctx) with camera /
  sound) + `registerCineScreen` for screen-space captions / cut-in / HUD.
- Moves: the engine's `startMove` (combat.js; handed in through the squad world, no import cycle) → combo scaling, block,
  hitstun, Gojo's Infinity all apply as for any hit. Damage choke-point `applyScaledDamage` → armor hook. Super armor: the
  combat.js armored flags (boss / cast / Superman / Kevin) — the Megazord joins them. Grabs: `tryGrab` gate (+ a
  release for any command grab).
- Camera: frames both fighters' hurtboxes — the Megazord's taller hurtbox makes it zoom out smoothly and back (no camera code).
- Sprite manifest / roster-integrity: roster_integrity checks the `characters` export only; the Megazord is a squad add-on form
  (registered on the squad, NOT in `characters`), so it is untouched.

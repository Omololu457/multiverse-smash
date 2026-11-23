# MSV1-INVINCIBLE — Phase 0: audit and reuse

Start commit `0beadf134` (docs/msv1/invincible/START_COMMIT.txt). The sheet is `assets/incoming/invincible/invincible.png`
(1006 × 883, the JustOruma "Invincible" SWL+ sheet, supplied by the owner as
`invencible_swl_2v_sprite_sheet__by_sayangoku2_dholu2v.png`).

## Does an Invincible / Mark Grayson already exist? — NO

`characters.js` has no Invincible / Mark Grayson fighter (no key, no art, no data stub; the only "Grayson" is Robin = Dick
Grayson, DC). The Invincible universe holds the old **Omni-Man** (`omniman`) only — `thragg` and the old `omniMan` data stub
were pruned long ago. So Mark is added as a **new fighter `invincible`**, universe `invincible`, next to Omni-Man.
`OLD_VERSION.md` is therefore not needed (nothing is replaced); no replay references an old Invincible id.

The six COSTUME SAMPLES along the bottom of the sheet (looked at, x6): (1) the classic yellow-and-blue suit, masked;
(2) the blue-and-black suit, masked; (3) the classic suit with the mask OFF; (4) the blue-and-black suit, mask off;
(5) a small lilac-skinned kid in a red-and-yellow costume (Oliver); (6) a white-and-red caped Viltrumite (Omni-Man).
The game has **no existing alternate art** matching any of them (no Mark at all), so there is nothing to reuse or complete;
the strip is a skin reference only. The two Mark-specific suits feed the skins: the mask-off look = MASKLESS MARK (6), and
the white/red Viltrumite look informs the imperial-white family (1, 2, 10). The 20 premade skins (Phase 5) are recolours of
Mark's own pixels.

## Omni-Man (the father) — what exists to match

* old `omniman` (canFly flight, Smart Atoms meter, `omnimanBodySlamCinematic.js`, `omnimanVoice.js`, art `omni_man_*.png`):
  untouched, frame-data diff zero.
* `omniman_viltrum` — being built right now by the parallel MSV1-OMNIMAN session (phase 0 committed `0beadf134`, the rest is
  uncommitted in that session). Its flight design (57.2 px/f momentum) is on HEAD and is the reference for Mark's top speed
  (FLIGHT_REFERENCE.md). Its **skins (Viltrumite insignia, Alien X palette, Winning Valkyrie palette) do not exist on HEAD
  yet**, so Mark's skin tool defines those three shared pieces itself in one small table
  (`tools/invincibleskins/shared_viltrum.json`) written so the Omni-Man skin tool can read the same file — father and son
  then share one insignia, one Alien X palette, one Valkyrie palette.
* THINK! line: the brief asks Omni-Man's THINK! to read "Think, Mark! THINK!" against Mark. That code lives in the
  uncommitted `omniman_viltrum` build; this build exposes `isMarkGrayson(f)` (invincibleData.js) and the docs say where the
  Omni-Man session should call it. If `omniman_viltrum` is on HEAD by the time this build ends, the line is wired directly.

## Standard ultimate input and cost

Ultimate button (keyboard U / 5, pad R2) at **100 energy**, then the universal 20 s ultimate cooldown
(`abilities.js ULTIMATE_COOLDOWN_FRAMES = 1200`). Mark's meter = `maxEnergy 200` (two bars — the most common size after
100 on the roster): NO HOLDING BACK (Super) = 1 bar = 100, TERMINAL VELOCITY (Ultimate) = 100 + the 20 s cooldown.

## Roster numbers

* Selectable roster at HEAD (characters with sprite art + animationData, the select-grid gate): **118 fighters**,
  **median max health 1150**, lowest 950 (Ben 10, Ghostface). Invincible = 0.65 × 1150 = **748 HP** → the lowest health on
  the roster by 202 HP (Phase 2).
* Fastest ground runner: **Ryomen Sukuna (Shinjuku) 14.66 px/f** (FLIGHT_REFERENCE.md) → Invincible 16.13 px/f.

## Systems reused (not rebuilt)

| System | Where | Used for |
|---|---|---|
| flight.js | `FLIGHT_PROFILES`, `stepFlight` (per-axis accel / drag / reverseBrake), `flightToggleInput`, `tickFlightDriver`, `resetFlight`, physics.js flight branch | his flight = one new profile `invincible`; the agile feel comes from the numbers (no logic change) |
| Dseyl's sim-clock Charge tap | `dseylFlight.js` pattern | takeoff / come-down on Charge TAP, deterministic for replay / LAN |
| Gojo / Sukuna Shinjuku architecture | command layer (`invincible.js`) + sim state on `f._inv` (`invincibleState.js`) + render (`invincibleFx.js`) + idempotent hooks (`tools/invincible/apply_hooks.py`) | everything |
| combat.js `startMove` frameExact path, `getComboScale` | | every move |
| `applyScaledDamage` (the damage choke-point, `W.damage`) | | every scripted hit, so Gojo's Infinity (gsDamageMods) and every other damage-level defence apply; CAN'T STAY DOWN's 1-HP floor sits on the same line |
| wall splat / bounce | combat.js WALL_SPLAT (34 hitstun, 24 f pinned, 0.35 bounce, `_wallBounceShake`) | Invincible Punch uses the same fields and numbers |
| knockback weight hooks | combat.js `cyborgKnockback`-style defender weight line | his light weight (received knockback ×1.3) |
| camera shake / hitstop | `_wallBounceShake`, `f.hitstop`, the Shinjuku fighters' capped shake cue | impacts, booms, Terminal Velocity |
| text bubbles | Sukuna / Gojo Shinjuku bubble renderer pattern | "Not yet.", "Still standing.", "Dad. Stop." |
| cinematic camera / ultimate pattern | Shinjuku ultimates (sim phases on `f._*`, render reads them) | Terminal Velocity (takeoff → aim → impact → whiff) |
| blood system + `tools/bloodmap` | `data/bloodmaps/invincible.json` | he bleeds red (Phase 4) |
| Edo Tensei generator | `tools/edoskin` (eligibility HUMAN) | Edo skin for him (Phase 4) |
| skin system | skins.js cosmetic `animationData` swap, the Sukuna / Gojo Shinjuku premade-skin tables, sim-clock glitter phases | 20 premade skins, `tools/invincibleskins/` |
| Homelander / Superman flight SFX | `homelander_sfx_map.js` pools `FLIGHT_TAKEOFF`, `SUPERSONIC` via `sound.playSfxFile` | takeoff + sonic boom, pitched UP (lighter / faster than Omni-Man) |
| WebAudio synth | the Shinjuku Fx `synth()` pattern | barrage taps, the Invincible Punch crack, Terminal Velocity whistle + impact |
| SPD Red teleport convention | double-tap ← / → (rangers.js blink; "the teleport button + direction") | ZIP = double-tap in the zip direction |

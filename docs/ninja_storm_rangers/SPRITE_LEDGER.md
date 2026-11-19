# Ninja Storm Rangers — Sprite Ledger (both stances, one ledger)

Sources (copied verbatim, never edited):

| Stance | Source file | SHA-256 (first 12) | Frames found |
|---|---|---|---|
| Red / Shane | `assets/incoming/ninja_storm/red.png` (from `Red Ranger.png`) | `4ec89543a884` | 338 |
| Yellow / Dustin | `assets/incoming/ninja_storm/yellow.png` (from `Yellow Ranger.png`) | `0afafaf92284` | 338 |

Credit: **Ninja Storm Red/Yellow Ranger from "Power Rangers Super Legends" (DS), ripped by Grim, spritedatabase.net**

Pipeline: `tools/ninja_storm_build/segment.py` (connected components on the flat background, one id per frame `R<row>F<n>`;
the growing cloud row is split by `CLOUD_SPLITS` into `CLOUD0..6`) → `tools/ninja_storm_build/extract.py` (bottom-centre
anchored cells, one strip per animation) → `assets/ninja_storm/{red,yellow}/*.png` + `ninjaStormSprites.js`.
Per-frame boxes: `frames_red.json`, `frames_yellow.json`. Contact sheets with the ids printed on every frame:
`contact_sheet_red.png`, `contact_sheet_yellow.png`.

**The two sheets have the same layout.** Every row holds the same frame count at the same place, so ONE id → animation
mapping drives both stances. Only the palette differs: Red for Shane, Yellow for Dustin.

Rows per sheet: R0:7 R1:12 R2:9 R3:16 R4:13 R5:13 R6:10 R7:2 R8:23 R9:13 R10:15 R11:20 R12:11 R13:12 R14:12 R15:15 R16:12
R17:7 R18:8 R19:6 R20:12 R21:15 R22:13 R23:8 R24:12 R25:6 R26:11 R27:18, + CLOUD0–6 = **338**.
Usage: **333 used**, **3 excluded** (not character art), **2 unused** (R19F4, R19F5: the extra frames at the end of an air-slash follow-through).

## The brief's table vs the real sheet

| Brief said | Real sheet | Used as |
|---|---|---|
| Idle rows → idle, idle_alt | R0 (7) | `idle` R0F0–3, `idle_alt` R0F4–6 |
| Walk/run row → walk, run | R1 (12): 8 run + 4 walk | `run` R1F0–7, `walk` / `walk_back` R1F8–11 |
| Streak-blur row → Vanish trail FX | R2F0–4 streaks, R2F5–8 specks | `fxStreak` (render-only Vanish trail), `fxSpeck` |
| Punch/kick combo rows → light, heavy, low, crouch/block | R3 (16) punch-kick string; R4 (13) heavy + guard poses; R12 (11) crouch + low kick | `light` R3F0–3, `nStraight` R3F4–9, `heavy` R3F10–15, `heavyQuake` R4F0–5, `guard` R4F7–8, `guard_hit` R4F6, `crouch_guard` R4F11–12, `crouch` R12F0/1/3, `nLow` R12F4–10 |
| Jump + landing-ring rows → jump_rise, jump_fall, landing dust | R8 (23): rise, fall, landing ring, dust | `jump` R8F0–2, `fall` R8F3–6, `land` R8F19–22, `fxLandRing` R8F7/8/10/12/15, `fxDust` + specks |
| Aerial spin-kick + dive/roll rows → air_attack, knockdown | R9 (13) spin + dive; R10 (15) air kick + roll | `airSpin` R9F0–8, `down_air` R9F9–12, `air` R10F0–5, `airRoll` R10F6–14 |
| Triangle shuriken icons + dash-kick pose + hit-spark → Shuriken Throw, launcher, hit_react | **No triangle shuriken icons exist on either sheet.** R5 (13) is the throw pose + rising kick; R21 holds a small 2-frame spinning star + spark burst | `nShuriken` R5F0–4 (body), `fxStar` R21F0–1 (the thrown star, the closest real art), `up` (Rising Kick launcher) R5F5–12, `fxSpark` R21F8–14 + R11F17 |
| Sword-slash rows → Crescent Blade melee | R14 (12) three-cut sword combo; R15F0–9 the same with a lightning trail; R16, R17 spin / low slashes | `nBlade` R14F0–11, `nBladeMode` R15F0–9 (Mode-on version), `nSpinSlash` R16F0–6, `nRise` R16F7–11, `nLowSlash` R17 |
| Standalone crescent-trail frames → Crescent Wave projectile | **No standalone, body-less crescent exists.** The trail only shows up attached to the slash body | `fxCrescent` is a **derived crop** of R15F3's white / gold trail pixels with the body removed (no new art); throw pose `nWave` R15F10–14, air `nWaveAir` R18F3–7 |
| Growing lightning-cloud row → timed Mode | The cloud row: 7 growing cloud / lightning frames, wider than the grid | `nMode` CLOUD0–6 (big cell). Red = Lightning Mode, Yellow = Quake Mode (same art, Dustin's palette) |
| Gun-aim + reticle/beam rows → Blaster Lock-On | R20 (12) aim poses (straight, up, low, air); R21F2–7 muzzle + beam segments | `nLock` R20F0–1, `nLockUp` R20F2–5, `nLockLow` R20F6–9, `nLockAir` R20F10–11, `fxBeam` R21F2–5, `fxBeamD` R21F6–7. Yellow = Lion Hammer reticle recoloured as a ground-slam telegraph (render tint, no new art) |
| Giant-fist-burst row + debris rows → Ultimate | R23 (8) giant fist burst; R24 (12) debris | `nUltBurst` R23F0–4/6/7, `nUltDebris` R24F1/3/5–7, `fxChunk` R23F5 + R24F0/2/4/8–11 |
| Remaining idle/walk-variant row → Shadow Clone draw source | R22 (13) and R6 (10) hold extra stand / ready poses | `idleStand` (R22F0/1/4–6, R6F0/1/8/9, …) is the clone's resting loop. While it echoes, the clone plays the **active stance's** real move strip (cool tint, 0.6 alpha). No new art |
| Knockdown/get-up rows → hit_react, knockdown, win, lose | R26 (11) hurt → knockdown; R27 (18) get-up, wake, roll; R25 (6) intro / victory; R22F2–3 | `hurt` R26F0–1, `hurt_heavy` R26F1–2, `knockdown` R26F2–10, `getup` R27F0–8, `nWake` R27F9–12, `intro` R25F0–3, `win` R25F3–5, `taunt` R25F3–4, `lose` R22F2–3 |
| (not in the table) | R13 (12) smoke-poof teleport | `vanishStart` R13F0–1, `nSwap` (Kawarimi) R13F2–8, `vanishEnd` R13F9–11 |
| (not in the table) | R6F2–7 dash + clone-cast hand sign | `dash` R6F2 + R4F10, `nClone` R6F3–7 |
| (not in the table) | R11 (20) rush + slide | `nRush` R11F1–5, `fxSlide` R11F6–15 (ultimate arrival skid), `hurt_air` R11F18–19 |
| (not in the table) | R22F7–12 dash thrust | `nDashThrust` |
| (not in the table) | R27F13–17 back roll | `nBackstep` (the closest non-attack pose, Phase 6) |
| (not in the table) | R3F7, R3F8–9 | `grab`, `throw` |

### Excluded (not character art)

| Id | Why |
|---|---|
| R7F0 | Tutorial direction arrow ↑ (UI marker) |
| R7F1 | Tutorial direction arrow ↗ (UI marker) |
| R11F0 | Stray 4-px fragment (sheet noise) |

### Missing animations (nothing was invented)

- **Triangle shuriken icons**: not on either sheet. The thrown shuriken uses the R21F0–1 spinning star.
- **Body-less crescent projectile**: not on the sheet. It is a crop of R15F3's own trail pixels.
- **A dedicated clone row**: none. The clone reuses whichever stance is active (stand poses + real move strips, tinted).
- **A dedicated backstep**: none. It uses R27F13–17, the back roll from the get-up row.
- **A distinct lose pose**: none. It uses R22F2–3 (two R22 pose frames).
- **Separate Yellow-only art** (Lion Hammer, Lion Zord, Quake cloud): none. Yellow uses the same frames in Dustin's
  palette; the Lion Hammer lock-on and Quake Mode are render tints of those frames.
- **Portrait**: the credit-block mugshot on each sheet (top right, masked out of the frame scan).

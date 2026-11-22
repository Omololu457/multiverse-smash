# MSV1-GOJO — Phase 0 audit: what the new Satoru Gojo reuses

New fighter `gojo_shinjuku` ("Satoru Gojo", tag "Shinjuku Arc"). The OLD Gojo (`gojo`, "Gojo Satoru") stays exactly as he is:
nothing in his definition, his specials (`abilities.js executeGojoSpecial / executeGojoUltimate`), his Infinity
(`game.js` charge-tap toggle, `combat.js shouldGojoAutoDodge`, `abilities.js applyGojoPassiveSystems`), his voice
(`gojoVoice.js`) or his skins changes. His frame data is snapshotted before/after every phase
(`harness/gojo_shinjuku_framedata.mjs`, `FRAMEDATA_BEFORE.json`) and must diff ZERO.

Everything below is reused by SHARING (importing / reading the same file or asset) or COPYING. Nothing is moved out of
the old Gojo's code paths.

## The old Gojo, read in full

| Area | Where | What it is |
|---|---|---|
| Definition | `characters.js` `const gojo` (≈ line 656) | HP 1160, maxEnergy 220, spriteScale 1.8, strips `./gojo_<action>_sheet.png` (idle 28×64 ×4, walk 34×63 ×8, hurt 72×62 ×6, A-jab 49×63 ×6, C 55×59 ×5, B 56×62 ×5, domain 37×64 ×4, ultimate 39×64 ×3…). These strips were cut from the same FinhJ sheet family as the new one. |
| Specials | `abilities.js executeGojoSpecial` | Up+Special = teleport behind (8 energy, 120 f cd) · ↓← + Special = Hollow Purple (70) · → + Special = Red orb (40) · neutral Special = Blue orb (30). Charge→release strips, `schedulePendingSpawn`. |
| Ultimate | `abilities.js executeGojoUltimate` | Ultimate (U) = Unlimited Void: `spendFullBarForDomain` (FULL meter), `activateDomain(f, {cost:0, duration:15, range:1e5})`, Infinity forced on for the domain. |
| Domain | `domains.js` | `rosterKey === "gojo"` branches: video background `gojo_domain.mp4` (+ `gojo_domain_end.jpg`, procedural `_drawUnlimitedVoid` fallback), theme `Gojo_domain_theme.mp3`, white flash, and the FREEZE: every foe in range gets `domainFrozen = true`, `hitstun ≥ 4`, `vx = 0` each frame for the 15 s (900 f) duration; no damage (Gojo lands hits manually). |
| Infinity | `game.js` handleChargeTap (≈ 11565), `combat.js shouldGojoAutoDodge`, `abilities.js applyGojoPassiveSystems`, `game.js` ≈ 20992 / 23335 (render ring) | Charge-TAP toggles `infinityActive`; each dodged hit costs 5 energy; 0.14/frame drain; 5 % HP backlash at empty. VISIBLE (teleportFlash + ring). |
| Voice | `gojoVoice.js` `GOJOYOUNG_VOICE` pools (intro 10, taunt 59, cast 18, hitConnect 12, hitReact 6, win 17) + `voice/gojo/gojo_red.mp3`, `gojo_hollow_purple.mp3`, `gojo_namecall.mp3` | Skin-gated for the old Gojo (gojo2 "Limitless" skin). |
| FX art | `gojo_blue_orb_fx.png` (3f 152×154), `gojo_red_orb_fx.png` (3f 149×149), `gojo_hollow_purple_orb_fx.png` (7f 269×251) | Projectile sprite strips drawn by the generic `drawProjectiles` sheet hook. |
| HUD | generic energy bar (`traits.energyType: "cursed_energy"`) | No bespoke meter UI for the old Gojo. |
| AI | `ai.js` ≈ 377 / 645 / 861 / 1235 | Old-Gojo-only plan + `infinityDesired`. |

## Reuse list for `gojo_shinjuku`

| Reused | How |
|---|---|
| **Unlimited Void domain** (U key, the Infinite Void background/video, theme, white flash, the opponent FREEZE and its 15 s duration) | SHARED: `activateDomain` is called with the same `{ duration: 15, range: 1e5 }` plus a new opt-in `domainKey: "gojo"` option so every `rosterKey === "gojo"` domain branch (video, theme, freeze, no-ring) runs for him. The option is undefined for every existing caller → domains.js behaviour for everyone else is byte-identical (proved by test). |
| Domain cost | Same rule as the old Gojo (`spendFullBarForDomain`: a FULL meter, drained to 0) **plus** 50 CE. |
| Blue / Red / Purple visuals | SHARED asset files `gojo_blue_orb_fx.png`, `gojo_red_orb_fx.png`, `gojo_hollow_purple_orb_fx.png` (read-only) as fallbacks; the new sheet's own effect sprites (cyan Blue orb, boxed Red, merge circles, purple mass, dome) are primary. |
| Projectile code | SHARED engine `spawnProjectile` (via the world object), the generic projectile hit path, juggle/scaling rules. Blue / Red / Purple behaviour (pull, repel, erase) is NEW code in `limitless.js`, not a change to the old Gojo's specials. |
| Infinity logic | NOT shared: the old Gojo's Infinity is visible, per-dodge, single-level. The new Infinity is a new, invisible, 3-level system in `limitless.js` gated on `gojo_shinjuku`. The old toggle path never sees him (it is gated on `rosterKey === "gojo"`). |
| Energy meter/HUD | The old Gojo has no bespoke meter, so the CE bar copies the generic energy-bar look (same height/rounding as the engine bar, cursed-energy blue). |
| Sounds | SHARED files: `voice/gojo/gojo_red.mp3` (Red), `voice/gojo/gojo_hollow_purple.mp3` (Purple), `voice/gojo/gojo_namecall.mp3` (intro), `Gojo_domain_theme.mp3` (domain, via the shared domain path), `GOJOYOUNG_VOICE` pools (intro / win / hitConnect / hitReact / cast). Picks are deterministic hashes (audio-only). Blue hum, Red crack, Purple roar, chant tones and the Black Flash thump are procedural WebAudio (no new files). Infinity has NO sound. |

## INPUTS — what P and U do today (verified in `game.js` P1_CONTROLS / P2_CONTROLS and `padLayout.js`)

| | Player 1 keyboard | Player 2 keyboard | Gamepad |
|---|---|---|---|
| **P / P-equivalent** | `p` = **Charge** (HOLD charges the shared meter; TAP = per-character toggle — old Gojo: Infinity, Sasuke: Absolute Defense, flyers: flight). Shift+P (debug personality overlay, menu/debug only) is shift-gated and unaffected. | `7` (Charge / toggle) | **L2** (button 6) = Charge |
| **U / U-equivalent** | `u` = **Ultimate** (old Gojo: Unlimited Void) | `5` | **R2** (button 7) |
| Pause | Escape / pad Options (not P) | — | Options (button 9) |

Decision for `gojo_shinjuku`:
* **P = Infinity.** P is already the Charge key, so Infinity rides the existing `charge` input field (already in
  `REPLAY_INPUT_FIELDS` → recorded by replays, carried by LAN lockstep). Tap/hold timing is measured on the SIM clock from
  `readRawControls` press edges inside his tick — never a keydown listener. The generic "hold Charge to fill the meter"
  is replaced for him by Infinity (his CE regenerates on its own; the super meter builds from hits as usual). Nothing
  else that P did is lost for anyone else: P's charge/toggle for every other fighter is untouched, and P was never pause.
* **P2 keyboard: `7`** (the mirrored Charge key).
* **Gamepad: R3** (button 11 — unused anywhere in the game, verified by search) **and L2** (the Charge button, same as
  keyboard P). R3 is read only for `gojo_shinjuku` and folded into the same `charge` field, so it travels through
  replay/LAN exactly like L2.
* **U = Unlimited Void**, same key as the old Gojo (P2 `5`, pad R2).

Charge-button motions (RCT ↓↓+Charge, Falling Blossom ↓↙←+Charge): when a fresh ↓↓ / ↓↙← motion is buffered at the
Charge press, the press belongs to that technique and does NOT touch Infinity.

## Other systems found (reuse report)

| System | Found | Use |
|---|---|---|
| Super meter / bars | No separate "super bar" system: ultimates spend `fighter.energy` (100 per bar). | His super meter = `energy`, maxEnergy 300 → **3 bars** (corrected in phase 4: 200 % Purple needs 2 bars + Hollow Purple 1, so 3 bars fit a full meter). CE is a separate 0–100 gauge in his GAME_STATE. |
| Text bubbles | Spider-Man quip bubbles (`abilities.js` quip system, `ms_quip_bubbles`) | Intro / win bubbles ("Don't worry. I'm the strongest." / "Nah, I'd win.") drawn by `gojoShinjukuFx.js` in the same bubble style (render-only). |
| Hitstop / camera shake | engine `hitstop`, `shakeCamera` | Shared. |
| Projectile pooling | engine `activeProjectiles` (per-owner caps in modules) | Shared; fields cap affected objects. |
| Clones / illusions | `ninja.js` / `cloneChoreography.js` (`_isClone`, Naruto family), MSV1 Shane/Dustin (`nsDuo`), Jiraiya | Six Eyes Sight, Infinity stops, Purple erases. |
| Summons / drones | `summons.js activeSummons`, Green Arrow `drones.js`, Dseyl/Syndrome machines, Megumi shikigami volumes | Blue crush / Purple erase through the shared lists. |
| elements.js patches | Enoch ice/fire/water ground patches | Patch damage stopped by Infinity; Purple erases patches. |
| Blood system | `battleBlood.js` + `tools/bloodmap` | His bloodmap is generated; burnout nosebleed is a render-only decal. |
| Edo Tensei generator | `tools/edoskin/gen.py` | His Edo skin is generated. |
| Skins system | `skins.js` SKINS table + per-character skin modules (Megumi pattern: precomputed region recolours, `recolorTag`) | 20 premade skins. |
| Black Flash | Yuji's ultimate cinematic (`yujiUltimateCinematic.js`) and Todo's post-swap bonus (`abilities.js` AOI_TODO_BF_*) — **no generic timing system** | New timing system in `limitless.js` (render effect procedural). |
| Other domains | **Sukuna — Malevolent Shrine** (`domains.js` rosterKey sukuna, priority 4), Alt Sukuna (ultimate cinematic), Hashirama Sealing Jutsu, Omololu Genesis Threshold | Domain CLASH implemented against any domain in `activeDomains` (Sukuna's is the canon case). |
| Sukuna world-cutting slash | **Does not exist** (Sukuna has Cleave / Dismantle / Cursed Slash / Flame Arrow) | Bypass skipped. |
| Sukuna Domain Amplification | **Does not exist** | Bypass skipped. |
| Mahoraga | The Handler (`handler`, display "Megumi") ultimate FORM `_mahoragaActive` with an adaptation wheel + World-Slash counter; `megumi_fushiguro` has Mahoraga only as a non-combat intro | Wheel bypass implemented for the Handler's Mahoraga form. |
| InputFrame | `readRawControls` / `writeRawControls` + `REPLAY_INPUT_FIELDS` (replay + LAN masks) | Every Gojo input (incl. Infinity) is read from this snapshot. |

## Input changes vs the brief (phase 4)

- **Red Rush is → + Special + Heavy** (the brief's ↓↙← + S + H collides with Falling Blossom Emotion's ↓↙← + P
  motion buffer and with Purple's ↓ ←). The qcb alias for Reversal Red was dropped for the same reason: ↓ ← is Purple.
- **Blue Step is Up (+ a direction) + Special.** Up alone = straight up (45 % of the screen distance × 0.45); Up + → / ←
  = the diagonal step (45 % of the screen, 576 px, along the diagonal).
- **Black Flash is judged in the sim tick**, not the command layer: the 2-frame window opens on the hit and hitstop
  freezes the command layer, so a press during hitstop still counts.

## User requests after phase 3 (2026-11-21): "more like the other Gojo"

- **P = tap / hold.** A tap (released inside 12 f) steps Infinity off → L1 → L2 → L3 → off (the brief's "hold 30 / 60 f
  for L2 / L3" is replaced, because holding P is now the charge). Holding P past 12 f is the shared hold-to-charge, the
  same as every other fighter: `isCharging`, the meter fills (doEnergyCharge), the new `charge` pose (sheet's Ultimate
  Action stance, looped) and a render-only blue cursed-energy aura. Charging also refills CE (+12 CE/s). The Infinity
  level he had is kept while he charges. ↓↓ + P (RCT) and ↓↙← + P (Falling Blossom) still own their presses.
- **Double-tap TOWARD the foe = the old Gojo's teleport.** Same formula as game.js `teleportBehindTarget` (lands right
  beside the foe at their height, faces them), same 48-frame cooldown, dash pose on the blink. Read on the sim clock
  (gojoShinjukuState.js `mobilityTick`), so replay / LAN reproduce it; the engine's wall-clock double-tap is skipped for
  him (one game.js line).
- **Double-tap AWAY = a long Ranger-style blink** (rangers.js feel): 2 f wind-up, 5 f travel covering 40 % of the screen
  (512 px), 8 f recovery, 30-frame cooldown. The travel frames are invulnerable (melee / grabs whiff, projectiles pass —
  one combat.js line). Motions (↓↘→, ↓↘→↓↘→) and Up + direction (Blue Step) never read as double-taps.
- **U = Unlimited Void (phase 5)** reuses the old Gojo's domain through `activateDomain(..., { domainKey: 'gojo' })`:
  his freeze, the Unlimited Void background video and theme. Three domains.js lines accept the key; behaviour is
  identical for every other domain (a domain's rosterKey only differs from its owner's key when domainKey is passed).
  A domain cast already under way survives the other domain's freeze, so two Gojos opening together clash.

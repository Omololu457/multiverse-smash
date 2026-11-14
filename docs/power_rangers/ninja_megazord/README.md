# Ninja Megazord — White Ranger's team-support orders (shared Zord system)

The Ninja Megazord is **team support called by Tommy, not Tommy's Zord**. It is a short scripted assist, never a fighter: no HP, no hurtbox, never body-blocks, no input, no AI, no homing after commit, no camera change. It runs on the **same shared scheduler as the Falconzord** (`falconzord.js`) and draws through the **same cached renderer** (`drawZordCell` in `mmprBlackFx.js`). No second scheduler, renderer or image cache exists.

Art ledger: [SPRITE_LEDGER.md](SPRITE_LEDGER.md). Credit: "Sprites ripped by Belial" (transcribed from the sheet's own panel, shown in the in-game credits next to the White Ranger entry). Skins never recolour the robot.

## Resources (per owner, `owner._falcon`, JSON-plain → replay snapshot)
- **2 order pips**, both full at round start, refilling **180 f apart** (sequential).
- **60 f global lockout** after any call; one live order per owner; **12 f commit** (`wCall` startup). A hit/grab/KO/reset before the commit cancels the call: no robot appears, the pip and Energy stay spent.
- **120 f post-ultimate lock**; a live order is retired on ultimate entry.
- Blink, Formation and round time never restore pips.

## Orders (ages count from commit; damage is `raw × 1.7` stored, then the engine's 0.60 global scale and combo scaling)
| | Twin Fist (Fwd+Special) | Crane Rise (Up+Special) | Ninja Edge (Back+Special) |
|---|---|---|---|
| Cost | 15 Energy + 1 pip | 18 Energy + 1 pip | 20 Energy + 1 pip |
| Warning | ages 0-13 | ages 0-11 | ages 0-23 (the delayed, readable one) |
| Main contact | ages 17-21, raw 38, hitstun 30, blockstun 16 | ages 17-21, raw 44, **launch** (vy −20, once per combo via the shared assist-launch rule) | ages 34-38, raw 54, 150×110 zone |
| Formation follow-up (gate `formation`) | ages 32-35, raw 24 | ages 33-36, raw 20, **pop-up push** (knockbackY −15, not a `launch`); its hit makes Tommy's signal pose jump-cancellable → air conversion | ages 52-55, raw 26 arc (`arc0` FX) |
| Life | 56 | 60 | 76 |

The follow-up contacts are **gated**: `falconzord.js` skips any contact whose `gate` is not in `sortie.gates`. Only an accepted Formation sets `gates = ['formation']`; without it the robot plays the follow-up pose substitution (`gatePoses`) and never hits.

## Formation acceptance (White-owned rule, `mmprWhiteState.js`)
Holding a Formation token, a **clean (unblocked) main-contact hit** opens a **10 f** offer. A **fresh** Special retap inside it spends the token + **10 Energy** and arms the follow-up; once per combo. A block, whiff, parry, late retap or held Special never accepts (the late retap is an ordinary Special). No reward or assist cue plays after a KO.

## Determinism
Profiles are pure data registered from `mmprWhiteData.js`. All state is on `owner._falcon` / `owner._mmprWhite` (JSON), snapshot-checked in replay. No `Math.random`. Black's and White's sorties can coexist in one match (each owner only clears its own leftovers).

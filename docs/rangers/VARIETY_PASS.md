# S.P.D. Ranger Variety Pass (2026-11-13)

The owner asked for more moveset variety for the S.P.D. Rangers, with **S.P.D. Red untouched and used as the model**.
Red's variety comes from four kinds of move: command normals (Back+Heavy flip, Down+Heavy), an air special, an Up special, and a motion special (↓↘→ Phase Strike).
Blue, Green and Pink each got the same four layers, each with its own identity. **No skins were added**, and Red's files are byte-identical.

| Layer | S.P.D. Blue (Sky Tate) | S.P.D. Green (Bridge Carson) | S.P.D. Pink (Syd Drew) |
|---|---|---|---|
| Down+Heavy (low knockdown; Down+Light keeps the quick low) | Low Sweep `bSweep` 38 raw, 11f | Floor Sweep `gSweep` 38 raw, 11f | Cartwheel Sweep `pSweep` 40 raw, 12f |
| Back+Heavy (free evade, no hitbox) | Backstep `bBackstep` 90px, 6f invuln | Backward Roll `gEvade` 100px, 7f invuln | Handspring Away `pEvade` 100px, 7f invuln |
| air neutral Special (once per airtime) | Delta Dive `bAirDive` 36 raw, diving kick, 14f landing | Air Deltamax `gAirShot` 30 raw, downward shot | Air Deltamax `pAirShot` 32 raw, downward shot |
| Up+Special | (keeps the existing kit) | Somersault Read `gSomer` 44 raw, launcher | Vault Kick `pVault` 40 raw, **overhead** |
| ↓↘→+Special (3-hit, last hit knocks down) | Intercept Drive `bDrive1-3` 18/20/32 (always available) | Read Rush `gRush1-3` 18/18/26 (**only on a marked target**; consumes the mark) | Iron Barrage `pBar1-3` 20/20/38 (**only with Iron Reserve**; spends the charge) |
| **↓↙←+Special** (layer 2 — Red's ↓↙← slot) | Barrier Bash `bBash` 44 raw, 13f, 70px shoulder charge, knockbackX 20 (foe pushed ≈51px) | Arc Kick `gArc` 46 raw, 14f, flying kick carrying 120px, knockdown | Flip Shot `pFlip` backflip 80px (5f invuln, no hitbox) → one Deltamax shot raw 30 |
| **Forward+Light** (layer 3 — command normal) | Barrier Palm `bPalm` 36 raw, 13f, heavy knockback (foe slides ≈41px after hitstun) | Step-in Elbow `gElbow` 30 raw, 9f, 32px advance, special-cancellable | Rose Knee `pKnee` 34 raw, 11f, pops the foe up ≈43px for a manual jump follow-up |
| **air Heavy** (layer 4; air Light keeps the quick kick) | Barrier Drop `bAirH` 40 raw, 11f | Flying Side Kick `gAirH` 40 raw, 11f | Rose Axe Kick `pAirH` 42 raw, 11f |
| **Up+Special** (layer 4, Blue only — Red's Sky Uppercut slot) | Sky Barrier `bSky` 44 raw, 8f launcher, invulnerable 1-5 | (Somersault Read) | (Vault Kick) |

## ↓↙← layer
- ↓↙← is read the same way as ↓↘→. The raw history now records `[down, forward, back]`, and the rule is back-without-down in the last 4 ticks after down-without-back within 15.
- A plain Back+Special (no ↓ first) keeps its old meaning: Blue Barrier, Green Retreat, Pink Baton Reprisal stance (tested).
- Barrier Bash and Arc Kick can be cancelled into from a connected Light/Heavy, like the other specials. Flip Shot is neutral-only.
- Strips: Pink `pFlip` [acro1, fall4, aim1] and Green `gArc` [crouchReady0, arc1, arc2, arc3] are real cells, and the skins were rebuilt with 48 sheets per skin. Blue `bBash` aliases `bAdvance`.

## Rules shared by the motion strings
- The ↓↘→ read is deterministic. It uses a 16-tick history of raw `[down, forward]` input: forward-without-down in the last 4 ticks, after down-without-forward within 15 ticks. A plain → never triggers it (tested). Replay and LAN stay deterministic because it reads the same raw controls.
- **Blocked stage ⇒ the string ends** with an 18f stop.
  - Why: in this engine a defender in blockstun is not `isBlocking` on the next frame (guard is only re-read once blockstun ends), so a gapless string would connect after the first block.
  - Effect: the string is fully blockable and punishable. On a whiff it stays committed.
- Without its resource, Green's and Pink's ↓↘→ is the ordinary forward special (Acrobat Step / Iron Breaker).

## Animation
- Green and Pink: the new strips are real sheet cells, added to `tools/spd_*/extract.py`. The existing assets were re-extracted byte-identical, and the skins were rebuilt with 47 sheets per skin.
- Blue: the new moves alias existing strips (`bSweep`→bLow, `bBackstep`→walk_back, `bAirDive`→air, `bDrive1/2/3`→light/bJ2/bChain). There is no new art.

## Ownership
- SPD Blue's files (`spdBlueData.js spdBlueState.js spdBlue.js spdBlueKit.js`) are Codex's uncommitted work.
- I edited them because the owner asked. The edits were narrow, hash-guarded against these pre-edit hashes, and backed up in the session scratchpad:
  - Data cac875c76b853de9, State 7a4bc2bc652b432f, spdBlue a709677fb0706ab9, Kit 668810800ea2941e
- **Blue's variety is not committed.** It lands when Codex commits Blue.

## Verification
- `node harness/spd_rangers_variety.test.mjs` → `docs/rangers/variety_results.json`. It drives each fighter with real keyboard input.

## Damage note
All raw values in this file are authored numbers. Play applies the roster-parity ×1.7 scale (see `ROSTER_PARITY_PASS.md`).

## Layer 5 — Back+Light retreating poke (2026-11-14)

Each Ranger steps back during startup and then strikes with a long-reach poke. It whiff-punishes an opponent walking in, and it is blockable (no knockdown).
The new `pull:[from,to,px/frame]` payload field moves the fighter backward through `groundTeleportDestination` (wall-safe), the same way `travel` moves forward.

| Ranger | Move | Raw (×1.7 data) | Startup | Step back | Strip |
|---|---|---|---|---|---|
| Pink | Retreating Backfist `pBackfist` | 26 → 44 | 10 | 35px | pJ3 |
| Green | Phase Snap Kick `gSnap` | 26 → 44 | 10 | 35px | gJ2 |
| Blue | Withdrawing Strike `bWithdraw` | 28 → 48 | 11 | 36px | bJ3 |

Test: `harness/spd_rangers_variety.test.mjs`, 76/0. It measures the step-back at the moment of contact (35/35/36 ±1) and checks that a blocked poke gives blockstun and no knockdown.

## Layer 6 — Charge+Forward ARMORED advancing strike (2026-11-14)

Each Ranger has a 20-energy shoulder/ram that armors its whole startup through the engine's generic `_castArmor` window (combat.js `castArmored`, ticked down in game.js; no shared-file change).
- The Ranger still takes damage but gets no hitstun and is not interrupted.
- Launchers, spikes, throws and ultimates beat it.
- New `armor:N` payload field, set at move start next to `invuln`.

| Ranger | Move | Raw (×1.7) | Startup | Armor | Advance |
|---|---|---|---|---|---|
| Pink | Diamond Shoulder `pShoulder` | 60 → 102 | 20 | f1–19 | 56px |
| Green | Phase Ram `gRam` | 56 → 95 | 19 | f1–18 | 52.5px |
| Blue | Barrier Charge `bRam` | 60 → 102 | 21 | f1–20 | 59px |

- Neutral Charge is unchanged: Pink Iron Reserve and Green Aura Scan.
- Blue had no Charge use before: only Charge+Forward is intercepted (a `charge` edge was added to the edge recorder), and neutral Charge still falls through to the engine.
- Test (`spd_rangers_variety.test.mjs`, 85/0): the dummy really jabs the Ranger at startup frame 5 via `startMove`. The Ranger must take the damage, get no hitstun, stay in the move, and then land the charge (74–79 applied).

## Layer 7 — Charge+Back counter stance (Green / Blue) (2026-11-14)

Pink already had a counter (Baton Reprisal). Green and Blue now get one too, so every Ranger has a defensive read.

- **Stance:** 10 energy, invulnerable f1–20.
- **Read:** during f4–19, if the opponent has a live melee attack (not yet connected) whose active frames start within 150px (centre to centre), the Ranger cancels into the counter-strike.
- **Implementation:** state-only (payload `counter:[from,to,reach]` + `counterInto`); no shared-file change.
- **Limits:** projectiles are not read. A whiffed stance runs 42f (punishable).

| Ranger | Stance | Counter strike | Effect |
|---|---|---|---|
| Green | Phase Read `gRead` | Read Strike `gReadStrike` raw 50 | pops the foe up |
| Blue | Barrier Parry `bParry` | Parry Strike `bParryStrike` raw 55 | blasts the foe away |

Test (89/0):
- A real dummy jab at stance frame 5 triggers the strike (66 / 72 applied), and the Ranger takes 0 damage.
- A whiffed stance never strikes and ends after 41f.

**Layer 7 revision (with layer 8):** the stance no longer carries blanket invulnerability.
- The read fires on the attacker's first active frame and cancels into the counter strike, whose own invuln (6f) dodges the hit. Tested: still 0 damage taken.
- Throws (`unblockable` / `damageType:'grab'`) are never read and can hit the stance, so throws beat counters.

## Layer 8 — ↓↙←+Heavy command throw (2026-11-14)

Each Ranger's command throw has the same profile:
- `damageType:'grab'` + `unblockable` (set onto the live attack at move start, because `startMove` does not copy the flag).
- 6f startup, short grounded reach (46px, low box), knockdown, 32f recovery.
- The motion flags were already recorded on every button edge, so ↓↙← is read on the Heavy press.

| Ranger | Throw | Raw (×1.7) |
|---|---|---|
| Pink | Iron Hip Toss `pToss` | 70 → 119 |
| Green | Phase Suplex `gToss` | 66 → 112 |
| Blue | S.P.D. Arrest Throw `bArrest` | 72 → 122 |

Tests (97/0):
- Each throw grabs a **guarding** dummy and knocks it down (87–94 applied).
- Out of reach, it whiffs for 38f.
- Green/Blue throws beat the mirror's counter stance: the counter never fires, the throw lands, and the thrower takes 0 damage.

**Harness note (2026-11-14):** the live-match checks in spd_pink/green determinism + visual flaked because `page.keyboard.press(k)` sends key-down and key-up with no game frame in between, so the game never saw the button (diagnosed by a missing Charge edge in the failing runs).
- Fix: every live press in those four files is held for 80ms (`{delay:80}`).
- Fixed sleeps on the prep/scan were also replaced by waits on the state (4s cap).
- No assertion changed.

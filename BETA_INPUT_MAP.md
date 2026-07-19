# Beta Input Simplification — single-direction specials

**Beta only.** When the beta code (`GojoV1` / `isBetaUnlocked()`) is active, command specials no
longer require a motion roll (qcf/qcb/F,F/…). Instead: **hold ONE direction, then tap Special.**
Normal (non-beta) play is completely unchanged — the full motion is still required there.

## How it works (no main-path changes)

The whole system funnels through one choke point: every character's special dispatch calls
`getRelativeDirections(fighter)` and then `endsWithPattern(dirs, PATTERN)` (both in `abilities.js`).

- **`game.js`** stamps `fighter._betaHeldDir` (the single relative direction currently held —
  priority `U > F > B > D`, `null` = neutral) the frame Special is pressed. Beta-gated, so normal
  play never sets or reads it. (`betaHeldDirFromInput`, and the stamp just before `triggerSpecial`.)
- **`getRelativeDirections`** — in beta, returns the **exact canonical motion** that the held
  direction maps to (per-character table `BETA_SPECIAL_MOTIONS`) instead of reading motion history.
- **`endsWithPattern`** — in beta, matches by **exact equality** (not the forgiving subsequence
  match) so a reduced single direction can't false-trigger a longer motion.

Both functions early-return in beta and leave their non-beta bodies byte-for-byte intact. Nothing
about move data, damage, costs, or the motion detector for normal play is touched. Note: the unlock
is global, so in a beta match the AI opponent also uses single-direction inputs (it fires a valid
special from whatever direction it holds — functionally unchanged, just not motion-variant-specific).

## What each held direction maps to

`F` = toward opponent, `B` = away, `U`/`D` = up/down, `neutral` = no direction held.
"(sub)" marks a proposed substitute for a motion that does **not** cleanly reduce to one of the five
basic directions (per the task) — chosen so the special stays reachable, never silently dropped.

| Character | neutral | Forward (F) | Back (B) | Up (U) | Down (D) |
|---|---|---|---|---|---|
| **Goku**   | Dragon Fist | **Kamehameha** (qcf) | — | — | — |
| **Gojo**   | Blue | **Red** | **Hollow Purple** (qcb) | Teleport | — |
| **Sukuna** | Cleave | **Flame Arrow** | **Dismantle** (qcb) | — | — |
| **Naruto** | Rasengan | **Shadow Clone Spawn** (qcf) | **Clone Dispel** (qcb) | **Pincer Rendan** (sub) | **Dark Rasengan** |
| **Megumi** | **Toad** (sub) | **Divine Dogs** (qcf) | **Max Elephant** (qcb) | **Rabbit Escape** | **Nue** (sub) |
| **Toji**   | Inventory Smash | **Curse Spirit** (qcf) | **Chain-Knife** (qcb) | — | **Rapid Strike** (sub) |
| **Sasuke** | Dash Strike | **Two-Strike Lightning** (qcf) | **Chidori Koiten** (qcb) | — | **Shuriken** |
| **Rick**   | Meeseeks Box | **Portal-Pull** (qcf) | **Portal-Push** (qcb) | Rocket | Portal-Laser |

Direction-independent inputs are unaffected in beta and still work as before:
- **Naruto** Big Ball Rasengan / Rasenshuriken — selected by **holding P (charge)**, not a direction.
- **Sasuke** Susanoo (in-form): plain Special = sword/arrow, **hold Down** = grab (kept explicitly).
- **Kawarimi / Substitution** — Block + Special during an incoming hit (state-gated, not a motion).

## Substitute choices (motions that don't reduce to one of the 5 directions)

Each of the 5 slots (neutral/F/B/U/D) maps to one special. Where the original motion isn't a clean
single-direction reduction, here is what was chosen and why:

- **Naruto — Pincer Rendan** (orig. `B→U`): mapped to **Up**. Up is its natural component and is
  otherwise unused by Naruto. Still gated on ≥2 clones — with fewer, Up falls through to base Rasengan.
- **Megumi — Nue** (orig. `F→D→F`, DP): mapped to **Down**. `F/B/U` are taken by the clean
  qcf/qcb/up reductions (Divine Dogs / Max Elephant / Rabbit), and Megumi has no other Down special.
- **Megumi — Toad** (orig. `B→F`): mapped to **neutral**. It's the only summon left without a clean
  single-direction slot; neutral was free (Divine Dogs, Megumi's default, moved to its qcf Forward).
- **Toji — Rapid Strike** (orig. `F→F`, double-tap): mapped to **Down**. `F` is taken by Curse
  Spirit (qcf) and Toji has no other Down special, so Down is the free slot.

### Naruto — two specials with no free single-direction slot (documented, not silently dropped)

Naruto has more motion specials (7) than there are single directions (5). The five highest-value
specials take the five slots (above). The remaining two keep their **full motion** even in beta:

- **Toad Summon** (`B→F`) — Back is taken by Clone Dispel (the clean qcb reduction).
- **Chakra-Arm Grab** (`F→F`, shroud-stage-3+ only) — Forward is taken by Clone Spawn; this is a
  niche, state-gated grab.

(These are the only two specials across all 8 characters that don't get a dedicated beta
single-direction. Every other special is reachable with one held direction.)

## Test coverage

`harness/beta_input.test.mjs` — for **all 8** sprite-complete characters, on the real code path:
- **(A)** normal play + motion roll → the command special still fires (main path intact);
- **(B)** normal play + a single held direction → the special does **not** fire (motion still required);
- **(C)** beta on + the same single held direction → the special fires.

Each character runs in an isolated browser context so the (un-resettable, per-session) beta flag
can't leak into another character's normal-play assertions. 56/56 pass. The pre-existing motion
suites (`round4`, `chidori_koiten`, `substitution`, `toji_motion`, `rick`, `basickit`, `beta_code`)
all still pass unchanged, confirming non-beta play is unaffected.

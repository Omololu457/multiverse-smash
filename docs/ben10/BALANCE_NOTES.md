# Current integration contract — 2026-11-11

This section supersedes historical phase notes below. Production exposes Swampfire
only, with Alien Force and Classic humans. Prime and all 13 older forms require
Ben development mode and are not finished-art releases.

Swampfire uses raw supplied move values, damage 1.10, defense divisor 1.10, speed
0.92 and knockback weight 1.15 exactly once. Regrowth banks 35% of actual eligible
HP loss, waits 120 simulation ticks, then restores 2 per 10 up to 80 per entry.
See aliens/swampfire/README.md for exact frames, costs and block timing.

Human walk speeds are AF 9, Classic 9.7, Prime 8.6; impulses -19/-20/-18, one jump.
The shared pool is never healed by transformation. Reset restores selected human
stats and art. General training reset intentionally starts a clean human/device.
Last Resort is once per actual round, not rearmed by full healing.

Drain uses the existing pool-HP factor and attack/Vow additions, not a flat 5/s in
all cases. A paid Swampfire channel finishes at zero Power and then times out;
hits cancel remaining beats. Cast recovery cannot be canceled with charge/guard/
roll/walking/swapping. Vow can only draw from the validated loadout: production's
single approved form provides no random variety. Experimental loadouts retain it.

Timing targets use exact active endpoints only for Swampfire. Flame Jet's raw45
is 23 actual HP in the focused clean-target pipeline test after 1.10 offense,
0.60 global scale, pre-increment combo decay and per-contact flooring. Old combo
approximation targets are not balance requirements. No unrelated authored moves
were retimed to meet them. Sounds are synthesized placeholders, not voices.

# Historical phase notes (retained; not current readiness certification)

# BEN 10 — BALANCE NOTES

Ben 10 is a **shapeshifter / rushdown** built around a deliberately **weak human baseline** and a
**resource-gated** alien transform engine. His ceiling is high (five alien kits on tap, mid-combo
swaps), but every powerful option costs the Omnitrix Power meter and opens a vulnerability. The design
goal: the Omnitrix is a *tempo* tool, not free power.

## What keeps him fair (the levers)

| Lever | Effect | Why it's fair |
|---|---|---|
| **Shared health pool** | The human variant's HP (AF 950 / Classic 900 / Prime 1000) is the ONE pool for every form. Transforming never heals or resizes the bar. | No "fresh health bar" per alien — a juggle carries across form changes. |
| **Transform cost + startup** | 20 Power and a **40-frame vulnerable startup** before the alien appears. | You can't transform reactively on reaction to a blocked string — it's a commitment, punishable on whiff. |
| **Power drain** | Alien forms drain **5/s** (~20s from full). At 0 Power → forced revert. | Caps uptime; you must close the round or bank Power (hold Charge / land hits: +3 on hit, +2 taken). |
| **Timeout cooldown** | A 0-Power forced revert locks out transforming for **6s**. | Punishes greedy over-staying; the opponent gets a guaranteed human-Ben window. |
| **Swap cost + lockout** | Alien→alien swap is **15 Power + 30-frame lockout**, and **cannot** fire during hitstun. | Mobility between kits is paid-for and rate-limited. |
| **One swap per combo** | A 2nd swap while swapLockout > 0 is rejected — no mid-air swap loop. | Removes the infinite / unburstable swap-juggle. |
| **Manual revert** | A deliberate revert is only a 20-frame lockout (no timeout), so defensive reverts are allowed but can't be spammed into instant re-transform. | Rewards planning without a 6s punish for playing safe. |
| **Weak human normals** | Jab ~20 dmg, slow heavy; specials cost Power. | Caught human (pre-transform / post-timeout), Ben is one of the weakest fighters on the roster. |

## Binding Vow (opt-in glitch mode)

The Vow is **opt-in** (hold Heavy through round start, or a harness toggle). Upside: alien damage
**×1.25**. Downsides that pay for it: drain **×1.6** (uptime ~12.5s instead of 20s), swap costs **22**
(vs 15), and — critically — **you cannot choose your alien**: every transform/swap is a deterministic
`hash(matchSeed, frame, playerIndex)` pick. It's a high-roll, high-commitment mode, not a strict
upgrade: the extra damage is offset by lost control + faster burnout.

## Matchups

- **vs Homelander** (flying laser speedster, 1150 HP, −40% chip via Supe Durability): Homelander zones
  from the air with Heat Vision and out-ranges human Ben hard. Ben's answer is a *grounded* alien with a
  fast approach (XLR8-class) + the **Green Flash Roll** (i-frames 4-12) to pass lasers, then stay in
  Homelander's face before the Power meter runs out. Homelander wins neutral and the clock; Ben wins the
  moment he's in. Homelander's chip-reduction + higher HP means Ben can't win a poke war — he must commit.
- **vs Superman** (all-rounder, 1150 HP, flight + Heat Vision): the hardest matchup — Superman out-HPs,
  out-ranges, and out-neutrals human Ben and most placeholder aliens. Ben survives on **Energy Guard**
  (absorb one big hit) + **Last Resort** (−20% DR + 30 Power under 15% HP) to claw back a transform window,
  then a mid-combo swap to extend the one opening he gets. Expect to lose neutral repeatedly; Ben's path
  is a single committed burst + the comeback passives, not a war of attrition.
- **vs Spider-Man** (traversal/rushdown, ~1000 HP, Spider-Sense dodge + web zips): a tempo mirror. Spidey's
  Spider-Sense can auto-evade Ben's telegraphed 40-frame transform and his slow heavy. Ben must transform
  from *neutral/space* (not in Spidey's face) and use Dash Strike's i-frames to beat web-zip repositions.
  Even fight: whoever respects the other's reversal (Spider-Sense counter vs Green Flash Roll) and manages
  their resource (web-fluid vs Omnitrix Power) better takes it.

## Rule for future aliens

Real aliens must be balanced by their **`mods` (speed / damage / defense / weight) + move tables ONLY**,
never by engine edits. The transform/swap/timeout/Vow economy, the shared pool, and the combo scaling are
roster-wide invariants. Placeholders ship with deliberately **average (×1.0) mods** so the framework is
testable without pre-judging any alien's power. A new alien that over- or under-performs is re-tuned in
its `aliens.js` entry (mods) and its `BEN10_ALIEN_POOL` move table — see `docs/ben10/ADD_ALIEN.md`.

# Swampfire — why he is fair (2026-11-17)

Swampfire is balanced by his modifiers and move table only. No engine code was
changed to make him strong or weak.

- **Every special costs Power.** Flame Jet 12, Vine Eruption 18, Blaze Dash 10.
  Power is the same pool that keeps him transformed, so spending it shortens the form.
- **He is slow.** Walk speed is the human's ×0.92, so he has to earn his range.
- **Regrowth is capped and interruptible.** It only returns 35% of recently lost
  HP, never more than 80 HP per transformation, and only after 120 frames without
  being hit. Any hit restarts that wait, and reverting or swapping empties the bank.
  It can never heal him above what he had before the damage.
- **The ultimate is expensive and punishable.** Methane Inferno needs 50 Power,
  works only in alien form, has a 40-frame startup and leaves him in a 100-frame
  recovery lockout he cannot cancel.
- **Tankiness has a price.** Damage ×1.10, defense ÷1.10 and weight 1.15 are paid
  for by the slower speed and the Power cost of every special.

Tests: `harness/ben10_swampfire_combos.test.mjs` (combo routes, Regrowth, Vow),
`harness/ben10_integration.test.mjs`, `harness/ben10_swampfire_live.mjs`.

# Global alien buff — damage and toughness (2026-11-19)

Owner request: every Ben 10 alien gets a damage and health buff, not a speed buff.

- **One knob:** `benAlienBalance.js`, `BEN_ALIEN_BUFF = { damage: 1.15, defense: 1.20 }`. It applies to every READY form.
- **Why toughness, not max health:** Ben's health bar is one shared pool (Classic 900 / Jacket 950 / Prime 1000) for every
  form, and transforming never heals or resizes it. The roster median max health is about 1150. Defense ×1.20 means an
  alien takes 1/1.20 of each hit, so a 950 pool lasts like about 1140 (≈ the roster median) while Ben is transformed. Human
  Ben is unchanged.
- **Damage ×1.15** on top of each alien's own damage mod.
- **Identity kept:** each alien's `mods` stay its design numbers. The buff multiplies on top where mods become live
  multipliers: `applyAlien` and the defense re-sync (fighters.js), combat's READY-form damage divide, Alien X's voice
  stance, and Brainstorm's dome. Rath still hits hardest (1.25 → 1.44), Ghostfreak is still the frailest
  (defense 0.80 → 0.96), and Humongousaur / Terraspin are still the tankiest (1.20 → 1.44).
- **Not changed:** speed, weight, frame data, Power costs, the human form. Albedo uses the same forms, so the mirror is even.
- **Design-total tests** (`harness/ben10_<alien>.test.mjs`) still check the per-alien design numbers before the buff.

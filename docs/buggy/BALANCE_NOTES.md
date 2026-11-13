# Buggy the Clown — Balance Notes (Phase 10)

## Kit at a glance

| | Buggy | Zoro | Superman | Homelander | Green Arrow |
|---|---|---|---|---|---|
| HP | **950** | 1000 | 1150 | 1050 | 920 |
| Walk / dash | 5.0 px/f / 8 px/f (engine floor) | Toji tier (98, teleport dash) | flight | flight (very fast) | — |
| Weight | **0.9** (knocked back further) | — | — | — | — |
| Meter | Chop 100: +4/knife hit, +3/part hit, +1.5/s, +6/nullify | Spirit | Solar | — | — |

Measured damage (`harness/buggy_combos.test.mjs`, vs a standing 1000-HP Zoro; COMBOS.md):
- Bread-and-butter routes deal **95–101** (about 10% of a bar).
- Nullify → Carve → Super deals **238**.
- A neutral Super deals **222** (370 designed × the roster-wide 0.60 global damage scale), then 3 s of no Chop gain.

## Why he is not broken

1. **The immunity is narrow.** Only `slash` is nullified. Across the roster (DAMAGE_TAGS.md, 129 characters, 1193 moves) that's **261 slash** moves against 721 blunt, 150 energy and 61 grab. Projectiles are separate: 128 are tagged `projectile` (arrows, bullets, shells pierce), so they are not cuts. Blunt hits, explosions, energy, grabs and Haki all hit him normally.
2. **The immunity has a built-in punish: Chop Stagger.** Three nullified slashes within 5 s force a 1 s reassembly. During it he cannot attack or block and takes full damage. A blade fighter who keeps pressing gets a guaranteed opening.
3. **Haki ignores it.** Any `haki: true` attack does, and so does Zoro for the rest of the match once Conqueror's Haki fires (his HP < 25%, once per match).
4. **Parts are a liability as well as a tool.**
   - At most 2 parts are out at once (a 3rd retires the oldest).
   - A part broken to 0 HP snaps back for **25 chip damage to Buggy** and goes on a **6 s cooldown**, shown as a greyed pip.
   - The CPU attacks parts 25% of the time, head first.
   - Recalling refunds only 30% Chop, scaled by the part's remaining HP.
5. **Low HP, light, and slow.**
   - He has the lowest HP of this group except Green Arrow.
   - Weight 0.9 means he is launched further.
   - His walk is slow (5.0 px/f), and he has no flight and no teleport.
   - His damage is spread across many small hits that scale at 85% each, so he has no 300+ touch outside the Super.
6. **The Super is honest.** It costs a full 100 Chop and is followed by a 3 s Chop lockout. Parts are recalled first, so he can't stack part pressure on top of it.

## Matchups

### How the numbers were measured

The game's real AI-vs-AI spectator mode was run (`harness/buggy_matchup_sim.mjs`):
- `adaptive` CPU on both sides;
- 10 matches per side, sides swapped;
- 20 matches (about 50 rounds) per opponent.

**These are CPU-vs-CPU numbers. They mostly measure how well each character's AI plays, not the matchup.**
- Calibration: Zoro's CPU wins 95% of rounds vs the Superman CPU and 98% vs the Homelander CPU, yet only 20% vs the Green Arrow CPU.
- Run-to-run noise is large. Buggy vs Zoro was **56%** in one run and **43%** in a rerun with nothing Zoro-related changed.
- So the useful signal is Buggy's result **relative to Zoro's** against the same CPU opponent.

| Buggy vs | Brief target | Buggy round % (CPU) | Zoro round % vs the same CPU | Verdict |
|---|---|---|---|---|
| Zoro | 5.5-4.5 | 56% · 43% → **49%** over 99 rounds | — | about even; see below |
| Superman | 4-6 | **65%** | 95% | far below Zoro → disadvantaged relative to the roster |
| Homelander | 4-6 | **32%** | 98% | clearly disadvantaged; matches the 4-6 intent |
| Green Arrow | even | **22%** | 20% | the same as Zoro → no Buggy-specific problem |

### vs Zoro (target 5.5-4.5)

- **Mechanics.** Every Zoro move except his grab is a slash (25 of 26), so on paper Buggy shuts him down. Three things pull it back:
  - Zoro's fast strings trigger **Chop Stagger** naturally (three slashes in 5 s → a 1 s open window);
  - his **grab** is never nullified;
  - **Conqueror's Haki** makes every hit land once he drops under 25%.
- In the CPU runs Buggy won with about 300 of 950 HP left on average, so Zoro does land real damage through those windows.
- **Does it feel worse than 6-4?** Not on this data: about 49% across 40 CPU matches.
- **Risk, flagged.** A patient human Zoro who never throws three slashes in 5 s deals almost nothing until he grabs or reaches Haki. A patient Buggy can farm that, and human play could skew past 6-4 Buggy.
  - The levers belong on Buggy's side: a lower stagger threshold (3 → 2), or a longer 5 s window.
  - **Zoro is not retuned**, per the brief.

### vs Superman / Homelander (target 4-6)

- Neither kit contains a slash after this phase's tag fix:
  - Superman: blunt 9 (normals plus his World of Cardboard rush), energy 2 (Heat Vision, Freeze Breath), grab 2;
  - Homelander: blunt 9, energy 1 (Heat Vision), grab 1.
- So Buggy's defining defence never applies.
- Both fly, which takes them out of the Festival ring, the Ball arcs and the planted legs.
- The sustained Heat Vision beam is not a projectile, so the Cape Flourish cannot reflect it. Superman's separate in-flight beam shots *can* be reflected.
- Buggy's tools still matter:
  - the Cannon hand and Lookout head reach fliers;
  - the Acrobatic kick is an anti-air;
  - the 214B Cape can reflect their thrown projectiles.
- The CPU data agrees with the intent. Buggy does far worse than Zoro against both (65% vs 95%, 32% vs 98%), and the Homelander result is already well on the 4-6 side.

### vs Green Arrow (target even)

- Green Arrow's arrows **pierce**, so they're tagged `projectile` and not nullified. His drones and bombs are blunt or explosive.
- Both are zoner-summoners with parts / drones. Buggy's parts and GA's drones run on the same generic `drones.js` rules, including the 25% AI part-targeting.
- The Green Arrow CPU beats almost everyone (Zoro wins 20%), and Buggy's 22% matches Zoro's. Nothing points to a Buggy-specific imbalance. The CPU cannot confirm "even" either way.

## Changes made in this phase

The damage-tag table had five false keyword tags. Only Buggy reads these tags, so other characters' frame data is unchanged.

| Ultimate | Was | Now | Why |
|---|---|---|---|
| Superman — World of Cardboard | slash | **blunt** | "Card" in "Cardboard" matched the playing-card keyword |
| Gaara — Sabaku Taisou | slash | **blunt** | "cut-in" (the cinematic portrait) matched `cut` |
| Shizuku — Bloodletting | slash | **blunt** | "cut-in" matched `cut` |
| Light — As Planned (Death Note) | slash | **energy** | "scythe" appears only in the alternate pose |
| Mayuri — Konjiki Ashisogi Jizō | slash | **blunt** | the construct *crushes* the foe |

The `cut` keyword now ignores "cut-in", and the other three are explicit overrides in `tools/buggy_build/damage_audit.mjs`. Regenerating changed exactly these five entries.

No Buggy numbers were retuned on CPU data. The figures above describe the build as committed.

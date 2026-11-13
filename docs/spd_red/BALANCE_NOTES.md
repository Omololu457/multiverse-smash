# S.P.D. Red Ranger: balance notes

These matchup numbers are **design assessments** (Red's wins out of 10 games). They are not measured win rates.

They come from the kits as built. The stat lines below are read from `characters.js`, and the damage figures come from `docs/spd_red/COMBOS.md`, which was measured with real input. No CPU-vs-CPU win-rate sweep was run, so treat each number as the target the kit was tuned toward, not as data.

## Red's numbers at a glance

| | Value |
|---|---|
| HP | 950 (roster middle; Buggy 950, Sanji 940, Green Arrow 920) |
| Walk / run | 5.6 / 8.4 px per frame |
| Weight | 0.9 |
| Jumps | **1**: no double jump, no flight |
| Teleport (blink) | 22% of the screen, 11 frames (3 startup / 5 invulnerable / 3 recovery) |
| Blink charges | 2, each refilling in 90 frames (1.5 s) |
| Best meterless combo | raw ~250 (displayed 150) |
| Best route with Delta and Judgment | raw ~474 (displayed 284). It needs a GUILTY verdict plus 100 Delta |
| Combo scaling | 85% per hit (`spdRedComboScale`). A 4-hit route deals about 3.2× a single hit, not 4× |

## Matchups

### vs Sanji: 5-5

Sanji is a mirror in stats: 940 HP, speed 83.6 against Red's 82.4, and both are rushdown chain fighters.

- **Sanji's edge:** his kick strings are longer, and his chains have no resource cost.
- **Red's edge:**
  - A blink through a committed Diable string turns a block into a punish, and the dodge pays +5 Delta and ×1.15.
  - The crossup's 8 frames of wrong facing also break Sanji's forward-committed specials.
- Neither side zones the other out, so the match comes down to reads. **Even.**

### vs Arlong: 6-4 Red

Arlong is a 1120 HP, weight 1.3 bruiser with water zone control and the slowest dash in this group (13, cooldown 34).

- **The teleport ignores water.** A blink is invulnerable travel with no ground contact, so Arlong's water zone neither slows Red nor catches him. That removes Arlong's main way to keep a rushdown out.
- Arlong's 1.3 weight shortens Red's launch juggles, and the extra HP means Red needs about one more full route to finish.
- Arlong still wins any exchange Red starts badly, because a single Arlong hit outdamages Red's scaled strings.
- Red is favoured, but not lopsidedly: **6-4.**

### vs Buggy: favoured (about 6.5-3.5)

Buggy is a trickster and part zoner at 950 HP.

- His detached parts cover space at range. Red's 2-charge blink crosses that space in 11 frames, and the Phase Strike's 10 invulnerable frames pass through a part in flight.
- Once Red is in, Buggy has no fast reversal answer to the Jab (+1 on block) and blink pressure.
- Buggy's best plan is to spend parts while Red's blink charges are empty. That 1.5 s window is real, and it is why this isn't 7-3.

### vs Superman and Homelander: 4.5-5.5 (slightly unfavoured)

Both are 1050–1150 HP fliers with double jumps, speed 99, and dash 30. Red has one jump and no vertical blink (`vertical: false`).

- **While they fly above him,** his answers are the Sky Uppercut (cost 20), the rising kick anti-air, and the air Blaster. All of them are committal.
- **Red's comeback tools:**
  - Blink-dodging a laser or beam gives the full dodge reward.
  - On the ground they are inside Phase Strike range.
  - At under 30% HP Judgment turns GUILTY: they are sealed for 3 s and released on the far side.
- The HP gap (+100 to +200) means Red needs one extra successful route. **Slightly unfavoured**, as the brief intends for a mid-HP rushdown against the top flyers.

### vs Green Arrow: favoured (about 6.5-3.5)

Green Arrow is a 920 HP tech zoner and summoner with drones, trick arrows, and munitions.

- The drones and arrow volleys are exactly what the blink dodge rewards. Each dodged projectile pays +5 Delta, so Red's meter **grows** while Green Arrow zones.
- Green Arrow has the lowest HP in this group (920), and his drones need setup time. A Phase Strike crossup (+8 on hit) or a Delta Charge into a blink-cancel punishes the setup.
- Green Arrow is not helpless: SWEEP orders and munitions with area of effect are hard to blink through cleanly, and his double jump escapes Red's ground game. **Red favoured.**

## Why he isn't broken

1. **The blink is limited.**
   - It has 2 charges, each with a 1.5 s refill, and its invulnerability covers only 5 of its 11 frames.
   - Its 3 recovery frames are punishable when a blink is read.
   - He has no vertical blink, and the Super lockout and spent charges are real.
   - Every charge is GAME_STATE (rollback-safe and deterministic), so he cannot desync into extra charges.
2. **Damage is scaled hard.**
   - 85% per hit is stricter than the roster's standard curve, so his longest normal routes stay at about 250 raw.
   - The 474 route needs three things in one round: a 20-hit Judgment meter, the foe at or below 30% HP, and a full 100 Delta.
3. **Judgment is gated.**
   - It fires once per round and needs 20 landed hits first.
   - A GUILTY seal **absorbs 50%** of the damage taken while sealed. It is a reset tool, not a damage multiplier.
   - The release on the far side gives the foe space back.
   - INNOCENT pays only +40 Delta and one retry.
   - Any Ranger foe is always innocent, so the mirror and other Rangers can't be sealed.
4. **The Super costs everything.**
   - It needs exactly 100 Delta and spends all of it.
   - It then locks Delta gain for 3 s. The 220 beam replaces 180 only after a GUILTY verdict in the same round.
5. **His defences are average.**
   - Defence 76, weight 0.9, a single jump, and 950 HP mean he dies to a full route like everyone else.
   - The Wake reversal is −12 on block, and Deltamax is about −11 when blocked on its first active frame (blockstun 20 against 31 remaining frames).
6. **His meter has costs.**
   - Every special costs Delta (10–25), so spamming the Blaster or Rapid Fire empties his Phase Strike and Deltamax budget.
   - Dodge income (+5) requires a real read, and a whiffed blink pays nothing.

## What to watch after release

- **Dodge income vs pure zoners** (Green Arrow, Buggy). If Red reaches 100 Delta too reliably, lower `dodge.energy` from 5 to 3 in `SPD_RED_PROFILE.blink`. It is a single data field.
- **Phase Strike +8 on hit.** If the Jab link proves too easy, shorten the strike's recovery by a few frames rather than its damage.
- **Flier matchups.** If they land worse than 4.5-5.5, give the air Blaster a slight downward angle. Do not add a vertical blink: `vertical: false` keeps the framework's ground-rushdown identity.

# Enoch: balance notes

**Numbers.** They come from the real data via `harness/enoch_balance.test.mjs` (`docs/enoch/balance_results.json`). The
behaviour comes from the live tests:
- `harness/enoch_kit.test.mjs`: moves, glide, defence, matchups, determinism
- `harness/enoch_combos.test.mjs`: the five combos

**Damage.** "Raw" is stored damage. Live damage = raw × 0.6 (the global factor) × the combo scale.

## Matchups

| opponent | call | why |
|---|---|---|
| **Frozone** | **5-5** | The mirror of his own base. Frozone has more health (1150 vs 980), a bigger super (410 raw vs 330–390) and faster rushdown. Enoch has full-screen fire (Heat Lens), patches and reactions. **Decision:** Frozone is an *ice-walker* on Enoch's ICE (a skater doesn't slip on ice), so Enoch's slick zoning doesn't work on him. Enoch's FIRE and STEAM still hurt him. Decided on Enoch's side (`ICE_WALKER` in `enochState.js`); Frozone's files are byte-identical. Tested in the kit (Frozone keeps footing; fire still burns). |
| **Arlong** | Enoch favoured on paper, honestly near **5-5** | Arlong's water zones turn Enoch's FIRE into STEAM (no fire DOT there), but they also make Arlong WET for the laser (×1.25). The heaviest, highest-health fighter (1320) meets a light zoner who chips him from range. Arlong wins up close. **Decision:** (1) FIRE laid on an Arlong water zone becomes STEAM (`stats.arlongDouse`); (2) a target standing in an Arlong zone counts as wet (+25 % laser); (3) Arlong's own state is never mutated, so no Arlong file changes. Both are tested live (kit X). |
| **Superman / Homelander** | **4-6** | Flyers ignore his whole ground game: patches, slick, fire DOT and bursts only touch *grounded* fighters, and a glide can't follow them up. They have more health (1150 / 1050), top speed (99) and their own long-range heat vision. His answers are partial: the visor laser now LOCKS ON like theirs (it angles up at a flyer), the Ice Blast angles up to 30° at an airborne foe, and the rising palm is the anti-air. The laser is still gauge-limited (≤ 84 raw per full gauge, 1 s cooldown, 2.5 s overheat), so it is still a bad matchup for a ground controller. |
| **Sanji** | **5-5** | Sanji's lit **Diable Jambe** (`_sanji.dj > 0`) standing on Enoch's ICE melts it to WATER, with no burst. Fire meets ice, so Sanji is the one character who erases Enoch's ice by walking on it, but in doing so he hands Enoch WATER (the laser ×1.25 and Steam Burst set-ups). Unlit, Sanji slips like everyone else. Enoch-side only; Sanji's state is only *read*. Tested live (kit X). |

## Why he is not broken

1. **The lowest health of the cast:** 980 (Frozone 1150, Superman 1150, Homelander 1050, Arlong 1320, Sanji 1180).
   He is also light (weight 0.85).
2. **The thermal meter is the leash.**
   - From neutral, **4 Ice Blasts** (or 4 Heat Lenses) put him in a zone that **locks the other element**.
   - **10 in a row overload** him: that element is locked for 1.5 s and the meter sits at ±50.
   - Water moves exist only in the balance zone (±25), and each one pushes 20–25 away from 0, so they can't be chained
     either.
   - The meter drifts back at only 0.8 / s, so spending it has a real cost.
3. **Hard caps.**
   - 4 patches on screen (the oldest is evicted) and 3 Ice Blasts in flight.
   - The laser runs on the Homelander / Superman **laser gauge** (`beam.js`): 72 frames of beam per full gauge (refill 0.5 / frame),
     **≤ 84 raw per full gauge** (12 × 7), +12 hot; every beam is followed by a **1 s re-fire cooldown**, and running the gauge
     dry **overheats** it for 2.5 s. Its lock-on is Homelander's; its damage is still Enoch's (Homelander's is 15 per 4 frames).
   - **Walls: one at a time**, each element on its own 4 s cooldown. The Ice Wall (2.8 s, stops 3 shots, one 60-raw launch
     on eruption) and the Fire Wall (2.5 s, 8 raw every 15 frames to whoever stands in it, burns 3 shots) cost 15 thermal
     each. Raising fire on his own ice wall is a 45-raw steam burst, which costs both walls and both cooldowns.
   - The biggest burst is **72 raw**, and only from an intensity-3 patch, which takes three merges.
   - The glide lasts ≤ 4 s and ends on any hit. It is never flight; the feet never leave the floor.
   - The disc has 80 HP, and fire melts it.
4. **Cooldowns:** Deep Freeze 8 s · Tide Break 6 s · guard cancel 10 s (which also costs 25 thermal).
5. **Supers 330 / 340 / 390 raw**, all below Frozone's 410. Each locks his thermal for 3 s afterwards.
6. **Standard combo scaling.** The brief asked for 85 % per hit; he uses the engine's shared curve (1 → 0.65 plus starter
   weighting), so his combos can't out-scale anyone else's. The five brief combos do 78–153 live without meter and 252
   with Thermal Shock (`COMBOS.md`).
7. **Set-up dependency.** His best damage (bursts, wet ×1.25, Steam Burst, Tide Break) needs patches placed first. Every
   patch is visible, timed (3–7 s) and walkable-around.

## Frame data: what the brief gave, and the values it left open

The brief's values, verified live against a blocking dummy:
- Jab +1, Straight −3, Heavy −5, wake-up reversal −12.
- The authored blockstun adds `BLOCK_SYNC = 2`, because the engine clears the attacker's move 2 frames after an equal
  blockstun.

**Left open in the brief, chosen here** (all punishable or neutral, none plus):

| move | on block | reason |
|---|---|---|
| low sweep | −2 | a light low; safe-ish but not a frame trap |
| rising palm | −4 | the anti-air; punishable up close if blocked |
| air strike | 0 | air normal (landing recovery decides) |
| slide | −6 | travels and lays ICE; punishable |
| Ice Blast | −6 | the projectile is the point, not the recovery |
| Frost Floor | −8 | a low eruption + ICE patch |
| Deep Freeze | −10 | a freeze on hit, so a clear punish on block |
| Heat Lens (tap) | −6 | hitscan, full screen |
| Scorch Sweep | −8 | lays FIRE ahead |
| Steam Burst | −10 | 85 raw; water-only |
| Condense | −4 | slow orb, set-up tool |
| Ice Disc / Tide Break / super | 0 / 0 / 0 | not attacks that are blocked in the usual sense (platform, a patch conversion, the freeze-contract cinematic) |

## Deviations from the brief (and why)

| brief | built | why |
|---|---|---|
| 85 % per-hit combo scaling | the engine's standard curve | parity with the whole roster |
| ICE + FIRE burst "knockdown" | a juggle-able pop (vy −11, hitstun 34) | a hard knockdown ends combos 2 and 3 at the burst |
| Heavy "launches" | launchVy −12 (a pop of about 85 px) | a −19 launcher put the foe out of reach of combo 1's Ice Blast |
| Ice Blast flat | aims up ≤ 30° at an *airborne* foe only | combo 1 (catches the popped body); still flat on the ground |
| (glide passes the foe) | an ICE glide passes through (physics pass-through hook); a fire glide collides | combo 3's "Ice Glide past" |
| super from full meter | also cancellable out of a clean committed special (Tide Break) | combo 5 |
| Frozone untouched | still byte-identical; Frozone is treated as an ice-walker on Enoch's ice (Enoch-side rule) | a skater on ice; keeps the mirror 5-5 |

## 2026-11-16: Ice Stance, the channel, Charge inputs, effects
- **Tap Charge** = ICE STANCE ⇄ elemental. In Ice Stance he runs Frozone's own kit (frozoneState host table, `registerFrozoneHost('enoch')`):
  strike chain, Ice Lance, Glacier Rush, Rising Glacier, Black Ice, Icebreaker, Ice Wall, Chill → Freeze → Shatter, Ice Flash /
  Ice Stream / Ice Glider, and WHITEOUT (Frozone's ultimate on his poses). Frozone specials cost Enoch COLD thermal, not meter.
- **Holding Charge no longer starts a glide** (owner: "that sucks"). The glide still starts from a double-tap on his own ICE or a
  guard cancel, and a held Charge still carries it.
- **Down + Charge (hold)** = channel COLD, **Up + Charge (hold)** = channel HEAT: rooted, 0.75 / frame toward ±70 (short of an
  overload), not during an overload. **Forward + Charge** = Ice Disc (was Down + Charge).
- Ice Blast uses the sheet's standing point-and-shoot frames; the shard is drawn as a crystal spike in flight.
- Effects from the owner-supplied effect sheets (tools/enoch/cut_vfx.py → assets/enoch/vfx, enochVfx.js), render-only:
  ice burst on shard hits / shatters, fire pillars on the Fire Wall, fire puffs on embers, water splashes, channel auras.

## 2026-11-16: lasting effects + fire / ice twins
- **Fire / ice twins** (element follows temperature outside the ±25 balance band): hot → Ice Blast fires a FIRE SHARD
  (fireball, energy, heats him), Frost Floor = FLAME FLOOR (fire patch); cold → Heat Lens = FROST LENS (the ice laser eyes:
  blue beam, frosts the floor, cools him). His dash and slide leave a FIRE trail when hot, an ICE trail when cold (none in
  balance); a fire dash over his own ice = the thermal burst. Ice Wall / Fire Wall, Deep Freeze / Scorch keep their inputs.
- **Lasting effects** (STATUS in enochData; kept in his state per victim, so replays / snapshots carry them):
  BURN: +1 per clean fire special, +0.34 per held-laser tick, +0.5 per Fire Wall tick, +0.25 per fire-patch tick. From 2 stacks
  3 raw × (stacks − 1) every 0.5 s. CHILL: the same amounts from ice; from 2 stacks every step is 12 % shorter per stack above 1;
  5 = ICE BOX (80 f frozen, then 4 s before another box). Stacks last 4 s, then fall one per second. Fire on ≥ 2 chill =
  STEAM SHOCK (14 × chill), ice on ≥ 2 burn = QUENCH (10 × burn). Blocked hits build nothing.
- HUD: the opponent's health bar takes a red (burn) / blue (chill) wash that deepens per stack, with BURN ×n / CHILL ×n · SLOW %
  / ICE BOX written on it. In the world: flames on a burning foe, ice crystals on a chilled one, an ice block around a boxed one.

## 2026-11-16: air slide (ice / fire) with a limit, fire cage, trap sprites
- **AIR SLIDE** (elemental stance): jump, then double-tap → he pours a slab of his element and slides along it (13 px/f for
  up to 30 f, a gentle drop; Down angles it down). ICE = an icicle slab; when hot (> +25) FIRE = a flame streak. One per jump;
  a pool of 3 that refills one every 2 s **only while he is on the ground**, so jump → slide → jump → slide runs dry (the
  4th in a row is refused). Passing through the foe = one hit (raw 40) that chills / burns. Costs 6 thermal of its element.
  Ice Stance's Ice Stream (Frozone's air double-tap) spends the same pool (frozoneState host hook `air`; Frozone unchanged).
- **FIRE CAGE**: burn reaching 5 traps the foe in a column of fire for 70 f (held in place, 5 raw every 10 f), then the burn
  drops to 2; 4 s before another cage. The ICE BOX's twin.
- Trap art comes from the owner-supplied sheets (tools/enoch/cut_vfx.py): the fire-eruption columns = the cage; the
  icicle-slab vector sheet (navy background keyed out) = the ice box's lid and the air ice-slide slab.

### 2026-11-16 (later): the AIR CHAIN replaces the 3-charge pool
- Owner: the air slide should be "infinite-ish" — slide, jump, slide again, 4-5 times before it gets too hard. Now: Jump
  during a slide or inside the hop window after it = a HOP (works with no air jumps left) that re-arms the slide.
  Each link: hop −14 × 0.88^(link−1) px/f, slide 30 f −10 % a link (min 14), hop window 24 − 4 × (link−1) frames
  (24, 20, 16, 12, 8, 4). 6 links at most; landing resets the chain. A double-tap without a hop / jump first is refused.

### 2026-11-16 (evening): one-direction inputs, meteors, snowman, melting, longer effects
- Owner: "I literally can't do some of the moves … arrows pointing at an angle". Every move now has a ONE-direction input
  (motions still work): Special = Ice Blast · Forward = Heat Lens · Down = Frost Floor · Back = Deep Freeze · Up = METEOR;
  Back + Heavy = Ice Wall (Fire Wall when hot) · Forward + Heavy = Fire Wall · Back + Charge = SNOWMAN; Ultimate = Super.
  Special in the air = the meteor (Up is the jump key on keyboard, so Up + Special works either way). Neutral Special is
  Steam Burst when water is unlocked.
- ICE METEOR (Up + Special): raw 70 boulder on the foe's spot, chills, ICE patch; 5 s cooldown; a floor ring telegraphs it.
  Hot → FIRE METEOR shower: 3 comets × raw 30, 95 px apart, 10 f stagger, burn + FIRE patches.
- SNOWMAN (Back + Charge): solid (Ice Wall body rules), 5 shot HP, 12 s, melts over 1.5 s into a WATER puddle; fire next to
  it ×4 faster. 5 s cooldown. One at a time, independent of the wall.
- MELTING: an ice patch / ice wall that runs out leaves a WATER puddle (80 % width, calm 1 s so it never refreezes on the
  spot); the last 2.5 s of ice show it thinning + dripping; melted air-slide slabs drip.
- LONGER: ice patches 15 s (was 7), fire 10 s (5), water 9 s; Ice Wall 8 s (2.8), Fire Wall 6 s (2.5); slabs 7 s;
  burn / chill stay 10 s after the last hit (4) then fall a stack every 2 s (1); ice box 2 s (1.3); fire cage 2 s (1.2).
- AIR CHAIN windows widened: 40, 34, 28, 22, 16, 10 frames (was 24 … 4) — 4-5 links comfortable, 6 is the cap.

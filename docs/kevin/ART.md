# Kevin sprite and skin notes

The supplied 2,118 × 4,936 RGBA sheet by **regulardor8go** remains at its original path. The [frame ledger](frame-map.json) records its SHA-256 and native crop coordinates. The cropper keys the exact flat background RGB (52, 80, 116) inside measured sprite bands and keeps detached parts inside authored cells. The existing renderer uses nearest-neighbor sampling. Each selected skin needs one versioned atlas for all its materials, forms, cars and effects. Palette generation runs offline. Star and glitter pixels use a fixed pattern inside opaque recolored regions.

| Ledger group | Playback and reuse |
|---|---|
| intro, win, lose | Car arrival, opening door, Kevin exiting, boarding, car departure and defeat. Cars use wheel baselines with horizontal motion across successive frames. |
| idle, run, jump, guard | Human stance, walk/run/dash, jump, fall, guard and Mine Now. The guard row includes the supplied green intake marks. |
| punch, kick, launch, sweep, air | Light chain, heavy, long reach, sweep, launcher, air light and Demolition Drop. Motion arcs stay in their authored cells. |
| apply, shed, carFlash, carSample, sampleCar | Coating application, expiry, carried alloy animation, field car sampling, and the parking-car effect. Late car-alloy frames also drive Green Machine. |
| coatRun, coatJump, coatKick, coatLaunch, coatSweep, coatAir, coatPunch | Taydenite’s movement and attack template across material palettes. Coated idle uses the final two material-change poses. |
| quarry, boulder, debris | Crouch, lift, throw, recovery, the live boulder, and five frames of visual fragments. The human variant recolors the supplied coated body and keeps the rock pixels. |
| hurtSet | Hurt, tumble, downed, and rise. Coated hurt, guard and downed art use human pose silhouettes with material palettes. |
| transform, revert | Supplied green silhouettes and the asymmetrical mutant, plus collapse, human recovery and mutant defeat. |
| mutantIdle, mutantMove, mutantClaw | Ultimate stance, winged movement and jumps, claws, heavy and launcher. |
| mutantShard, shard | Shard Volley and released particles, plus compatible lunge and release poses. |
| mutantHalo, mutantArc | Rising ring and yellow discharge, including separated rings and the full beam. Arc boot anchors exclude low beam pixels. These groups also drive the cash-out cinematic. |
| mutantAir, flame | Aerial Claw, Colossus Drop and Aerial Furnace. Separate flames add no hit volumes. |
| samples | Four palette demonstration stances, referenced for the silver, green, purple and dark material palettes. |

Large portraits, red labels, an annotated show still, swatches, credits and divider pixels are excluded from animation. Select portraits come from idle. The sheet has no dedicated overhead throw, grounded unwinged mutant walk, crouching mutant, mutant guard reaction, or unique descending Colossus Drop. These moves use the compatible poses above. Per-cell hand sockets are registration estimates within measured crops. Fixed form-specific simulation sockets keep capture geometry identical across skins.

The lower form’s blue cloak and pale asymmetric arm with magenta spikes match **Ultimate Kevin** from *Ultimate Alien*. The purple swatch is labeled **Sotoraggian Armor** on the sheet. The comic describes Kevin absorbing SevenSeven’s armor. The interface calls the coating **Alien armor**. Names, conditions, crossover skins and time limits are game adaptations. [Classic Kevin](https://ben10.fandom.com/wiki/Kevin_Levin_(Classic)) · [Ultimate Kevin](https://ben10.fandom.com/wiki/Ultimate_Kevin) · [Wanted: Kevin Levin](https://ben10.fandom.com/wiki/Wanted:_Kevin_Levin)

## Skin sources and inspiration

Every skin entry credits the supplied sheet. Hair, exposed skin, clothing, coatings, different mutant parts, the car and effects are treated by region. Crossover palettes are cosmetic inspirations.

| Selectable skin | Inspiration |
|---|---|
| Alien Force — Default | Supplied Alien Force-era Kevin, green car and original mutant colors |
| Alien X — Event Horizon | Alien X, near-black blues, clipped stars, silver and mint |
| Upgrade — Blacktop | Upgrade, black and neon green |
| Chromastone — Prism Heist | Chromastone, amethyst and magenta crystal |
| Superman — Tomorrow’s Alloy | Superman, royal blue, crimson and gold on the inherited silhouette |
| JJK — Cursed Rose | Jujutsu Kaisen, rose hair and crimson clothing and energy |
| JJK — Limitless Chrome | Jujutsu Kaisen, pale hair, navy and icy blue |
| Winning Valkyrie — Victory Alloy | Winning Valkyrie, cobalt, red, white and gold |
| Anodite — Afterglow | Anodite energy colors, violet and warm magenta |
| Ghostforge | Original pale hair, opaque spectral teal and mint |
| Black Gold — Gilded Outlaw | Original charcoal and brushed gold |
| Opal — Glitterstorm | Original pearl, lavender and clipped pink/cyan sparkle |

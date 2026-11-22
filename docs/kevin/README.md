# Kevin Levin

Select **Ben 10 → Kevin Levin**. Kevin has 1,050 HP, shared dash and double jump, a 100-point Power meter, one material coating and one separate projectile slot. The character picker remembers each local side’s last Kevin palette through the account save.

## Controls and moves

Forward and back are relative to facing. Fresh presses drive attacks. Keyboard directions are WASD for P1 and arrows for P2. Double-tap a horizontal direction to dash. Cross jumps, including the shared second jump. P1 presses W and P2 presses Up to jump. Press Up and the action together for an up-modified keyboard move. Circle guards and Options pauses. Keyboard guard is **; / /** and pause is **Esc**.

| Action | DualSense | P1 / P2 keyboard | Human or coated | Ultimate Kevin |
|---|---|---|---|---|
| Light chain | Square three times on clean hits | J / 1 | 48, 48, 64 | Amalgam Claws 63, 65, 82 |
| Heavy | Triangle | K / 2 | 95 | Mutant Heavy 118 |
| Reach | Forward + Triangle | Forward + K / 2 | Forged Reach 110 | Lunging Claw 133 |
| Launcher | Up + Triangle | I / 3 or Up + K / 2 | 78 | 96 |
| Low | Down + Triangle | Down + K / 2 | Sweep 65 | Mutant Low 84 |
| Air light | Air Square | Air J / 1 | 60 | Aerial Claw 79 |
| Descending heavy | Air Triangle | Air K / 2 | Demolition Drop 105 | Colossus Drop 128 |
| Grab | Ground L1 | O / 6 | Throw 100 with sampling on approved surfaces | Mutant Throw 122 |
| Infuse | Ground Back + Triangle, loaded | Back + K / 2 | Borrowed Thunder 155 | Borrowed Thunder 178 |
| Capture or return | Neutral R1 on ground or in air | L / 4 | Mine Now or Return to Sender | Same |
| Advancing special | Ground Forward + R1 | Forward + L / 4 | Shoulder Drive 112 or material signature | Arc Torrent 174 |
| Up special | Ground Up + R1 | Up + L / 4 | Scrap Quarry 135, costs 15 Power | Halo Launcher 148 |
| Down special | Ground Down + R1 | Down + L / 4 | Apply Sample, costs 8 Power | Shard Volley, 3 × 54 |
| Back special | Ground Back + R1 | Back + L / 4 | Field Absorption | Claw Counter, 138-raw riposte |
| Directional air special | Direction + R1 in air | Direction + L / 4 | Forward gives Aerial Drive 91. Other directions are unused. | Any direction gives Aerial Furnace 156 |
| Select sample | Ground L2 + R1 | P + L / 7 + 4 | Cycles carried sample | Sample selection is disabled |
| Charge | L2 | P / 7 | Shared charge | Power charging suspended during the form |
| Ultimate | R2 | U / 5 | Absorption Overload, costs 100 Power | Ground R2 cashes out the remaining duration |

Damage in the table is raw. Ground Back + Triangle uses Heavy with an empty slot. Each directional aerial special has one use per airtime. Neutral R1 keeps capture and release in both forms. The sample chord is a fresh R1 press with L2 held and consumes that special edge.

## Material and projectile rules

Coatings last 720 active simulation ticks after contact. The HUD displays the active coating and carried sample separately. Down + Special applies a carried sample on any stage. Grounded Back + Special samples midfield props marked **Fe**, **▰**, and **Al** within 68 world units horizontally and 12 vertically. The props supply steel, stone and Kevin’s car alloy. A failed touch leaves the coating and timer intact. A successful grab against Iron Man, Iron Man 2, Cyborg, Elastigirl, Vilgax, or a coated Kevin samples their approved steel, rubber, alien armor or active material surface. The source keeps its equipment and stats, and the throw uses shared tech rules.

| Material | Forward special | Raw | Property |
|---|---|---:|---|
| Steel | Wrecking Ram | 134 | One light hit of armor from tick 5 through contact. Weak eligible shots can spend the same protection. Damage still applies. An armored rush with a clean hit can cancel into Heavy. |
| Car alloy | Green Machine | 122 | Faster and longer lunge at 11 world units per travel tick. Clean contact opens a Launcher cancel. |
| Taydenite | Crystal Guillotine | 143 | Held-guard stun floors of 24 ticks on Guillotine and 21 on Forged Reach. Flawless guard retains its reward. |
| Rubber | Ricochet Riot | 120 | One backward and upward rebound on a clean grounded hit. Air Light can cancel the rush into pursuit. |
| Alien armor | Bounty Breaker | 138 | Half chip on frontal eligible energy shots up to 110 raw during guard. The advancing strike has a discharge accent. |
| Stone | Quarry Breaker | 150 | One light hit of armor during grounded Heavy, Forged Reach, Sweep or Quarry Breaker. Quarry Breaker strikes low. |

**Mine Now** starts in four ticks, catches during ticks 4–13, and recovers for 18. Its cooldown is 64 ticks from commitment. Face the shot and bring it through Kevin’s raised-hand volume. An empty slot accepts the first eligible shot in the shared newest-first resolution order. Intake consumes the original before damage and impact. The slot stores its family, normalized raw value and an expiry 480 ticks after capture. The HUD shows **SHOT STORED** and a family icon.

**Compatible attacks** include Gwen’s Mana Bolt and Blue Vortex, Vegeta’s grounded Down + Special Ki Blast including the charged tier, Beerus’s neutral Ki Blast, and Starfire’s ordinary grounded Starbolt. Return to Sender keeps the family’s pink, cyan, gold or green visual and fires a new Kevin-owned projectile with 110% of the normalized base raw, rounded and clamped to 60–160. Borrowed Thunder adds 60 raw to Heavy. Either spends the same charge on commitment, including a whiff. Material or form changes leave the charge timer intact.

Beams, ultimates, melee, grabs, summons, stage hazards, attached and returning weapons, reflected attacks, and Kevin’s own returned shots are excluded. Opt-in projectile metadata is independent of palette selection.

## Absorption Overload

A full Power bar starts a vulnerable 28-tick morph. Ultimate Kevin lasts 720 active ticks with his own move table and 12% faster shared movement. The morph clears the coating, preserves HP and jump state, and keeps any stored shot through its original expiry. Reversion uses the green collapse cycle. Arc Torrent allocates 174 raw to one beam contact. Halo Launcher is an anti-air and Shard Volley has three independently colliding shots. Aerial Furnace descends into its flame attack.

Ground R2 commits **Everything You Threw at Me**. The opener can whiff or be guarded. Either consumes the remaining form. On a clean hit, the cinematic lifts the target with a ring and discharges before resolving one damage budget on impact. Damage scales from roughly 180 to 360 raw with surrendered time.

## Art and measurement

- [Frame ledger](frame-map.json) gives native source rectangles, frame order, default durations, local foot and hand anchors, projectile sockets and effect bounds. [Move data](../../kevinData.js) includes combat-specific contact timing.
- [Frame contact sheet](contact-sheet.png) covers human, coated and Ultimate Kevin plus effects. [Palette contact sheet](skin-contact-sheet.png) alternates bright and dark backgrounds. It shows human, Taydenite, steel, alloy, rubber, armor, stone, Ultimate Kevin, car and discharge.
- [Art and skin notes](ART.md) document the group mapping, art reuse and sources. [Verification and balance](VERIFICATION.md) records actual HP loss and route conditions.

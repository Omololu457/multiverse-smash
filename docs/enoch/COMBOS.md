# Enoch: combos

Every combo below was performed in **training mode** by `harness/enoch_combos.test.mjs`.

**How the harness performs them**
- It uses real raw controls through `writeRawControls`.
- Motions are entered as numpad digits, one frame each, facing-relative.
- Each button goes in on the frame after the previous move registered a clean hit, the way a buffered player would do it.
- The opponent is Frozone with full health.

**What counts as a pass**
- Every listed hit lands.
- The opponent never recovers (grounded and out of hitstun, freeze and knockdown) between the first and the last hit.

Live damage is after the engine's 0.6 roster damage factor and combo scaling. The numbers are written to
`docs/enoch/combo_results.json` on every run.

Notation: `↓↘→` = 236, `↓↙←` = 214, `→→` = 656 (a forward double-tap). L / H / S = Light / Heavy / Special;
Charge = L2 / the Charge key.

| # | combo | inputs | hits (live damage) | total |
|---|---|---|---|---|
| 1 | Jab → Straight → Heavy → Ice Blast | L, L, H, 236 + S | Jab 24 · Straight 37 · Heavy 48 · Ice Blast 27 | **136** |
| 2 | Frost Floor → Heat Lens on the patch → burst → Straight → Heavy | 22 + S, 656 + S, → + L, H | Frost Floor 21 · Heat Lens + ICE/FIRE burst 61 (same frame) · Straight 31 · Heavy 40 | **153** |
| 3 | Ice Glide past → Fire Glide → reaction → Steam Burst | hold Charge (skate through), ← to turn, H (fire glide), 236 + S | ICE/FIRE burst 27 · Steam Burst 56 | **83** |
| 4 | Deep Freeze → Scorch Sweep → Tide Break | 214 + S, 214 + H, 656 + H | Deep Freeze 24 (0.7 s freeze) · Scorch 34 · Tide Break burst 20 | **78** |
| 5 | three patches → balance → Tide Break → THERMAL SHOCK | (ICE, FIRE, WATER down; meter at 0) 656 + H, 236236 + S | Tide Break 18 · Thermal Shock 54 + 72 + 108 | **252** + steam |

## How each one works

**1. Jab → Straight → Heavy → Ice Blast.**
- Light chains to Light (Jab → Straight). From the Straight, Heavy chains to the frost palm.
- The palm launches into a pop (launchVy −12). The Ice Blast is special-cancelled from the palm.
- The blast **aims up, at most 30°**, at an airborne opponent in front of him, so it catches the popped body. On the
  ground it flies flat.

**2. Frost Floor → Heat Lens on the patch → burst → Straight → Heavy.**
- Frost Floor is one low eruption that lays ICE under the opponent.
- The Heat Lens tap lays FIRE at a grounded target's feet. FIRE on his own ICE is the ICE + FIRE reaction: the 45 burst
  pops them (vy −11, hitstun 34) on the same frame as the lens hit.
- A clean Heat Lens links into a Light; Forward + Light gives the Straight, which chains into the Heavy.

**3. Ice Glide past → Fire Glide → reaction → Steam Burst.**
- An **ICE glide skates through** the opponent; this is the physics pass-through hook, the same kind Dash Parr, Zoro and
  Sanji use. A fire glide still collides.
- Holding back makes the ice glide turn. Heavy switches to a fire glide, whose FIRE trail runs over the ICE trail he
  left under the opponent, and the burst pops them.
- The burst leaves WATER and the meter sits in the balance zone, so `236 + S` out of the glide is **Steam Burst**, with
  the glide bonus of +10 %.

**4. Deep Freeze → Scorch Sweep → Tide Break.**
- Deep Freeze applies the shared freeze (`_supFrozen`, 0.7 s, +15 % damage taken).
- Scorch special-cancels from it and lays FIRE.
- Tide Break turns every patch to WATER, bursting under the frozen or reeling opponent.
- Deep Freeze (22 cold) and Scorch (20 hot) leave the meter near −2, inside the balance zone, so Tide Break is unlocked.
  Its 25 push away from 0 lands as it ends (the meter finishes near −27).

**5. Three patches → balance → Tide Break → THERMAL SHOCK.**
- With ICE, FIRE and WATER down and the meter in the balance zone, Tide Break bursts under the opponent.
- The super cancels out of a clean Tide Break (Tide Break is a committed move, but the super is allowed out of any clean
  special). At balance it is **Thermal Shock**, 390 raw.
- The meter is locked for 3 s, and the super leaves WATER + STEAM behind.

## Notes and deviations (also in BALANCE_NOTES.md)

- **Scaling.** The brief asks for 85 % per hit. Enoch uses the engine's **standard combo curve** (1, 0.92, 0.84, 0.76,
  0.70, 0.65 + starter weighting), the same as every other character, so his combos can't out-scale the roster. The
  counter still resets 1.5 s (90 f) after the last hit.
- **The burst is a pop, not a hard knockdown.** The brief's "knockdown" is played as a juggle-able pop (vy −11, hitstun
  34). A true knockdown would end combos 2 and 3 at the burst.
- **Frost Floor hits once.** The eruption volume is the only hitbox; it had been double-hitting with a melee box.
- **Heavy (frost palm) launch.** launchVy −12 (a pop of about 85 px) instead of a full −19 launcher, so the Ice Blast in
  combo 1 can follow.
- **Ice glide passes through** (combo 3's "past"). A fire glide does not.

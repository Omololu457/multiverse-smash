# Ninja Storm Rangers — Balance Notes

One fighter (`ninja_storm_rangers`), two stances: **Red / Shane** (Air) and **Yellow / Dustin** (Earth). The match always
opens in Red. Anchor: S.P.D. Red (health 1200, the same speed numbers, the same roster-parity tier ×1.6).

## Honesty label: Shadow Clone and Kawarimi are ORIGINAL

**Shadow Clone** and **Kawarimi** (substitution) are a mechanic invented for this game, with a ninjutsu flavour. They are
**not show-accurate**. Power Rangers Ninja Storm never shows Shane or Dustin making literal clones or doing a
log-substitution swap. What *is* from the source: the Wind Ninja Academy, Air / Earth elements, Ninja Swords + Hawk Blaster
(Shane), Lion Hammer (Dustin), the Hawk / Lion Zords and the Lightning upgrades (see `RESEARCH.md`). Ninja Vanish is the
show's ninja teleport, using S.P.D. Red's Blink numbers.

## Why this is not "two characters for the price of one"

Everything that makes a stance strong comes out of **one shared pool**, and swapping has a real price:

1. **One Focus bar.** Both stances spend the same 0–100 Focus. It is carried across swaps, never refilled by a swap, and
   both kits charge the same costs (Blade 12, Wave 14, Shuriken 8, Lock-On 18, Clone 20, Kawarimi 10, Mode 30,
   Ultimate 100). Pressuring in Red and then in Yellow spends from the same bar, not two.
2. **One health bar.** Like Ben 10's shared pool, a swap never heals, never resizes, and never resets damage taken.
3. **Two Vanish charges, total.** The Ninja Vanish charges (2, 90 f refill each) belong to the fighter, not the stance.
   A swap does not refill them.
4. **The swap clears the old stance.** Like Ben's `clearBenFormState`: a live **Shadow Clone is destroyed** (with its
   queued echoes), the **active Mode ends**, and a held lock-on aim is dropped. Swapping mid-pressure throws away a clone
   you paid 20 Focus for, and a Mode you paid 30 for.
5. **30-frame lockout** after each swap (no swap-back loops), and the swap is **refused** in hitstun, mid-special /
   Ultimate / Mode charge-in, and during the lockout. It cannot be used as a stun escape. Only Kawarimi can (and that needs a
   clone, Focus and its 90 f cooldown).
6. **The same raw numbers.** Both stances share the normal frame data (measured: Jab→Straight→Kick = 118, Tackle→Shoulder
   Check→Stomp = 118) and the special slots. The stance changes *what the moves do around the numbers* (the Mode's bonus,
   weight, the Lock-On's behaviour), not the damage table.

What the swap *buys*: a different timed Mode and the ability to keep a combo going in the other kit (see `COMBOS.md`:
Red launcher → ↓↓ K → Dustin air finisher, a true combo). The swap is free (0 Focus) and instant. That is fair because
it is a 2-input dial with a 30 f lockout and clears the old stance's state.

## Focus economy, both stances

| Source | Focus |
|---|---|
| Landed hit | +4 |
| Blocked hit | +2 |
| Passive | +1 every 40 f (+1 extra per tick in Lightning Mode) |
| Vanish dodge reward | +5 (and +15% on the next attack within 20 f) |

The gains do not depend on the stance. The only stance-specific economy difference is Lightning Mode's +1 extra passive tick
(4 s ≈ +6 Focus), which pays for Red's offensive Mode. Quake Mode instead gets the defensive side (−10% damage taken).
After an Ultimate: 3 s (180 f) Focus lockout.

## The two timed Modes: comparable power budgets

Same slot (Light + Heavy + Special), same cost (30), same duration (240 f) and the same cooldown (600 f).

| | Lightning Mode (Red) | Quake Mode (Yellow) |
|---|---|---|
| Offense | +15% damage (measured: 118 → 136 on the same string) | heavy: ×1.6 knockback + knockdown (space + oki, no extra damage) |
| Defense | none | −10% damage taken |
| Resource | +1 extra Focus per passive tick | none |
| Mobility | Vanish startup −1 f (3 → 2) | none |

Lightning trades for damage and tempo. Quake trades for durability and positioning. Each Mode gets one primary
stat (±10–15%) plus one utility rider.

**Decision: ONE shared Mode cooldown.** The 600 f cooldown slot belongs to the fighter, not the stance. Popping Lightning
then swapping does **not** let you pop Quake straight away. Per-stance cooldowns would double the Mode uptime of anyone who
swaps, which is the "two characters" problem above. (The swap also ends the active Mode, see point 4.)

## Defense (Phase 6)

- **Ninja Vanish** (shared charges): 3 / 5 invulnerable / 3 frames, crossup, dodge reward.
- **Kawarimi** (shared, needs a clone): 10 Focus, 90 f cooldown, 6 f invulnerable, works out of hit / block stun.
- **Backstep** (Back + Heavy): the closest non-attack pose per stance (the R27 back-roll frames), 6 f invulnerable.
  **Decision: ONE shared 300 f cooldown** across both stances, for the same reason as the Mode: a per-stance cooldown would
  give a swapping player two invulnerable hops per 5 s.

## Weight

The one base stat that differs: **0.8 Red, 0.85 Yellow** (Dustin is canonically the tougher one). Knockback taken scales
with the stance in force *when the hit lands*. Walk / run / jump are identical in both stances (walk 5.6, run 8.4: as fast as
S.P.D. Red).

## Ultimates

THUNDER FIST FINISH (Red) and LION ZORD SLAM (Yellow): 100 Focus, the same structure and total. Solo it is one giant-fist
impact of 260 raw. With a live Shadow Clone it becomes a **TWIN TECHNIQUE**: two simultaneous impacts of 130, from both sides,
unblockable. The total is unchanged; the clone buys the two-sided, unblockable delivery, not extra damage.

## Naming

The brief's Phase 1 asks for the select name "Ninja Storm Rangers" (or the project's convention for a two-person fighter).
Phase 8 asks for name "Shane Clarke & Dustin Brooks" / displayName "Ninja Storm Rangers". The project's existing
dual-identity fighter (`shisui_itachi_kids`) uses `name` as the select / HUD label and `title` as the subtitle, and the render
check picks the roster entry "Ninja Storm Rangers". So: `name` = `displayName` = **"Ninja Storm Rangers"**, `fullName` =
`title` = **"Shane Clarke & Dustin Brooks"**. The HUD shows "NS Rangers · Red / Yellow" for the active stance.

## Determinism

No `Math.random` / `gameRng` anywhere. The kit needs no simulation randomness. Sound noise uses a seeded LCG, and anything
random goes through `ninjaHash` (match seed, frame, player index). All sim state (`_academy`, `_nsr`, `_ranger`) is
plain JSON in the replay checkpoint. The clone ghost, tints, streaks, dust and the Mode aura are render-only.

# MOVELIST — Multiverse Smash
### Beta-Tester Onboarding Guide

Welcome! This is everything you need to pick up a controller (or keyboard) tonight
and actually play. It covers all **8 sprite-complete fighters**:

**Goku · Gojo · Megumi · Sukuna · Toji · Naruto · Sasuke · Rick.**

Every button, cost, and damage number in this guide was pulled straight from the game
code (`characters.js`, `abilities.js`, `input.js`) — nothing here is guessed. Damage
shown is the raw move value; a few projectiles are scaled down ~40% on impact (noted
where it matters). If a number here disagrees with what you feel in-game, trust the
game — then tell us.

> **Controller users:** you're the primary audience tonight. The controller column is
> the one to read. Keyboard is listed alongside for anyone on a laptop.

---

# 1. UNIVERSAL CONTROLS

These apply to **every** character. Learn this once and it works for all 8.

## The button map

The controller layout below is the **real** DualSense / standard-gamepad mapping the
game reads (verified in `input.js` `pollGamepad` — the on-screen legend some builds
print is out of date; this table is what the code actually does).

| What you want to do | Keyboard (Player 1) | Controller (DualSense / standard pad) |
|---|---|---|
| **Move left / right** | `A` / `D` | **D-pad ←/→** or **Left stick** |
| **Jump** | `W` | **✕ (Cross)** — *or* push **Up** |
| **Crouch / Block** | hold `S` | hold **Down** (D-pad or stick) |
| **Dash** | double-tap `A` or `D` | double-tap **D-pad ←/→** (or flick the stick) |
| **Light attack** | `J` | **☐ Square** |
| **Heavy attack** | `K` | **△ Triangle** |
| **Up-attack (launcher)** | `I` | hold **Up** + **☐ Square** (or **△ Triangle**) |
| **Air attack** | `J` while airborne | **☐ Square** while airborne |
| **Down-air (spike)** | `S` + `J` while airborne | **Down** + **☐ Square** while airborne |
| **Special move** | `L` | **R1** |
| **Ultimate / Domain** | `U` | **R2** |
| **Grab / throw** | `O` | **L1** (hold) |
| **Charge meter / Toggle** | `P` | **L2** (hold = charge · tap = toggle) |

Notes that trip people up:

- **○ Circle is not used.** Don't hunt for a move on it.
- **Up does two things.** *Up alone* = jump. *Up + an attack button* = the up-attack
  launcher (the up does **not** also make you jump — the game sorts this out for you).
  On keyboard the launcher is its own key, `I`.
- **Block = hold Down** (`S` / D-pad Down). There's no separate block button; crouch and
  block are the same input. You can't block while charging your meter.
- **Dash is a double-tap**, never a hold. Tap a direction twice quickly. Several
  fast characters (Gojo, Sukuna, Toji, Sasuke, Rick) turn a double-tap **toward** the
  opponent into a **teleport behind them** instead of a normal dash — see their sections.
- **L2 is press-and-hold to charge, quick-tap to toggle.** A quick tap flips a
  character-specific switch (Gojo's Infinity, Sasuke's Absolute Defense). Holding it
  charges your energy meter (or, for charge-specials like Naruto's, powers up the move).

## Motion inputs (how specials are chosen)

Most characters have several specials that **all share the Special button** (`L` / **R1**).
Which one comes out depends on the **direction you tap just before** pressing Special.
Directions are **relative to the way you're facing**, so they work the same on both sides
of the screen.

| Shorthand | Meaning | Keyboard | Controller |
|---|---|---|---|
| **Neutral** | no direction, just press Special | `L` | **R1** |
| **F** (forward) | toward the opponent | `D`→`L` (or `A`→`L` if facing left) | push stick/D-pad **toward** foe, then **R1** |
| **B** (back) | away from the opponent | away-key → `L` | push **away**, then **R1** |
| **↓** (down) | down, then Special | `S`→`L` | **Down**, then **R1** |
| **↓F** ("quarter-circle forward" / *qcf*) | down, roll to forward, Special | `S` then `D` then `L` | roll stick **Down → toward foe**, then **R1** |
| **↓B** ("quarter-circle back" / *qcb*) | down, roll to back, Special | `S` then `A` then `L` | roll stick **Down → away**, then **R1** |
| **F,F** | tap toward twice | `D` `D` `L` | tap **toward** twice, then **R1** |
| **Hold P + Special** | hold charge, then Special | hold `P` + `L` | hold **L2** + **R1** |
| **Block + Special** | hold Down (block) then Special during an incoming hit | hold `S` + `L` | hold **Down** + **R1** |

**New to fighting games?** A "quarter-circle forward" just means: press **Down**, then
sweep to **the direction you're facing**, then hit Special — one smooth roll of the
stick/keys. Don't overthink it; a quick down-then-forward tap works.

---

# 2. HOW AIR COMBOS WORK (read this once)

Every character in the game shares the same air-combo engine, so the basic juggle is the
same for everyone:

1. **Launch them.** Land your **up-attack** (`I` / **Up + Square**). It knocks the
   opponent into the air *and* the game **auto-cancels your landing lag** so you're free
   to act immediately.
2. **Chase.** **Jump** up after them (`W` / **✕**).
3. **Hit them in the air.** Press **Air attack** (`J` / **Square** in the air).
4. **Spike (optional finisher).** If they're still floating, **Down + air attack**
   (`S`+`J` / **Down + Square**) slams them back to the ground.

So the universal bread-and-butter route is:

> **Up-attack (launcher) → jump → Air attack → Down-air spike.**

That's the baseline. A few characters have **special** air routes on top of it (Toji's
Rising Spiral, Naruto's Rendan aerial). Those are called out in their sections below.
One character (**Rick**) has **no down-air at all**, so his air combos end on the air
normal — noted in his section. Where a character has nothing beyond the universal route,
it says so plainly rather than inventing one.

---

# 3. THE FIGHTERS

Each section lists the character's stats, normals (with both inputs), a dedicated **Air
Combos** subsection, every special + ultimate (input, cost, damage, what it does), and any
character-specific system that needs extra explanation.

---

## GOKU — *Dragon Ball* · HP 1200 · Ki 200

All-rounder with strong ki projectiles. A great first pick — no gimmicks, just clean
tools.

### Normals
| Move | Keyboard | Controller | Damage |
|---|---|---|---|
| Light | `J` | ☐ Square | 45 |
| Heavy | `K` | △ Triangle | 85 |
| Up-attack (launcher) | `I` | Up + ☐ Square | 70 |
| Air attack | `J` (air) | ☐ Square (air) | 60 |
| Down-air (spike) | `S`+`J` (air) | Down + ☐ Square (air) | 80 |

### Air combos
Standard route only: **Up-attack → jump → Air attack (60) → Down-air spike (80).** Goku
has no dedicated aerial special, but his air normals hit hard enough to make the basic
juggle worthwhile.

### Specials — Special button (`L` / **R1**)
| Move | Motion | Cost | Damage | What it does |
|---|---|---|---|---|
| **Dragon Fist** | Neutral + Special | 40 | 150 | A forward melee rush wreathed in a dragon aura. Your big close-range punish. |
| **Kamehameha** | ↓F + Special | 30 | 120 | A fast blue ki beam. Your main zoning / poke-from-range tool. |

### Ultimate — `U` / **R2**
- **Super Saiyan Blue** — cost **100** (full bar). Transforms Goku for ~8 seconds: big
  speed and attack boost, and **ki attacks deal double damage**. Pop it when you have
  meter and want to open someone up.

---

## GOJO SATORU — *Jujutsu Kaisen* · HP 1160 · Cursed Energy 220

A high-mobility control character built around his **Infinity** barrier and space-time
blinks. Rewards spacing and patience.

### Normals
| Move | Keyboard | Controller | Damage |
|---|---|---|---|
| Light | `J` | ☐ Square | 45 |
| Heavy | `K` | △ Triangle | 85 |
| Up-attack (launcher) | `I` | Up + ☐ Square | 70 |
| Air attack | `J` (air) | ☐ Square (air) | 60 |
| Down-air (spike) | `S`+`J` (air) | Down + ☐ Square (air) | 80 |

### Air combos
Standard route: **Up-attack → jump → Air attack (60) → Down-air spike (80).** For a
flashier mix-up, use **Blink** (↑ + Special) to teleport behind a launched opponent and
restart pressure from the other side.

### Specials — Special button (`L` / **R1**)
Blue/Red/Hollow Purple each **charge then release** (there's a short wind-up — that's
normal, not lag).
| Move | Motion | Cost | Damage | What it does |
|---|---|---|---|---|
| **Blue (Lapse)** | Neutral + Special | 30 | 110 | A singularity projectile that **pulls** the target toward you. Great for dragging them into a punish. |
| **Red (Reversal)** | F + Special | 40 | 130 | A close-mid repulsion burst that blasts them away. |
| **Hollow Purple** | ↓B + Special | 70 | 200 | Blue + Red combined: a wide, slow, heavy convergence beam. Your biggest hit — but slow, so set it up. |
| **Blink (teleport)** | ↑ + Special | 8 | — | Space-time contraction: teleport **behind** the opponent. Cheap, ~2s own cooldown. Use it on defense or to start offense. |

> You can also **double-tap toward** the opponent to teleport-dash behind them (his
> movement tech), separate from Blink.

### Ultimate — `U` / **R2**
- **Unlimited Void** — needs a **full meter** (drains to 0). Domain expansion plus
  Infinity auto-dodge. A strong burst window.

### Character system — **INFINITY** (the big one)
- **Tap `P` / tap L2** to toggle Infinity **on**. While it's on, incoming hits are
  **automatically negated** — each block auto-spends a little meter (~5 per hit).
- **Tap `P` / L2 again** to drop it (you can't attack effectively while turtling forever,
  and it eats meter).
- Think of it as a stance you flip on when you expect pressure and off when you want to
  push buttons. (It can be shut off by a specific binding-vow mechanic in some modes.)

---

## MEGUMI FUSHIGURO — *Jujutsu Kaisen* · HP 1120 · Cursed Energy 210

A **summoner**. Every special calls out a different shikigami by its own motion. You play
Megumi by controlling space with the right summon for the situation.

### Normals
| Move | Keyboard | Controller | Damage |
|---|---|---|---|
| Light | `J` | ☐ Square | 42 |
| Heavy | `K` | △ Triangle | 82 |
| Up-attack (launcher) | `I` | Up + ☐ Square | 68 |
| Air attack | `J` (air) | ☐ Square (air) | 58 |
| Down-air (spike) | `S`+`J` (air) | Down + ☐ Square (air) | 76 |

### Air combos
Standard route only: **Up-attack → jump → Air attack (58) → Down-air spike (76).**
Megumi's strength is his ground summons, not aerials — juggle with the basic route, then
reset to summon zoning.

### Specials — Special button (`L` / **R1**), one summon per motion
| Summon | Motion | Cost | Damage | What it does |
|---|---|---|---|---|
| **Divine Dogs** | ↓F + Special | 20 | 95 | Twin wolves rush the opponent. Your reliable default. |
| **Nue** | F→↓→F (dragon-punch motion) + Special | 25 | 110 | An aerial lightning-strike bird. Good anti-air / catches jumps. |
| **Toad** | B→F + Special | 20 | 70 | Restrains / checks the opponent — a keep-out tool. |
| **Rabbit Escape** | ↓↑ + Special | 15 | 20 | A swarm that makes space / covers your retreat. |
| **Max Elephant** | ↓B + Special | 35 | 145 | A massive crushing water-elephant. Your heavy hitter. |

### Ultimate — `U` / **R2**
- **Chimera Shadow Garden** — cost **100**. **Domain Expansion.** Unfurls a shadow
  territory across the arena that **restrains the opponent** (heavy movement penalty)
  for its duration (~15s). Megumi keeps his full shikigami summon kit while it's up.

---

## SUKUNA — *Jujutsu Kaisen* · HP 1240 · Cursed Energy 210

The King of Curses: highest normals in the anime cast, a strong domain, and a dash that
plows through projectiles. A straightforward, hard-hitting bully.

### Normals
| Move | Keyboard | Controller | Damage |
|---|---|---|---|
| Light | `J` | ☐ Square | 50 |
| Heavy | `K` | △ Triangle | 100 |
| Up-attack (launcher) | `I` | Up + ☐ Square | 75 |
| Air attack | `J` (air) | ☐ Square (air) | 70 |
| Down-air (spike) | `S`+`J` (air) | Down + ☐ Square (air) | 90 |

### Air combos
Standard route: **Up-attack → jump → Air attack (70) → Down-air spike (90).** Sukuna's
air normals are the hardest-hitting in the cast, so his basic juggle does real damage —
no special aerial needed.

### Specials — Special button (`L` / **R1**)
| Move | Motion | Cost | Damage | What it does |
|---|---|---|---|---|
| **Cleave** | Neutral + Special | 40 | 160 | A wide melee slash with an extra-wide hitbox. Your go-to punish. |
| **Dismantle** | ↓B + Special | 35 | 140 | A ranged slashing projectile. Zone from afar. |
| **Flame Arrow (Fuga)** | F + Special | 35 | 140 | A charged explosive fire-bolt (short charge → fire). |
| **Malevolent Dash** | double-tap **toward** | 15 | 80 | A fast dash-strike that **destroys incoming projectiles** and starts combos. ~0.8s cooldown. This is his movement tech, not on the Special button. |

### Ultimate — `U` / **R2**
- **Malevolent Shrine** — needs a **full meter** (drains to 0). Domain expansion that
  covers the whole stage: guaranteed sure-hit chip on the opponent wherever they are,
  ~15s. One of the strongest ultimates in the game.

---

## TOJI FUSHIGURO — *Jujutsu Kaisen* · HP 1260 · **No cursed energy — every ability is free**

The most mechanically deep character. Toji has **no meter at all**, so all his specials
and his ultimate cost **0** — they're gated by cooldowns instead. His identity is a
**3-weapon stance system** you swap between on the fly. Fast, aggressive, high-skill.

### Stance system — **tap `P` / tap L2 to cycle** (Blade → Chain → Gun → Blade)
- Tapping **L2 / `P`** rotates his weapon stance. Each stance **rebinds Light / Heavy /
  Up** to a completely different weapon normal (see the three tables below).
- **A stance-tap during a move's recovery also CANCELS that move** — this is how you
  stay safe and keep pressure: whiff a swing, tap to a new stance, keep going.
- The **Special button** (`L` / **R1**) runs the same four motion-specials in *every*
  stance (listed once, below the stances).

### BLADE stance (default) — the balanced melee stance
| Move | Input | Damage | Notes |
|---|---|---|---|
| Quick Draw | Light (`J` / ☐) | 44 | Fast poke. **Opens the Reaper rekka** (see combos). |
| Forward Slash | Heavy (`K` / △) | 62 | Longer-reach committed swing. |
| Skyward Cut | Up-attack (`I` / Up+☐) | 55 | **Launcher** — starts juggles. |
| Dash Strike | Down + Heavy | 80 | A committing dash-in stab (long recovery — don't whiff it). |
| Rising Spiral | Light in the **air** | 72 | Air normal / **juggle ender** off Skyward Cut. |

### CHAIN stance — mid-range zoning (longer reach, slower, big pushback)
| Move | Input | Damage | Notes |
|---|---|---|---|
| Short Lash | Light (`J` / ☐) | 38 | Quick long-reach poke. |
| Wide Arc | Heavy (`K` / △) | 66 | Whiff-punish / wall-carry (huge knockback). |
| Low Sweep | Down + Heavy | 54 | A low-hitting poke. |
| Rising Coil | Up-attack (`I` / Up+☐) | 58 | Anti-air **launcher**. |

### GUN stance — ranged normals (projectiles)
| Move | Input | Damage | Notes |
|---|---|---|---|
| Snap Shot | Light (`J` / ☐) | 20 | Fast bullet — chip / pressure from range. |
| Tracer Round | Up-attack (`I` / Up+☐) | 42 | Heavier shot with hard knockback. |
| Feint (Aimed Shot) | Heavy (`K` / △) | — | An aim-pose feint that fires **nothing** — bait a reaction, then punish. |

### Specials — Special button (`L` / **R1**), all **free**, work in every stance
| Move | Motion | Damage | Notes |
|---|---|---|---|
| **Inventory Smash** | Neutral + Special | 155 | A heavy weapon strike pulled from his cursed-tool inventory. His biggest single hit. |
| **Rapid Dash Strike** | F→F + Special | 65 | A fast forward speed-burst strike. |
| **Curse Spirit** | ↓F + Special | 70 | A thrown curse-creature projectile — his (free) ranged poke. |
| **Chain-Knife / Inverted Spear** | ↓B + Special | 95 | Chain shoots out and hits, retracts, then a spin finisher. ~1.6s cooldown. |

> Toji also **double-taps toward** the opponent to **teleport behind them and instantly
> strike** (60 dmg) — his signature blink, on the movement, not the Special button.

### Ultimate — `U` / **R2**
- **Heavenly Restriction** — cost **0** (cooldown-gated, since he has no meter). An
  ~8-second surge: **1.8× speed and 1.6× damage**. Turn it on and overwhelm.

### Air combos & documented combo routes
Toji has **3 jumps**, so his air time is longer than most and he can extend juggles.
- **Blade juggle (documented):** **Skyward Cut** (Up, launcher) → **jump** → **Rising
  Spiral** (air Light) as the ender.
- **Reaper's Rekka (documented):** **Quick Draw** (Light) → press a **fresh Light during
  its recovery** to chain **Reaper 1 (30) → Reaper 2 (34) → Reaper 3 (50)** — full string
  ≈ **114 damage**.
- Chain stance's **Rising Coil** is also a launcher if you prefer to juggle from range.

---

## NARUTO UZUMAKI — *Naruto (KCM)* · HP 1180 · Chakra 190

A versatile toolbox: Rasengan variants, shadow-clone combos, summons, and a passive
comeback buff. The deepest projectile/summon kit in the game.

### Normals
| Move | Keyboard | Controller | Damage |
|---|---|---|---|
| Light | `J` | ☐ Square | 44 |
| Heavy | `K` | △ Triangle | 82 |
| Up-attack (launcher) | `I` | Up + ☐ Square | 66 |
| Air attack | `J` (air) | ☐ Square (air) | 56 |
| Down-air (spike) | `S`+`J` (air) | Down + ☐ Square (air) | 72 |

### Air combos
- **Standard route:** Up-attack → jump → Air attack (56) → Down-air spike (72). Naruto's
  air normal is specifically his **Rendan aerial juggle hit**, so it's built for this.
- **Clone launcher (see below):** **Pincer Rendan** (B→U + Special, needs ≥2 clones) pops
  the opponent up with front + back hits — then chase with your air normal.

### Specials — Special button (`L` / **R1**)
**Rasengan family (solo, meter only):**
| Move | Motion | Cost | Damage | What it does |
|---|---|---|---|---|
| **Rasengan** | Neutral + Special | 30 | 120 | Fast close-range dashing spiral orb. Your default. |
| **Big Ball Rasengan** | **Hold `P`/L2** + Special (partial charge) | 55 | 150→210 | A charged melee ram; size + damage grow with how long you hold (capped). |
| **Rasenshuriken** | **Hold `P`/L2 to FULL** + Special | 80 | 260 | Full-charge wind blade — his strongest non-clone hit, **plus a lingering wind-chip damage-over-time** (5 ticks of 8) after it lands. |
| **Dark Rasengan** | ↓ + Special | 45 | 180 | A close-range AOE ring-burst that detonates **in place** (no travel). |

**Clones, summons & defense:**
| Move | Motion | Cost | Damage | What it does |
|---|---|---|---|---|
| **Shadow Clone** | ↓F + Special | pool split | — | Spawns a shadow clone (cap 3). Clones are static decoys that power the clone combos below. |
| **Dispel Clones** | ↓B + Special | free | — | Removes all your live clones. |
| **Toad Summon** | B→F + Special | 35 | 70 | A summoned toad leaps in for one strike. |
| **Chakra-Arm Grab** | F→F + Special | — | grab | **Shroud stage 3+ only** — a long-reach (170px) chakra-arm throw. |
| **Kawarimi / Substitution** | Block + Special *during an incoming hit* | 25 | — | Smoke-poof teleport **behind** the opponent so their swing whiffs. If you have clones in reserve, it spends a **clone instead** (free no-sell). |

**Clone combos (consume your clones):**
| Combo | Motion + requirement | Result |
|---|---|---|
| **Rasengan Barrage** | Neutral + Special with **≥2 clones** | Your orb (90) + 2 guaranteed clone orbs (70 each). |
| **Pincer Rendan** | B→U + Special with **≥2 clones** | Front + back guaranteed juggle hits (60 + 60) that launch. |
| **Combined Rasengan** | Hold `P`/L2 + Special with **3 clones** | One giant team orb, **200** in a single hit. |

### Ultimate — `U` / **R2**
- **Kurama Avatar** — cost **100**. A Tailed-Beast-Bomb cinematic: a guaranteed
  **sure-hit** blast.

### Character system — **KURAMA SHROUD** (passive)
- A **health-gated comeback buff** that ramps automatically as you take damage:
  **5 stages** (`shroudStage` 0–5). The **lower your HP, the higher the stage**, the
  stronger your buffs.
- **Stage 3+** heals you on hit **and unlocks the Chakra-Arm Grab** (F→F + Special).
- You don't press anything for this — just know that a low-health Naruto is a *more
  dangerous* Naruto, so don't assume a near-dead Naruto is finished.

---

## SASUKE UCHIHA — *Naruto* · HP 1180 · Chakra 190

A fast melee duelist with lightning specials, a full-negate barrier, and a giant
two-stage **Susanoo** ultimate. High skill ceiling.

### Normals
| Move | Keyboard | Controller | Damage |
|---|---|---|---|
| Light | `J` | ☐ Square | 46 |
| Heavy (sword thrust) | `K` | △ Triangle | 92 |
| Up-attack (launcher) | `I` | Up + ☐ Square | 68 |
| Air attack | `J` (air) | ☐ Square (air) | 54 |
| Down-air (spike) | `S`+`J` (air) | Down + ☐ Square (air) | 78 |

### Air combos
Standard route: **Up-attack → jump → Air attack (54) → Down-air spike (78).** Sasuke's
up-attack is a true launcher; his heavy sword thrust (92) is a strong ground ender if you
prefer to keep them grounded.

### Specials — base kit — Special button (`L` / **R1**)
| Move | Motion | Cost | Damage | What it does |
|---|---|---|---|---|
| **Dash Strike** | Neutral + Special | 18 | 55 | A Sharingan blitz gap-closer / poke. Cheap and fast. |
| **Shuriken** | ↓ + Special | free | 34 | A ranged auto-aimed throw (chest height). Free poke. |
| **Two-Strike Lightning** | ↓F + Special | 24 | 42 + 46 (88) | A telegraphed 2-hit lightning combo. Has a real wind-up — commit to it. |
| **Chidori Koiten** | ↓B + Special | 35 | 95 | A stationary lightning **AOE discharge** around Sasuke (not a projectile) — hits everything close. |
| **Hawk Summon** | B→F + Special | 30 | 72 | A summoned hawk swoops across the screen (own traveling hitbox) and **launches** the opponent very high — a combo-starter into an air-juggle, not a knockdown. |
| **Substitution (Kawarimi)** | Block + Special *during an incoming hit* | 25 | — | Smoke-poof teleport behind the opponent so their swing whiffs. |

> Sasuke also **double-taps toward** the opponent to blink behind them (Sharingan speed),
> on the movement.

### Ultimate — **SUSANOO** (`U` / **R2**) — a sustained two-stage giant form
This is not a normal special — it turns Sasuke into a giant with its own attacks. It's the
most involved mechanic in his kit.

| Stage | How to enter | Cost | Form |
|---|---|---|---|
| **Stage 1** | Press Ultimate | 50% of your max energy (~95) | Giant Lv1: **1.4× damage, 1.3× defense** |
| **Stage 2** | While in Stage 1, **press Ultimate again** (Sharingan-awakening cinematic) | drains **all** remaining energy | Giant Lv2: **1.9× damage, 1.5× defense** |

While in Susanoo, the **Special button** (`L` / **R1**) fires the giant's attacks:
| Giant attack | When it comes out | Damage |
|---|---|---|
| **Grab** (extending ribcage arm) | Lv1 (any time), or Lv2 while holding **Down** | 120 (Lv1) / 210 (Lv2) |
| **Sword slash** | Lv2, when the opponent is **close** | 265 |
| **Arrow** (bow) | Lv2, when the opponent is **far** (>170px) | 230 |

### Character system — **ABSOLUTE DEFENSE**
- **Tap `P` / tap L2** to toggle a barrier that **fully negates hits** (including
  projectiles), just like Gojo's Infinity — but at a higher **per-block cost (~12
  energy)**. **Tap again** to drop it. Great for eating a specific big hit; too expensive
  to leave on forever.

---

## RICK SANCHEZ — *Rick and Morty* · HP 1050 · "Bullshit Science Energy" 160

The game's **zoner**. Rick wants the opponent **out** — he throws Meeseeks, fires
rockets, and warps enemies around with portals. His melee is deliberately weak backup;
you win by controlling space, not brawling. Lowest HP in the cast, so don't get cornered.

### Normals
| Move | Keyboard | Controller | Damage |
|---|---|---|---|
| Light (jab) | `J` | ☐ Square | 34 |
| Heavy (kick) | `K` | △ Triangle | 60 |
| Up-attack (launcher) | `I` | Up + ☐ Square | 56 |
| Air attack | `J` (air) | ☐ Square (air) | 44 |
| Down-air (spike) | — | — | **none** (no down-air) |

> Rick's melee numbers and range are **intentionally low** — he's a backup brawler, not a
> rushdown. Lean on his specials.

### Air combos
Rick has **no down-air**, so he can't spike. His air route is short:
**Up-attack (launcher) → jump → Air attack (44)** — and that's the ender. For a stronger
setup, use **Portal-Pull** (↓F + Special) to yank the opponent into melee range on the
ground, then start a string.

### Specials — Special button (`L` / **R1**)
| Move | Motion | Cost | Damage | What it does |
|---|---|---|---|---|
| **Meeseeks Box** | Neutral + Special | 30 | 45 (Meeseeks) | Throws a Meeseeks that rushes the opponent. **No cap** — only your energy limits how many are out, so you can flood the screen with them. |
| **Rocket** | Up + Special | 40 | 95 | Rick launches upward **and** fires a rocket that travels **forward across the stage** (~long range), catching anyone in its lane. Recovery + a projectile in one. |
| **Portal-Gun Laser** | Down + Special | **free** | 20 (~12 on hit) | A fast, long-range laser bolt. Free spacing poke (short cooldown so you can't fully spam it). Weakest hit, but it costs nothing. |
| **Portal-Pull** | ↓F + Special | 35 | 42 | Opens a portal and **yanks the opponent right next to Rick** — a combo starter. The hit is minor; the free positioning is the point. |
| **Portal-Push** | ↓B + Special | 45 | 65 | The opposite: **banishes the opponent to the far edge** of the stage. Full-screen reset / spacing. Hardest-hitting special, but grants no follow-up. *(Whiffs on an opponent with i-frames but still costs meter — don't waste it.)* |

> **Portal-Behind:** like the other fast characters, **double-tap toward** the opponent to
> teleport **behind** them (movement tech, not the Special button).

### Ultimate — **SELF-DESTRUCT** (`U` / **R2**)
- Cost **140** (near your whole bar). An **instant proximity AOE blast** (radius ~220px,
  **180 damage**). **Rick takes no self-damage.** It only connects if the opponent is
  **close enough** when you press it — so bait them in or catch a whiff, *then* detonate.
  There's no start-up or vulnerability window; the huge cost is the balancing factor.

### Character system — **TAUNT → HEAL** (unique to Rick)
- **Hold Down for a full 10 seconds** (`S` / D-pad Down) to commit into a locked taunt
  animation. If Rick **isn't hit** during the whole charge *and* the taunt, he **heals 50%
  of his current HP**.
- It's a huge reward but a huge risk — you're standing still and defenseless for a long
  time. Use it only when you've knocked the opponent far away (Portal-Push!) or during a
  big lull. Any hit — even chip — cancels it with no reward.

---

# 4. QUICK REFERENCE

- **"Cost"** is the character's energy meter (ki / cursed energy / chakra / Bullshit
  Science). **Toji has no meter** — his moves are free, gated by cooldowns.
- **Ultimates** are always `U` / **R2**. Some are **domains / transforms** (Gojo's
  Unlimited Void, Sukuna's Malevolent Shrine, Megumi's Chimera Shadow Garden, Goku's SSJ Blue) that
  spend a full/large bar and change how you play — see each character's Ultimate.
- **Toggles** (Gojo Infinity, Sasuke Absolute Defense) are a **quick tap of `P` / L2** —
  the same button you **hold** to charge meter.
- **Teleport-behind** on a **double-tap toward** belongs to Gojo, Sukuna, Toji, Sasuke,
  and Rick.
- This roster is the game's live **sprite-complete** set (`hasSprites`), currently **8**.
  When more characters get sprites, this doc should grow with them.

*All inputs, costs, and damage values verified against `characters.js`, `abilities.js`,
and `input.js`. Found a mismatch on your pad tonight? Flag it — that's exactly what beta
testing is for.*

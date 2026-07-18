# MOVELIST — Multiverse Smash

Move & combo reference for every **sprite-complete** character (`hasSprites: true`).
On the current build that's **7**: Goku, Gojo, Megumi, Sukuna, Toji, Naruto, Sasuke.

All values are pulled directly from the code — normals from `characters.js`
`basic_attacks`, specials/ultimates from `characters.js` + `abilities.js`
(damage/cost/motion), systems from `abilities.js`/`game.js`. Damage is the raw
move value before per-character/attack multipliers.

---

## Controls reference

Keyboard is **P1's real binds** (`P1_CONTROLS`); controller is the DualSense/
standard-pad mapping (`PS5_MAP` / `pollGamepad`).

| Action | Keyboard (P1) | Controller |
|---|---|---|
| Move / aim | `A` `D` (left/right), `S` (down/crouch/block) | D-pad / left stick |
| Jump / up | `W` | `X` |
| Light | `J` | `Square` |
| Heavy | `K` | `Triangle` |
| Up-attack / launcher | `I` (or Up + Light/Heavy) | `Up` + `Square`/`Triangle` |
| Air attack | `J` in air | `Square` in air |
| Down-air (spike) | `S` + `J` in air | `Down` + `Square` in air |
| Special | `L` | `R1` |
| Ultimate / Domain | `U` | `R2` |
| Grab / throw | `O` | `L1` |
| Charge (hold) / Toggle (tap) | `P` | `L2` |
| Dash | double-tap `A`/`D` | double-tap D-pad L/R |

### Motion notation

Specials share the **Special** button; the *direction motion* entered just
before it selects the variant (Megumi/Gojo/Sukuna/Naruto/Sasuke style). Motions
are **relative to facing**:

- **F** = toward the opponent (`D` if facing right / `A` if facing left · D-pad toward)
- **B** = away from the opponent
- **↓** = down (`S` / D-pad Down)
- **↓F** ("qcf") = down → toward · **↓B** ("qcb") = down → away
- **Neutral** = press Special with no direction
- **Hold P** = hold Charge while pressing Special (charge specials)
- **Block+Special** = hold `S`/Down (block) then Special

---

## GOKU — Dragon Ball · HP 1200 · Energy 200

### Normals
| Move | Keyboard | Controller | Damage |
|---|---|---|---|
| Light | `J` | `Square` | 45 |
| Heavy | `K` | `Triangle` | 85 |
| Up-attack (launcher) | `I` | `Up`+`Square` | 70 |
| Air attack | `J` (air) | `Square` (air) | 60 |
| Down-air (spike) | `S`+`J` (air) | `Down`+`Square` (air) | 80 |

### Specials  (Special = `L` / `R1`)
| Move | Motion | Cost | Damage | Notes |
|---|---|---|---|---|
| Dragon Fist | Neutral + Special | 40 | 150 | Forward melee rush with dragon aura. |
| Kamehameha | ↓F + Special | 30 | 120 | Fast blue ki beam projectile. |

### Ultimate  (`U` / `R2`)
- **Super Saiyan Blue** — cost 100. Triggers the SSJ transformation: massive
  speed/attack boost, ki attacks deal double damage (buff form, ~8s).

---

## GOJO SATORU — Jujutsu Kaisen · HP 1160 · Energy 220

### Normals
| Move | Keyboard | Controller | Damage |
|---|---|---|---|
| Light | `J` | `Square` | 45 |
| Heavy | `K` | `Triangle` | 85 |
| Up-attack (launcher) | `I` | `Up`+`Square` | 70 |
| Air attack | `J` (air) | `Square` (air) | 60 |
| Down-air (spike) | `S`+`J` (air) | `Down`+`Square` (air) | 80 |

### Specials  (Special = `L` / `R1`)
| Move | Motion | Cost | Damage | Notes |
|---|---|---|---|---|
| Blue (Lapse) | Neutral + Special | 30 | 110 | Attraction singularity — projectile that **pulls** the target in. Charge→release. |
| Red (Reversal) | F + Special | 40 | 130 | Repulsion burst (close-mid melee). Charge→release. |
| Hollow Purple | ↓B + Special | 70 | 200 | Convergence of Blue+Red — wide, slow, heavy convergence beam. Charge→release. |
| Blink (teleport) | ↑ + Special | 8 | — | Space-time contraction: teleport **behind** the opponent. ~2s own cooldown. |

### Ultimate  (`U` / `R2`)
- **Unlimited Void** — needs a FULL meter (drains to 0). Domain expansion +
  Infinity auto-dodge.

### Character system — **Infinity**
- Toggle with a **tap of `P` / `L2`**. While active, incoming hits are auto-
  negated (per-block meter cost ~5). Tap again to drop it. Disabled by the
  Limitless-Sacrifice binding vow.

---

## MEGUMI FUSHIGURO — Jujutsu Kaisen · HP 1120 · Energy 210

Megumi is a **summoner** — every special is a shikigami summoned by its own motion.

### Normals
| Move | Keyboard | Controller | Damage |
|---|---|---|---|
| Light | `J` | `Square` | 42 |
| Heavy | `K` | `Triangle` | 82 |
| Up-attack (launcher) | `I` | `Up`+`Square` | 68 |
| Air attack | `J` (air) | `Square` (air) | 58 |
| Down-air (spike) | `S`+`J` (air) | `Down`+`Square` (air) | 76 |

### Specials  (Special = `L` / `R1` — shikigami by motion)
| Summon | Motion | Cost | Damage | Notes |
|---|---|---|---|---|
| Divine Dogs | ↓F + Special | 20 | 95 | Default — twin wolves rush in. |
| Nue | F→↓→F (DP) + Special | 25 | 110 | Aerial lightning-strike bird. |
| Toad | B→F + Special | 20 | 70 | Restrains/checks the opponent. |
| Rabbit Escape | ↓↑ + Special | 15 | 20 | Swarm distraction / space-maker. |
| Max Elephant | ↓B + Special | 35 | 145 | Massive crushing water-elephant. |

### Ultimate  (`U` / `R2`)
- **Mahoraga Ritual** — cost 100. Permanently transforms Megumi into **Mahoraga**
  in place (one-way; Mahoraga has its own moveset).

---

## SUKUNA — Jujutsu Kaisen · HP 1240 · Energy 210

### Normals
| Move | Keyboard | Controller | Damage |
|---|---|---|---|
| Light | `J` | `Square` | 50 |
| Heavy | `K` | `Triangle` | 100 |
| Up-attack (launcher) | `I` | `Up`+`Square` | 75 |
| Air attack | `J` (air) | `Square` (air) | 70 |
| Down-air (spike) | `S`+`J` (air) | `Down`+`Square` (air) | 90 |

### Specials  (Special = `L` / `R1`)
| Move | Motion | Cost | Damage | Notes |
|---|---|---|---|---|
| Cleave | Neutral + Special | 40 | 160 | Wide melee slash (extra-wide hitbox). |
| Dismantle | ↓B + Special | 35 | 140 | Ranged slashing projectile. |
| Flame Arrow (Fuga) | F + Special | 35 | 140 | Charged explosive fire-bolt projectile. |
| Malevolent Dash | double-tap **toward** | 15 | 80 | Fast dash-strike that **breaks incoming projectiles** and starts combos (~0.8s cd). |

### Ultimate  (`U` / `R2`)
- **Malevolent Shrine** — needs a FULL meter (drains to 0). Domain expansion
  (guaranteed in-range chip + lock).

---

## TOJI — Jujutsu Kaisen · HP 1260 · **No cursed energy** (all abilities cost 0)

Toji uses a **3-stance weapon system**. **Tap `P` / `L2`** to cycle stance
(**Blade → Chain → Gun → Blade**); a stance-tap during a move's *recovery* also
**cancels** it. Each stance rebinds Light/Heavy/Up to real weapon normals. The
**Special** button (`L`/`R1`) runs the shared motion specials in every stance.

### Blade stance (default) — Light `J`/`Square`, Heavy `K`/`Triangle`, Up `I`
| Move | Input | Damage | Notes |
|---|---|---|---|
| Quick Draw | Light | 44 | Fast poke; **starts the Reaper rekka**. |
| Forward Slash | Heavy | 62 | Longer-reach committal swing. |
| Skyward Cut | Up-attack | 55 | **Launcher** (juggle starter). |
| Dash Strike | Down + Heavy | 80 | Forward-committing dash-in stab (long recovery). |
| Rising Spiral | Light in air | 72 | Air normal / **juggle ender** off Skyward Cut. |

### Chain stance — mid-range zoning (longer reach, slower, high pushback)
| Move | Input | Damage | Notes |
|---|---|---|---|
| Short Lash | Light | 38 | Quick long-reach poke. |
| Wide Arc | Heavy | 66 | Whiff-punish / wall-carry (big knockback). |
| Low Sweep | Down + Heavy | 54 | Low poke. |
| Rising Coil | Up-attack | 58 | Anti-air **launcher**. |

### Gun stance — ranged normals (projectiles)
| Move | Input | Damage | Notes |
|---|---|---|---|
| Snap Shot | Light | 20 | Fast light round (projectile). |
| Tracer Round | Up-attack | 42 | Stronger tracer shot (projectile). |
| Feint | Heavy | — | 5B gun feint (no projectile). |

### Specials  (Special = `L` / `R1` — all free)
| Move | Motion | Damage | Notes |
|---|---|---|---|
| Inventory Smash | Neutral + Special | 155 | Heavy weapon strike from the cursed-tool inventory. |
| Rapid Dash Strike | F→F + Special | 65 | Fast forward speed-burst strike. |
| Curse Spirit | ↓F + Special | 70 | Free thrown curse-creature projectile (cheap ranged poke). |
| Chain-Knife / Inverted Spear | ↓B + Special | 95 | Chain shoots out and hits, then retract → spin finisher (~1.6s cd). |

### Ultimate  (`U` / `R2`)
- **Heavenly Restriction** — cost 0. Surge: **1.8× speed, 1.6× damage** (Toji has
  no meter, so it's cooldown-gated rather than energy-gated).

### Combo route (documented)
- **Reaper's Rekka:** Quick Draw (Light) → press a **fresh Light during recovery**
  to chain **Reaper 1 (30) → Reaper 2 (34) → Reaper 3 (50)** — full string ≈ 114.
- **Blade juggle:** Skyward Cut (Up, launcher) → jump → **Rising Spiral** (air Light) as the ender.

---

## NARUTO — Naruto · HP 1180 · Energy 190

### Normals
| Move | Keyboard | Controller | Damage |
|---|---|---|---|
| Light | `J` | `Square` | 44 |
| Heavy | `K` | `Triangle` | 82 |
| Up-attack (launcher) | `I` | `Up`+`Square` | 66 |
| Air attack | `J` (air) | `Square` (air) | 56 |
| Down-air (spike) | `S`+`J` (air) | `Down`+`Square` (air) | 72 |

### Specials  (Special = `L` / `R1`)
| Move | Motion | Cost | Damage | Notes |
|---|---|---|---|---|
| Rasengan | Neutral + Special | 30 | 120 | Base fast close-range dashing spiral orb. |
| Big Ball Rasengan | **Hold `P`** + Special (partial) | 55 | 150→210 | Charged melee ram; size & damage scale with charge (capped). |
| Rasenshuriken | **Hold `P` to FULL** + Special | 80 | 260 | Full-charge wind blade — strongest non-clone special + lingering wind-chip DOT (5×8) on hit. |
| Dark Rasengan | ↓ + Special | 45 | 180 | Close-range AOE ring-burst that detonates **in place** (no travel). |
| Shadow Clone | ↓F + Special | pool split | — | Spawns a shadow clone (cap 3); powers the clone combos below. |
| Dispel Clones | ↓B + Special | free | — | Removes all live clones. |
| Toad Summon | B→F + Special | 35 | 70 | Summoned toad lands one strike. |
| Chakra-Arm Grab | F→F + Special | — | grab | **Shroud stage 3+ only** — long-reach (170px) chakra-arm throw. |
| Kawarimi / Substitution | Block + Special (vs an incoming hit) | 25 | — | Smoke-poof teleport **behind** the opponent; the incoming swing whiffs. With clones in reserve it instead spends a **clone** (free) per no-sell. |

**Clone combos** (consume clones):
- **Rasengan Barrage** — Neutral + Special with **≥2 clones**: Naruto's orb (90) + 2 guaranteed clone orbs (70 each).
- **Pincer Rendan** — B→U + Special with **≥2 clones**: front + back guaranteed juggle hits (60 + 60).
- **Combined Rasengan** — Hold `P` with **3 clones**: one big team orb (200, single hit).

### Ultimate  (`U` / `R2`)
- **Kurama Avatar** — cost 100. Tailed-Beast-Bomb cinematic — guaranteed **sure-hit** blast.

### Character system — **Kurama Shroud**
- Passive, health-gated **5-stage** comeback buff (`shroudStage` 0–5): lower HP →
  higher stage → stronger buffs; stage 3+ heals on hit and **unlocks the
  Chakra-Arm Grab**.

---

## SASUKE — Naruto · HP 1180 · Energy 190

### Normals
| Move | Keyboard | Controller | Damage |
|---|---|---|---|
| Light | `J` | `Square` | 46 |
| Heavy | `K` | `Triangle` | 92 |
| Up-attack (launcher) | `I` | `Up`+`Square` | 68 |
| Air attack | `J` (air) | `Square` (air) | 54 |
| Down-air (spike) | `S`+`J` (air) | `Down`+`Square` (air) | 78 |

### Specials — base kit  (Special = `L` / `R1`)
| Move | Motion | Cost | Damage | Notes |
|---|---|---|---|---|
| Dash Strike | Neutral + Special | 18 | 55 | Sharingan blitz gap-closer / poke. |
| Shuriken | ↓ + Special | free | 34 | Ranged poke (chest-height throw, auto-aimed). |
| Two-Strike Lightning | ↓F + Special | 24 | 42 + 46 (88) | Telegraphed 2-hit lightning (blockable chip; has a real windup). |
| Chidori Koiten | ↓B + Special | 35 | 95 | Stationary lightning **AOE discharge** around Sasuke (not a projectile). |
| Substitution (Kawarimi) | Block + Special (vs an incoming hit) | 25 | — | Smoke-poof teleport behind the opponent; the incoming swing whiffs. |

### Ultimate — **Susanoo** (`U` / `R2`, two-stage sustained form)
| Stage | How | Cost | Stat form |
|---|---|---|---|
| **Stage 1** | Press Ultimate | 50% of max energy (~95) | Giant Lv1: **1.4× dmg, 1.3× def** |
| **Stage 2** | Release, then **press Ultimate again** → Sharingan-awakening cinematic | drains **all** remaining energy | Giant Lv2: **1.9× dmg, 1.5× def** |

While in Susanoo, the **Special** button runs the giant's attacks:
| Attack | When | Damage |
|---|---|---|
| Grab (extending ribcage arm) | Lv1 (any), or Lv2 holding **Down** | 120 (Lv1) / 210 (Lv2) |
| Sword slash | Lv2, up close | 265 |
| Arrow (bow) | Lv2, spaced out (>170px) | 230 |

### Character system — **Absolute Defense**
- Toggle with a **tap of `P` / `L2`** (same pattern as Gojo's Infinity). While
  active, hits are fully negated at a **per-block meter cost (~12)**. Tap again to drop it.

---

### Notes
- "Cost" is cursed energy / ki / chakra meter; ultimates use `U`/`R2`.
- Domains (Gojo/Sukuna) and one-way transforms (Megumi→Mahoraga, Goku SSJ Blue)
  spend a full/large bar and change the moveset — see each character's Ultimate.
- The 7-character roster is derived live from `hasSprites` (see `spriteRosterKeys`
  in game.js); this doc covers exactly that set and should be updated as more
  characters gain sprites.

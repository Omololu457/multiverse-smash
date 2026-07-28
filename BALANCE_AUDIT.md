# Character Balance Audit — Data Gathering (Diagnosis Only)

**Scope:** the 8 sprite-complete characters (`hasSprites: true`): **Goku, Gojo, Megumi, Sukuna, Toji, Naruto, Sasuke, Rick**.
**Sources:** all numbers pulled directly from `characters.js`, `abilities.js`, `combat.js`, `summons.js`, `kurama.js` — no estimates. Line refs are given where a value is not in the character's `characters.js` data block. All values re-verified against the current tree.
**Line-ref note:** `combat.js`, `kurama.js`, `summons.js`, and `characters.js` refs are exact. `abilities.js` and `game.js` refs were captured before the beta-input commit (`10fa473`), which shifted them — **add ~59 to any `abilities.js` line, ~16 to any `game.js` line** to locate it in the current tree (e.g. `executeRickUltimate` cited `:2391` is now `:2450`; Naruto ult cost `:833` is now `:892`; the DOT tick `game.js:1919` is now `:1935`). Values are unaffected.
**Status:** NOTHING is rebalanced here. This is diagnosis. Report back before any number changes.

---

## ⚠️ Read this first — the global damage scale and its bypass

`combat.js:53` defines a single lever:

```js
const GLOBAL_DAMAGE_SCALE = 0.60   // "+66% time-to-kill"
```

The in-code comment claims it scales *"every point of dealt damage (melee, projectile, throw)"* and that *"RELATIVE balance between characters is untouched."* **That claim is only half true.** Tracing every damage path:

| Damage path | Scaled by 0.60? | Code |
|---|---|---|
| Melee normals / specials (`createAttackFromMove`) | ✅ ×0.60 (+ `offenseMult`) | `combat.js:621-627` |
| Projectiles (Rasengan, Rocket, shuriken, clone hits) | ✅ ×0.60 | `combat.js:934` |
| Throws / grabs | ✅ ×0.60 (melee `cat`) | `combat.js:621` |
| **Summons** (Megumi's dogs/nue/toad/elephant; Rick's Meeseeks) | ❌ **RAW** | `summons.js:442` |
| **Manual-damage ultimates** (Rick Self-Destruct 180; Kurama TBB 600) | ❌ **RAW** | `abilities.js:2436`, `kurama.js:244` |
| **DOT ticks** (Rasenshuriken wind-chip) | ❌ **RAW** | `game.js:1919` |

**Consequence:** any character who deals damage through summons, manual-subtract ults, or DOT is effectively hitting **1.667× harder** relative to everyone whose damage runs through the scaled melee/projectile pipeline. This is the single biggest systemic finding in this audit, and it is flagged again in the Outliers section. **Two number sets are given below: RAW (as authored) and EFFECTIVE (what the engine actually subtracts from HP).**

---

## 1. Core stats — side by side

| Char | HP | Max Energy | Energy type | Atk | Def | Spd | Mobility | Primary archetype |
|---|---:|---:|---|---:|---:|---:|---|---|
| Toji | **1260** | **0** | none | 96 | 89 | **98** | very_high | melee / speed |
| Sukuna | 1240 | 210 | cursed energy | **95** | 87 | 86 | high | melee / curse |
| Goku | 1200 | 200 | ki | 92 | 86 | 88 | high | melee / transform |
| Naruto | 1180 | 190 | chakra | 89 | 84 | 90 | high | melee / summons / ranged |
| Sasuke | 1180 | 190 | chakra | 89 | 84 | 90 | high | melee |
| Megumi | 1120 | **210** | cursed energy | 84 | 82 | 83 | medium | melee / summons |
| Gojo | 1160 | **220** | cursed energy | 91 | 88 | 87 | high | ranged / melee |
| Rick | **1050** | 160 | bullshit science | **82** | **78** | **80** | medium | ranged / zoner |
| Netero | **980** | 150 | nen | **98** | 82 | 94 | high | melee / speed |

HP spread = **210 (1050 → 1260)** for the original 8; Netero (added 2026-07-22) drops the floor to **980** → spread **280**.

> **Netero (Hunter x Hunter) — added 2026-07-22.** Deliberate glass-cannon speedster. Two intended outliers, internally consistent (extreme risk/reward, no defensive tools):
> - **Atk 98 = new roster ceiling** (above Toji 96, Sukuna 95) — highest attack on the roster.
> - **HP 980 = new roster floor** (below Rick 1050) — frailest fighter.
> - Spd 94 = 2nd-fastest (Toji 98 tops); Def 82 mid-low. His base normals/specials run through the standard scaled pipeline (EFF ≈ RAW × 0.60), so the high Atk stat does **not** bypass GLOBAL_DAMAGE_SCALE.
> - **Ultimate = 100-Type Guanyin Bodhisattva**, a sustained giant form (SUSANOO_DURATION_FRAMES ≈ 20s, full-meter cost), same class as Sasuke/Itachi Susanoo. Design choice: a *fast multi-hit* giant (avatar hits ~59–77 EFF each, 1.6× form buff already applied) rather than Sasuke's single ~302 EFF sword — high DPS over the window, not per-hit burst.
> - NOTE: this §1 table predates Vegeta / Beerus / Itachi / Omega Ranger; treat it as a *relative* reference, not a current census.

> **Zenitsu Agatsuma (Demon Slayer — FIRST of the universe) — added 2026-07-28.** Extreme burst-speed glass cannon. **One deliberate SHAPE-outlier (the Ultimate's gating), no power/damage outlier.**
> - Core: **HP 1000 · Energy 0 · Atk 88 · Def 74 · Spd 96 · mobility very_high.** HP 1000 sits between Netero 980 and Rick 1050 (2nd-frailest). **Def 74 = new roster floor** (below Rick 78) — intentional: the fragile-fast identity, and the systemic counterweight to a repeatable Ultimate. Spd 96 ties Tobirama, just under Toji/Minato 98. Atk 88 mid (ties Hisoka).
> - **Zero-energy, but NOT "pays nothing" like Toji.** Toji's `maxEnergy 0` kit costs literally nothing (flagged §Outliers #4). Zenitsu is also `maxEnergy 0`, but every non-normal is **COOLDOWN-gated**, so his currency is real-time recast windows, not a meter: Thunder Breathing 1st Form (`thunderCd` 90f/1.5s), Double Attack (`doubleAtkCd` 150f/2.5s, shared by both variants), Ultimate (`ultimateCooldown` 480f/8s). More constrained than Toji, not less.
> - Normals (RAW): light 50 · heavy 90 · up 70 · air 60 · down_air 80 — all `createAttackFromMove` → **scaled ×0.60**. Rekka "Thunderclap Flurry" (Down+Heavy): zenCombo1 32 → 2 38 → 3 62 (launcher), cancel-on-hit. Nothing exceptional; honest pipeline, no bypass.
> - Specials: **Thunder Breathing 1st Form** dash-strike 130 RAW → **78 EFF**, blockable (12% chip), lunging. **Double Attack** (Fwd=Tanjiro / Down=Inosuke): Zenitsu 70 RAW→42 EFF + a **60 direct** (summon-path, unscaled) partner hit ≈ **102 EFF** combined pincer — comparable to the roster's other 2-hit special confirms; the 60 direct is a small RAW-path contribution (a partner summon, same class as Megumi/Naruto summons) but tiny and cooldown-limited, not a bypass concern.
> - **Ultimate = "Godspeed" dash-through slice — the intended outlier SHAPE, flagged deliberately.** 300 RAW → **180 EFF** (scaled — honest side of §"global damage scale"). Damage is **mid-band, NOT an outlier**: = Rick Self-Destruct 180, below Sasuke Susanoo ~302. What IS unusual, in combination:
>   1. **COOLDOWN-gated, not energy** — the ONLY ult with no meter cost + a short (**8s**) recast. Every other damaging ult gates behind full meter (45.5–87.5%) *and* the 20s universal lockout (or Naruto's bespoke 40s). Zenitsu reuses the same `ultimateCooldown` field, just stamped 8s.
>   2. **UNBLOCKABLE** — a deliberate `attack.unblockable` guard-bypass (combat.js). Rare: most ults chip on block; the dodge-type ults (Gojo Unlimited Void auto-dodge, Rick proximity) avoid rather than pierce guard.
>   3. **Repeatable** — no meter + 8s ⇒ throwable every 8s.
>   **Verdict: shape-outlier, not power-outlier.** The **same-level requirement is the balancing lever** — a grounded opponent who simply *jumps on read* makes it whiff, leaving Zenitsu in recovery to punish (and he's the frailest-defense char on the roster, def 74 / HP 1000). So it is oppressive only vs. a grounded/cornered opponent and hard-countered by a single jump. Mid-band damage + hard counterplay + lowest survivability keep the *power* in check. **Watch-item, not a fix:** the 8s cooldown is the tuning knob — if playtests read it as too repeatable-and-safe, raise toward 10s (still inside the intended 5–10s design band) before touching damage. Filed as a deliberate, internally-consistent outlier (like Netero's), not an accident.

---

## 2. Basic-attack frame + damage data (RAW)

Damage shown is authored/raw; effective = ×0.60. Format: **dmg · startup/active/recovery**.

| Move | Goku | Gojo | Megumi | Sukuna | Toji | Naruto | Sasuke | Rick |
|---|---|---|---|---|---|---|---|---|
| light | 45 · 4/3/10 | 45 · 4/3/10 | 42 · 4/3/10 | 50 · 4/3/10 | **52 · 3/3/9** | 44 · 4/3/10 | 46 · 4/3/10 | **34 · 5/3/12** |
| heavy | 85 · 8/4/18 | 85 · 8/4/18 | 82 · 8/4/18 | **100 · 9/4/19** | 96 · 7/4/16 | 82 · 8/4/18 | 92 · 8/4/18 | **60 · 9/4/20** |
| upAttack | 70 · 7/4/16 | 70 · 7/4/16 | 68 · 7/4/16 | 75 · 8/4/17 | 72 · 6/4/14 | 66 · 7/4/16 | 68 · 7/4/16 (launch 11) | 56 · 8/4/17 (launch 10) |
| airAttack | 60 · 5/3/10 | 60 · 5/3/10 | 58 · 5/3/10 | 70 · 5/3/10 | 62 · 4/3/9 | 56 · 5/3/10 | 54 · 5/3/11 | 44 · 6/3/11 |
| downAir | 80 · 9/4/14 | 80 · 9/4/14 | 76 · 8/4/14 | 90 · 9/4/15 | 82 · 7/4/12 | 72 · 8/4/13 | 78 · 8/4/13 | *absent* |
| grab | 30 | 30 | 28 | 40 | 40 | 30 | *(none)* | 30 |

**Read:** Toji has the fastest/hardest normals (light 52 @ 3f startup, heavy 96 @ 7f). Sukuna hits hardest on heavy (100). Rick's normals are deliberately the weakest in every slot (light 34, heavy 60) and slowest startup — his zoner tax, and he has no downAir at all.

---

## 3. Specials & ultimates — damage, cost, cost-as-%-of-meter, frames

RAW = authored. EFF = actually subtracted from HP (×0.60 unless the path bypasses the scale — bypass paths are marked 🔓 and shown RAW). Cost% = cost ÷ that character's max energy.

### Goku (maxEnergy 200)
| Move | RAW | EFF | Cost | Cost% | s/a/r |
|---|---:|---:|---:|---:|---|
| dragonFist | 150 | 90 | 40 | 20% | 10/6/22 |
| kamehameha | 120 | 72 | 30 | 15% | 12/5/22 |
| SSB ultimate | *buff* (2× dmg, 1.4× spd form) | — | 100 | 50% | — |

### Gojo (maxEnergy 220)
| Move | RAW | EFF | Cost | Cost% | s/a/r |
|---|---:|---:|---:|---:|---|
| blue | 110 | 66 | 30 | 13.6% | 10/5/18 |
| red | 130 | 78 | 40 | 18.2% | 14/5/22 |
| hollowPurple | 200 | 120 | 70 | 31.8% | **20/6/30** |
| Unlimited Void ult | *domain, Infinity auto-dodge* | — | 100 | 45.5% | — |

### Megumi (maxEnergy 210) — 🔓 summons bypass the 0.60 scale (RAW = EFF)
| Move | RAW=EFF 🔓 | Cost | Cost% | s/a/r | cooldown |
|---|---:|---:|---:|---|---:|
| divineDogs | **95** | 20 | 9.5% | 10/5/18 | 120 |
| nue | **110** | 25 | 11.9% | 14/5/20 | 160 |
| toad | 70 | 20 | 9.5% | 12/6/19 | 140 |
| rabbitEscape | 20 | 15 | 7.1% | 9/18/14 | 180 |
| maxElephant | **145** | 35 | 16.7% | 20/6/26 | 240 |
| Mahoraga ult (permanent xform) | wheelRotation 180×1.5×0.60 = **162** eff | 100 | 47.6% | 16/6/26 | — |

Mahoraga also raises maxHealth → **1600** and applies 1.5× dmg / 1.35× def (`abilities.js:1526-1531`).

### Sukuna (maxEnergy 210)
| Move | RAW | EFF | Cost | Cost% | s/a/r |
|---|---:|---:|---:|---:|---|
| cleave | 160 | 96 | 40 | 19% | 10/6/20 |
| dismantle | 140 | 84 | 35 | 16.7% | 10/5/20 |
| Malevolent Shrine ult | *domain* | — | 100 | 47.6% | — |

### Toji (maxEnergy 0) — **every ability costs 0**; the only cost is frame commitment
| Move | RAW | EFF | Cost | s/a/r | src |
|---|---:|---:|---:|---|---|
| inventorySmash (special) | 155 | 93 | **0** | 8/5/18 | `abilities.js:1247` |
| rapidStrike | 65 | 39 | **0** | 4/4/10 | `:1236` |
| tojiTeleportStrike | 60 | 36 | **0** | 3/4/10 | `:1264` |
| chainKnife (projectile) | 95 | 57 | **0** | @14 windup | `:1197` |
| curseSpirit (projectile) | 70 | 42 | **0** | — | `:1223` |
| Heavenly Restriction ult | *1.6× dmg / 1.8× spd, 8s* | — | **0** | — | `:1275` |
| **Blade stance** quickDraw/forwardSlash/skywardCut | 44 / 62 / 55 | 26 / 37 / 33 | 0 | see §4 | `:1328-1330` |
| **Blade** reaper1/2/3 (rekka) | 30 / 34 / 50 | 18 / 20 / 30 | 0 | `:1331-1333` |
| **Blade** dashStrike / risingSpiral | 80 / 72 | 48 / 43 | 0 | `:1340,1344` |
| **Chain** shortLash/wideArc/lowSweep/risingCoil | 38 / 66 / 54 / 58 | 23 / 40 / 32 / 35 | 0 | `:1371-1374` |
| **Gun** snapShot / tracerRound (aimedShot = 0, feint) | 20 / 42 | 12 / 25 | 0 | `:1313,1315` |

### Naruto (maxEnergy 190). Runtime hardcodes damage in `abilities.js` (matches the data block except Big Ball charge-scaling).
| Move | RAW | EFF | Cost | Cost% | s/a/r |
|---|---:|---:|---:|---:|---|
| rasengan | 120 | 72 | 30 | 15.8% | 8/4/16 |
| bigBallRasengan (charge 150→210) | 210 | 126 | 55 | 28.9% | 14/6/22 |
| rasenshuriken (+ 🔓 40 raw DOT) | 260 (+40) | 156 **+40 = 196** | 80 | 42.1% | **20/8/30** (runtime cooldown 50) |
| darkRasengan (AOE) | 180 | 108 | 45 | 23.7% | 12/8/22 |
| kawarimi (defensive) | 0 | 0 | 25 | 13.2% | 6/0/20 |
| shadowCloneBlast | 80 | 48 | 25 | 13.2% | 8/6/16 |
| **Kurama Avatar ult** (TBB, 🔓 raw, guaranteed) | **600** | **600** 🔓 | 95* | 50% | cinematic + **2400f/40s recast** (was 4800f/80s) |

\* `characters.js` declares `cost:100`, but `abilities.js:833` spends `ceil(maxEnergy×0.5) = 95`. **Discrepancy — flag.** Blocked TBB still deals `600×0.20 = 120` (`kurama.js:75`).
\*\* **Recast retune (2026-07-24):** Naruto's ult uses a bespoke `NARUTO_KURAMA_RECAST_FRAMES` instead of the universal 1200f/20s. Cut **4800f/80s → 2400f/40s** — see §Naruto-ult-retune below.

### Sasuke (maxEnergy 190). Susanoo attacks fire on the SPECIAL button while in-form.
| Move | RAW | EFF | Cost | Cost% | s/a/r | src |
|---|---:|---:|---:|---:|---|---|
| Dash Strike (neutral SP) | 55 | 33 | 18 | 9.5% | 4/4/12 | `abilities.js:1873` |
| Two-Strike Lightning (qcf) | 42+46=88 | 53 | 24 | 12.6% | **30f handseal** +14+16 | `:1919` |
| Chidori Koiten (qcb) | 95 | 57 | 35 | 18.4% | 16/6/20 | `:1841` |
| Shuriken (down+SP) | 34 | 20 | **0** | 0% | proj, cd16 | `:1893` |
| Absolute Defense (toggle) | *full negate* | — | 12/block | 6.3%/hit | — | `combat.js:312` |
| **Susanoo ult** Lv1 grab | 120×1.4×0.60 | **~100** | 95 (stage1) | 50% | 12/8/22 | `:2126` |
| Susanoo Lv2 grab | 210×1.9×0.60 | **~239** | drains rest→0 | +→100% | 12/8/22 | `:1618` |
| Susanoo Lv2 **sword** | 265×1.9×0.60 | **~302** | (in-form, free) | — | 14/10/24 | `:2109` |
| Susanoo Lv2 arrow (proj) | 230×0.60 | **138** | (in-form, free) | — | cd26 | `:2093` |

Susanoo is a **sustained form**: `SUSANOO_DURATION_FRAMES = 1200` (~20s). One up-front energy cost buys ~20s of otherwise-free giant attacks. Its Lv2 sword (~302 eff) is the single hardest hit any of the 8 has that runs through the scaled pipeline.

### Rick (maxEnergy 160) — 🔓 Meeseeks & Self-Destruct bypass the 0.60 scale
| Move | RAW | EFF | Cost | Cost% | s/a/r | src |
|---|---:|---:|---:|---:|---|---|
| Meeseeks Box (summon, **uncapped**) | 45 | **45** 🔓 | 30 | 18.75% | one-hit | `abilities.js:2383` |
| Rocket (up+SP, proj) | 95 | 57 | 40 | 25% | proj | `:2367` |
| Portal-Laser (down+SP, proj) | 20 | 12 | **0** | 0% | proj | `:2337` |
| Portal-Pull (qcf, manual 🔓) | 42 | **42** 🔓 | 35 | 21.9% | — | `:2299` |
| Portal-Push (qcb, manual 🔓) | 65 | **65** 🔓 | 45 | 28.1% | — | `:2317` |
| **Self-Destruct ult** (🔓 raw, **instant**) | **180** | **180** 🔓 | 140 | **87.5%** | **0 startup** | `:2391` |

Meeseeks `maxSimultaneous: 99` — energy is the only limiter, they can stack. Self-Destruct: instant same-frame proximity AOE (220px), **Rick takes no self-damage**, no vulnerability state set (`:2415`).

---

## 4. Best realistic combo per character (RAW total, EFF in parens)

Combos computed from the actual move data and how they chain in code, not summed move lists.

| Char | Route | RAW total | EFF (×0.60) |
|---|---|---:|---:|
| **Toji** | Reaper's Rekka string reaper1→2→3 (30+34+50) | **114** | 68 |
| Toji (w/ opener) | quickDraw→reaper1→2→3 (44+114) | **158** | 95 |
| Toji (launcher) | skywardCut→risingSpiral air (55+72) | 127 | 76 |
| **Sasuke** | heavy→up(launch 11)→air juggle (92+68+54) | **214** | ~128* |
| Sasuke (extended) | light→heavy→up→air (46+92+68+54) | 260 | ~156* |
| Sasuke (Susanoo Lv2) | single sword hit | 265 (×1.9×.6) | **~302** |
| **Naruto** | Full Rasengan Barrage #19: anchor 90 + 3 clone hits ×70 | **300** | 180 |
| Naruto | rasenshuriken + DOT (260 + 🔓40) | 300 | **196** |
| Naruto | Combined Rasengan #20 (single 200 guaranteed) | 200 | 120 |
| Naruto (ult) | Kurama TBB (🔓 raw) | **600** | **600** |
| **Sukuna** | heavy→cleave (100+160) | 260 | 156 |
| **Goku** | heavy→dragonFist (85+150) | 235 | 141 |
| **Gojo** | red→hollowPurple confirm (130+200), or heavy→hollowPurple | ~285 | ~171 |
| **Megumi** | 🔓 maxElephant + nue chained summons (145+110) | 255 | **255** 🔓 |
| **Rick** | 🔓 Self-Destruct point-blank (instant, 180 raw) | 180 | **180** 🔓 |
| Rick (neutral) | heavy→rocket (60+95→57) | 155 | ~93 |

\* later combo hits taxed by `getComboScale` — EFF is a fresh-combo upper bound.

**Read:** in RAW terms Naruto (300 route / 600 ult) and Sasuke Susanoo (265 sword) top the chart. But once the 0.60 scale is applied to everyone-who-gets-scaled, **Megumi's 255 summon route and Rick's 180 Self-Destruct are delivered at full RAW** — they punch far above their apparent tier.

---

## 5. Damage-per-energy (EFFECTIVE dmg ÷ energy cost) — value per resource

Ranked; higher = more damage per point of meter. Toji excluded (zero-cost = infinite).

| Rank | Char · move | EFF dmg | Cost | **dmg/energy** |
|---|---|---:|---:|---:|
| — | **Toji · everything** | 26–93 | **0** | **∞** |
| 1 | Naruto · Kurama ult 🔓 | 600 | 95 | **6.32** |
| 2 | **Megumi · Divine Dogs** 🔓 | 95 | 20 | **4.75** |
| 3 | Megumi · Nue 🔓 | 110 | 25 | 4.40 |
| 4 | Megumi · Max Elephant 🔓 | 145 | 35 | 4.14 |
| 5 | Megumi · Toad 🔓 | 70 | 20 | 3.50 |
| 6 | Naruto · rasenshuriken (+DOT) | 196 | 80 | 2.45 |
| 7 | Goku · kamehameha / Sukuna · cleave & dismantle / Naruto · rasengan & dark | ~72–108 | var | ~2.40 |
| 8 | Naruto · bigBall | 126 | 55 | 2.29 |
| 9 | Sasuke · Two-Strike Lightning | 53 | 24 | 2.21 |
| 10 | Goku · dragonFist | 90 | 40 | 2.25 |
| 11 | Gojo · blue / red | 66 / 78 | 30 / 40 | 2.20 / 1.95 |
| 12 | Gojo · hollowPurple | 120 | 70 | 1.71 |
| 13 | Sasuke · Chidori Koiten | 57 | 35 | 1.63 |
| 14 | **Rick · Meeseeks** 🔓 | 45 | 30 | **1.50** |
| 15 | Rick · Portal-Push 🔓 | 65 | 45 | 1.44 |
| 16 | Rick · Rocket | 57 | 40 | 1.43 |
| 17 | **Rick · Self-Destruct** 🔓 | 180 | 140 | **1.29** |

**Read:** Megumi owns 4 of the top 5 non-ultimate slots — and hers are RAW/bypass, so the delivered value is even higher than the ratio suggests relative to scaled characters. Rick occupies the bottom four slots despite the lowest HP. Toji pays nothing at all.

---

## 6. Risk indicators — payout vs. commitment

**Low-risk / instant for the payout (flagged):**
- 🚩 **Rick Self-Destruct** — **0 startup**, resolves same-frame, 180 RAW (bypass), **no self-damage, no vulnerability state**. Only gates: 220px proximity + 87.5%-meter cost. The purest "no-risk-window" burst in the roster.
- **Toji tojiTeleportStrike** (startup 3) / **rapidStrike** (startup 4/rec 10, 65 dmg) — very fast, zero energy, low recovery. Near-free pressure.
- **Sukuna cleave** — 160 RAW (96 eff) at startup 10 — a lot of damage for a fairly quick special, though recovery 20 is punishable.
- **Naruto Kurama TBB** — guaranteed sure-hit cinematic; block only chips it to 120. Effectively unavoidable payout of 600 once cast.

**High-risk / punishable (the intended-cost side):**
- **Sasuke Two-Strike Lightning** — 30-frame rooted handseal; a hit during it cancels the move AND eats the 24 energy. Most self-punishing move in the set.
- **Naruto rasenshuriken** — recovery 30, runtime whiff cooldown 50 frames. Most punishable projectile.
- **Gojo hollowPurple** — 20 startup / 30 recovery for 200 RAW. Big but heavily telegraphed both ends.
- **Megumi maxElephant** — 20 startup / 26 recovery (slowest summon), though 145 RAW makes it worth it.

**Contrast to flag:** Rick's *ultimate* has the roster's lowest risk-window (instant, no self-damage) while Sasuke's *specials* carry the highest (30f handseal). Two opposite ends of the risk/reward axis with no shared tuning basis.

---

## 7. HP side-by-side & compensating-strength check

| Char | HP | vs Rick | Compensating strengths for lower HP? |
|---|---:|---:|---|
| Toji | 1260 | +210 | N/A (top HP) — also best normals, zero-cost kit, 98 speed |
| Sukuna | 1240 | +190 | N/A |
| Goku | 1200 | +150 | N/A |
| Naruto | 1180 | +130 | 600-dmg bypass ult, clone routes |
| Sasuke | 1180 | +130 | ~302 Susanoo sword, sustained form |
| Gojo | 1160 | +110 | biggest meter (220), Infinity auto-dodge ult, hollowPurple |
| Megumi | 1120 | +70 | **ult → 1600 HP**; best summon dmg/energy; RAW-bypass summons |
| **Rick** | **1050** | — | **See below** |

**Rick (1050 HP) — is he compensated, or strictly worse?**

Against the field Rick is the **simultaneous floor** on HP (1050), attack (82), defense (78), speed (80), basic-attack damage (light 34 / heavy 60), and damage-per-energy (bottom 4 slots). His genuine edges:
- 🔓 **Self-Destruct** — instant, 180 RAW, no self-damage (a real, unique panic/kill button).
- 🔓 **Uncapped Meeseeks** — RAW-bypass summons that can stack (`maxSimultaneous 99`).
- **Portal-Behind teleport** + full projectile zoning kit (Rocket / Portal-Laser / Pull / Push), two of which (Pull/Push) are RAW-bypass.

**Verdict for the follow-up decision:** Rick is **not strictly worse** — his bypass-scale ult + uncapped summons + teleport give him a distinct, functional zoner identity. But his *neutral game* (lowest HP + lowest attack + lowest speed + weakest normals + worst DPE, all at once) is genuinely under-tuned, and his compensations are concentrated in two gimmicks (a 140-cost ult and summon spam) rather than spread across his kit. He is the roster's clearest "high-variance, low-floor" outlier and the most likely to need a look — flagged, not fixed.

---

## 8. Outliers — flagged, not fixed

1. 🚩 **The 0.60 scale bypass (systemic).** Summons, manual-subtract ultimates, and DOT bypass `GLOBAL_DAMAGE_SCALE`, so **Megumi, Rick's ult, and Naruto's Kurama/DOT hit 1.667× harder relative to every scaled melee/projectile character.** The scale comment's "relative balance untouched" is false. This warps *every* cross-character comparison below and is the highest-priority item.

2. 🚩 **Megumi's summon damage-per-energy.** 4 of the top 5 non-ult DPE slots (3.50–4.75), and because summons are RAW/bypass she delivers those at full value while paying only 9.5–16.7% of a 210 meter. Statistically out of line vs the ~2.2–2.4 DPE the scaled cast pays.

3. 🚩 **Rick Self-Destruct — zero-startup, no-self-damage, bypass-scale burst.** 180 RAW delivered instantly with no vulnerability window. Uniquely low-risk payout; only lever holding it is the 87.5%-meter cost + proximity. Explicitly the kind of move the brief asked to flag.

4. 🚩 **Toji pays nothing, ever.** `maxEnergy: 0` → inventorySmash (93 eff), a 158-raw rekka string, and a 1.6×/1.8× ultimate all cost **0 energy**. Every other character rations a meter; Toji's only currency is frame commitment. His DPE is literally infinite and he *also* has the best normals and top HP/speed. No resource downside anywhere in his kit.

5. 🚩 **Naruto Kurama ult = 600 RAW, guaranteed, bypass-scale.** ~3× the effective damage of the next-biggest scaled hit (Sasuke's ~302 sword), unavoidable (block only chips to 120), for 95 energy (DPE 6.32, highest in roster). The single most valuable button in the game — *per cast*. Its old **80s recast** (4× the universal 20s) was the counterweight, but it over-corrected: on a damage-per-cooldown basis the TBB sat BELOW Rick/Sasuke ults at 80s, so it *felt* nerfed despite the huge payload. **Retuned to 40s** (§Naruto-ult-retune) — the per-cast value stays flagged-high, but the availability is now in line with the pack.

6. **Sasuke Susanoo economics.** One up-front cost buys ~20s of free giant attacks topping ~302 eff/sword — a sustained-form value structure that doesn't compare cleanly to the per-cast meter economy every other character uses.

7. **Rick — low floor (see §7).** Bottom of the roster on HP/atk/def/spd/normals/DPE at once; compensations exist but are gimmick-concentrated.

8. **Data-block vs runtime discrepancies (accuracy, not balance):**
   - Naruto ult `cost:100` declared, **95 spent** in code (`abilities.js:833`).
   - Chidori Koiten header comment says "55 raw"; code spends **35** and deals **95** (`abilities.js:1842-1845`).
   - `abilities.js` hardcodes special damage rather than reading the `characters.js` block (they happen to match except Big Ball charge-scaling and base-rasengan `active` 5-vs-4). If numbers get retuned, **both** places need editing or they'll silently diverge.

---

## §Naruto-ult-retune — Kurama TBB recast cooldown 80s → 40s (2026-07-24, applied)

**Reported problem:** ~80s of ultimate lockout for ~half a health bar reads as clearly overtuned vs the rest of the roster; Naruto feels "nerfed" because of this specifically.

**Investigation (numbers pulled, not guessed):**
- Naruto ult: **600 raw** (guaranteed sure-hit; block → 120), cost **95** (50% meter), recast **4800f = 80s** (`NARUTO_KURAMA_RECAST_FRAMES`, Naruto-only).
- Every other character: universal **1200f = 20s** (`ULTIMATE_COOLDOWN_FRAMES`). Naruto was the sole outlier at **4×** the pack.
- Damage-per-cooldown (raw/s): Naruto @80s = **7.5**, which is *below* Rick self-destruct (180/20 = 9.0) and Sasuke Susanoo (~302/20 = 15.1) — i.e. despite owning the highest *per-cast* payload in the game, its *availability-adjusted* value sat at the bottom of the ultimate pack. That is exactly the "feels nerfed" report.

**Decision — cooldown REDUCTION, not damage increase.** The per-cast damage (600 raw) is already flagged as the roster's highest (§8 item 5); raising it would deepen an existing outlier. The problem is availability, so cut the cooldown. Chosen value **2400f = 40s (2× the universal 20s baseline)**:
- 600 / 40s = **15.0 raw/s ≈ Sasuke Susanoo's 15.1** — dead in line with the pack's premium ultimate, not an outlier either direction. (30s → 20 raw/s would overshoot to the roster's highest; 20s → equal-cooldown *and* highest-damage = clear outlier.)
- A **2× premium over baseline** is justified by it being the single hardest, unavoidable hit; but it's no longer the near-once-per-match famine 80s produced.
- The **50% meter cost already gates recast** (~20–27s to regen 95 energy), so 40s is the effective cadence: reliably once per 90s round, occasionally twice with real meter setup.

**Cross-check (no reverse outlier):** at 40s Naruto's ult-DPM and damage-per-cooldown match Sasuke's Susanoo and sit above Rick's — premium but not dominant. Damage/cost unchanged, so §5 DPE (6.32) and the §8-item-5 per-cast flag still stand; only availability moved. **Verified in-engine:** TBB connects for 600 (1180→580) and `ultimateCooldown` is set to 2400f/40s on cast (`harness` screenshot `naruto_ult_impact.png`).

---

*End of diagnosis. Naruto Kurama recast retuned 80s→40s (§Naruto-ult-retune); all other values unchanged.*

# Character Balance Audit — Data Gathering (Diagnosis Only)

**Scope:** the 8 originally sprite-complete characters: **Goku, Gojo, Megumi, Sukuna, Toji, Naruto, Sasuke, Rick**. (MK-feel Stage 5 sprite-flag-REMOVED Goku/Megumi/Toji → `hasSprites: false` = procedural box renderer; their `animationData` + all BALANCE data are KEPT, so every number below is unchanged — the flag only gates rendering, not gameplay.)
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
| **Summons** (Megumi's dogs/nue/toad/elephant; Rick's Meeseeks) | ✅ **×0.60 since MK-feel Stage 1a** (sole summon hit-site now routes through `applyScaledDamage`; Megumi reconciled in Stage 3c) | `summons.js:503` |
| **Manual-damage ultimates** (Rick Self-Destruct 180; Kurama TBB 600) | ✅ **×0.60 since MK-feel Stage 1a** (both route through `applyScaledDamage`; Kurama TBB reconciled Stage 3b, Rick Self-Destruct Stage 3d — Rick now ALSO pays a 15% self-HP cost) | `kurama.js:263`, `abilities.js:12788` |
| **DOT ticks** (Rasenshuriken wind-chip) | ❌ **RAW** | `game.js:1919` |

**Consequence:** any character who deals damage through summons, manual-subtract ults, or DOT is effectively hitting **1.667× harder** relative to everyone whose damage runs through the scaled melee/projectile pipeline. This is the single biggest systemic finding in this audit, and it is flagged again in the Outliers section. **Two number sets are given below: RAW (as authored) and EFFECTIVE (what the engine actually subtracts from HP).**

---

## 1. Core stats — side by side

| Char | HP | Max Energy | Energy type | Atk | Def | Spd | Mobility | Primary archetype |
|---|---:|---:|---|---:|---:|---:|---|---|
| Toji | **1050** | **0** (Heavenly Restriction, no cursed energy) | none | **98** | 82 | **98** | very_high | melee / speed |
| Sukuna | 1240 | 210 | cursed energy | **95** | 87 | 86 | high | melee / curse |
| Goku | 1200 | 200 | ki | 92 | 86 | 88 | high | melee / transform |
| Naruto | 1180 | 190 | chakra | 89 | 84 | 90 | high | melee / summons / ranged |
| Sasuke | 1180 | 190 | chakra | 89 | 84 | 90 | high | melee |
| Megumi | 1120 | **210** | cursed energy | 84 | 82 | 83 | medium | melee / summons |
| Gojo | 1160 | **220** | cursed energy | 91 | 88 | 87 | high | ranged / melee |
| Rick | **1050** | 160 | bullshit science | **82** | **78** | **80** | medium | ranged / zoner |
| Netero | **980** | 150 | nen | **98** | 82 | 94 | high | melee / speed |

HP spread = **210 (1050 → 1260)** for the original 8; Netero (added 2026-07-22) drops the floor to **980** → spread **280**.

> **Toji Fushiguro (JJK) — REBUILT 2026-08-11 on a fresh asset set.** The "peerless physical combatant" —
> ZERO cursed energy (Heavenly Restriction) traded for top-tier speed + hard-hitting normals, with a **novel
> two-stage COMEBACK as his survivability instead of raw bulk.** THE deliberate mechanic-outlier of the roster.
> - Core: **HP 1050 · Energy 0 · Atk 98 · Def 82 · Spd 98 · very_high mobility.** Speed **98 ties the roster
>   ceiling** (Maki/Minato — the teleport-blur gate). Atk **98 ties Netero's ceiling** (top of band). HP **1050 =
>   glass-cannon band** (tied 2nd-frailest of the melee crowd: above Netero 980 / Beerus 1000, below Maki 1180) —
>   DELIBERATELY low so the comeback, not bulk, is his durability. Def 82 low-mid. No energy meter (`hideResourceMeter`).
> - **Damage pipeline is HONEST — no GLOBAL_DAMAGE_SCALE bypass.** Every normal, the A-B-C-A+B rekka, all 5
>   specials (Split Soul / Rapid Slashes / Chain of a Thousand Miles / Playful Cloud / Fly Heads swarm) and the
>   Handgun bullet route through `createAttackFromMove` / `spawnProjectile` → all ×0.60 scaled. The Reincarnated
>   Form is a **buff-mode** (×1.25 dmg via `damageMultiplier`, so its output is his normal scaled attacks × 1.25) —
>   it does NOT manual-subtract HP like Rick/Kurama. So Toji sits on the honest side of the §damage-scale finding.
> - **THE OUTLIER = the two-stage comeback (two free extra lives per round).** No close precedent: the nearest
>   comparisons are single-trigger (Gon Adult-Form sudden-death; Maki ≤25%-HP Shibuya). Toji gets TWO auto-saves:
>   1st zero-HP → 25% HP (no transform); 2nd zero-HP → Reincarnated Form (×1.25/1.1/1.08) + 40% HP; 3rd → normal KO.
>   **Scrutiny — is this oppressive?** Mitigations that keep it fair: (1) **base HP is floor-tier (1050)** — each
>   "life" is a *small* HP bar, so the total effective HP across all 3 bars ≈ 1050 + 262 + 420 ≈ **1732**, which is
>   BELOW Superman's single 1450×(def 92) effective tankiness and only ~1.2× a normal fighter's bar — spread across
>   three burn-downs the opponent gets THREE damage-race resets, not a wall. (2) **No i-frame abuse** — the save
>   grants only ~40f of invuln to recover, not a full reversal. (3) **Def 82 + no meter** — he can't stall or
>   stockpile; between saves he's as killable as any glass cannon. (4) **The Reincarnated buff is modest** (×1.25,
>   same class as Maki Shibuya ×1.25) and only arrives on the *2nd* save (i.e. when he's already been beaten twice).
> - **VERDICT: deliberate mechanic-outlier, internally consistent — NOT a stat-power outlier.** Recommended tuning
>   knobs, in order, IF playtests read the two lives as too safe: **(a) lower SAVE-2 from 40% → ~30%** (the biggest
>   single lever; save-1 25% is already lean); **(b) drop the per-round reset to per-match** (2 lives for the whole
>   best-of-3 instead of per round — this is the largest nerf and matches the original brief's "per match" wording);
>   **(c) trim base Atk 98 → 96** only if his per-hit *and* comeback together over-perform. Do NOT also raise base HP —
>   the low HP is the counterweight that makes the comeback fair. **Save-% and per-round-vs-per-match are the two
>   open design decisions flagged for sign-off** (current build: 25% / 40% / per-round).

> **Netero (Hunter x Hunter) — added 2026-07-22.** Deliberate glass-cannon speedster. Two intended outliers, internally consistent (extreme risk/reward, no defensive tools):
> - **Atk 98 = new roster ceiling** (above Toji 96, Sukuna 95) — highest attack on the roster.
> - **HP 980 = new roster floor** (below Rick 1050) — frailest fighter.
> - Spd 94 = 2nd-fastest (Toji 98 tops); Def 82 mid-low. His base normals/specials run through the standard scaled pipeline (EFF ≈ RAW × 0.60), so the high Atk stat does **not** bypass GLOBAL_DAMAGE_SCALE.
> - **Ultimate = 100-Type Guanyin Bodhisattva**, a sustained giant form (SUSANOO_DURATION_FRAMES ≈ 20s, full-meter cost), same class as Sasuke/Itachi Susanoo. Design choice: a *fast multi-hit* giant (avatar hits ~59–77 EFF each, 1.6× form buff already applied) rather than Sasuke's single ~302 EFF sword — high DPS over the window, not per-hit burst.
> - NOTE: this §1 table predates Vegeta / Beerus / Itachi / Omega Ranger; treat it as a *relative* reference, not a current census.

> **Hisoka Morrow (Hunter x Hunter) — added 2026-07-28.** Flexible mid-tier technician. **No stat outliers, no damage-scale bypass.**
> - Core: **HP 1080 · Nen 170 · Atk 88 · Def 82 · Spd 91.** Every value sits INSIDE existing bands — HP between Rick 1050 / Megumi 1120; Atk below Gojo 91 / above Killua 84; Spd upper-mid (Naruto/Sasuke 90 < 91 < Netero 94). No ceiling/floor records.
> - Normals (RAW): light 40 · heavy 80 · upAttack 62 · airAttack 52 · downAir 68 — deliberately *moderate* (combo/mixup technician, not a burst bruiser); downAir 68 is the roster's lowest but by design. All run through `createAttackFromMove` → **scaled ×0.60** (EFF ≈ RAW×0.60).
> - **Clean damage pipeline — NO GLOBAL_DAMAGE_SCALE bypass.** Bungee Gum + rekka are `createAttackFromMove` (scaled); Texture Surprise cards are `spawnProjectile` (scaled); the Bloodlust Overdrive ultimate is a **buff-mode form**, so its output is his normal (scaled) attacks × a 1.3 multiplier — it does NOT manual-subtract HP like Rick Self-Destruct / Kurama TBB. So Hisoka is on the honest side of the §"global damage scale" finding.
> - Specials: Bungee Gum 72 RAW (EFF ≈43), rangeX **172** = 2× the normals' default 85 (extended-reach whip, offset by 30 Nen + startup 8). Texture Surprise: single 48 RAW precise / rapid 5×16 RAW spread (zoning). 
> - **Ultimate = Bloodlust Overdrive**, a sustained buff-mode form (near-max Nen gate 140/170, 0.30/frame drain → auto-revert): +30% dmg, +25% attack speed, Bungee Gum reach 172→230. Same class/tier as Killua Godspeed (×1.25 dmg / ×1.4 atkSpd) and Gon Adult Form (×1.3 dmg) — sits squarely between them, no outlier. Drain-limited window is the counterplay.

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

> **Superman (DC — 3rd DC char, 20th sprite char) — added 2026-07-29.** Deliberate top-tier durability/power bruiser. **Three STAT-record outliers (HP/Atk/Def ceiling), all canon-justified; NO damage-scale bypass on his bread-and-butter, ONE unscaled ultimate (same class as Omni-Man).**
> - Core: **HP 1450 · Solar Energy 200 · Atk 100 · Def 92 · Spd 88 · mobility high · canFly.** Three new roster ceilings: **HP 1450** (above Omni-Man 1400), **Atk 100** (above Netero/Omni-Man 98), **Def 92** (above Toji 89). Spd 88 is deliberately mid (flight covers mobility). This is the intended "most durable + strongest on the roster" identity.
> - **The Atk-100 ceiling does NOT translate to outlier damage.** `combat.js:1318` derives `offenseMult` from `damageMultiplier`/`attackMultiplier` (mode buffs) — **not** the base Atk stat — so Superman's per-hit output is purely his authored RAW × 0.60. Normals (RAW): light 36 · heavy 72 · up 56 · air 48 · down_air 62 → **EFF ≈ 22/43/34/29/37**. Heavy 72 RAW sits *below* Zenitsu 90 / Hisoka 80 — genuinely mid-band. So the powerhouse identity lives in **HP + Def (survivability)**, not per-hit burst.
> - **Def 92 + HP 1450 = the one real watch-item.** Highest defense × highest HP makes him the tankiest fighter; that's the deliberate archetype, but it's the tuning surface. **Knob: HP (trim toward ~1380 if playtests read him as oppressive — still above the 1260 original-8 ceiling).** Not changed here (diagnosis-only); filed as a deliberate, internally-consistent outlier like Netero's.
> - Clean pipeline on everything except the ult: rekka "Kryptonian Rush" (Fwd+Heavy, cancel-on-hit, supRush1 28 → 2 34 → Fin 74 RAW launcher) and both specials — **Heat Vision** (neutral, 52 RAW→31 EFF, independent-collision beam projectile via `spawnProjectile` → **scaled**) and **Super Flying Punch** (Fwd, 108 RAW→65 EFF dash-strike, `createAttackFromMove` → **scaled**) — all run the honest ×0.60 path.
> - **Two Mangekyou-style mode-toggles** (Down+Sp Solar Flare / Back+Sp Kryptonian Overload), mutually exclusive, drain the shared 200 Solar Energy pool (0.25/frame → ~13s), auto-revert at 0. Solar Flare = +25% dmg + Heat Vision→wide gold beam (84 RAW→50 EFF); Overload = +30% atk-speed +15% move-speed + Flying Punch→Overload Rush (150 RAW→**90 EFF**, the highest special EFF but mode+drain-gated). Same buff-mode tier as Killua Godspeed / Hisoka Overdrive; the shared-pool competition (flight + specials + modes + ult all draw one bar) is the self-limiting counterweight.
> - **Ultimate = "Solar Overload"** (freeze-cinematic, 100-cost = half the 200 bar + 20s universal cooldown): **380 RAW, manual-subtract (`opp.health -= dmg`) → 380 EFFECTIVE, UNSCALED.** This is on the **bypass side** of §"global damage scale" — but it's the *exact same class and pattern* as Omni-Man's Viltrumite Onslaught (340) and Kurama TBB (600), i.e. a guaranteed sure-hit cinematic ult. 380 sits between Omni-Man 340 and Sasuke Susanoo ~302…Kurama 600 — high, not a ceiling. A held block chips it to 25%. Consistent with the existing melee-powerhouse-ultimate precedent, not a new exploit.
> - **Verdict: stat-record bruiser, honest damage pipeline, one precedented unscaled cinematic ult.** The outliers are survivability records (HP/Def), deliberate and canon-shaped; his offense is mid-band-scaled + shared-pool-gated. Watch HP×Def tankiness in playtests (knob = HP).

> **Kyojuro Rengoku (Demon Slayer — 2nd of the universe, 21st sprite char) — added 2026-07-29.** Aggressive fire-Hashira bruiser. **No STAT-record outliers; ONE joint-high stat (Atk 92, ties Minato); honest scaled bread-and-butter + one precedented unscaled cinematic ult.**
> - Core: **HP 1140 · Energy 0 (cooldown-gated, like Zenitsu) · Atk 92 · Def 80 · Spd 92.** All INSIDE existing bands: HP between Tobirama 1120 / Minato 1150; **Atk 92 ties Minato** (above Gojo 91, below Toji 96 / Sukuna 95) — joint-2nd tier, not a ceiling; Def 80 mid-low (above Zenitsu 74, below the shinobi 82–84); Spd 92 upper-mid. No records set.
> - **Zero-energy, COOLDOWN-gated** (same currency model as Zenitsu, NOT Toji's free kit): Charged Flame Strike (`flameCd` 75f/1.25s), Counter (`counterCd` 96f/1.6s), Ultimate (`ultimateCooldown` 480f/8s). Real-time recast windows, not a meter.
> - **Bread-and-butter runs through the SCALED pipeline — NO bypass.** All 5 normals, both branching combo chains (ground `rengokuG1→G2→G3` + air `A1→ABridge→A2`), the three super finishers, and both Charged Flame Strike tiers are `createAttackFromMove` → **×0.60**. Normals (RAW): light 52 · heavy 95 · up 74 · air 62 · down_air 84 → **EFF ≈ 31/57/44/37/50** (heavy 95 RAW upper-mid, near Zenitsu 90). Flame Strike: tap 90 RAW→54 EFF / hold 150 RAW→90 EFF (hold ties Superman's Overload Rush for highest special EFF, but charge-committed + cooldown-gated + no meter to stockpile).
> - **Counter (reactive):** a parry WINDOW (`shouldRengokuCounter`, same negate-in-`resolveAttackHit` architecture as Sasuke Absolute Defense / Feedback Energy Absorption) that negates one incoming melee hit and ripostes **70 flat (manual-subtract, unscaled)**. Read-gated (must be timed vs an incoming startup) — a reactive-only punish, same class as a parry, not a neutral tool.
> - **Ultimate = "Flame Explosion"** (freeze-cinematic, cooldown-gated 8s, no meter cost): **340 RAW, manual-subtract (`opp.health -= dmg`) → 340 EFFECTIVE, UNSCALED.** On the **bypass side** of §"global damage scale", but the *exact same class/pattern* as Omni-Man Viltrumite Onslaught (340) and Superman Solar Overload (380) — a guaranteed sure-hit cinematic ult. 340 = Omni-Man's exact value, the LOW end of the cinematic-ult band (< Superman 380 < Kurama 600). A held block chips it to 25%.
> - **Verdict: balanced aggressive bruiser, no fix needed.** The one thing to watch is **Atk 92 (joint-high) + the honest-but-strong scaled kit** — offset by mid HP/Def, no energy meter (can't stockpile), and read-gated defense. Filed as internally-consistent (like Zenitsu/Superman), not an accident. Watch-item knob = Atk or the 8s ult cooldown if playtests read the flame pressure as too safe.

> **Shinobu Kocho (Demon Slayer — 3rd of the universe, 22nd sprite char) — added 2026-07-29.** The Insect Hashira: a low-BURST / high-ATTRITION glass-cannon technician (poison, not brute force). **Two deliberate SURVIVABILITY floors (HP + near-Def), NO damage-scale bypass on bread-and-butter; unscaled payoff is confined to the poison DoT + the one cinematic ult, both precedented.**
> - Core: **HP 960 · Energy 0 (cooldown-gated, like Zenitsu/Rengoku) · Atk 82 · Def 76 · Spd 97 · mobility very_high.** **HP 960 = new roster FLOOR** (below Netero 980 / Zenitsu 1000) — intentional: canonically the physically frailest Hashira. **Def 76 = 2nd-lowest** (above Zenitsu's deliberate 74 floor — his floor is kept intact). **Spd 97 = 2nd-fastest on the roster** (above Zenitsu/Tobirama 96, under Toji/Minato 98) — the fastest Demon Slayer. **Atk 82 = low** (below Killua 84); note base Atk does NOT scale damage in this engine (offenseMult derives from mode buffs), so the low value is archetype flavor — the low-power identity lives in the authored per-move RAW.
> - **Combined survivability (960 HP + 76 Def) is the frailest on the roster** — the single deliberate counterweight to her speed + poison attrition + an i-frame evade + a repeatable cooldown-gated ult. This is the Zenitsu shape (fragile-fast) pushed one notch: frailer than Zenitsu on HP, one notch less frail on Def.
> - **Bread-and-butter runs through the SCALED pipeline — NO bypass.** All 5 normals + the 3-hit "Insect Breathing" chain (shinobuG1→G2→G3) + the Poison Thrust's DIRECT hit are `createAttackFromMove` → **×0.60**. Normals (RAW): light 44 · heavy 78 · up 62 · air 52 · down_air 70 → **EFF ≈ 26/46/37/31/42** — the LOWEST normal-damage tier on the roster (every value at/below Zenitsu's, well under Rengoku's). Chain = 24+30+40 RAW → **~56 EFF** total for the full string. This is the honest low-burst side of §"global damage scale".
> - **Zero-energy, COOLDOWN-gated** (Zenitsu/Rengoku currency model, not Toji's free kit): Poison Thrust (`poisonCd` 78f/1.3s), Butterfly Flit (`flitCd` 66f/1.1s), Ultimate (`ultimateCooldown` 480f/8s). Real-time recast windows, not a meter.
> - **POISON DoT (the identity mechanic) — modest, bounded, unscaled attrition.** Poison Thrust (Neutral/Fwd Special) deals **24 EFF direct (scaled) + a wisteria POISON DoT** via the EXISTING generic `_dot` subsystem (Itachi black-flames precedent): `{ticks:7, interval:20, dmg:7}` = **≤49 unscaled over ~2.3s**. Butterfly Flit (Back Special) is a 0-damage i-frame backflip evade. The DoT is a small manual-subtract (same class as any `_dot`), gated by a 1.3s cooldown, and **`opp._dot =` OVERWRITES rather than stacks** — so poison never runs away, and re-applying just refreshes. A real but bounded attrition tool, not a bypass concern.
> - **Ultimate = "Insect Breathing: Butterfly Dance"** (freeze-cinematic spinning-DASH finisher, cooldown-gated 8s, no meter): **300 direct, manual-subtract (unscaled, range-independent sure-hit; a held block chips to 25% and NO poison) + a wisteria POISON finisher `{6×11=66}` on a CLEAN hit** = **~366 total.** On the bypass side of §"global damage scale", but the SAME class/pattern as every cinematic ult (Rengoku 340 / Omni-Man 340 / Superman 380 / Kurama 600). Her **300 DIRECT is the LOWEST direct of the cinematic-ult band** — the poison finisher supplies the rest as attrition, on-theme. Total 366 sits low-mid band (≈ Rengoku 340, < Superman 380).
> - **Verdict: internally-consistent low-burst attrition technician, no fix needed.** The deliberate outliers (HP-floor + near-Def-floor = frailest survivability) are the honest counterweight to a fast, poison-attrition, evasive kit with a repeatable ult. No damage-scale bypass on the repeatable neutral tools; the unscaled bits (poison DoT, cinematic ult) are precedented and bounded (DoT overwrites, ult is 8s-gated). **Watch-items, not fixes:** (1) the 8s ult cooldown is the tuning knob if the repeatable 366 reads as too safe (raise toward 10s, the Zenitsu band); (2) if the poison + speed + i-frame-evade package proves too slippery in playtests, the poison tick count (7) or `flitCd` are the levers before touching her already-floor survivability.

> **Kasumi Miwa (Jujutsu Kaisen — 6th of the universe, 25th sprite char) — added 2026-08-03.** Grounded, technical KATANA battojutsu swordfighter, mid-tier. **ZERO stat outliers; honest scaled bread-and-butter; ONE precedented unscaled cinematic ult — the LOWEST-power of that band.**
> - Core: **HP 1150 · Energy 160 cursed_energy · Atk 86 · Def 84 · Spd 93 · mobility high · spriteScale 1.7.** Every value INSIDE existing bands — HP between Megumi 1120 / Gojo 1160; Atk between Megumi 84 / Hisoka·Zenitsu 88; Def mid (= Maki 84); Spd upper-mid (Naruto 90 < 93 < Netero 94). **Energy 160 is deliberately the smaller cursed pool** (below the big-3 Gojo 220 / Sukuna·Megumi 210) — she's a weak-cursed-output sorcerer whose power is skill/battojutsu; 160 sits in the Netero-nen 150 / Hisoka-nen 170 band, no floor record.
> - **Bread-and-butter runs through the SCALED pipeline — NO bypass.** All 5 normals + the 3-hit "Battojutsu Rush" chain (miwaG1→G2→G3) + both grounded/air specials are `createAttackFromMove` → **×0.60**. Normals (RAW): light 44 · heavy 78 · up 62 · air 54 · down_air 70 → **EFF ≈ 26/47/37/32/42** (low tier, ~ Shinobu's). Chain = 28+34+48 RAW → **~66 EFF** total. Specials: Iai Dash 66 RAW→**~40 EFF** (gap-closer, 28 energy) · Rapid Slash Vortex 58 RAW→**~35 EFF** (air, 30 energy). Honest low-burst side of §"global damage scale".
> - **Energy-METERED** (cursed_energy 160), unlike the no-meter Demon Slayers — her specials/ultimate spend a real bar (regen + the hold-P charge stance rebuilds it). Both specials are cheap (28/30); the ult is the expensive commit (100 of 160).
> - **Ultimate = "Blade of the Neophyte"** (battojutsu quick-draw freeze-cinematic, 100 energy): **280 direct, manual-subtract (unscaled, range-independent sure-hit; a held block chips to 25%).** On the bypass side of §"global damage scale", but the SAME class as every cinematic ult — and its **280 is the LOWEST direct of the entire cinematic-ult band** (< Shinobu 300 / Rengoku·Omni-Man 340 / Superman 380), with **NO DoT/poison rider** (a single clean slash, unlike Shinobu's +66 poison or Ghostface's +60 bleed). So it's the most conservative unscaled ult on the roster.
> - **Verdict: clean mid-tier technician, no fix needed, no outliers.** Metered (not free), scaled bread-and-butter, lowest-power cinematic ult. **Watch-item, not a fix:** if the energy economy proves too generous (cheap 28/30 specials + a rebuilding charge stance), the special costs are the lever before the ult. Reserved/unused source content (ultimate_dash tail frames, Drinking pose, random_1/2 = a different character) noted in MIWA_ASSET_MAP.md.

> **Madara Uchiha (Naruto — 6th of the universe, 26th sprite char) — added 2026-08-04.** The LARGEST kit in the project: **7 specials + 2 command-normals + a tap/hold TIERED ultimate + 2 buff-mode forms** — a deliberate scope exception (vs. the standard 2–4). **ZERO stat outliers; every individual tool is scaled/in-band or precedented; the 7-special breadth is VERSATILITY, throttled by a shared energy pool — NOT raw power.**
> - Core: **HP 1180 · Energy 220 chakra · Atk 94 · Def 86 · Spd 92 · spriteScale 1.8.** All INSIDE existing bands, NO records — HP between Gojo 1160 / Toji 1260 (top-shinobi, not a ceiling); **Energy 220 ties Gojo's ceiling** (deliberate headroom for the tiered-ult's higher gate, below); Atk 94 above Gojo 91 / Minato·Rengoku 92, below Sukuna 95 / Toji 96 (and base Atk does NOT scale damage — flavor); Def 86 above the shinobi 82–84, below Toji 89; **Spd 92 deliberately upper-mid** (above Naruto/Sasuke 90, below Netero 94) — NOT a speed outlier.
> - **Normals + specials ALL run through the SCALED pipeline (×0.60) — NO bypass.** Normals (RAW): light 42 · heavy 92 · up 66 · air 56 · air_heavy 84 → **EFF ≈ 25/55/40/34/50** (≈ Sasuke). down_air is a genuine **GAP** (absent, like Rick). Specials (RAW→EFF, cost): Katon Fireball 110→66 (30) · Gunbai Summon = **projectile-reflect utility, 0 dmg** (25) · Gunbai Fan-Swing 96→58 (30) · Wood Spike 92→55 (28) · **Wood Dragon 150→90 (45 — highest special, = Rengoku charged / Goku dragonFist)** · Susanoo Base Punch 100→60 (FREE cmd-normal, cooldown-gated). Every value sits in an existing special band.
> - **Buff-mode #1 — tier-3 Susanoo armor** (Back+Heavy, 55 energy, ~6s): ×1.35 dmg / ×1.2 def, in-form light/heavy = armored sword swings. Same buff-mode class as Killua Godspeed / Hisoka Overdrive. **Note (UNDER-tuned, quality not power):** the armored attacks use the BASE hitbox range while the sword ART reaches farther → they whiff at mid-range. Weaker than it looks; a reach fix (like the giant got) is a quality item, not a nerf.
> - **Ultimate = TIERED (one button, tap/hold):** **TAP = Perfect Susanoo / Tengai Shinsei** — meteor freeze-cinematic, **340 manual-subtract** (unscaled sure-hit, block→25%), cost 100 (standard). Squarely the cinematic-ult band (= Rengoku/Omni-Man 340; < Superman 380; > Miwa 280) — **not an outlier.** **HOLD = Complete Susanoo giant** — a sustained tier-4 form (×1.9 dmg / ×1.5 def, ~10s), reusing the Sasuke/Itachi giant architecture; its big sword swings are 85/115 RAW ×1.9 → **97/131 EFF — LOWER per-hit than Sasuke's Susanoo Lv2 sword (~302).** Gated behind a **HIGHER 180-energy threshold** (must bank beyond the 100 standard) — verified NOT accessible at standard ult-ready energy (a HOLD below 180 falls back to the TAP tier).
> - **Verdict: fair VERSATILITY outlier, not a power outlier — no per-move damage nerf needed.** The 7-special scope gives him an answer to every situation, but (a) every tool is scaled/in-band with no stat records, (b) the strongest option (the giant) is gated behind the highest energy commitment on the roster, and (c) the **shared 220 chakra pool is the self-limiting throttle** — specials cost 25–45, armor 55, ult 100/180, so he can't deploy everything at once (the same shape as the Superman shared-pool finding). **Watch-item, not a fix:** if playtests read him as having "a free answer to everything," the lever is **energy costs** (raise special costs to force selection) before touching damage. **Quality item:** the tier-3 armor's reach-mismatch. Full 54-file utilization in MADARA_ASSET_MAP.md.
>
> **Ichigo Kurosaki (Bleach — FIRST of the universe, 27th sprite char) — added 2026-08-07.** Versatile high-mobility KATANA bruiser. **A LARGE kit (Madara-class scope exception): 5 normals + a 4-branch command system (Fwd+Heavy 3-hit rekka + Down/Back+Heavy + Fwd+Light + Dash+Heavy) + 5 direction-branched specials + a 2-part cinematic ult + an 8-way aerial dash.** Full-utilization mandate (every uploaded sprite assigned) drove the breadth — same confirmed exception precedent as Madara. **ZERO stat outliers; honest scaled bread-and-butter; ONE precedented unscaled cinematic ult; the breadth is VERSATILITY + mobility, throttled by a shared reiatsu pool — NOT raw power.**
> - Core: **HP 1160 · Energy 200 reiatsu · Atk 92 · Def 84 · Spd 94 · spriteScale 1.9.** All INSIDE existing bands, NO records — HP between Yuji 1120 / Sasuke·Madara 1180; **Energy 200 = Goku's 200** (below Gojo/Madara 220); Atk 92 ties Rengoku/Minato (below Sukuna 95 / Toji 96; and base Atk does NOT scale damage — flavor); Def 84 = shinobi band (below Toji 89 / Superman 92); **Spd 94 deliberately upper-mid** (above Miwa 93 / Rengoku·Madara 92, below the teleport-tier 98 Toji/Flash/Maki/Minato) — NOT a speed outlier.
> - **Normals (RAW):** light 44 · heavy 86 · up 68 · air 58 · down_air 78 → **EFF ≈ 26/51/40/35/47.** Heavy 86 sits below Zenitsu 90 / heavy band — mid-band. **Command system (RAW):** rekka 30/36/62, Down+Heavy 72, Back+Heavy 80, Fwd+Light 40, Dash+Heavy 84 → all scaled ×0.60 (EFF ≈ 18/22/37, 43, 48, 24, 50) — in-band pokes/launchers, low-knockback openers that the launcher finisher pays off (Miwa-rekka shape).
> - **Specials (RAW → EFF ×0.60, cost):** Getsuga Tenshō projectile 72→43 (30) · Charged Slash 96→57 (30) · Aerial Getsuga 72→43 (32) · **Hollow Getsuga 120→72 (48)** · **Hollow Rising 110→66 (46).** The two dark-form "Hollow" supers are the highest-damage specials but cost the MOST reiatsu — the built-in counterweight. Getsuga is the only projectile (independent collision), his sole zoning tool; everything else is committal melee.
> - **Ultimate = Getsuga Tenshō** (2-part dash-slash → rising-uppercut freeze-cinematic): **330 manual-subtract** (unscaled sure-hit, block→25%, launches skyward), cost 100 (standard). Squarely the cinematic-ult band (Miwa 280 < **Ichigo 330** < Rengoku/Madara 340 < Superman 380) — **not an outlier.** Universal 20s cooldown.
> - **8-way aerial dash** (traits.directionalDash) = a MOBILITY-tech advantage (8-directional air movement vs. the roster's single horizontal air-dash), zero damage. Note it alongside Spd 94 as the mobility surface, but it grants no offensive power.
> - **Verdict: fair VERSATILITY + mobility outlier, not a power outlier — no per-move damage nerf needed.** Mirrors the Madara finding: (a) every tool is scaled/in-band with no stat records, (b) the strongest specials (the Hollow supers) are gated behind the highest special costs (48/46), and (c) the **shared 200 reiatsu pool is the self-limiting throttle** — specials 30–48, ult 100, so he can't spam the whole kit. **Watch-items, not fixes:** (1) if the 8-way air-dash + Spd 94 + large kit reads as too slippery/complete in playtests, the levers are **special costs** (force selection) and the **air-dash cooldown** (physics `dashCooldown 22`) before touching damage; (2) the dark-form Hollow supers being on Up/Down special makes them reachable — the 48/46 cost is the tuning knob if they read as too available. Full 34-file utilization in the Stage-5 audit below (§Ichigo-utilization).

> **Inosuke Hashibira (Demon Slayer — 4th of the universe, 28th sprite char) — added 2026-08-08.** Dual-nichirin "Beast Breathing" rushdown. **ZERO stat outliers; honest scaled bread-and-butter; NO unscaled ultimate at all — the signature is a mechanic, not a damage spike. One genuinely NEW mechanic (mid-combo partner assist) whose damage is a small, cooldown-gated summon-class direct.**
> - Core: **HP 1040 · Energy 0 (cooldown-gated, like the other 3 DS chars) · Atk 88 · Def 74 · Spd 93 · mobility high · spriteScale 2.0.** All INSIDE existing bands, NO records — HP between Zenitsu 1000 / Rick 1050 (low-mid); **Def 74 deliberately TIES Zenitsu's floor (not undercut)** — the reckless all-offense identity, kept at the existing floor rather than setting a new one; Atk 88 ties Hisoka/Zenitsu (base Atk does NOT scale damage — flavor); Spd 93 ties Yuji, upper-mid (below Shinobu 97 / the teleport-tier 98). Combined 1040 HP + 74 Def is frail-ish but the HP cushions it — NOT the roster-frailest (Shinobu 960/76 is frailer overall).
> - **Normals (RAW):** light 42 · heavy 80 · up 60 · air 50 · down_air 72 → **EFF ≈ 25/48/36/30/43** — mid-low tier (≈ Shinobu/Miwa). All `createAttackFromMove` (scaled ×0.60), NO bypass.
> - **Command chain — "Beast Breathing Flurry" (5-stage, Fwd+Heavy → re-tap Heavy, cancel-on-hit):** B1–B5 = 18/20/22/26/42 RAW → **~77 EFF** for a full 5-hit confirm; **Down+Heavy "Beast Fang"** 62 RAW → 37 EFF. All scaled. The 5-stage length is longer than the roster norm (3), but each stage requires a fresh clean-hit confirm (whiff/block ENDS the string via shared `rekkaContinue`) — self-limiting. The ~77 EFF full string is a touch above Shinobu's 3-hit ~56 / Miwa's ~66, offset by the harder 5-confirm requirement.
> - **Cinematic specials (Neutral=Spin / Fwd=Dash Thrust / Down=Lunge Fan):** RAW 108/100/122 → **EFF ≈ 65/60/73 — deliberately routed through GLOBAL_DAMAGE_SCALE** (`applyInosukeSpecialDamage`), so they are NOT the roster's only unscaled regular specials. Damage is **RANGE-GATED at the strike beat** (whiffable) + a **shared 1.6s cooldown** (`beastSpecialCd`). Strong-but-fair special tier, honest pipeline, cooldown-throttled.
> - **Beast Breathing Assist (the NEW mechanic):** a mid-combo partner call — freezes Inosuke (hitstop), summons a Demon Slayer partner who performs ONE real move as a combo hit, then Inosuke's flurry auto-resumes. Damage = partner's `heavy` × 0.5 applied as a **summon-path direct (~40–48, e.g. Zenitsu 45)** — the SAME class/magnitude as Zenitsu's Double-Attack partner direct (60), on a **2.5s cooldown** (`bbaCd`). Tiny + cooldown-gated + whiffable + extends (doesn't multiply) the existing combo. Not a bypass concern (identical framing to the Zenitsu partner-direct already accepted in this audit).
> - **NO ultimate.** Inosuke has no separate cinematic ult (the mid-combo Assist IS his signature) — so he carries **none** of the unscaled 280–380 cinematic-ult burst every other recent addition has. This makes his total damage ceiling LOWER than the DS siblings despite the aggressive shape.
> - **Verdict: internally-consistent aggressive rushdown, no fix needed.** No stat records, honest scaled bread-and-butter, cinematic specials scaled + cooldown-gated, the new assist is a small summon-class direct, and there's no unscaled ult at all. **Watch-items, not fixes:** (1) the 5-stage flurry's ~77 EFF full confirm is the tuning surface if playtests read it as too rewarding — the lever is stage damage or the cancel window before touching stats; (2) the three cinematic specials sharing one 1.6s cooldown could feel available — the cooldown is the knob. Full 19-file utilization in §Inosuke-utilization below.

> **Tobi (Naruto — masked Obito alias, a FULLY SEPARATE roster char, 29th sprite char) — added 2026-08-08.** Kamui trickster/zoner. **A LARGE kit (Madara/Ichigo-class scope exception): 5 normals + air-kunai + a multi-stage Chain Grab + Kamui intangibility toggle + self-portal + opponent-teleport grab + Fire Phoenix split-projectile + a Nine-Tails cinematic ult.** Reuses Obito's Kamui-family ARCHITECTURE as a template but shares ZERO runtime state (own `_tobi*` namespace + own cinematic module — proven by the isolation section of `test:tobi`). **ZERO stat outliers; honest scaled bread-and-butter; ONE precedented unscaled cinematic ult; breadth is VERSATILITY, throttled by a shared chakra pool + the intangibility drain — NOT raw power. ONE proactive fix applied (Chain Grab cooldown).**
> - Core: **HP 1150 · Energy 200 chakra · Atk 90 · Def 84 · Spd 96 · spriteScale 1.90.** Deliberately Obito's exact statline (masked alias). All INSIDE existing bands, NO records — HP 1150 = Obito (< Sasuke/Madara 1180); Energy 200 = Goku/Ichigo (< Gojo/Madara 220); Atk 90 = Obito (base Atk does NOT scale — flavor); Def 84 = shinobi band; **Spd 96 = Obito, below the teleport-tier 98 — added to the teleport-blur list by the SAME Kamui FEAT allowlist as Obito, not by raw speed.** No stat outlier.
> - **Normals + specials + projectiles ALL run through the SCALED pipeline (×0.60) — NO bypass.** Normals (RAW): light 38 · heavy 76 · up 58 · air 44 · down_air 56 → **EFF ≈ 23/46/35/26/34** (≈ Obito, slightly below). The `air` normal also tosses a kunai (30→18 EFF projectile). All in-band.
> - **Specials (RAW→EFF ×0.60, cost):** **Chain Grab** — a multi-stage command grab (whip→reach→snatched→smash), guaranteed pull 42 + smash 84 → **75 EFF total + hard knockdown**, cost 30, **now 1.5s cooldown**. · **Kamui Warp** (self-portal) = 0 dmg mobility, cost 20. · **Kamui Grab** (opponent-teleport) = 0 dmg full-screen displacement, cost 20 (on connect). · **Fire Phoenix Jutsu** — a GIANT screen-filling fireball 60→36 that bursts into 4 sub-fireballs 22→13 each; **max ~88 EFF if the full fan connects** (realistically ~50–62), cost 42 — highest special, = Ichigo Hollow band. · **Kamui Intangibility** — a continuous defensive toggle (0.75 chakra/frame drain, ~4.8s on 200; melee-auto-drop; silent-off), 0 dmg. Every value sits in an existing special band.
> - **Ultimate = Nine-Tails Bijūdama** (giant-fox freeze-cinematic, own `tobiNineTailsCinematic.js` module + `_tobiKuramaHide`): **360 manual-subtract** (unscaled sure-hit, block→25%), cost 100. Squarely the cinematic-ult band (= Obito Juubi 360 = Rengoku/Madara 340…380 Superman; < Kurama 600) — **not an outlier.** Duplicate-render guard verified (caster hidden the whole beast sequence).
> - **Verdict: fair VERSATILITY outlier (Madara/Ichigo class), not a power outlier — one proactive fix.** Every tool is scaled/in-band with no stat records; the strongest options are cost-gated (Fire Phoenix 42, ult 100); the **shared 200 chakra pool + the intangibility's continuous drain are the self-limiting throttle** (phasing burns the same pool the specials need, so he can't be invincible AND cast freely for long). **The ONE genuine over-tune was the Chain Grab** — a 160-reach guaranteed 75-EFF + hard-knockdown unblockable at 30 chakra with NO cooldown, on a non-frail Obito-tier statline. **Fix applied: a 1.5s (90f) cooldown** (`_tobiChainCd`), so it's strong confirm-pressure but not spammable. **Watch-items, not fixes:** (1) "specials stay live while intangible" (inherited from Obito's design) lets him zone/grab while phased — the chakra drain competing with special costs is the counterweight; the lever is the drain rate if it reads as too safe. (2) Fire Phoenix's ~88 EFF max requires eating the whole fan; the 42 cost is the knob. Full 32-file utilization in `TOBI_ASSET_MAP.md`.

> **Obito Uchiha (Naruto — 7th of the universe, 29th sprite char) — added 2026-08-08.** An evasive space-time Kamui zoner/disruptor. **ZERO stat outliers; honest scaled bread-and-butter; ONE precedented unscaled cinematic ult.** BUT it carries **TWO genuinely NOVEL mechanics with no close power-precedent — flagged here for extra scrutiny per the build mandate:** (1) a **continuous intangibility toggle** and (2) a **non-damage position-teleport command grab**.
> - Core: **HP 1150 · Energy 200 chakra · Atk 90 · Def 84 · Spd 96 · spriteScale 1.30.** All INSIDE existing bands, NO records — HP between Yuji 1120 / Sasuke·Madara 1180; Energy 200 = Goku/Ichigo (below Gojo/Madara 220); Atk 90 mid (and base Atk does NOT scale damage — flavor); Def 84 = shinobi band; **Spd 96 deliberately upper-mid, JUST BELOW the teleport-tier 98** (Toji/Flash/Maki/Minato) — he is added to the double-tap teleport-blur list **by FEAT (an explicit allowlist), not by a stat record.** Not a speed outlier.
> - Bread-and-butter: 5 scaled normals (light 40 → heavy 78 → up 60 launcher / air 52 / downAir 58) + a Fwd+Heavy "Kamui Rod Combo" 3-hit rekka (32+38+60 RAW, cancel-on-hit) — all in-band, honest ×0.60 pipeline. 4 ranged specials (Shuriken 18 / Air 18 / Rod 22 / Giant 34 chakra) are scaled projectiles (38–70 RAW). Kamui self-portal (20) = pure mobility, no damage.
> - **Ultimate = Juubi / Ten-Tails Bijūdama** (giant-form freeze-cinematic): **360 manual-subtract** (unscaled sure-hit, block→20%), cost 100 (standard). Squarely the cinematic-ult band (Miwa 280 < Ichigo 330 < Rengoku/Madara 340 < **Obito 360** < Superman 380) — **not an outlier.** Universal 20s cooldown.
> - **⚠️ OUTLIER 1 — KAMUI INTANGIBILITY (continuous invuln toggle).** No close precedent: Gojo's Infinity and Sasuke's Absolute Defense are per-hit-priced *negations* that still let you act; Kamui is a full *phase* (unhittable by melee AND projectiles). **Why it is NOT degenerate / self-limiting by design:** (a) **continuous chakra drain** (0.75/f net −0.69 vs regen) caps a phase at **~4.8s** and auto-deactivates at 0; (b) **any melee swing auto-drops the phase** for that attack (he cannot be safe *and* pressure with normals — his only offense while phased is mid-damage projectiles/specials, i.e. an evasive-zoner window, not an unhittable-and-winning state); (c) the info-asymmetry (clear ON ghost / silent OFF) is a *mindgame*, adds **zero power**. **Verdict: a UTILITY/shape outlier, not a power outlier** — it deals no damage and is throttled three ways (drain + melee-drop + finite pool). **Watch-item, not a fix:** the tuning knob is the **drain rate** (`KAMUI_DRAIN`, abilities.js) — raise it if playtests read the phase as too sustainable; the melee-drop is the anti-degeneracy lever and should stay.
> - **⚠️ OUTLIER 2 — KAMUI TELEPORT GRAB (non-damage position payload).** A genuinely new grab OUTCOME type (the pipeline previously only ever *damaged* on release — combat.js `_grabTeleport` is the new stamp-and-clear override, guarded so normal grabs still throw for damage: Madara/Susanoo grab tests stay green). On a clean grab it warps the opponent to a random far point, **dealing 0 damage.** **Why it is NOT a power outlier:** the payoff is **disruption, not damage** — a full-screen neutral reset (like Rick's Portal-Push, but Push *does* deal 65; Obito's deals nothing). It costs a close-range grab read (reach 82, techable) for a purely positional reward. **Verdict: a UTILITY/disruption outlier, LOW power (0 dmg).** **Watch-item, not a fix:** if the full-screen reset proves too oppressive as a repeatable neutral-skip in playtests, add a cooldown or shorten the grab reach before anything else — there is no damage to nerf.
> - **Overall verdict: fair evasive-zoner/disruptor, no per-move damage nerf needed.** No stat records; scaled bread-and-butter; precedented cinematic ult. The two novel mechanics are both **utility, not power**, and each is self-limited (intangibility by drain+melee-drop; the grab by dealing no damage + a techable close read). Filed as deliberate, internally-consistent NEW-mechanic outliers — flagged for playtest scrutiny, not fixed. Full 66-file utilization in OBITO_ASSET_MAP.md.

> **Pain / Nagato's Deva Path (Naruto — 8th of the universe, 30th sprite char) — added 2026-08-10.** A gravity zoner + Akatsuki summoner. **A LARGE kit (Madara/Ichigo/Tobi-class scope exception, confirmed): 6 normals + a Fwd+Light command normal + a Fwd+Heavy 3-hit rekka + 4 separate specials (Almighty Push / Pull / Super Push / Dedera Double Attack) + a 5-option "Six Paths Summon" assist system + a freeze-cinematic ultimate.** Same confirmed exception precedent as Madara (every real special-tier file earns its own slot). **ZERO stat outliers; honest scaled bread-and-butter; ONE scaled cinematic ult (routed through the choke-point, NOT manual-subtract); the breadth is VERSATILITY, throttled by a shared chakra pool + assist cooldown — NOT raw power. ONE watch-item flagged (assists are cooldown-only, no energy cost).**
> - Core: **HP 1150 · Energy 210 chakra · Atk 90 · Def 84 · Spd 90 · spriteScale 2.0.** All INSIDE existing bands, NO records — HP 1150 = Obito/Tobi (below Sasuke/Madara 1180); **Energy 210 sits between Ichigo/Goku 200 and Gojo/Madara 220** (deep pool to feed the large kit, NOT a ceiling); Atk 90 = Obito/Tobi (base Atk does NOT scale damage — flavor); Def 84 = shinobi band (below Toji 89 / Superman 92); **Spd 90 = Naruto/Sasuke — deliberately NOT the teleport-tier** (below Madara/Rengoku 92; he is a grounded gravity zoner, not a speedster). No stat outlier.
> - Bread-and-butter: 6 scaled normals (light 40 → heavy 88 rod-thrust / up 64 launcher / airAttack 54 / airHeavy 80 / downAir 52 spike) + a Fwd+Light command jab (34) + a Fwd+Heavy 3-hit rekka (30+36+58 RAW, cancel-on-hit, launcher finisher) — all honest ×0.60 pipeline (measured combo confirm ~195 over the string). Heavy 88 RAW ties the shinobi-bruiser band (Zenitsu 90 / Vegeta ~), below Sukuna. In-band.
> - Specials (all metered, scaled): **Almighty Push** (neutral, 30 chakra) = a formless range-checked repulsion — ~54 EFF + big knockback (no projectile, canon-shaped); **Almighty Pull** (Back, 32) = a reel-toward command grab reusing the shared `_grabPull` reel (~27 EFF + reposition, like Hisoka's Bungee Gum); **Super Almighty Push** (Down, 55) = stronger shove ~79 EFF + a debris ground shockwave; **Dedera Double Attack** (Fwd, 42) = a sequenced clay-bird projectile (~55 EFF, explosion-on-connect). Costs 30–55 out of 210 — squarely the shinobi special band.
> - **Ultimate = Chibaku Tensei** (cast → black-sphere growth → slam → flat/dome/flame-pillar ground effect freeze-cinematic): **360 RAW → 216 EFF — routed through `applyScaledDamage` (the choke-point), NOT a manual-subtract unscaled sure-hit** (block chips to 25%), cost 100. Effective 216 = Tobi/Obito Juubi 216 (both 360×0.60), just above Madara Tengai 204 — **squarely the cinematic-ult band, and honestly SCALED (arguably the most conservative of the recent cinematic ults).** Duplicate-render guard verified in `test:pain` (single struck-once payoff, caster single-bodied, clean end).
> - **⚠️ WATCH-ITEM — the Six Paths assist system is COOLDOWN-ONLY (no energy cost).** Five summon options (Itachi/Konan/Sasori/Sasuke/Tobi) on `Charge + slot`, each a small rush-in summon-class direct (~52–64 RAW → ~31–38 EFF, `oneHit`, puff-despawn) sharing ONE 150f (~2.5s) cooldown. **Why it is NOT degenerate:** the shared cooldown means only ONE assist every 2.5s (can't stack the Paths), each is summon-class low damage, and the selector is a deliberate `Charge`-modifier gesture (doesn't crowd the Special/Ultimate/Grab buttons). **But** they're FREE (cooldown-gated, not chakra-priced) — the one deviation from the metered rest of the kit. **Verdict: versatility utility, low power, but flag the free-ness.** **Watch-item, not a fix (diagnosis-only pass):** if playtests read the assists as too available, the lever is a **small chakra cost per call** (10–20) before touching the damage or the 2.5s cooldown.
> - **Overall verdict: fair VERSATILITY outlier (Madara/Ichigo/Tobi class), not a power outlier — no per-move damage nerf needed.** Every tool is scaled/in-band with no stat records; specials are metered 30–55; the ult is honestly scaled (216 EFF); the **shared 210 chakra pool is the self-limiting throttle** for the offensive kit. The ONE thing that stands apart is the cooldown-only (free) assist system — flagged as the tuning surface. **Watch-items, not fixes:** (1) assist energy cost (above); (2) Almighty Pull → guaranteed follow-up: the reel sets up a free mixup on a 32-chakra grab — if it reads as too plus, the reel `gap`/hitstun are the knobs. Full 40-file utilization in `PAIN_ASSET_MAP.md`; canonical `test:pain` = 41/0 (every move + all 5 assists + the ult + the duplicate-render guard).

> **Red Ranger / Jason (Power Rangers — 4th ranger, FIRST of the classic MMPR team) — added 2026-08-11.** A compact hand-to-hand + Power Sword striker. **A NORMAL-scope kit (NOT a Madara-class exception): 5 normals + a Fwd+Heavy 3-hit punch rekka + an air dive-kick poke + ONE command-grab special + a freeze-cinematic ultimate.** **ZERO stat outliers; honest ×0.58 scaled bread-and-butter; ONE scaled command grab + ONE scaled cinematic ult (both routed through `applyScaledDamage`, NOT manual-subtract). No novel mechanic — every piece reuses a wired precedent (Omega rekka / shared resolveGrab / gokuBlackSword freeze contract). ONE watch-item flagged (the block-beating grab is energy-priced but has no cooldown).**
> - Core: **HP 1200 · Energy 180 morphin_grid · Atk 93 · Def 86 · Spd 92 · mobility medium · spriteScale 1.54.** All INSIDE existing bands, NO records — **HP 1200 sits squarely in the Power Rangers band** (Gold 1160 < Green 1190 < **1200** < Samurai Red 1220), below Sasuke/Madara-tier headroom; **Energy 180 is a mid pool** (above the samurai rangers' 160–165, in the Hisoka-nen 170 / below Goku·Ichigo 200 band) — feeds ONE 100-cost ult + a 15-cost grab, no stockpiling; Atk 93 mid-high (above Gojo 91 / Minato·Ichigo·Rengoku 92, below Madara 94 / Sukuna 95 — and base Atk does NOT scale damage, flavor); Def 86 = Naruto/Madara band (above shinobi 84, below Toji 89 / Superman 92); **Spd 92 upper-mid** (ties Madara/Rengoku/Minato, above Naruto/Sasuke 90, well below the teleport-tier 98) — NOT a speed outlier.
> - Bread-and-butter: 5 scaled normals (light 45 jab → heavy 88 cross / up 70 launcher / air 60 flying-kick / down_air 80 somersault, ×0.58 pipeline) + a Fwd+Heavy 3-hit rekka (rrRekka1 42 → rrRekka2 46 → rrRekka3 84 super-360 LAUNCHER, cancel-on-hit) + an airborne-Heavy dive-kick poke (58, cd-gated free). Full chain measured **~98 EFF over the 3-hit string** (harness-confirmed). Heavy 88 RAW ties the striker band (Samurai Red 90 / Green 88); nothing above the shinobi-bruiser ceiling. In-band.
> - **Special = the "trhow" command grab** (neutral Special, direction-agnostic): a REAL `resolveGrab` command grab (beats block, teched by the shared grab window) → trhow_1 lift → trhow_2 release throw via the shared `updateGrab`, **120 RAW → ~72 EFF (scaled), cost 15 morphin_grid.** Reach 80 (normal grappler range, NOT extended). Uchiha-Susanoo-grab damage tier (120), but at NORMAL reach and behind a 28-frame commit + whiff recovery + an energy price. **⚠️ WATCH-ITEM: it beats block and has NO cooldown beyond the commit/whiff recovery — energy is the only gate.** Why not degenerate: 15 energy per attempt (whiff still pays), teched by the shared window, normal reach (must be point-blank), and it competes with the 100-cost ult for the same 180 pool. **If playtests read it as too spammable, the lever is a small grab cooldown or a reach trim — not the damage.**
> - **Ultimate = "Power Sword: Overhead Strike"** (freeze-cinematic leaping overhead slash, sword_up_attack): **340 RAW → ~204 EFF — routed through `applyScaledDamage` (the choke-point), NOT a manual-subtract unscaled sure-hit** (block chips to 25%), cost 100. Effective 204 **exactly matches the Gold/Green Ranger ult tier** (both 340 base) and sits with Madara Tengai 204 — squarely the cinematic-ult band, honestly scaled. Reuses the WIRED `gokuBlackSword`/Kurama freeze contract (the samurai cinematic is unwired WIP — deliberately NOT used as the precedent). Single struck-once payoff + clean end verified in `test:red-ranger-mmpr` / `-stage4`.
> - **Overall verdict: fair, in-band all-rounder striker — no fix needed.** Every value sits inside the Power Rangers / roster bands with no stat records; the whole kit is honestly ×0.58 scaled (grab + ult both through the choke-point, no bypass); breadth is normal-scope (not a Madara exception). The ONE tuning surface is the block-beating, cooldown-less (energy-only) command grab — flagged, not fixed. Full file-utilization in `RED_RANGER_MMPR_ASSET_MAP.md`; canonical `test:red-ranger-mmpr` covers every move + a fallback-box sweep.

> **Hashirama Senju (Naruto — the First Hokage, "God of Shinobi", 31st sprite char) — added 2026-08-12.** The Mokuton summoner-wall. **A LARGE kit (Madara/Ichigo/Tobi/Pain-class scope exception, confirmed by the build mandate): 5 normals + a Fwd+Heavy 3-hit chain + a Fwd+Light poke + Kunai (ground/air) + a CHARGE tap/hold Wood Release Punch + Mokuton arm + a 4-TIER Tree-Summon ladder + a Wood Golem 2-hit + Gracious Deity Gates (immobilize) + a freeze-cinematic ult** — every real special-tier file earns its own slot (same precedent as Madara). **ZERO damage-scale bypass — the ENTIRE kit is honestly scaled; ONE scaled cinematic ult (through `applyScaledDamage`, NOT manual-subtract). The breadth is VERSATILITY, throttled by a shared chakra pool + escalating tier costs + cooldowns — NOT raw power. THREE stat/mechanic watch-items flagged (incl. the 2026-08-12 Wood Release climbable-pillar mobility tool).**
> - Core: **HP 1220 · Energy 220 chakra · Atk 94 · Def 92 · Spd 88 · mobility medium · spriteScale 1.7.** Atk 94 = Madara (above shinobi 89, below Sukuna 95 / Toji·Netero 98) — upper-mid, and base Atk does NOT scale damage. Spd 88 mid (below the shinobi 90 and well below the 98 teleport gate) — deliberately NOT a speedster; he's the wall, not the runner. Energy 220 **ties Gojo's ceiling** — justified: it funds the single largest option-set (tree ladder + golem + gates + ult all draw the same bar). **⚠️ WATCH-ITEM #1 — Def 92 × HP 1220.** Def 92 **ties Superman's defense record** (the roster ceiling); combined with HP 1220 (2nd-highest behind Sukuna 1240 among non-Superman) this makes him the **2nd-tankiest fighter by Def×HP** (Superman 92×1450 is #1). Deliberate "God of Shinobi premier wall" archetype and canon-justified, but it IS the tuning surface. **Knob: trim HP toward ~1180 or Def to 90 if playtests read him as too durable — not the damage.**
> - Bread-and-butter (all ×0.60 scaled — RAW → EFF): 5 normals light 46→28 / heavy(kick) 90→54 / up 68→41 / air 56→34 / down_air 76→46; Fwd+Heavy chain hashiComboA 40→24 → B 46→28 → Fin 86→52 LAUNCHER (cancel-on-hit, ~104 EFF full string); Fwd+Light wood-beam poke 64→38 (cd-gated free). Heavy 54 EFF is upper-mid (≈ Superman 43 / Zenitsu-band) — in-band, no record.
> - Specials (all scaled): **Kunai** ground 52→31 / air 46→28 (spinning-shuriken projectile, 15 chakra) — basic zoning. **Wood Release Punch** (CHARGE tap/hold, Rengoku/Zaraki charge-release precedent): tap 82→49 / hold-Super 124→74, cooldown-gated (55f), NO energy cost — the CHARGE-hold builds chakra (same "free scaled strike, cd-gated" class as Rengoku Flame Strike / Zaraki Charged Dash). **Mokuton arm** 70→42 (30 chakra). **Tree-Summon ladder** (Down+Special, successive-cast escalation 1→4): tier dmg 42/60/86/112 → 25/36/52/67, **escalating chakra 16/26/40/54** — the cost curve is the self-limiter; each tier is a persist-one-hit growing hazard (Madara Wood-Spike class). **Wood Golem** (Up+Special) 84+106 → 50+64 = **~114 EFF over 2 hits, 50 chakra** — a big committed summon (long recovery). All honest-pipeline.
> - **⚠️ WATCH-ITEM #2 — Gracious Deity Gates** (Back+Special, 40 chakra): **0 damage, a ~70-frame FULL immobilize** (hitstun-based pin) that flanks the foe in two torii gates. A strong stand-alone CC with guaranteed-follow-up potential (pin → tree/golem/ult). No direct CC-immobilize precedent on the roster, so flagged for scrutiny. Why not oppressive: energy-priced (40, competing with the same pool as everything else), real startup before the pin lands, and it's one option among ~15 (can't be looped without draining the bar). **Knob: reduce the pin to ~55f if playtests read the pin→punish as too guaranteed — not a removal.** (The same gate-drop is also the Sealing-Jutsu ult's lock-phase, per the confirmed Stage-0 design.)
> - **⚠️ WATCH-ITEM #3 — Wood Release: Rising Pillar (climbable terrain, added 2026-08-12).** A NEW mechanic CLASS: **Down+Special cast in the AIR — or from atop another pillar — raises a REAL climbable wood pillar** (a genuinely new physics primitive, `platforms.js`: grow→hold→recede standable surface; the grounded Down+Special is UNCHANGED = the offensive Tree-Summon ladder). **0 damage — pure mobility.** Each pillar tops **~150px above the caster's current feet** (UNDER his ~285px jump apex, so gaining height still needs an active jump); casting from a higher perch grows a TALLER pillar → an ascending staircase up to an airborne/elevated opponent (verified `test:wood-pillar-climb` 20/0: 3 pillars, +150 each, climbed 530px). Cost **18 chakra/cast + brief cast recovery + 3-pillar concurrent cap (oldest recedes) + finite lifetime (~2.5s hold)**. No roster precedent for a *vertical-pursuit* approach, so flagged for scrutiny per the build mandate. **Balance-check vs the existing mobility/approach category (the explicit Stage-3 comparison):** — vs the **teleport-dash** (98-tier double-tap): that is INSTANT, FREE, horizontal; the pillar is SLOW (must jump each step, ~1s+ to build a 3-high climb) and costs 18/cast → **not strictly better, slower + costlier, different axis.** — vs **Kamui Warp** (Obito/Tobi 0-dmg self-portal, 20 chakra): Warp is an instant fixed-offset teleport; the pillar is a slower, telegraphed, *chainable* vertical build that leaves terrain — neither dominates. — vs **Rick's portals** (Push 65 + full-screen displace): those DEAL DAMAGE + reposition; the pillar deals **0** — a less offensive, narrower tool. — vs **Ichigo's 8-way air-dash**: both 0-dmg mobility-tech; air-dash is one horizontal burst, the pillar is a vertical staircase. **Why it is NOT a free infinite-height escape/approach:** energy-priced (a 4-high climb = 72/220 ≈ 33% of the bar), capped at 3 concurrent, **telegraphed + interruptible** (visible growing trees; the foe can anti-air / knock him off a pillar / hit him mid-climb), and the pillars auto-recede. It also fills an **archetype GAP** — Spd 88, medium mobility, the grounded wall who had **no** approach/anti-air tool — so it's an in-character, cost-gated *vertical* mobility patch, not a speed/power spike. **Verdict: a 0-damage UTILITY/mobility tool in the SAME class the audit already accepts (Kamui Warp / teleport-dash / air-dash) — utility, NOT power; NOT strictly better than the category, and it occupies a new vertical niche rather than dominating an existing one.** **Knobs, no fix applied (diagnosis pass):** (a) if high-pillar CAMPING/stalling reads as oppressive → shorten the hold (faster recede) or raise the 18 cost; (b) if the chain feels too free → raise per-cast cost / lengthen cast recovery; (c) **VISUAL only (not power):** the reused tree crown scales wide (~500px at full height), so 3 stacked can crowd the screen — cap the sprite width / narrow it if it reads busy. The shared `physics.js` grounding change is **gated byte-for-byte safe when no platform is active** (`test:wood-platform-regression` 15/0 across a diverse roster sample; `test:wood-platform` 17/0 for the primitive).
> - **Ultimate = "Sealing Jutsu"** (freeze-cinematic: combo → Gracious Deity Gates pin → Naruto/Minato/Tobirama cameo assists → red sealing barrier): **340 RAW → ~204 EFF — routed through `applyScaledDamage` (the choke-point), NOT a manual-subtract unscaled sure-hit** (a held block chips it to 25%), cost 100. Effective 204 sits **exactly with Madara Tengai 204 / Red Ranger Power Sword 204**, just below Pain Chibaku 216 — squarely the honestly-scaled cinematic-ult band, no record. Cameos are **bespoke pre-drawn art (NOT the allies' real kits)** — same self-contained pattern as Pain's assists. Reuses the WIRED `madaraTengaiShinsei` freeze contract; single struck-once payoff verified with an explicit **duplicate-render guard** in `test:hashirama`.
> - **Overall verdict: VERSATILITY outlier (deliberate Madara-class scope exception), internally consistent, honest damage pipeline (zero bypass) — NOT a power outlier. No fix applied (diagnosis-only).** Three tuning surfaces flagged, all deliberate/canon-shaped: (1) Def 92 × HP 1220 top-tier tankiness (knob = HP/Def), (2) the Gates 70f immobilize CC (knob = pin duration), (3) the Wood Release climbing-pillar mobility tool — a 0-damage vertical-pursuit utility in the accepted Kamui-Warp/teleport-dash class, NOT strictly better than the category (knobs = cost / hold duration / visual width). Everything else is in-band scaled and shared-pool-throttled. Full file-utilization in `HASHIRAMA_ASSET_MAP.md`; canonical `test:hashirama` (32/0) + per-stage `test:hashirama-s1..s7` cover every move, the full tier ladder, and the ult cinematic (dup-render guard).

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

### Megumi (maxEnergy 210) — summons now scaled (MK-feel Stage 3c: the 🔓 bypass is CLOSED)
**Stage 3c (2026-08-10):** Megumi's summon route was the audit's flagged 🔓 bypass. Stage 1a already routed every summon hit through `applyScaledDamage(summon.target, summon.damage, {source:"summon"})` (`summons.js:503`, the SOLE summon damage site — no projectile/AOE/manual-subtract path exists), so the RAW values below now land at **×0.60**. Verified: `test:damage-scale` `summon raw=100 scale=0.6 dealt=60`. User chose ACCEPT-1a-scaling (no additional raw cut). His marquee two-summon route drops from **255 RAW = 255 EFF** to **255 RAW → 153 EFF** — he no longer punches above tier.
| Move | RAW | EFF (×0.60) | Cost | Cost% | s/a/r | cooldown |
|---|---:|---:|---:|---:|---|---:|
| divineDogs | 95 | **57** | 20 | 9.5% | 10/5/18 | 120 |
| nue | 110 | **66** | 25 | 11.9% | 14/5/20 | 160 |
| toad | 70 | **42** | 20 | 9.5% | 12/6/19 | 140 |
| rabbitEscape | 20 | **12** | 15 | 7.1% | 9/18/14 | 180 |
| maxElephant | 145 | **87** | 35 | 16.7% | 20/6/26 | 240 |
| Chimera Shadow Garden (domain) | 0 dmg (restrain-only) | 100 | 47.6% | — | — |

Chimera Shadow Garden is a **control** ult: a whole-map Domain Expansion (~15s) that applies a movement penalty to the opponent (`domains.js` megumi branch). No chip/sure-hit damage and no transform — Megumi keeps his summon kit. Cheaper than Gojo/Sukuna's full-bar domains by design (flat 100 EN) since it deals no damage.

### Sukuna (maxEnergy 210)
| Move | RAW | EFF | Cost | Cost% | s/a/r |
|---|---:|---:|---:|---:|---|
| cleave | 160 | 96 | 40 | 19% | 10/6/20 |
| dismantle | 140 | 84 | 35 | 16.7% | 10/5/20 |
| Malevolent Shrine ult | *domain* | — | 100 | 47.6% | — |

### Toji (maxEnergy 0) — Stage 3a: SPECIALS + ULT now draw a cursed-tool DURABILITY meter (max 100, ~0.12/f regen); stance normals + teleport-strike stay free
_The `Cost: 0` figures below are the pre-3a state; specials now cost durability (inventory 40 / chain 34 / curse 24 / rapid 18 / ult 55, fizzle below cost) + the ult takes a 45s lockout. Effective damage numbers are unchanged._
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
| **Kurama Avatar ult** (TBB, guaranteed) | **600** | **360** (×0.60 since Stage 1a) | 95* | 50% | cinematic + **2400f/40s recast** (was 4800f/80s) |

\* `characters.js` declares `cost:100`, but `abilities.js:833` spends `ceil(maxEnergy×0.5) = 95`. **Discrepancy — flag.** Blocked TBB now deals `round(600×0.20)×0.60 = 72` effective (`kurama.js:76` ratio × the Stage-1a scale). **MK-feel Stage 3b (2026-08-10):** TBB is no longer a raw-damage bypass — Stage 1a routed it through `applyScaledDamage` (`kurama.js:263`), so the marquee 600 lands as **360 effective** (blocked 72). Accepted as the Stage-3b nerf (no dodge-QTE / no chip-ratio change).
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

Susanoo is a **sustained form**. **MK-feel Stage 3e (2026-08-10):** the sustained-value outlier was the *window length* — one up-front cost bought ~20s of otherwise-free giant attacks. The form is now shortened to **`SASUKE_SUSANOO_DURATION_FRAMES = 800` (~13.3s)** — a Sasuke-specific constant, so the shared `SUSANOO_DURATION_FRAMES` (1200) still governs Itachi + Netero Guanyin (not flagged, no collateral nerf). Lv1+Lv2 share the one window (Stage 2 does not reset it). The swings stay FREE by design — a per-swing energy cost would brick Lv2, which drains energy to 0 on escalation; cutting the window is the clean lever. Its Lv2 sword (~302 eff) is still the hardest scaled hit, but the total free-offense budget drops ~1/3. Verified `test:stage3e-sasuke` 10/0 (incl. Itachi-not-nerfed proof).

### Rick (maxEnergy 160) — bypass CLOSED (Stage 1a scaled the whole kit; Stage 3d redistributes)
**Stage 3d (2026-08-10):** every 🔓 flag below is now STALE — Stage 1a routed Rick's whole kit through the choke-point (Meeseeks via `summons.js:503`; Portal-Pull/Push via the `_portalDrop` resolver `game.js:6084`; Self-Destruct via `applyScaledDamage` `abilities.js:12788`). So the EFF column dropped across the board — which made the roster-floor problem WORSE, hence the Stage-3d redistribution: **nerf the risk-free gimmick nuke, buff the under-tuned neutral.**
| Move | RAW | EFF (×0.60) | Cost | Cost% | s/a/r | src |
|---|---:|---:|---:|---:|---|---|
| Meeseeks Box (summon, **uncapped**) | 45 | **27** | 30 | 18.75% | one-hit | `summons.js:503` |
| Rocket (up+SP, proj) | 95 | 57 | 40 | 25% | proj | `abilities.js` |
| Portal-Laser (down+SP, proj) | 20 | 12 | **0** | 0% | proj | `abilities.js` |
| Portal-Pull (qcf) | 42 | **25** | 35 | 21.9% | — | `game.js:6084` |
| Portal-Push (qcb) | 65 | **39** | 45 | 28.1% | — | `game.js:6084` |
| **Self-Destruct ult** (instant, **+15% self-HP cost**) | **180** | **108** | 140 + **~158 HP** | **87.5%** | **0 startup** | `abilities.js:12788` |

Meeseeks `maxSimultaneous: 99` — energy is the only limiter, they can stack. **Self-Destruct (Stage 3d):** instant same-frame proximity AOE (220px), opponent damage **180 RAW → 108 EFF**; it is no longer risk-free — detonating costs Rick **15% of max HP (~158, non-lethal, floors at 1)** applied on cast (even on a whiff), on top of the 140 meter. The audit's "meter is the only lever / Rick takes no self-damage" finding is resolved. **Neutral buff (roster-floor fix):** light 34→40 (EFF 24), heavy 60→72 (EFF 43), speed 80→84 — lifted off the absolute floor while keeping the frail weak-backup-melee zoner identity (HP 1050 / def 78 kept). Verified `test:stage3d-rick` 15/0.

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
| Naruto (ult) | Kurama TBB (scaled since Stage 1a) | **600** | **360** |
| **Sukuna** | heavy→cleave (100+160) | 260 | 156 |
| **Goku** | heavy→dragonFist (85+150) | 235 | 141 |
| **Gojo** | red→hollowPurple confirm (130+200), or heavy→hollowPurple | ~285 | ~171 |
| **Megumi** | maxElephant + nue chained summons (145+110), scaled since Stage 1a | 255 | **153** |
| **Rick** | Self-Destruct point-blank (scaled Stage 1a; +15% self-HP cost Stage 3d) | 180 | **108** |
| Rick (neutral) | heavy→rocket (72+95→57) | 167 | ~100 |

\* later combo hits taxed by `getComboScale` — EFF is a fresh-combo upper bound.

**Read:** in RAW terms Naruto (300 route / 600 ult) and Sasuke Susanoo (265 sword) top the chart. **As of MK-feel Stage 3 the §"global damage scale" bypass is fully CLOSED** — Kurama TBB (600 → **360 EFF**, Stage 3b), Megumi's summon route (255 → **153 EFF**, Stage 3c), and Rick's Self-Destruct (180 → **108 EFF**, + a 15% self-HP cost, Stage 3d) all scale like everything else. No move now delivers raw-past-scale damage. Rick's neutral was buffed off the floor in the same stage.

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

Against the field Rick WAS the **simultaneous floor** on HP (1050), attack (82), defense (78), speed (80), basic-attack damage (light 34 / heavy 60), and damage-per-energy (bottom 4 slots). His genuine edges:
- **Self-Destruct** — instant panic/kill button. **Stage 3d:** scaled to 108 EFF (1a) AND now costs 15% self-HP — a committed high-risk nuke, not a free one.
- **Uncapped Meeseeks** — summons that can stack (`maxSimultaneous 99`); now scaled (27 EFF each, 1a).
- **Portal-Behind teleport** + full projectile zoning kit (Rocket / Portal-Laser / Pull / Push) — all now scaled (1a).

**Verdict — RESOLVED in MK-feel Stage 3d (2026-08-10):** the diagnosis held — Rick's compensations were gimmick-concentrated and his neutral was under-tuned, made worse once 1a scaled his whole kit down. Stage 3d **redistributed** rather than piled on: the risk-free gimmick nuke gained a real cost (15% self-HP), and his neutral was lifted off the floor (light 34→40, heavy 60→72, speed 80→84). He keeps the frail-zoner identity (HP 1050 / def 78) but is no longer the simultaneous floor on normals + speed, and his power is now spread across the kit instead of concentrated in two gimmicks. `test:stage3d-rick` 15/0.

---

## 8. Outliers — flagged, not fixed

1. 🚩 **The 0.60 scale bypass (systemic).** Summons, manual-subtract ultimates, and DOT bypass `GLOBAL_DAMAGE_SCALE`, so **Megumi, Rick's ult, and Naruto's Kurama/DOT hit 1.667× harder relative to every scaled melee/projectile character.** The scale comment's "relative balance untouched" is false. This warps *every* cross-character comparison below and is the highest-priority item.

2. 🚩 **Megumi's summon damage-per-energy.** 4 of the top 5 non-ult DPE slots (3.50–4.75), and because summons are RAW/bypass she delivers those at full value while paying only 9.5–16.7% of a 210 meter. Statistically out of line vs the ~2.2–2.4 DPE the scaled cast pays.

3. 🚩 **Rick Self-Destruct — zero-startup, no-self-damage, bypass-scale burst.** 180 RAW delivered instantly with no vulnerability window. Uniquely low-risk payout; only lever holding it is the 87.5%-meter cost + proximity. Explicitly the kind of move the brief asked to flag.

4. ✅ **Toji pays nothing, ever** — *FIXED (MK-feel Stage 3a).* Was: `maxEnergy: 0` → inventorySmash, rekka, and the 1.6×/1.8× ultimate all cost 0; infinite DPE + best normals + top HP/speed. Now: keeps `maxEnergy: 0` (flavor) but his **special-button specials + ultimate draw a cursed-tool DURABILITY meter** (max 100, ~0.12/frame regen ≈ 14s empty→full; costs inventory 40 / chain 34 / curse 24 / rapid 18 / ult 55 — below cost the move fizzles), the **ultimate is on a 45s lockout** (2700f, vs the 20s universal), and **HP 1260 → 1120** (no longer the roster ceiling). Effective per-move damage is UNCHANGED (still RAW×0.60); the fix is the resource economy, not the numbers. His DPE is now finite and rationed like everyone else. (The stance command-normals + the teleport-strike movement tech stay free — they are normals, not specials.)

5. 🚩 **Naruto Kurama ult = 600 RAW, guaranteed, bypass-scale.** ~3× the effective damage of the next-biggest scaled hit (Sasuke's ~302 sword), unavoidable (block only chips to 120), for 95 energy (DPE 6.32, highest in roster). The single most valuable button in the game — *per cast*. Its old **80s recast** (4× the universal 20s) was the counterweight, but it over-corrected: on a damage-per-cooldown basis the TBB sat BELOW Rick/Sasuke ults at 80s, so it *felt* nerfed despite the huge payload. **Retuned to 40s** (§Naruto-ult-retune) — the per-cast value stays flagged-high, but the availability is now in line with the pack.

6. **Sasuke Susanoo economics. ✅ RESOLVED (MK-feel Stage 3e).** One up-front cost bought ~20s of free giant attacks topping ~302 eff/sword — a sustained-form value structure that didn't compare cleanly to the per-cast meter economy. Fixed by shortening the free window: `SASUKE_SUSANOO_DURATION_FRAMES` 1200→800 (~20s→~13.3s), Sasuke-only (Itachi/Netero keep the shared 1200). Swings stay free by design (per-swing energy would brick Lv2's drain-to-0); the ~1/3 shorter window is the lever. `test:stage3e-sasuke` 10/0.

7. **Rick — low floor. ✅ RESOLVED (MK-feel Stage 3d).** Was bottom of the roster on HP/atk/def/spd/normals/DPE at once with gimmick-concentrated compensations. Fixed by redistribution: Self-Destruct gained a 15% self-HP cost (no longer a risk-free nuke) and his neutral was lifted off the floor (light 34→40, heavy 60→72, speed 80→84). Keeps the frail-zoner identity; no longer the simultaneous floor.

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

**Re-verification (2026-08-02, no change).** The ult was re-flagged as a suspected outlier ("~70s cooldown for ~half a health bar, never confirmed fixed"). Re-pulled the live values: cooldown **2400f/40s** (`abilities.js:92`, applied `abilities.js:2183`), damage **600 raw** (`kurama.js:70`), cost **95** (50% meter, `abilities.js:2166`). The re-flag's premise is **stale** — those are the post-retune numbers, not the pre-retune 80s/famine state. Against the current (grown) roster Naruto is the **highest raw per-cast ult** (next band Superman 380 / Rengoku·Omni-Man 340) held in check by the **longest cooldown** (pack baseline 20s; cooldown-gated chars 8s), landing at 15 raw/s ≈ Sasuke Susanoo — in line on damage-per-cooldown. The re-flag asked to *reduce* cooldown / *raise* damage; either would push the roster's most valuable button into a genuine outlier, opposite the stated "bring him in line" goal. **Decision: no change.** Flag closed. Re-verified in-engine (`naruto_ult_impact.png`).

---

*End of diagnosis. Naruto Kurama recast retuned 80s→40s (§Naruto-ult-retune); re-verified 2026-08-02, no change. All other values unchanged.*

---

## §Feedback — Omnitrix form balance (2026-07-28, added)

Feedback is a Ben 10 **Omnitrix transform form** (energy-absorption specialist), sibling to XLR8 /
Diamondhead. This is the first Ben 10 balance entry (the family predates this doc). All Feedback damage
routes through the honest **×0.60 GLOBAL_DAMAGE_SCALE** — normals via `createAttackFromMove`, every
projectile (discharge / redirect / overload) via `spawnProjectile` (`combat.js:934`). **No bypass.**

- **Core (BEN10_ALIEN_POOL.feedback):** HP 980 · Energy 100 · dmg 0.95 · spd 8 · role zoner. HP 980
  ties Netero (2nd-frailest tier); moderate offense/mobility — a defensive counter-zoner, not a bruiser.
- **Normals (RAW→EFF):** light ~38→24 · heavy ~76→48 · up ~62→39 (verified in-engine). All reuse the
  electric-shot pose (no melee art) with per-move tuning — shape reuse, standard poke damage.
- **Down Special — Energy Discharge:** projectile RAW 90 → **EFF 54**, cost 22 (22%). DPE 2.45. A plain
  ranged poke, mid-tier.
- **Neutral Special — Energy Absorption (reactive counter):** opens a timed window; an incoming hit is
  full-negated (like Sasuke Absolute Defense / Gojo Infinity) → refunds 20 energy → fires a redirect
  projectile RAW `min(180, 80 + absorbed×1.4)` → **EFF ~98** off a 60-dmg absorb, cost 12.
  **Shape-outlier, not power-outlier:** it is a *timed, one-hit* window with committed recovery
  (whiff = punishable) — STRICTLY more limited than the existing always-on full-negate mechanics it
  mirrors. The redirect is a blockable/whiffable scaled projectile. Counterplay = bait it and punish the
  recovery. Filed as a deliberate, internally-consistent reactive tool (like Sasuke's `combat.js:312`).
- **Ultimate — Overload:** 3 staggered orbs, RAW 110 each → **EFF ~66**, total **~192** if all connect
  (spacing-dependent), cost 70. DPE 2.74. In line with XLR8 Sonic Blitz (RAW 280 → EFF ~168) and
  Diamondhead Crystal Storm; scaled (no bypass), not guaranteed-full like the manual-subtract ults in §8.

**Verdict:** honest-pipeline character on the scaled side of the roster; no GLOBAL_DAMAGE_SCALE bypass.
The absorb counter is the only notable mechanic and is well-counterplayed. No fixes required.

---

## Combo-String Standardization (2026-08-10) — balance impact

Roster-wide combo-string standardization (COMBO_STANDARDIZATION_AUDIT.md, Stages A–G). Full-effort
verdict: **standardization TOWARD the roster norm, not power-creep.** No damage values were changed;
the net buffs move under-equipped characters UP to parity with peers who already had the same tool, and
every gain stays bounded by the roster's shared systems: combo-decay (`COMBO_DAMAGE_CURVE`), the single
−26 launch floor (all launchers), `maxAirHits=3`, the jump-cancel execution requirement, and cancel-on-hit
gating (a whiff/block ends any string).

- **Stage B — 8 opener conversions (netero/killua/hisoka/flash/gon/batman/zenitsu/ghostface):** Down+Heavy
  → Forward+Heavy. Input-direction ONLY — zero frame/damage change; the deterministic step-in glide
  (`COMBO_STEP_IN_VX`) is retained. **Balance-NEUTRAL.**
- **Stage C — 5 finishers now LAUNCH (shinobu/inosuke/tobirama/netero/ghostface):** was `category:"heavy"`,
  now `launcher:true`. Grants each a grounded-chain → air-combo conversion it lacked. Finisher DAMAGE is
  unchanged (only the launch flag); it pops to the shared −26 floor, needs a jump-cancel, and juggle hits
  are combo-decay-scaled. This brings the 5 to **parity** with the ~20 rekka chars whose finishers already
  launched. Maki stays a heavy-ender **exception** (her tight cancel-window is the tradeoff). **Fair — parity.**
- **Stage D — 8 new melee strings (itachi/yuji/goku_black/cell/tobi/morty/albedo/omololu):** added to the
  shared `STANDARD_STRING_CHARS`, gaining the Light→Light→Heavy(→launcher) dial-a-combo. It reuses each
  char's OWN existing normals (light/light/upAttack) — **no new or stronger moves** — cancel-on-hit,
  L,L,H-capped (no third light, no loop), launcher = their existing up-attack (same damage). Matches the 6
  chars who already had it and the rekka roster. **Fair — parity.**

**Verdict:** no per-move damage change anywhere; the only power deltas (Stage C ×5, Stage D ×8) equalize
under-equipped melee characters to the roster's existing combo/juggle baseline, all in-band under the
shared decay/launch/cancel systems. No fixes required. True zoners (rickPrime/evilMorty/beerus/piccolo/
frieza) intentionally keep no combo string.

---

## Combo Breaker + Comeback Finisher (two universal systems) — added 2026-08-12

Two roster-wide defensive/comeback systems, built Stages 0–4. **Diagnosis-only pass — nothing rebalanced
here; the two watch-items below are FLAGGED, not changed.** Stage 0 audit confirmed the exclusion set
(chars with a bespoke below-threshold comeback keep THEIRS): **Toji** (2-stage save), **Maki** (≤25% HP
ult unlock), **Gon** (adult-form sudden-death). No double-comeback for anyone.

### A. COMBO BREAKER (universal, hybrid cost) — `combat.js` `tryComboBreaker`
Deals **no damage** — a defensive hitstun-escape (block+special, only while stunned vs an attacker's
`comboCounter ≥ 3`; i-frames + attacker blast). Cost = a per-round **STOCK (2/round, unchanged)** PLUS a
second currency by kit type: **energy chars spend 40 meter**, **meterless chars pay a 360f (6s) cooldown**
(`comboBreakerCd`, the Zenitsu/Rengoku currency model). Meterless detection uses `traits.hasEnergy`, not
runtime `maxEnergy` (which `createFighter` clamps to ≥1).

> **⚠️ WATCH-ITEM — the flat-40 meter cost is UNEVEN across the 100–220 energy range.** 40 meter is **40%
> of the bar for the 100-energy chars** (flash/batman/ghostface/ben10/albedo — who start each round at 50%
> = 50 energy → **~1 break then must regen**) but only **~18% for the 220-energy chars** (gojo/hashirama/
> madara → 2 breaks, i.e. stock-capped, not meter-capped). Net effect: **low-energy chars effectively get
> fewer breaks/round than high-energy chars** — the opposite of a flat cost's intent. Arguably acceptable
> (a glass-cannon trading offense-energy for a premium defensive escape is a real cost), but it is an
> unintended asymmetry. **Knob, if playtests read it as unfair: switch the meter cost from flat 40 to a
> PERCENTAGE of max energy (~20%)** → ≈20 for a 100-bar, ≈44 for a 220-bar, even relative burden across the
> roster. The meterless 360f cooldown is already even (no meter to vary). Filed as flag-don't-adjust.

### B. COMEBACK FINISHER (universal, Fatal-Blow-style) — `combat.js` `tryComebackFinisher`
Once per MATCH, only below **30% HP**, on a dedicated **block+grab** (no motion, no meter, separate from
the special/ult economy). A committed lunge (16f startup i-frame armour; whiffing wastes the one use;
blockable → ~20% chip). Damage = **fixed `round(min(maxHealth×0.32, 360))`**, applied via a
`_comebackFinisher` override in `resolveAttackHit` (bypasses combo/counter/defense/global-scale → exact
EFFECTIVE number; on the "bypass side" of §"global damage scale", same as the cinematic ults it is
benchmarked against).

**Damage side-by-side vs the existing top-end band (EFFECTIVE):**

| Tier | chars | finisher EFF | % of own HP |
|---|---|---:|---:|
| Frail (HP 960–1120), sub-cap | shinobu 960 … yuji/megumi/tobirama 1120 (21 chars) | **307 – 358** | flat **32.0%** |
| HP ≥ 1125, capped | rengoku 1140 … superman 1450 (30 chars) | **360** | 31.6% → **24.8%** |
| Reference — top-end cinematic ults | Omni-Man/Rengoku 340 · Superman 380 · Sasuke Susanoo ~302 · **Kurama 600 (extreme)** | 302–380 (600) | — |

- **The cap works: no char exceeds 360.** It specifically neutralizes the high-HP outlier the design
  warned about — Superman would have been `0.32×1450 = 464` (2nd-hardest hit in the game), capped to 360.
- **360 sits at the high-mid of the cinematic-ult band** (= Omni-Man/Rengoku 340 +20; below Superman 380;
  far below Kurama 600). For a **once-per-match, <30%-HP-gated, committed, blockable** move, that is
  **in-band, not an outlier**.
- **The cap makes it a genuine comeback shape:** relative payoff is *bigger* for frail users (32% of their
  own bar) and *smaller* for tanks (Superman 24.8%) — the underdog-favouring curve a comeback tool should
  have. (Note the flip side of a *fixed* number: 360 is 37.5% of a 960-HP opponent's bar but 24.8% of a
  1450 bar — it bites harder into frail opponents. Inherent to fixed damage, not a fix.)

> **⚠️ WATCH-ITEM — a universal ~30% once-per-match swing raises the whole roster's comeback ceiling.** This
> is the *design intent* (a comeback system, MK-Fatal-Blow class ≈ 30% below 30% HP), and it is heavily
> counterplayable (HP-gated, one-time, whiffable, blockable→chip, armour only through startup). But every
> eligible fighter now carries a guaranteed-ish 300–360 payoff. **Verdict: deliberate UNIVERSAL comeback
> mechanic, internally consistent, capped WITHIN the existing top-end band — NOT a power outlier** (same
> class as filing Toji's two-stage save as a "deliberate mechanic-outlier"). **Knobs, in order, IF
> playtests read the swing as too strong:** (1) tighten the **HP gate** 30% → 25% (fires less often); (2)
> lower the **cap** 360 → ~320 (Omni-Man-minus, still band); (3) lower **dmgPct** 0.32 → ~0.28. Damage last,
> gate first. The exclusion set (Toji/Maki/Gon) is the one correctness invariant — verified they cannot
> also fire the generic finisher.

**Regression:** `test:stage2d-breaker` 34/0, `test:comeback-finisher` 34/0, live `test:breaker-roster`
16/0 + `test:finisher-roster` 18/0; full-roster suite sweep clean apart from pre-existing/flaky failures
unrelated to these systems (grep-proven 0 code overlap: inosuke/shinobu energy-label flavor, flash
Godspeed ult, madara Gunbai reflect, sharingan giant-sizing, zaraki/ichigo/yuji flaky).

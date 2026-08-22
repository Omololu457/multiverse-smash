# Multiverse Smash — Full Roster Moveset & Damage Data Export

**Generated 2026-08-05 from live code** (`characters.js` = base stats + normals; `abilities.js` = real
specials/command-moves/ultimates; `combat.js`/`domains.js`/`fighters.js`/`*Cinematic.js` where noted).
Values pulled directly, **not estimated**. Runtime-computed values tagged **[DYNAMIC]**; unresolved
values are under each character's **Flags**.

## ⚠️ How to read damage — every move shows `RAW→EFF`
- **`X→Y`** = **RAW damage → EFFECTIVE damage** after the global `GLOBAL_DAMAGE_SCALE = 0.60` lever
  (`Y = round(X × 0.60)`). **Y is what the opponent actually loses.** Most of the roster is scaled.
- **`X [UNSCALED]`** = the move BYPASSES the 0.60 scale (manual `opp.health -= dmg`), so **RAW = EFFECTIVE**.
  These are the guaranteed freeze-cinematic ults + a few specials/summons — verified via each move's
  `apply*Damage` callback. For these, the single number IS the effective damage.
- The RAW→EFF pair is shown **inline on every move** so the distinction can't be lost mid-analysis.
- Further scaling in real matches: `COMBO_DAMAGE_CURVE = [1,.92,.84,.76,.70,.65]` (later combo hits weaker),
  `HITSTUN_SCALE = 1.15`. Transformation multipliers (×1.2 etc.) apply ON TOP of the 0.60 scale.
- **Normals row** = `light / heavy / up(launcher) / air / down_air / grab`. "—" = move absent.
- **Energy:** most use a meter; **EN 0 = cooldown-gated** (Toji, Maki, Demon Slayer trio). Ultimate
  **gating types vary** (flagged per entry) — see the gating-census appendix.

> Cross-referenced against `BALANCE_AUDIT.md` (its §1 stat table predates Vegeta/Beerus/Itachi/Omega —
> relative reference, not census). Discrepancies flagged inline + collected in the appendix.

═══════════════════════════════════════════════════════════════════════════════

# DRAGON BALL

## Goku — dragon_ball
- **Stats:** HP 1200 · EN 200 · 92/86/88
- **Normals:** 45→27 / 85→51 / 70→42 / 60→36 / 80→48 / 30→18
- **Specials:** Dragon Fist 150→90 · 40 EN · Kamehameha 120→72 · 30 EN (proj)
- **Ultimate:** Super Saiyan Blue — **no direct damage**; flat 100 EN → advances SSJ ladder.
- **Transformations (dmg×/spd×/def×):** base 1/1/1 → SSJ1 1.2/1.1/1.05 → SSJ2 1.3/1.15/1.1 → SSJ3 1.5/1.2/1.05 (5 ki/s) → SSJ Blue 2.0/1.4/1.2 (8 ki/s) → Ultra Instinct 2.5/2.0/1.5 (12 ki/s, autoDodge). *(multipliers apply on top of the 0.60 scale)*
- **Mechanics:** mandatory ladder; SSJ3/Blue/UI drain-gated, revert at 0.
- **Flags:** none.

## Vegeta — dragon_ball
- **Stats:** HP 1150 · EN 200 · 91/85/88
- **Normals:** 45→27 / 85→51 / 70→42 / 60→36 / 80→48 / 30→18
- **Command-chain (Fwd+Heavy):** vgFkick1 → vgSidekick → vgUpInto (launcher) → vgUpFinish.
- **Specials:** Galick Gun 120→72 · 25 EN · Big Bang 140→84 · 35 EN · Final Flash 200→120 · 50 EN.
- **Ultimate:** SSJ Blue Evolution — **no direct damage**; flat 100 EN → advances ladder.
- **Transformations:** base → SSJ 1.2/1.12/1.05 → SSJ2 1.3/1.15/1.1 → SSJ Blue 1.45/1.25/1.12 (**needs SSJ first**) → SSB Evolution 2.3/1.5/1.25 → Ultra Ego 2.5/1.8/**0.9** (heals 15 HP/hit, only DEF-penalty form).
- **Flags:** none.

## Goku Black — dragon_ball
- **Stats:** HP 1200 · EN 200 · 90/86/90
- **Normals:** 45→27 / 85→51 (**Ki Slash: 10 EN** — only energy-costing normal) / 70→42 / 60→36 / 80→48 / 30→18
- **Specials:** **PLACEHOLDER — no handler.** characters.js lists Kamehameha (30 EN), Spirit Bomb (40 EN), Explosion (120 EN), Sword Slash (40 EN) as metadata only. **Stage-3 TBD.**
- **Ultimate:** "Sword Slash" (40 EN metadata) — not wired.
- **Transformations:** base + SSJ Rose (threshold-gated, no cost, drain, freeze-cinematic). base→SSG→Rose→Blue ladder **SHELVED 2026-08-01** — only base+Rose live.
- **Flags:** **[MAJOR GAP]** specials are metadata, not functional.

## Beerus — dragon_ball
- **Stats:** HP 1000 · EN 170 · 97/78/95
- **Normals:** 46→28 / 88→53 / 68→41 / 58→35 / 78→47 / 30→18
- **Specials:** Ki Blast 120→72 · 30 EN · Downward Ki 140→84 · 35 EN · Forward Push 95→57 · 45 EN · Outward Ki 130→78 · 50 EN · **Hakai 190 [UNSCALED] · 70 EN (40f startup)**.
- **Ultimate:** Ki Ball — **380 [UNSCALED]** (blocked 84) · flat 150 EN · freeze-cinematic.
- **Flags:** characters.js `specials:{}` empty — real values in `executeBeerusSpecial`.

## Piccolo — dragon_ball *(non-sprite placeholder)*
- **Stats:** HP 1100 · EN 160 · 84/86/80 · **Normals:** 40→24 / 80→48 / 60→36 / 55→33 / 70→42 / 28→17
- **Specials (metadata):** Special Beam Cannon 150→90 · 35 EN · Hellzone Grenade 100→60 · 30 EN. **Ult:** Fused with Kami · 100 EN.
- **Flags:** **[NO HANDLER]** — declared data only; EFF shown assuming the scaled pipeline *if* ever wired.

## Frieza — dragon_ball *(base/final form; full sprite build)*
- **Stats:** HP 1100 · EN 200 · 90/80/98 · **Normals (raw→×0.60):** light 42→25 / heavy 80→48 (kick) / up 62→37 launcher / air 52→31 / down_air 60→36 / grab 28→17
- **Rush rekka (Fwd+Heavy, cancel-on-hit):** 40→24 · 46→28 · 84→50 launcher (~102 EFF full chain)
- **Specials (raw→×0.60·cost):** Death Beam 78→47·22 (piercing beam) · Ki Blast 26×3→~47·24 (crystal volley) · Death Ball 120→72·45 (sphere) · Psycho Teleport 74→44·28 (i-frame blitz)
- **Transformations (ladder, SAME model as Vegeta / Goku Black — charge hold-release steps up, tap reverts, continuous Ki drain, auto-revert at 0):** base → **GOLDEN** (≥100 Ki, drain 0.18/f) 1.25/1.18/1.08 → **BLACK** (≥150 Ki, needs Golden, drain 0.30/f) 1.50/1.32/1.15. All-around DMG/SPD/DEF boost bought with energy drain. No separate ultimate (reaching Black IS the payoff).
- **Flags:** **[NO HANDLER]** — data only.

## Cell — dragon_ball *(non-sprite placeholder)*
- **Stats:** HP 1300 · EN 170 · 94/90/82 · **Normals:** 50→30 / 95→57 / 75→45 / 65→39 / 85→51 / 35→21
- **Specials (metadata):** Kamehameha 120→72·30 · Solar Kamehameha 160→96·40. **Ult:** Perfect Cell · 100 EN.
- **Flags:** **[NO HANDLER]** — data only.

═══════════════════════════════════════════════════════════════════════════════

# JUJUTSU KAISEN

## Gojo — jujutsu_kaisen
- **Stats:** HP 1160 · EN 220 · 91/88/87
- **Normals:** 45→27 / 85→51 / 70→42 / 60→36 / 80→48 / 30→18
- **Specials:** Blue 110→66 · 30 EN · Red 130→78 · 40 EN · Hollow Purple 200→120 · 70 EN · Teleport 0 · 8 EN.
- **Ultimate:** Unlimited Void (domain) — flat **100 EN** · 15s · freezes opponent · map-wide · **scaled** (no bypass).
- **Mechanics:** Infinity auto-dodge (5 EN/dodge).
- **Flags:** Blue/Red/Purple binding-vow-gatable.

## Megumi — jujutsu_kaisen
- **Stats:** HP 1120 · EN 210 · 84/82/83
- **Normals:** 42→25 / 82→49 / 68→41 / 58→35 / 76→46 / 28→17
- **Specials (summons — **[UNSCALED]**, cd):** Divine Dogs 95 [UNSCALED]·20 · Nue 110 [UNSCALED]·25 (launcher) · Toad 70 [UNSCALED]·20 · Rabbit 20 [UNSCALED]·15 · Max Elephant 145 [UNSCALED]·35. *(summons bypass the 0.60 scale — they punch above tier)*
- **Ultimate:** Chimera Shadow Garden — flat 100 EN · **Domain Expansion** → whole-map shadow territory that restrains the opponent (movement penalty) for ~15s; summons stay available (no transform).
- **Flags:** shikigami are AI summons; summon cd = cd/4.

## Sukuna — jujutsu_kaisen
- **Stats:** HP 1240 · EN 210 · 95/87/86
- **Normals:** 50→30 / 100→60 / 75→45 / 70→42 / 90→54 / 40→24
- **Specials:** Cleave 160→96 · 40 EN · Dismantle 140→84 · 35 EN · Flame Arrow 140→84 · 35 EN · **Cursed Slash 100→60 · 30 EN (auto-target, BLOCKABLE→25%)** · Malevolent Dash 0 · 15 EN.
- **Ultimate:** Malevolent Shrine (domain) — flat 100 EN · 15s · auto-slash 14→8 every 30f (~30 slashes ≈ **420→252 total**) · scaled.
- **Flags:** Flame Arrow/Dismantle binding-vow-gatable.

## Toji — jujutsu_kaisen *(EN 0 — cooldown-gated)*
- **Stats:** HP 1260 · EN 0 · 96/89/98
- **Normals:** 52→31 / 96→58 / 72→43 / 62→37 / 82→49 / 40→24
- **Specials (0-cost):** Inventory Smash 155→93 · Rapid Strike 65→39 · Curse Spirit 70→42 · Chain-Knife 95→57 (96f cd) · Teleport-Dash strike 60→36.
- **Ultimate:** Heavenly Restriction — **0 EN (cooldown)** · 8s · spd×1.8, dmg×1.6, 30f invuln.
- **Mechanics:** 3-stance system (blade/chain/gun), CHARGE cycles.

## Maki — jujutsu_kaisen *(EN 0 — cooldown-gated, no HUD bar)*
- **Stats:** HP 1180 · EN 0 · 96/84/98
- **Normals:** 54→32 / 98→59 / **78→47 (fastest launcher, 4f startup)** / 66→40 / 88→53 / — (no grab)
- **Command-chain (Fwd+Heavy):** makiG1 → makiG2 → makiG3 (launcher), cancel-on-hit.
- **Specials (0-cost, cd):** Kunai Throw 60→36 (66f) · Nunchaku Flurry 92→55 (96f). Power Charge (hold P): dmg×1.3, 5s.
- **Ultimate:** Cursed Tool Awakening (Shibuya) — **gating = HP ≤25%** (one-way) · freeze-cinematic → Shibuya (dmg×1.25, spd×1.1) · **Heavenly Vow tight-cancel window = 5 frames** (superhuman links vs narrow execution — the risk/reward tradeoff).
- **Flags:** `_shibuyaUnlocked` persists if healed >25%.

## Yuji — jujutsu_kaisen
- **Stats:** HP 1120 · EN 150 · 90/82/90
- **Normals:** 48→29 / 92→55 (Divergent Fist) / 70→42 / 60→36 / 78→47
- **Specials:** Cursed-Energy Ball 70→42 · 30 EN · Beam 95→57 · 40 EN · Energy Pillar 80→48 · 35 EN (launcher) · Crescent Slash 78→47 · 25 EN · Aerial Combo 60→36 · 20 EN · **Sukuna Slash 50 [UNSCALED] · 35 EN (auto-target, BLOCKABLE→25%)**.
- **Ultimate:** Black Flash — flat 100 EN · freeze-cinematic → **mash-extendable Koma flurry** 14→8 × up-to-10 + finisher 90→54. *(the flurry/finisher run scaled)*
- **Flags:** maxEnergy 150 by design.

## Miwa — jujutsu_kaisen
- **Stats:** HP 1150 · EN 160 · 86/84/93
- **Normals:** 44→26 / 78→47 / 62→37 / 54→32 / 70→42
- **Command-chain (Fwd+Heavy, Battojutsu Rush):** miwaG1 28→17 → miwaG2 34→20 → miwaG3 48→29 (launcher).
- **Specials:** Iai Dash 66→40 · 28 EN · Rapid Slash Vortex 58→35 · 30 EN (airborne).
- **Ultimate:** Blade of the Neophyte — **280 [UNSCALED] · flat 100 EN** · battojutsu freeze-cinematic, range-independent (blocked→25%). **LOWEST direct of the cinematic-ult band.**

═══════════════════════════════════════════════════════════════════════════════

# NARUTO

## Naruto — naruto
- **Stats:** HP 1180 · EN 190 · 89/84/90
- **Normals:** 44→26 / 82→49 / 66→40 / 56→34 / 72→43 / 30→18
- **Specials:** Rasengan 120→72 · 30 EN · Big Ball Rasengan **150–210 [DYNAMIC]** →90–126 · 55 EN · Rasenshuriken 260→156 · 80 EN (+wind DOT 5×8→[UNSCALED] chip) · Dark Rasengan 180→108 · 45 EN · Kawarimi 0 · 25 EN · Uzumaki Barrage 5×42→25 + 95→57 · 60 EN · Shuriken Clone 40→24 + 72→43 · 35 EN · Chakra Arm Grab (extended command-grab).
- **Ultimate:** Kurama Avatar / Tailed Beast Bomb — **600 [UNSCALED]** · gating = 50% maxEnergy (**≈95 spent — characters.js says 100, DISCREPANCY**) · 40s recast. Blocked = 120.
- **Mechanics:** shadow clones (cap 3, shared pool); Kurama shroud (HP-gated); Transformation Jutsu.
- **Flags:** Big Ball charge [DYNAMIC]; Rasenshuriken wind-DOT bypasses scale.

## Sasuke — naruto
- **Stats:** HP 1180 · EN 190 · 89/84/90
- **Normals:** 46→28 / 92→55 / 68→41 / 54→32 / 78→47 / — (no generic grab)
- **Specials:** Dash Strike 55→33 · 18 EN · Two-Strike Lightning 42→25 + 46→28 · 24 EN · Shuriken 34→20 · 0 · Hawk Summon 72→43 · 30 EN (launcher) · Chidori Koiten 95→57 · 35 EN (AOE) · Substitution 0 · 25 EN · **Susanoo Skeletal Grab (standalone command-grab, throw 120→72 via updateGrab, reach 210, 0 cost)**.
- **Ultimate:** Susanoo — **staged, SCALED** (goes through the normal pipeline). Gating = 50% maxEnergy tap → drains-all on escalate. Lv1 grab 120→**~100** (×1.4 form) → Lv2 (Sharingan freeze-cinematic escalation): grab 210→**~239** (×1.9), sword 265→**~302** (×1.9, hardest scaled hit on roster), arrow 230→**138**.
- **Mechanics:** Tier-1 grab is a standalone special (grab button); Sharingan dash-teleport.

## Itachi — naruto
- **Stats:** HP 1170 · EN 200 · 90/85/91
- **Normals:** 45→27 / 90→54 / 66→40 / 54→32 / 76→46 / —
- **Specials:** Great Fireball 120→72 · 25 EN · Amaterasu 90→54 + DOT(6×10) · 40 EN (unblockable) · Genjutsu 150→90 · 45 EN (combo-ender) · Susanoo Sword 240→144 · 0 (giant-form, launcher).
- **Ultimate:** Susanoo — **SCALED** single-tier giant · gating = 50% maxEnergy · dmg×1.6/def×1.4, ~6s.
- **Mechanics:** Mangekyou mode gates Amaterasu/Genjutsu.

## Tobirama — naruto
- **Stats:** HP 1120 · EN 200 · 90/82/96
- **Normals:** 44→26 / 88→53 / 66→40 / 54→32 / 74→44 / —
- **Command-chain (Fwd+Heavy):** tobiCombo1 42→25 → tobiCombo2 46→28 → tobiComboFin 84→50 (launcher). Pokes: tobiStrongFwd 66→40 (32f) · tobiRisingKnee 56→34 (28f).
- **Specials (5-dir):** Water Dragon 78→47 · 40 EN · Water Slash 72→43 · 25 EN · Rising Water 66→40 · 30 EN (launcher) · Water Wall 44→26 · 30 EN · Darkness 60→36 · 30 EN · Water Body-Flicker 0 · 35 EN (reversal, 90f cd).
- **Ultimate:** **Edo Tensei** — gating = spend ALL EN (min 60) + **25% current HP (non-lethal)** · **[DYNAMIC] energy-drain window**. Summons pre-chosen vessel, controls their FULL kit (incl. their own ult); opponent cancels by hitting Tobirama's dummy (shared HP).
- **Flags:** window duration [DYNAMIC]; some water FX placeholder.

## Minato — naruto
- **Stats:** HP 1150 · EN 200 · 92/82/98
- **Normals:** 45→27 / 88→53 / 68→41 / 56→34 / 74→44 / —
- **Command-chain (Fwd+Heavy):** minatoRush1 42→25 → minatoRush2 48→29 → minatoRushFin 86→52 (launcher). Pokes: minatoFloorCombo 70→42 (34f) · minatoMeleeRush 62→37 (30f).
- **Specials:** Flying Raijin Kunai 72→43 · 15 EN (+drops mark, ≤3) · Rasengan 120→72 · 30 EN · Big Ball 175→105 · 45 EN · **Reaper Death Seal — soul-rip 250→150 · 60 EN + 170 HP** (sacrifice, HP cost only on connect; command-grab) · Shuriken Clone 40→24 + 72→43 · 35 EN · Flying Raijin Clones 50→30/mark · 40 EN · Pincer Rendan 60→36 ×2 · 35 EN.
- **Ultimate:** Nine-Tails / Tailed Beast Bomb — **600 [UNSCALED]** · gating = 50% maxEnergy · 40s recast (shared).
- **Mechanics:** Flying Raijin marks (F→F recall); shadow clones; Edo vessel eligible.

## Madara — naruto
- **Stats:** HP 1180 · EN 220 · 94/86/92
- **Normals:** 42→25 / 92→55 / 66→40 / 56→34 / **down_air: NONE — confirmed gap, no art (button no-ops; see gap note)** / — (grab = Susanoo grab)
- **Command-normal:** **Susanoo Skeletal Grab (Fwd+Heavy, Tier-1 command-grab, throw 120→72, reach 150, 0 EN/40f cd).**
- **Specials:** Katon Fireball 110→66 · 30 EN · Gunbai Fan-Swing 96→58 · 30 EN · **Mokuton Wood Dragon 150→90 · 45 EN (highest special)** · Wood Spike 92→55 · 28 EN · Gunbai Summon 0 · 25 EN (**projectile-reflect stance**).
- **Armored Susanoo mode (Back+Heavy):** 55 EN, ~6s, dmg×1.35/def×1.2; in-form swings 85→51 / 115→69.
- **Ultimate:** **TIERED (tap/hold).** TAP (or hold <180 EN) = Tengai Shinsei meteor — **340 [UNSCALED] · flat 100 EN** (blocked→25%). HOLD (**gating = ≥180-EN threshold**) = Complete Susanoo giant — **SCALED** form (dmg×1.9/def×1.5, ~10s): giant swings 85→**~97** / 115→**~131** (×1.9×0.60), planted no-jump.
- **Flags:** **down_air GAP confirmed (no candidate sprite — the only downward art is the Tengai meteor overlay FX, not a body pose).** BALANCE_AUDIT verdict: fair *versatility* outlier, not power.

═══════════════════════════════════════════════════════════════════════════════

# HUNTER × HUNTER

## Netero — hunter_x_hunter
- **Stats:** HP 980 · EN 150 · 98/82/94
- **Normals:** 48→29 / 95→57 / 72→43 / 62→37 / 84→50 / 30→18
- **Command-chain (Down+Heavy):** down_attck_1 46→28 → down_attck_2 72→43.
- **Specials:** Barrage Punches 110→66 · 30 EN.
- **Ultimate:** 100-Type Guanyin Bodhisattva — flat 100 EN · **SCALED** sustained giant 20s (dmg×1.6/def×1.4). Avatar attacks (RAW→EFF, ×1.6 already in eff per BALANCE_AUDIT ≈59–77 each): leg 62 · arm 78 · combo 46×2 · burst 92 · **Zero 180→~173 (once/activation).**
- **Mechanics:** fast multi-hit giant (high DPS over window).

## Killua — hunter_x_hunter
- **Stats:** HP 1030 · EN 180 · 84/78/95
- **Normals:** 38→23 / 78→47 / 60→36 / 50→30 / 70→42 / 26→16
- **Command-chain (Down+Heavy):** barrage1 26→16 → 28→17 → 30→18 → 55→33 (launcher).
- **Specials:** Yo-Yo 70→42 · 30 EN · Lightning Palm 62→37 · 25 EN · Electric Ball 60→36 · 30 EN.
- **Ultimate:** Godspeed — **buff-mode, gating = 150-EN threshold** (drain 0.30/f). dmg×1.25, atkSpd×1.4, move×1.3. **Opponent time-slowed to 0.4×.** No direct damage (attacks scaled ×1.25).
- **Flags:** none.

## Gon — hunter_x_hunter
- **Stats:** HP 1150 · EN 160 · 89/86/86
- **Normals:** 34→20 / 66→40 / 54→32 / 46→28 / 58→35 / 26→16
- **Command-chain (Down+Heavy):** rush1 → rush2 (launcher) — **[DYNAMIC combo-scaled]**.
- **Specials:** Jajanken **Rock 150→90 · 45 EN** (launcher, 18f telegraph) · Scissors 20→12 ×5 · 30 EN · Paper 46→28 · 24 EN (big KB).
- **Ultimate:** Adult Form + Final Blow — **buff-mode, gating = 140-EN threshold** (freeze growth-cinematic). Active: dmg×1.3, **canJump=false, noDash, speed 40**. **SUDDEN-DEATH Final Blow: clean hit = instant match WIN; whiff/block = instant match LOSS** (not a damage number — `finalblow.damage 400` exists but the gate is win/loss).
- **Flags:** **no `ultimate.name` in characters.js** — real ult in abilities.js.

## Hisoka — hunter_x_hunter
- **Stats:** HP 1080 · EN 170 · 88/82/91
- **Normals:** 40→24 / 80→48 / 62→37 / 52→31 / 68→41 / 26→16
- **Command-chain (Down+Heavy):** hisokaRekka1 28→17 → hisokaRekka2 52→31 (launcher).
- **Specials:** Bungee Gum 72→43 (base) / 92→55 (Overdrive) · 30 EN (whip, reach 172–230px, NOT grab) · Texture Surprise single 48→29 · 18 EN · rapid 16→10 ×5 · 30 EN.
- **Ultimate:** Bloodlust Overdrive — **buff-mode, gating = 140-EN threshold** (drain 0.30/f). dmg×1.3, atkSpd×1.25. **No scale bypass** (buff-mode → scaled attacks × 1.3).
- **Flags:** none.

## Chrollo — hunter_x_hunter
- **Stats:** HP 1080 · EN 130 · 84/84/88
- **Normals:** 44→26 / 80→48 / 66→40 / 58→35 / 76→46 / 30→18
- **Command-chain (Fwd+Heavy):** chCombo1 → chComboFin (launcher) — **[DYNAMIC]**.
- **Specials:** Nen Bolt 60→36 · 25 EN · Blade Lunge 78→47 · 25 EN.
- **Ultimate:** **Skill Hunter — NOT a damage number.** Gating = opponent lands **3 distinct moves** on Chrollo (unlock) + **100 EN** → Chrollo becomes the OPPONENT (full kit) for **fixed 30s**.
- **Mechanics:** **Bandit's Echo** (2nd, `_be*` ns): mark opponent's special/ult on CONNECT → copy ONE with HP+EN cost, single-use.
- **Flags:** ult payload = kit-copy, not damage/energy — **[DESCRIBE-not-number].**

═══════════════════════════════════════════════════════════════════════════════

# POWER RANGERS
*(Samurai Red/Gold/Green share a Toji-Rekka chain + Mega Mode + a shared [UNSCALED] freeze-cinematic ult.)*

## Samurai Red Ranger — power_rangers
- **Stats:** HP 1220 · EN 160 · 95/88/88
- **Normals:** 45→27 / 90→54 / **up: tap 66→40 / hold 112→67** / 60→36 / 80→48 / 30→18
- **Command-chain (Fwd+Heavy):** samRekka1 40→24 → samRekka2 42→25 → samRekkaFin 82→49 (launcher).
- **Specials:** Flame Slash (**Mega-only**) 120→72 · 35 EN (launcher) + burst 48→29 / 42→25.
- **Ultimate:** Fire Smasher: Blazing Strike — **base 340 / Mega 460 [UNSCALED]** · flat 100 EN · freeze-cinematic (blocked→25%).
- **Mode:** Mega Mode (Fwd+Charge) dmg×1.35/spd×1.05/def×1.08, drain 0.30/f (~8.9s).

## Gold Samurai Ranger — power_rangers
- **Stats:** HP 1160 · EN 165 · 92/84/94
- **Normals:** 45→27 / 86→52 / 70→42 / 60→36 / 80→48 / 30→18 · **Chain:** samRekka1/2/Fin 40→24 / 42→25 / 82→49.
- **Specials:** Light Slash base 90→54 melee + 72→43 wave · 35 EN → Mega 120→72 + 96→58 wave.
- **Ultimate:** Barracuda Blade: Light Finale — **base 340 / Mega 460 [UNSCALED]** · 100 EN · freeze-cinematic.
- **Mode:** Mega Mode (identical multipliers).

## Green Samurai Ranger — power_rangers
- **Stats:** HP 1190 · EN 165 · 91/85/91
- **Normals:** 45→27 / 88→53 / 70→42 / 60→36 / 80→48 / 30→18 · **Chain:** samRekka1/2/Fin 40→24 / 42→25 / 82→49.
- **Specials:** Forest Spear base 90→54 melee (**reach 100 — out-reaches all normals**) + 72→43 leaf-wave · 35 EN → Mega 120→72 + 96→58.
- **Ultimate:** Forest Spear: Verdant Storm — **base 340 / Mega 460 [UNSCALED]** · 100 EN · freeze-cinematic.
- **Mode:** Mega Mode (identical).
- **Flags:** **least test-verified char** (no dedicated suite); Mega forward/back sprites omitted.

## Omega Ranger — power_rangers
- **Stats:** HP 1180 · EN 175 · 93/86/92
- **Normals:** 48→29 / 92→55 / 70→42 / 60→36 / 80→48 / 30→18
- **Specials (4-way):** Delta Enforcer Gun 120→72 · 30 EN (proj) · Super Upper 150→90 · 45 EN (launcher) · Downward 165→99 · 40 EN · **Sword Ring 200→120 · 60 EN (launcher — costliest).**
- **Ultimate:** Omega Saber: Final Strike — **240→144 · flat 100 EN** · **SCALED** melee launcher (NOT a cinematic — runs the normal pipeline).
- **Mechanics:** no Mega Mode on this branch.

═══════════════════════════════════════════════════════════════════════════════

# DEMON SLAYER *(all EN 0 — cooldown-gated)*

## Zenitsu — demon_slayer
- **Stats:** HP 1000 · EN 0 · 88/74/96
- **Normals:** 50→30 / 90→54 / 70→42 / 60→36 / 80→48 / —
- **Command-chain (Down+Heavy):** zenCombo1 28→17 → 34→20 → 60→36 (launcher).
- **Specials:** Thunderclap 130→78 (72f cd) · Double Attack 70→42 (120f cd, assist summon).
- **Ultimate:** Godspeed — **300→180 (SCALED)** · cooldown-only (480f) · **unblockable** dash-through · same-level gate. *(NOTE: unlike the cinematic ults, this runs the scaled pipeline — 180 eff, not 300.)*
- **Flags:** assist partners deal separately (~45→27).

## Rengoku — demon_slayer
- **Stats:** HP 1140 · EN 0 · 92/80/92
- **Normals:** 52→31 / 95→57 / 74→44 / 62→37 / 84→50 / —
- **Command-chain (Fwd+Heavy, branches):** ground rengokuG1 30→18 → G2 36→22 → G3 46→28; air A1 30→18 → bridge 34→20 → A2 44→26; supers rengokuSuperFwd 74→44 / SuperDown 82→49 (launcher) / SuperAir 78→47 (spike).
- **Specials:** Charged Flame Strike tap 90→54 / hold 150→90 · 75f cd · Counter 0→riposte 70→42 · 96f cd.
- **Ultimate:** Flame Explosion — **340 [UNSCALED]** · cooldown-only (480f/8s) · range-independent (blocked→25%).

## Shinobu — demon_slayer
- **Stats:** HP 960 · EN 0 · 82/76/97
- **Normals:** 44→26 / 78→47 / 62→37 / 52→31 / 70→42 / —
- **Command-chain (Fwd+Heavy):** shinobuG1 24→14 → 30→18 → 40→24.
- **Specials:** Poison Thrust 40→24 (78f cd) + poison DOT 7×7=49 [UNSCALED] on clean hit · Butterfly Flit 0 (66f cd, i-frame evade).
- **Ultimate:** Butterfly Dance — **300 [UNSCALED]** · cooldown-only (480f) + lethal poison DOT 11×6=66 on clean hit ≈ **366 total** (blocked→25%, no poison).

═══════════════════════════════════════════════════════════════════════════════

# DC

## Flash — dc
- **Stats:** HP 1020 · EN 100 · 80/74/99 *(roster-fastest)*
- **Normals:** 30→18 / 62→37 / 50→30 / 44→26 / 60→36 / 24→14
- **Specials:** Speed Rush 22→13 ×3 · 20 EN · Tornado 28→17 ×4 · 35 EN (final-hit launcher).
- **Ultimate:** Flash Time — **buff-mode, gating = 90-EN threshold** (drain 0.22/f). atkSpd×1.25, dashSpeed 30; **opponent slowed to 0.34×**; **CANNOT BLOCK while active.** No direct damage.
- **Mechanics:** speed-tier teleport-blur (spd 99 ≥ Toji 98).

## Batman — dc
- **Stats:** HP 1080 · EN 100 · 86/88/92
- **Normals:** 32→19 / 64→38 / 52→31 / 45→27 / 58→35 / 26→16
- **Specials:** Batarang 34→20 · 15 EN (cheapest) · Cape Dash 50→30 · 25 EN (launcher) · Smoke Pellet 0 · 20 EN (teleport-behind, 14f i-frames).
- **Ultimate:** The Dark Knight — **300 [UNSCALED] · flat 100 EN** · freeze-cinematic batarang barrage (blocked→25%).

## Superman — dc
- **Stats:** HP 1450 · EN 200 · 100/92/88 *(tankiest — watch-item)*
- **Normals:** 36→22 / 72→43 / 56→34 / 48→29 / 62→37 / 30→18
- **Specials:** Heat Vision 52→31 / 84→50 (Solar-Flare) · 22 EN · Flying Punch 108→65 / 150→90 (Overload) · 30 EN (launcher).
- **Ultimate:** Solar Overload — **380 [UNSCALED] · flat 100 EN** · freeze-cinematic (blocked→25%).
- **Modes (share 200 pool, gate 80, drain 0.25/f):** Solar Flare (D+Sp) dmg×1.25; Kryptonian Overload (B+Sp) atkSpd×1.3/spd×1.15.
- **Flags:** HP 1450/Def 92 deliberate tank outlier.

═══════════════════════════════════════════════════════════════════════════════

# OTHER UNIVERSES

## Omni-Man — invincible
- **Stats:** HP 1400 · EN 200 · 98/88/90
- **Normals:** 50→30 / **120→72 (superArmor)** / 92→55 / 78→47 / 105→63 / 36→22
- **Command-chain (Fwd+Heavy):** omCombo1 42→25 → omCombo2 46→28 → omComboFin 84→50 (launcher). Pokes: omPush 66→40 (32f) · Rising Knee 56→34 (28f).
- **Specials:** Viltrumite Smash 130→78 · 35 EN (superArmor) · Skewering Rush 120→72 · 30 EN · Meteor Drop 140→84 · 40 EN (spike).
- **Ultimate:** Viltrumite Onslaught — **340 [UNSCALED] · flat 100 EN** · body-slam cinematic (blocked→25%).
- **Mechanics:** Flight toggle (drain [DYNAMIC]); teleport-dash; shared 200 pool.

## Saiki — saiki_k
- **Stats:** HP 1050 · EN 180 · 84/84/90
- **Normals:** 44→26 / 82→49 / 66→40 / 58→35 / 76→46 / 30→18
- **Command-chain (Fwd+Heavy):** saikiChain1–Fin (projectile bolts, damage **[DYNAMIC]**).
- **Specials:** Lightning 130→78 · 30 EN.
- **Ultimate:** Giant Bomb Throw — **300 [UNSCALED] · flat 150 EN** · AOE (radius 300, blocked→20%).
- **Flags:** rekka bolt damage [DYNAMIC].

## Ghostface — horror
- **Stats:** HP 1040 · EN 100 · 85/80/95
- **Normals:** 34→20 / 66→40 / 54→32 / 46→28 / 58→35 / —
- **Command-chain (Down+Heavy):** ghostfaceCombo1 22→13 → 28→17 → 42→25.
- **Specials:** Gutting Lunge 50→30 · 25 EN (+bleed DOT 6×6=36 on clean hit) · Low Gut 42→25 · 20 EN (knockdown) · **Backstage Pass (companion-swap system).**
- **Ultimate:** The Final Act — **300 [UNSCALED] · flat 100 EN** freeze-cinematic (blocked→25%) + lethal bleed DOT 10×6=60 on clean hit.
- **Mechanics:** **5 killer identities, each a REAL gameplay modifier + 4-char companion pool** (Backstage Pass swaps in a companion 10–15s; Jill = auto-counter; Billy = lunge-startup [DYNAMIC]).

## Rick — rick_and_morty
- **Stats:** HP 1050 · EN 160 · 82/78/80
- **Normals:** 34→20 / 60→36 / 56→34 / 44→26 / **down_air: NONE — confirmed gap, no art (button no-ops)** / 30→18
- **Specials:** Meeseeks Box 45 [UNSCALED]-assist · 30 EN · Rocket 95→57 · 40 EN · Portal-Pull 42 [UNSCALED] · 35 EN · Portal-Push 65 [UNSCALED] · 45 EN · Portal Laser 20→12 · **FREE (24f cd)**.
- **Ultimate:** Self-Destruct — **180 [UNSCALED] · flat 140 EN** · proximity AOE (radius 220, blocked→20%), **Rick takes no self-damage**, 0 startup.
- **Flags:** **down_air GAP confirmed** — asset map: "downAir intentionally ABSENT, no art exists"; the only unwired candidate (`rick_poop_attack.png`) is a **grounded upright projectile-toss** (the deferred "downTilt" gag), not an aerial down-strike — not viable as down_air.

## Morty — rick_and_morty *(non-sprite placeholder)*
- **Stats:** HP 980 · EN 120 · 74/72/72 · **Normals:** 40→24 / 70→42 / 60→36 / 50→30 / 65→39 / —
- **Specials (metadata):** Nerve Strike 100→60·25 · Frantic Flurry 80→48·20 · Scramble 50→30·10. **Ult:** Morty's Courage · 100 EN.
- **Flags:** **[NO HANDLER]** — data only.

## Evil Morty — rick_and_morty *(non-sprite placeholder)*
- **Stats:** HP 1100 · EN 150 · 86/82/82 · **Normals:** 45→27 / 85→51 / 70→42 / 60→36 / 80→48 / —
- **Specials (metadata):** Manipulative Blast 140→84·30 · Override 90→54·25 · Cold Step 60→36·15. **Ult:** Evil Morty's Takeover · 100 EN.
- **Flags:** **[NO HANDLER]** — data only.

## Rick Prime — rick_and_morty *(non-sprite placeholder)*
- **Stats:** HP 1120 · EN 180 · 92/82/88 · **Normals:** 55→33 / 95→57 / 75→45 / 65→39 / 90→54 / —
- **Specials (metadata):** Prime Portal Blast 160→96·35 · Annihilation Mine 110→66·30 · Prime Portal 60→36·15. **Ult:** Rick Prime's Supremacy · 100 EN.
- **Flags:** **[NO HANDLER]** — data only.

## Omololu — original *(non-sprite placeholder)*
- **Stats:** HP 1210 · EN 180 · 88/90/80 · **Normals:** 44→26 / 84→50 / 68→41 / 58→35 / 74→44 / 30→18
- **Specials (metadata):** Analysis Strike 130→78·30. **Ult:** Full Analysis · 100 EN.
- **Flags:** **[NO HANDLER]** — data only.

═══════════════════════════════════════════════════════════════════════════════

# BEN 10 *(Omnitrix transform device)*

## Ben 10 — ben_10
- **Stats:** HP 1250 · EN 100 · 90/85/* (*speed per alien form)
- **Human Normals:** 42→25 / 80→48 (superArmor) / 62→37 / 50→30 / 66→40 / 26→16 · **Chain:** benJab1 → benJab2.
- **Human Specials/Ult:** Hoverboard Dash/Bash — **[DYNAMIC, Stage-3 TBD]**. Omnitrix Overload (100 EN) fires the **active alien's** ultimate.
- **ALIEN DAMAGE [DYNAMIC]:** `D = round(BASE × alienMult)`, BASE = 42/85/68/56/78. Effective = D × 0.60.
  - **XLR8** (art, speed, mult 0.75): L 31→19 / H 63→38 · Special Dash Strike 80→48·15 · Ult Sonic Blitz 180→108.
  - **Diamondhead** (art, zoner, 1.0): L 42→25 / H 85→51 · Special Shard Barrage 100→60·20 · Ult Crystal Storm 210→126.
  - **Feedback** (art, zoner, 0.95): L 40→24 / H 80→48 · Special Energy Discharge 110→66·22 + **reactive absorb counter** · Ult Overload 210→126.
  - **Procedural (hidden) pool:** 30+ aliens via `mkAlien()` formula.
- **Mechanics:** per-slot transform (Charge+dir), energy-drain per alien, forced human revert at 0 EN.
- **Flags:** **[GAP] aliens have NO grab** (mkAlien omits it). **[POSSIBLE BUG] human revert doesn't reset maxHealth.** Per-alien specials/ults largely data (Stage-5 deferred).

## Albedo — ben_10 *(non-sprite placeholder)*
- **Stats:** HP 1250 · EN 100 · 90/85/5 · **Normals:** 42→25 / 80→48 / 62→37 / 50→30 / 66→40 / 26→16 (mirrors Ben human)
- **Specials:** shares Ben's alien roster (Ultimatrix). **Ult:** Ultimatrix Overload · 100 EN.
- **Flags:** spriteless clone; shares Ben's [DYNAMIC] alien kit.

═══════════════════════════════════════════════════════════════════════════════

# APPENDIX A — down_air (5th normal slot) status
| Char | down_air | Notes |
|---|---|---|
| **Madara** | **MISSING — confirmed gap** | No candidate sprite. `madara2_meteor_smash*` = Tengai ULT overlay FX, not a body pose. Asset map: "genuinely absent — no data, button no-ops." |
| **Rick** | **MISSING — confirmed gap** | Asset map: "downAir intentionally ABSENT — no art exists." Only orphan (`rick_poop_attack.png`) is a grounded upright projectile-toss (deferred "downTilt"), **not** an aerial down-strike → not wired. |
| *(all others)* | present | standard 5-slot schema filled. |
*Both are confirmed, still-open content gaps — NOT fabricated substitutions. Flagged here + inline so an
incomplete kit doesn't read as "weaker" for the wrong reason.*

# APPENDIX B — [UNSCALED] moves (bypass GLOBAL_DAMAGE_SCALE; RAW = EFF)
**Verified via `apply*Damage` callbacks (`opp.health -= dmg`).** Ultimates: Naruto/Minato TBB 600 · Superman
Solar Overload 380 · Beerus Ki Ball 380 · Madara Tengai 340 · Omni-Man Onslaught 340 · Rengoku Flame
Explosion 340 · Samurai Red/Gold/Green Flame-Smasher 340(/460 Mega) · Batman Dark Knight 300 · Ghostface
Final Act 300 · Shinobu Butterfly Dance 300 · Saiki Giant Bomb 300 · Miwa Blade 280 · Rick Self-Destruct 180.
Specials/other: Beerus Hakai 190 · Yuji Sukuna Slash 50 · Megumi shikigami summons · Rick Meeseeks/Portal-Pull/Push · DOT ticks (Rasenshuriken/poison/bleed).
**NOT unscaled (run the ×0.60 pipeline despite big numbers):** **Zenitsu Godspeed 300→180**, **Omega Saber 240→144**, all **Susanoo** forms (Sasuke/Itachi/Madara-giant/Netero-Guanyin), Gojo/Sukuna domains, and every buff-mode (Killua/Hisoka/Gon/Flash).

# APPENDIX C — Ultimate gating-type census (they're NOT all the same)
| Gating type | Characters |
|---|---|
| **Flat energy 100** | Gojo, Sukuna, Megumi, Batman, Superman, Omni-Man, Ghostface, Miwa, Yuji, Chrollo(+unlock), Samurai Red/Gold/Green, Omega, Netero, Goku/Vegeta (transform trigger) |
| **Flat energy, other** | Beerus 150, Saiki 150, Rick 140 |
| **50% of max energy** | Naruto/Minato (≈95; characters.js says 100 — **discrepancy**), Sasuke/Itachi (tap→drain) |
| **HP-threshold ≤25%** | **Maki** |
| **Buff-mode EN-threshold** | Killua 150, Gon 140 (+sudden-death), Hisoka 140, Flash 90 |
| **Tap-vs-hold energy gate** | **Madara** (tap 100 cinematic / hold ≥180 giant) |
| **Cooldown-only (EN 0)** | Zenitsu, Rengoku, Shinobu, Toji |
| **Move-count unlock** | **Chrollo** (3 distinct opponent moves) |
| **HP + all-energy sacrifice** | **Tobirama** (Edo Tensei: 25% HP + all EN) |

# APPENDIX D — Discrepancies & gaps
1. **Naruto/Minato TBB cost:** characters.js `100` vs abilities.js `95` (50% meter). (BALANCE_AUDIT flags.)
2. **Goku Black specials:** metadata, no handler (Stage-3); base→SSG→Rose→Blue ladder shelved.
3. **7 non-sprite placeholders** (Piccolo, Frieza, Cell, Morty, Evil Morty, Rick Prime, Omololu): specials/ults are declared metadata with **NO abilities.js handler** — EFF values shown assume the scaled pipeline *if* ever wired.
4. **Ben 10 aliens:** all damage [DYNAMIC]; **no grab**; possible human maxHealth-revert bug; specials/ults largely deferred.
5. **Gon:** no `ultimate.name` in characters.js; Final Blow is a win/loss condition, not damage.
6. **Chrollo Skill Hunter:** kit-copy, not a damage/cost number.
7. **down_air gaps:** Madara and Rick (Appendix A) — confirmed, no viable content.
8. **[DYNAMIC] runtime values:** Naruto Big Ball charge (RAW 150–210), Tobirama Edo-Tensei window, Ghostface Billy lunge-startup, Saiki bolts, Omni-Man flight drain, Ben 10 alien formula, combo-scaled chain hits.
9. **Effective-damage note:** every RAW→EFF pair verifies `EFF = round(RAW × 0.60)`; `[UNSCALED]` moves show RAW only (= effective).

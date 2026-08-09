# Multiverse Smash — Roster & Systems Reference

**Status snapshot — 2026-08-04 (branch `combo-flow-layer`).** Full regeneration from the live code
(`characters.js` / `abilities.js` / `fighters.js` / `skins.js`), superseding the 2026-08-01 partial.

**Scale right now:** **45 playable characters** across **13 universes** — **37 sprite-art complete** +
**8 non-sprite placeholders** (procedural-box fallback, minimal kits). **35** characters carry alt-skin
sets totalling **~257** recolors (13 of them have 10+; largest: Maki 15, Goku Black / Yuji / Gold 14).
**273** harness test scripts, **27** voice modules.

Stat key: **HP · EN**(energy) · **A**tk **D**ef **S**pd. `EN 0` = a **cooldown-gated** kit (no meter —
the Demon Slayer trio + Toji + Maki). Non-sprite placeholders are marked *(box)*.

---

## 1. Roster by universe

### Dragon Ball (7)
| Char | HP·EN·A/D/S | Signature kit | Ultimate |
|---|---|---|---|
| **Goku** | 1200·200·92/86/88 | ki blasts, Kamehameha, SSJ ladder (`_skinAnim` tier-swap) | Super Saiyan Blue |
| **Vegeta** | 1150·200·91/85/88 | Galick/Big Bang beams; **base→SSJ→SSJ Blue** tier-swap | SSJ Blue Evolution (Final Flash freeze-cinematic) |
| **Goku Black** | 1200·200·90/86/90 | **base→SSG→SSJ Rose→SSJ Blue** 4-tier ladder (recolor-pilot tiers); Rose grand cinematic, God/Blue snappy flash | Sword Slash (Rose-only sure-hit) |
| **Beerus** | 1000·170·97/78/95 | Hakai, God-of-Destruction ki | Ki Ball (3-stage charge/release/impact cinematic) |
| Piccolo *(box)* | 1100·160·84/86/80 | placeholder kit | Fused with Kami |
| Frieza *(box)* | 1200·170·90/84/88 | placeholder kit | Golden Frieza |
| Cell *(box)* | 1300·170·94/90/82 | placeholder kit | Perfect Cell |

### Jujutsu Kaisen (7)
| Char | HP·EN·A/D/S | Signature kit | Ultimate |
|---|---|---|---|
| **Gojo** | 1160·220·91/88/87 | Limitless (Blue/Red/Hollow Purple), **Infinity** field, teleport | Unlimited Void (domain) |
| **Megumi** | 1120·210·84/82/83 | Ten Shadows shikigami (Divine Dog, Nue, Toad, Serpent) | Chimera Shadow Garden (domain — restrains opponent) |
| **Sukuna** | 1240·210·95/87/86 | Dismantle/Cleave, Flame Arrow, Cursed Slash, Malevolent Dash | Malevolent Shrine (domain) |
| **Toji** | 1260·**0**·96/89/**98** | 3-stance weapon system (Blade/Chain/Gun), Toji-Rekka; zero-meter, no-cost kit | Heavenly Restriction |
| **Maki** | 1180·**0**·96/84/**98** | Cursed Tool Flurry rekka, tight-window Heavenly-Vow cancels; no meter | **Cursed Tool Awakening** — HP-threshold (≤25%) black-costume transform (Shibuya, gore-free) |
| **Yuji** | 1120·150·90/82/90 | Divergent Fist, cursed-energy strikes, command chains | Black Flash (freeze-cinematic cursed burst) |
| **Miwa** | 1150·160·86/84/93 | New-Shadow-style katana, Battojutsu Rush chain | Blade of the Neophyte (quick-draw freeze-cinematic slash) |

### Naruto (6)
| Char | HP·EN·A/D/S | Signature kit | Ultimate |
|---|---|---|---|
| **Naruto** | 1180·190·89/84/90 | Rasengan family, **shadow-clone** combos, Kurama Shroud (HP-gated comeback) | Kurama Avatar (fox; `_kuramaHide` hides real body) |
| **Sasuke** | 1180·190·89/84/90 | Chidori, fireballs, teleport, **standalone skeletal-Susanoo grab** | **Susanoo** (staged: Lv1 grab → Lv2 armor+arrow) — see §Susanoo |
| **Itachi** | 1170·200·90/85/91 | Amaterasu (black-flame DOT), Mangekyou genjutsu | Susanoo (single-tier sustained creature) |
| **Tobirama** | 1120·200·90/82/**96** | Water jutsu, Kawarimi, Flying-Raijin marks | **Edo Tensei** — see §Systems |
| **Minato** | 1150·200·92/82/**98** | Flying Raijin teleport + marks, Rasengan, Reaper Death Seal (HP-cost) | Nine-Tails Chakra Mode (half-fox avatar → Tailed Beast Bomb) |
| **Madara** | 1180·220·94/86/92 | LARGEST kit — 7 specials (Katon, Gunbai reflect, Fan-Swing, Wood Spike/Dragon) + Susanoo grab + armored mode | **Tiered Susanoo** — TAP Tengai Shinsei meteor / HOLD Complete-Susanoo giant — see §Susanoo |

### Hunter × Hunter (5)
| Char | HP·EN·A/D/S | Signature kit | Ultimate |
|---|---|---|---|
| **Netero** | 980·150·98/82/94 | Prayer barrage, Zero Hand | 100-Type Guanyin Bodhisattva (giant form) |
| **Killua** | 1030·180·84/78/95 | Yo-Yos, Lightning Palm / Electric Ball (dir-branched) | Godspeed (buff-mode + opponent time-slow) |
| **Gon** | 1150·160·89/86/86 | Jajanken (Rock/Paper/Scissors), Rush rekka | **Adult Form** — buff + movement-lockout + **sudden-death** (clean hit = win / whiff = loss) |
| **Hisoka** | 1080·170·88/82/91 | Bungee Gum (extended-reach whip), Texture-Surprise cards | Bloodlust Overdrive (buff-mode form-swap, extended reach) |
| **Chrollo** | 1080·130·84/84/88 | Bandit's Secret / book specials | **Skill Hunter** (live-copy) + **Bandit's Echo** (mark→copy one) — see §Systems |

### Power Rangers (4)
| Char | HP·EN·A/D/S | Signature kit | Ultimate |
|---|---|---|---|
| **Omega Ranger** (White/S.P.D.) | 1180·175·93/86/92 | Delta Enforcer gun, Super Upper, Bonus Ring; 4-way special | Omega Saber: Final Strike (live launcher) |
| **Samurai Red** (Fire) | 1220·160·95/88/88 | katana Toji-Rekka chain, **Mega Mode** tier-swap, Mega-only Flame Slash | Fire Smasher: Blazing Strike (tier-scaling freeze-cinematic) |
| **Gold Samurai** (Light) | 1160·165·92/84/94 | Barracuda katana chain, light slash-wave projectile, **Mega Mode** | Barracuda Blade: Light Finale (tier-scaling freeze-cinematic) |
| **Green Samurai** (Forest) | 1190·165·91/85/91 | naginata/spear reach archetype, forest kit | Forest Spear: Verdant Storm |

### Demon Slayer (3) — all **cooldown-gated** (EN 0)
| Char | HP·EN·A/D/S | Signature kit | Ultimate |
|---|---|---|---|
| **Zenitsu** | 1000·0·88/74/**96** | Thunder Breathing 1st Form; **Double Attack** (Tanjiro/Inosuke assists) | Godspeed (dash-through unblockable slice) |
| **Rengoku** | 1140·0·92/80/92 | branching flame combo chains, charge-tier Flame Strike, reactive Counter | Flame Breathing: Rengoku (freeze-cinematic AOE) |
| **Shinobu** | **960**·0·82/76/**97** | piercing thrusts, poison DOT, Butterfly Flit i-frame evade | Butterfly Dance (freeze-cinematic dash + lethal wisteria poison) |

### DC (3)
| Char | HP·EN·A/D/S | Signature kit | Ultimate |
|---|---|---|---|
| **Flash** | 1020·100·80/74/**99** | Speed Rush rekka, Spin/Tornado whirls; glass-cannon speedster (roster's fastest) | Flash Time (3× self / ⅓× opponent; can't block while active) |
| **Batman** | 1080·100·86/88/92 | batarangs, gadgets, cape | The Dark Knight (batarang-barrage freeze-cinematic) |
| **Superman** | **1450**·200·**100**/92/88 | Heat Vision, Flying Punch, Solar-Flare / Kryptonian mode-toggles, flight | Solar Overload (screen-clearing freeze-cinematic detonation) |

### Rick and Morty (4)
| Char | HP·EN·A/D/S | Signature kit | Ultimate |
|---|---|---|---|
| **Rick** | 1050·160·82/78/80 | portal-gun zoning/gadgets, portal-behind teleport, Void Form skin | Self-Destruct (no self-damage proximity AOE) |
| Morty *(box)* | 980·120·74/72/72 | placeholder kit (low-mobility "panic" archetype) | Morty's Courage |
| Evil Morty *(box)* | 1100·150·86/82/82 | placeholder kit | Evil Morty's Takeover |
| Rick Prime *(box)* | 1120·180·92/82/88 | placeholder kit | Rick Prime's Supremacy |

### Ben 10 (2)
| Char | HP·EN·A/D/S | Signature kit | Ultimate |
|---|---|---|---|
| **Ben 10** | 1250·100·90/85/* | **Omnitrix** transform device — human + **XLR8 / Diamondhead / Feedback** art forms (+ procedural alien pool); deliberate per-slot transform | Omnitrix Overload / per-form (XLR8 Sonic Blitz · Diamondhead Crystal Storm) |
| Albedo *(box)* | 1250·100·90/85/* | Ben's clone via **Ultimatrix**, spriteless "Negative" identity — shares the alien roster | Ultimatrix Overload (shared alien ults) |

*Ben/Albedo speed uses each alien form's own small `mkAlien` scale, not the 80–99 anime scale.*

### Invincible (1)
| Char | HP·EN·A/D/S | Signature kit | Ultimate |
|---|---|---|---|
| **Omni-Man** | 1400·200·98/88/90 | toggleable **Flight** replacing jump, Viltrumite Beatdown rekka | Viltrumite Onslaught (flying body-slam cinematic) |

### Saiki K (1)
| Char | HP·EN·A/D/S | Signature kit | Ultimate |
|---|---|---|---|
| **Saiki** | 1050·180·84/84/90 | psychic projectile zoner, teleport | Giant Bomb Throw (delayed screen-filling explosion) |

### Horror (1)
| Char | HP·EN·A/D/S | Signature kit | Ultimate |
|---|---|---|---|
| **Ghostface** | 1040·100·85/80/95 | knife stalker; **5 killer-identity skins carry REAL gameplay modifiers** (project-first); Companion Swap / Backstage Pass | The Final Act (guaranteed stab-flurry freeze-cinematic) — see §Systems |

### Original (1)
| Char | HP·EN·A/D/S | Signature kit | Ultimate |
|---|---|---|---|
| Omololu *(box)* | 1210·180·88/90/80 | self-insert placeholder | Full Analysis |

---

## 2. Signature systems & mechanics

### Susanoo tier model (Uchiha — unified reference)
One shared 3-tier model across every Uchiha (see `UCHIHA_SUSANOO_TIER_MODEL.md`):
**T1 Skeletal** = a REAL command-grab (extended-reach `resolveGrab`, not a strike) · **T2 Full armor** =
sustained buff-form · **T3 Perfect/Complete** = giant Ultimate. **Tier 1 is a standalone special** (its own
input), fully independent of the Ultimate.
- **Madara** — T1 Fwd+Heavy Susanoo grab · T2 Back+Heavy armored mode · T3 tap Tengai Shinsei meteor /
  hold Complete-Susanoo four-armed giant.
- **Sasuke** — T1 grab on the standard grab button (standalone) · staged Ultimate = Lv1 skeletal → Lv2
  full armor (grab / sword / arrow) via a Sharingan freeze-cinematic. *(No T3 giant art yet — content gap.)*
- **Itachi** — single-tier sustained Susanoo creature (own variant, pre-dates the model).

### Chrollo — dual copy mechanics
- **Skill Hunter** (Ultimate): momentarily swap into a live full copy of the opponent's kit (~30s), then revert.
- **Bandit's Echo** (2nd ability, independent `_be*` namespace): mark an opponent's special/ult on **connect**,
  then copy ONE with an HP + energy cost, single-use. Coexists with Skill Hunter.

### Ghostface — swap/summon suite
- **Killer-identity skins** = 5 identities, each a **real gameplay modifier** (the only non-cosmetic skins).
- **Companion Swap** (Kameo-style): a button combo fully plays a pool companion for 10–15s (auto-revert),
  reusing the Skill-Hunter field-swap engine (`_gfSwap*` namespace, unlimited resource).
- **Backstage Pass** / **Call-In** companion mechanics per identity pool.

### Edo Tensei (Tobirama)
Reanimation Jutsu — sacrifice all chakra + some HP to summon a **pre-chosen** vessel and command their FULL
moveset for a window, then the coffin closes. Pre-match vessel pick (scrollable roster). `_kuramaHide`
prevents a two-vessel render window during the swap.

### Morpher Call-In (Power Rangers team-up) — STAGED
Design: pre-pick another Ranger, who dashes in and performs THEIR OWN real Ultimate, then vanishes.
**Not fully wired on the current `combo-flow-layer` working tree** — the partner-select screen
(`SELECT_CALLIN_PARTNER`) and `fireCallIn` hook are absent here (S3/S4 outstanding). Included for status;
the duplicate-render and scroll audits both guard against its absence.

### Up Attack launcher system (roster-wide)
Shared launcher normal + the combo-flow layer (hitstop, cancel windows, opener-direction momentum,
combo decay) that governs how strings connect across the whole roster.

### Speed-tier teleport-blur
Any fighter whose **base speed stat ≥ Toji's (98)** is "Toji-speed-tier": a double-tap-dash toward the
opponent blinks behind them + plays a rapid spin/blur (whirling ghost copies). Qualifiers: **Flash (99),
Toji, Maki, Minato (98)**. Generalises the old hardcoded `dashTeleport` flag via a speed threshold.

### Transformation / tier systems
- **Vegeta-style tier-swap** (`_skinAnim` swaps every move's sheet + re-applies multipliers): Vegeta, Goku,
  Goku Black (4-tier recolor ladder), Samurai Red/Gold Mega Mode.
- **Buff-mode forms** (overlay + stat multipliers + drain→auto-revert, no sheet swap): Killua Godspeed,
  Hisoka Overdrive, Flash Time, Gon Adult Form, Naruto Kurama Shroud.
- **Giant/creature forms:** Madara Complete-Susanoo, Sasuke/Itachi Susanoo, Netero Guanyin, Naruto Kurama
  Avatar, Minato Kurama. All use runtime `_canvasHeightFrac` (excluded from the height-reference audit).
- **Ben 10 Omnitrix:** deliberate per-slot transform (Charge + direction → a specific alien), data-driven pool.
- **Transformation Jutsu** (Naruto universe): Tier-1 visual Disguise + Tier-2 full-copy (forks Skill Hunter).

### Freeze-cinematic ultimates
A large share of ults are freeze-cinematics (both fighters paused, scripted overlay, guaranteed hit):
Beerus Ki Ball, Rengoku/Shinobu/Zenitsu, Batman, Superman, Ghostface, Miwa, Yuji, Madara Tengai, Sasuke
Sharingan escalation, Vegeta Final Flash, Goku Black Rose. All re-verified single-draw-per-frame (§Testing).

### Domains, summons, chains
- **Domains:** Gojo Unlimited Void, Sukuna Malevolent Shrine (fullscreen, auto-slashes).
- **Summons/clones:** Naruto/Minato shadow clones (decoy system + clone-combo tiers), Megumi shikigami,
  Zenitsu Double Attack assists.
- **Command chains:** the shared **Toji-Rekka** pattern (Fwd+Heavy opener → re-tap on hit → cancel to next),
  ported across many characters (Tobirama, Minato, Rengoku, Zenitsu, Shinobu, Miwa, Maki, Ghostface, …).
- **Motion inputs:** Naruto-universe classic-motion engine (QCF/QCB) for Uzumaki Barrage / clone barrages.

---

## 3. Cross-cutting infrastructure
- **Selection scroll:** every roster grid scrolls when it overflows (char/Edo/FFA/alien); menus (skin/tower/
  team) fit-by-shrink. `test:scroll-audit` covers all screens.
- **Skins:** ~257 alt-skins via per-region recolor generators (`tools/gen_*_creative.py`) with line-art
  guard + face exclusion; cross-char palette-collision audit (`harness/palette_audit.mjs`).
- **Voice:** 27 per-character voice modules (transcribed via faster-whisper, curated pools).
- **Height reference:** every `spriteScale` tuned to canon height (`target = 0.623 × canon_cm`;
  `HEIGHT_REFERENCE.md`), giant forms excluded.
- **Fullscreen toggle**, cache-busting version stamp, training/debug harness hooks (`window.__harness`).

## 4. Balance notes
- **`GLOBAL_DAMAGE_SCALE = 0.60`** scales melee/projectile/summon/throw damage; manual-subtract ultimates
  are already balanced at raw values.
- Deliberate canon-justified stat outliers: Superman (HP 1450 / Atk 100 / Def 92), Omni-Man/Cell (HP 1400/
  1300), Toji/Minato/Maki/Flash (Spd 98–99).
- Cooldown-gated (EN 0) kits — Toji, Maki, and the Demon Slayer trio — are a distinct no-meter archetype.

## 5. Testing
**273** harness test scripts (`test:*`). Cross-cutting audits: `test:scroll-audit` (selection screens),
`test:duprender-sweep` (two-instance render bug across cinematics), `harness/palette_audit.mjs` (skin
collisions), `harness/height_reference.mjs` (canon sizing), `test:combo-flow-roster` / `test:up-attack` /
`test:speed-tier` (shared systems). Note: several per-character suites and voice-test harness hooks have
known pre-existing gaps (Chrollo/Gold-Samurai WIP, missing `__harness.*VoicePool` accessors) tracked separately.

# Multiverse Smash — Roster & Systems Reference

**Status snapshot — 2026-08-01 (branch `combo-flow-layer`).** Full-current-roster regeneration of the
earlier beta-roster doc. Everything below reflects the live code (`characters.js` / `abilities.js` /
`fighters.js` / `skins.js`), not the older partial list.

**Scale of the project right now:** **31 sprite-art playable characters** across **11 universes**, plus
**Albedo** (a spriteless Ben clone, procedural fallback art). 26 characters have alt-skin sets (some very
large — Omega/Gold 13, Batman 12, Hisoka/Superman/Rick 11). ~192 harness test scripts.

Stat key: **HP · EN**(energy)· **A**tk **D**ef **S**pd. `EN 0` = a **cooldown-gated** kit (no meter — the
Demon Slayer chars + Toji). `scale` = canon-height-tuned `spriteScale` (see §Height Reference).

---

## 1. Roster by universe

### Dragon Ball (4)
| Char | HP·EN·A/D/S | Signature kit | Ultimate |
|---|---|---|---|
| **Goku** | 1200·200·92/86/88 | ki blasts, Kamehameha, SSJ ladder | Super Saiyan Blue |
| **Vegeta** | 1150·200·91/85/88 | Galick beams, Big Bang; **base→SSJ→SSJ Blue** tier-swap (`_skinAnim`) | SSJ Blue Evolution (Final Flash freeze-cinematic) |
| **Goku Black** | 1200·200·90/86/90 | **base → SSJ God → SSJ Rose → SSJ Blue** 4-tier ladder (mandatory waypoints); Rose = grand cinematic, God/Blue = snappy flash. SSG/Blue are recolor-pilot tiers (base sprite → red/cyan hair) | Sword Slash (Rose-only sure-hit) |
| **Beerus** | 1000·170·97/78/95 | Hakai, God-of-Destruction ki | Ki Ball (3-stage freeze-cinematic) |

### Jujutsu Kaisen (4)
| Char | HP·EN·A/D/S | Signature kit | Ultimate |
|---|---|---|---|
| **Gojo** | 1160·220·91/88/87 | Limitless (Blue/Red/Hollow Purple), **Infinity** field, teleport | Unlimited Void (domain) |
| **Megumi** | 1120·210·84/82/83 | Ten Shadows shikigami summons (Divine Dog, Nue, Toad, Great Serpent) | Mahoraga Ritual (becomes Mahoraga) |
| **Sukuna** | 1240·210·95/87/86 | Dismantle/Cleave, Flame Arrow, Malevolent Dash | Malevolent Shrine (domain) |
| **Toji** | 1260·**0**·96/89/**98** | 3-stance weapon system (Blade/Chain/Gun), Toji-Rekka chain; zero-meter, no-cost kit | Heavenly Restriction |

### Naruto (5)
| Char | HP·EN·A/D/S | Signature kit | Ultimate |
|---|---|---|---|
| **Naruto** | 1180·190·89/84/90 | Rasengan family, **shadow-clone** combos, Kurama Shroud (health-gated comeback buff) | Kurama Avatar (fox, `_kuramaHide` hides real body) |
| **Sasuke** | 1180·190·89/84/91 | Chidori, fireballs, teleport | Susanoo (2-stage giant) |
| **Itachi** | 1170·200·90/85/91 | Amaterasu (black-flame DOT), Mangekyou genjutsu | Susanoo (single-tier creature) |
| **Tobirama** | 1120·200·90/82/**96** | Water jutsu, Kawarimi, Flying-Raijin marks | **Edo Tensei** — see §Systems |
| **Minato** | 1150·200·92/82/**98** | Flying Raijin teleport, Rasengan, Reaper Death Seal (HP-cost sacrifice) | Nine-Tails Chakra Mode (dedicated fox cinematic) |

### Hunter × Hunter (5)
| Char | HP·EN·A/D/S | Signature kit | Ultimate |
|---|---|---|---|
| **Netero** | 980·150·98/82/94 | Prayer barrage, Zero Hand | 100-Type Guanyin Bodhisattva (giant form) |
| **Killua** | 1030·180·84/78/95 | Yo-Yos (boomerang), Lightning Palm / Electric Ball (dir-branched) | Godspeed (buff-mode + opponent time-slow) |
| **Gon** | 1150·160·89/86/86 | Jajanken (Rock/Paper/Scissors), Rush rekka | **Adult Form** — buff + movement-lockout + **sudden-death** (clean hit = instant win / whiff = instant loss) |
| **Hisoka** | 1080·170·88/82/91 | Bungee Gum (extended-reach whip), Texture Surprise cards | Bloodlust Overdrive (buff-mode form-swap) |
| **Chrollo** | 1080·130·84/84/88 | Bandit's Secret / book specials | **Skill Hunter** — live-copy the opponent for 30s — see §Systems |

### Demon Slayer (3) — all **cooldown-gated** (EN 0)
| Char | HP·EN·A/D/S | Signature kit | Ultimate |
|---|---|---|---|
| **Zenitsu** | 1000·0·88/74/**96** | Thunder Breathing 1st Form; **Double Attack** (Tanjiro/Inosuke assist summons) | Godspeed (dash-through unblockable slice) |
| **Rengoku** | 1140·0·92/80/92 | branching flame combo chains, charge-tier Flame Strike, reactive Counter | Flame Explosion (freeze-cinematic AOE) |
| **Shinobu** | **960**·0·82/76/**97** | piercing thrusts, poison DOT, Butterfly Flit i-frame evade | Butterfly Dance (freeze-cinematic dash + poison) |

### Power Rangers (3)
| Char | HP·EN·A/D/S | Signature kit | Ultimate |
|---|---|---|---|
| **Omega Ranger** (White/S.P.D.) | 1180·175·93/86/92 | Delta Enforcer gun, Super Upper, Bonus Ring; 4-way special | Omega Saber: Final Strike (live launcher) |
| **Samurai Red Ranger** (Fire) | 1220·160·95/88/88 | katana Toji-Rekka chain, **Mega Mode** tier-swap, Mega-only Flame Slash | Fire Smasher: Blazing Strike (tier-scaling freeze-cinematic) |
| **Gold Samurai Ranger** (Light) | 1160·165·92/84/94 | Barracuda katana chain, light slash-wave projectile, **Mega Mode** tier-swap | Barracuda Blade: Light Finale (tier-scaling freeze-cinematic) |
| *All three also share* | | **Morpher Call-In** team special — see §Systems | |

### DC (3)
| Char | HP·EN·A/D/S | Signature kit | Ultimate |
|---|---|---|---|
| **Flash** | 1020·100·80/74/**99** | Speed Rush rekka, Spin/Tornado whirls; glass-cannon speedster | Flash Time (opponent time-slow buff) |
| **Batman** | 1080·100·86/88/92 | batarangs, gadgets, cape | The Dark Knight (batarang-barrage freeze-cinematic) |
| **Superman** | **1450**·200·**100**/92/88 | Heat Vision, Flying Punch, Solar Flare / Kryptonian Overload mode-toggles, flight | Solar Overload (freeze-cinematic detonation) |

### Others
| Char (universe) | HP·EN·A/D/S | Signature kit | Ultimate |
|---|---|---|---|
| **Omni-Man** (Invincible) | 1400·200·98/88/90 | toggleable **Flight** replacing jump, Viltrumite Beatdown rekka | Viltrumite Onslaught (flying body-slam cinematic) |
| **Rick** (Rick & Morty) | 1050·160·82/78/80 | portal-gun zoning/gadgets, portal-behind teleport | Self-Destruct |
| **Saiki** (Saiki K) | 1050·180·84/84/90 | psychic projectile zoner, teleport | Giant Bomb Throw (delayed screen-filling explosion) |
| **Ben 10** (Ben 10) | 1250·100·90/85/* | **Omnitrix transform device** — human + **XLR8 / Diamondhead / Feedback** art-backed forms (+ large procedural alien pool); deliberate per-slot transform. *Speed uses `mkAlien`'s own small scale (each form carries its own speed), not the 80–99 anime scale.* | Omnitrix Overload / per-form (XLR8 Sonic Blitz · Diamondhead Crystal Storm) |
| **Albedo** (Ben 10) | *shares Ben's kit* | Ben's clone — same alien roster via **Ultimatrix**; spriteless (procedural "Negative" red identity) | shared alien ultimates |

---

## 2. Cross-cutting systems & mechanics

### Transformation / tier systems
- **Vegeta-style tier-swap** (`_skinAnim` swaps every move's sheet to the form tier, multipliers re-applied
  per frame): Vegeta (base→SSJ→Blue), **Samurai Red & Gold Mega Mode**, Goku Black (base→SSG→Rose→Blue).
- **Buff-mode forms** (overlay + stat multipliers + drain→auto-revert, no sheet swap): Killua Godspeed,
  Hisoka Overdrive, Gon Adult Form, Flash Time, Superman Solar Flare / Overload.
- **Giant/creature forms:** Sasuke & Itachi Susanoo, Netero Guanyin, Naruto Kurama Avatar, Minato Kurama.
- **Ben 10 Omnitrix:** deliberate per-slot transform (Charge + direction → a specific alien), data-driven
  `BEN10_SLOT_COMBOS`; art-backed forms are XLR8/Diamondhead/Feedback + Ben-human.
- **Recolor-transformation pilot** (Goku Black SSG/Blue): a new tier built by *recoloring the base sprite's
  hair* rather than sourcing new art — viable only when the tier shares the base silhouette. Neck/skin-bleed
  was audited at the pixel level and closed (`NECK_MARGIN=0`).

### Freeze-cinematic ultimates
A shared "freeze contract" (combat/physics/input paused, guaranteed sure-hit at the strike beat, held block
chips to 25%). Members: Vegeta Final Flash, Beerus Ki Ball, Batman Dark Knight, Superman Solar Overload,
Omni-Man Onslaught, Rengoku Flame Explosion, Shinobu Butterfly Dance, Samurai Red/Gold, Killua/Flash
(time-slow), Goku Black Sword, plus the Susanoo/Guanyin/Kurama giants. **Effective-damage band ≈ 300–380**
(Kurama TBB 600 is the ceiling). A `_kuramaHide` flag suppresses the real body when a cinematic draws its
own, preventing the "two instances" glitch (swept game-wide — clean).

### Edo Tensei (Tobirama)
Pre-match **vessel pick** (a `SELECT_EDO_BACKUP` detour lets you choose ANY built roster char). The ultimate
plays a full frozen cinematic (seals → giant coffin rise → vessel reveal), then does an **in-place body-swap**
into the vessel's complete kit for a timed window — including a **nested ultimate-within-the-ultimate** (the
vessel can cast its own ult, its cinematic plays, the timer pauses). Reverts cleanly. The two-vessel
double-render window was found and fixed (`_kuramaHide` during [SWAP, CLOSE)).

### Skill Hunter (Chrollo)
Gated on landing 3 distinct opponent moves. The ultimate plays a swap cinematic (purple robe-swirl, a
ctx-primitive FX — no second body) then makes Chrollo a **live full copy of the opponent** for 30s (their
kit + a purple runtime tint), auto-reverting on a fixed timer.

### Morpher Call-In (Power Rangers team special — NEW)
A roster-wide team mechanic on every Ranger. **Pre-match** you pick a partner Ranger (a `SELECT_CALLIN_PARTNER`
detour, dynamic exclude-self list — a future Ranger auto-joins). In-match, **Special + Ultimate** together
deploys the partner: they dash in (Zenitsu-Double-Attack choreography), perform **their own real Ultimate**
against the opponent (Red/Gold play their freeze-cinematic; Omega its live-hitbox strike — via the existing
`triggerUltimate` dispatch, so it scales to any Ranger), then vanish. **Balance:** deploying ultimate-tier
damage through a special-tier cost is intentionally throttled by `CALLIN_DAMAGE_MULT` (default **0.55**,
live-tunable in Training Mode via `[` / `]`) + a 10s cooldown + base-tier-only partners.

### Domains, summons, chains
- **Domains:** Gojo Unlimited Void, Sukuna Malevolent Shrine (fullscreen screen-space, auto-slashes).
- **Summons/clones:** Naruto/Minato shadow clones (clone-combo tiers), Megumi shikigami, Zenitsu Double
  Attack assists.
- **Command chains:** the shared "Toji-Rekka" pattern (Fwd+Heavy opener → re-tap on hit → cancel into next
  stage) — Toji, Omni-Man, Superman, both Samurai Rangers, Minato, Killua, etc.

### Selection screens
Canvas card grids with **scroll** (wheel / trackpad / draggable scrollbar), rolled out to every char grid
(main select, Edo vessel pick, Morpher Call-In partner, FFA/team) via one shared `getCharacterCardRects`
path; non-overflowing grids (Omnitrix loadout = 3 art aliens, FFA slot/team assign) correctly need none.
FFA supports up to 4 players + **team mode** (A/B, uneven splits).

### Skins
Per-region **recolor pipeline** (`recolor_palette` / per-char `gen_*` tools, capture-masks-from-original,
line-art floor guard). 26 chars have skin sets. Several ship **procedural match-time overlays** drawn on a
near-black "void" recolor: Rick Void starfield, Superman Phantom Zone tendrils, Rengoku Void Ember, Shinobu
Night Moth, Gold Samurai **Voidwalker** gold-spark. Per-skin voice overrides exist (Gojo `gojo2`, Reverse-Flash).

### Voice
Per-character voice modules (intro / cast / taunt / hit-react / low-health / win pools), single-voice-channel
per character (a newer line stops the previous), lines play to natural completion. Namecall announcement in
the round-1 intro. Many chars voiced; Goku/Vegeta/Megumi/Toji/Ben10 intentionally silent.

### Height reference
`spriteScale = 0.623 × canon_height_cm / measured_idle_content_px` — a reusable methodology that sizes every
character to its **canon height** instead of "looks right next to the last one built." Re-audited game-wide;
Rengoku (2.25→1.94) and Shinobu (2.25→1.73) corrected in the latest pass. Cape/aura-inflated or shared-scale
cases (Superman, Ben forms) are flagged, not force-corrected.

### Cache-busting
A permanent import-map content-hash stamp (`tools/stamp_version.mjs` + serve + pre-commit hook) busts stale
ES-module caching locally *and* on GitHub Pages deploy-lag — the fix for the recurring "old code still
running" bug.

### Training / debug
Training Mode overlay: Infinite HP/EN [F3], Dummy behavior [F4], Reset [F2], and live **Call-In Mult** [`[`
/ `]`]. Session persistence (localStorage) restores selections/toggles across reload behind `?session=1`.

---

## 3. Balance notes
- **`GLOBAL_DAMAGE_SCALE = 0.60`** scales melee/projectile/summon damage; **manual-subtract ultimates run
  RAW** (unscaled) — the single biggest systemic factor (cinematic ults hit ~1.67× harder per point than
  scaled kit). Documented in `BALANCE_AUDIT.md`.
- Deliberate stat-record outliers, all canon-justified: Superman (HP 1450 / Atk 100 / Def 92), Omni-Man /
  Ben 10 / Toji / Sukuna durability, Shinobu (HP 960 floor), Flash/Minato/Toji (Spd 98–99 ceiling).
- Cooldown-gated (EN 0) kits — Toji (free), Zenitsu/Rengoku/Shinobu (real-time recast windows) — are a
  distinct currency model from meter chars.

## 4. Testing
~192 Playwright harness scripts (`npm run test:*`; `tools/run_all_tests.mjs` runs them with bounded
concurrency). **Run timing-sensitive harnesses serially** — heavy concurrency causes false negatives. Latest
full pass (2026-08-01): 188 green, 4 pre-existing/stale fails (2 goku-black tests behind the new tier ladder,
`beta-toggle` fixture on a deleted Sukuna skin, `beta-mode-rosters`), 0 new regressions.

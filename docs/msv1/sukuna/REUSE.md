# MSV1-SUKUNA — Phase 0: audit and reuse

New fighter **`sukuna_shinjuku`** ("Ryomen Sukuna", select tag "Shinjuku Arc"). The old **`sukuna`** is the reference.
He is not edited, renamed or rebalanced, and his frame data is diffed to ZERO every phase (`harness/sukuna_shinjuku_framedata.mjs`).

## 1. The old Sukuna (`sukuna`), as it stands at the start commit

| Item | Where | Value |
|---|---|---|
| Health / meter | characters.js `sukuna` | HP 1240, maxEnergy 210 (cursed energy; the engine's super meter) |
| Grab | engine generic throw | unchanged |
| Movement tech | game.js:11940 `executeSukunaMalevolentDash` | double-tap toward, 80 dmg, 48 f cd (the kit text still says "Forward + Special, 20", which is stale) |
| Neutral Special | abilities.js `executeSukunaSpecial` | **Cleave** 40 energy, 160 dmg, startup 10 |
| ↓← + Special | same | **Dismantle**, ranged slash projectile, 35 energy, 140 dmg, speed 13 |
| → + Special | same | **Flame Arrow (Fuga)**, 35 energy, 140 dmg, speed 11, short charge strip |
| ↓ + Special | same | Cursed Slash (auto-target), 30 energy |
| Ultimate | abilities.js:3879 `executeSukunaUltimate` | **Malevolent Shrine** (see §2) |
| Sounds | sound.js / sukunaVoice.js | `sukuna_slash.mp3` (Cleave / Dismantle cue), voice pools `intro / taunt / offense / cast / castCleave / castFlame / castDomain / hitReact / lowHealth / win` via `pickSukunaVoice`, JA default and EN switchable |
| Win voice | game.js:10709 | `pickSukunaVoice('win')` when the winner's rosterKey is `sukuna` |
| Kit | kits.js:988 | text only |

### Inputs (P1 keyboard / P2 keyboard / pad)
Light J / 1 / Square · Heavy K / 2 / Triangle · Up-Attack I / 3 · Special L / 4 / R1 · Ultimate U / 5 / R2 · Grab L1 · Charge L2 · Block Circle · Jump Cross.
The new Sukuna keeps the **same inputs for every technique he shares**: neutral Special = Cleave, ↓← + Special = Dismantle, → + Special = Fuga, Ultimate = Malevolent Shrine.
His new techniques use inputs the old one does not use for anything else on this fighter: ↓↓ + Special Spiderweb, ↓↓ + Charge Amplification, ↓↓ + Ultimate World-Cutting Slash.
The brief's motion notations are kept as alternatives in the move list: ↓↘→+S → Dismantle, →+S close → Cleave, ←↙↓↘→+S → Fuga.
Where the brief's input clashes with the old Sukuna's, the old input wins, as the brief requires. See COMBOS.md for the full input table.

## 2. The old ultimate — Malevolent Shrine (copied, never edited)

| Step | Value |
|---|---|
| Input | Ultimate, needs a FULL meter (`spendFullBarForDomain`: energy ≥ maxEnergy, drained to 0) |
| Domain | `activateDomain(f, { cost: 0, duration: 15, range: 1e5 })` covers the whole map, 15 s |
| Cast | attackCooldown `getAttackDuration(44)`, hand-sign strip `_spriteCastMove "domain"` for 40 f, camera focus |
| Cooldown | universal `ULTIMATE_COOLDOWN_FRAMES` 1200 (20 s) |
| Background / audio | domains.js `rosterKey === "sukuna"` branches: shrine background, incantation voice (`castDomain`) + `Sukuna_Theme.mp3` loop; the stage music is restored on collapse |
| Sure hit | foe in range: `domainUntouchable = true`, hitstun 4, no drift; an auto slash every **130 f** for **14** (alternating Cleave / Dismantle flash) through `applyScaledDamage` |
| Freeze | the foe can't act; manual melee is refused (`domainUntouchable`); Fuga (a projectile) still connects |

**How it is copied:** the new Sukuna calls the same `activateDomain` with `domainKey: 'sukuna'`. Gojo Shinjuku's phase-5 domains.js hook already exists (`rosterKey: options.domainKey || ...`).
That makes `domain.rosterKey === 'sukuna'`, so every old Shrine branch runs unchanged: background, theme, slashes and untouchable foe. Nothing in domains.js or abilities.js changes.
The cast pose uses this sheet's R6 hand-sign frames (`domainCast`).

## 3. Systems reused (not rebuilt)

| System | Used for |
|---|---|
| combat.js `startMove` frameExact path + `getComboScale` | every move of his (normals are engine melee, techniques use the same move start) |
| `applyScaledDamage` (W.damage) | every technique hit, so all damage-level defences apply (Infinity included) |
| super meter (`energy` / `maxEnergy`) | technique costs, the World Slash's 2 bars (200), the Shrine's full meter |
| text bubbles (Gojo Shinjuku's render bubble pattern) | intro "Know your place.", win lines, the World Slash chant captions |
| hitstop / camera | `hitstop` on each strike; Shrine cast via the domain's own flash and shake |
| projectiles (`activeProjectiles`) + limitless.js `isSuperProjectile` | Dismantle cuts destroy non-super projectiles they meet |
| Sanji's burn rule (sanjiState.js) | Fuga burn: 3 dmg every 20 f for 2 s, refreshes, never stacks. Sanji's burn is private to `f._sanji`, so the rule is copied, not shared |
| elements.js (`createField / addPatch / tickField / applyPatchEffects / reactionFor`) | Fuga's FIRE patch. Fire on a foreign ICE patch triggers the registered fire+ice reaction (thermalBurst + water + steam) |
| ninja.js traps (`_ninja.traps`), Enoch patches / ice discs (`_enoch.field`), Sanji's Concasse patch | Spiderweb clears them in its span (through the world's `patches()` / `removePatch`) |
| blood system + `tools/bloodmap` | `data/bloodmaps/sukuna_shinjuku.json` |
| Edo skin generator (`tools/edoskin`) | his Edo Tensei premade skin eligibility |
| skin system (skins.js, cosmetic `animationData` swap) + the Alien X palette | 20 premade skins (tools/sukunaskins) |
| gojo_shinjuku / limitless.js | domain clash (his Shrine vs Unlimited Void, loser burnout 5 s) and **CANON BYPASSES**. The `bypass()` block in gojoShinjukuState.js gains one gated line: Domain Amplification (every hit while active) and World-Cutting Slash pass Infinity at every level. The clash winner reopens HIS Shrine (`domainKey 'sukuna'`) |
| Gojo Shinjuku architecture | command layer + sim state on `f._sks` + combat hooks + idempotent `apply_hooks.py` |

## 4. Existing Cleave / Dismantle / Fuga code

They live inside the old Sukuna's `executeSukunaSpecial` as `triggerSpecial` branches bound to his rosterKey.
They are **not** reused as code: they would change his frame data and use the old projectile shape.
The new fighter's techniques are fresh sim-owned volumes with the brief's numbers. Sounds and voice pools are shared.

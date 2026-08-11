# Combo-String Standardization — Audit & Proposed Template (Step 1–3)

**Status:** REVIEW GATE. This document is the Step-1 audit + Step-2 proposal. **No input mapping has been changed.** Executing any remap is blocked on sign-off of the template + direction below.

---

## 0. How normal-attack input actually works today (the architecture)

Three layers produce every "combo string" in the game:

1. **Base normals (universal, `characters.js → basic_attacks`).** Resolved by `combat.js updateCombat` → `startMove`. Keys: `light`, `heavy`, `upAttack`, `airAttack`, `downAir`, (rare `air_heavy`).
   - **`updateCombat` starts exactly ONE move per press.** There is **no native Light→Light or Light→Heavy chaining** in the base path. After any normal ends, `attackCooldown = 10` — a second press is a *fresh, separate poke*, not a linked cancel.
   - The **one universal cancel route** is the **Up-Attack launcher → jump-cancel → air normal → `down_air` spike** (`physics.moveFighter` reads `currentAttack.launcher && hasHit`). This is roster-wide and consistent.

2. **Command-normal REKKA chains (per-character, `abilities.js → updateXCommandCombat`).** This is where *all* linked ground strings live. A directional+button **opener** queues `_rekkaNext`; a fresh button **edge during recovery** advances the chain via the shared `combat.js rekkaContinue` / `cancelWindowOpen` gate. ~34 of ~53 playable entries have one; ~19 have none.

3. **Shared timing constants (global).** `INPUT_BUFFER_FRAMES = 7` (~117 ms) for every buffered action, every character (`input.js`). Default rekka cancel window = the **entire recovery phase**. Combo decay (`COMBO_DAMAGE_CURVE`, `COMBO_HITSTUN_CURVE`) and step-in momentum (`physics.attackMomentumFriction = 0.90`, combo-flow Stage 4) are also global.

> **The single biggest inconsistency:** the in-game movelists (`kits.js`) advertise `"Light, Light, Heavy, Special"` bread-and-butters for nearly everyone — but the engine only *links* via the directional rekka. For the ~19 no-rekka characters, "Light, Light, Heavy" is three **separate, cooldown-gapped, individually-punishable pokes**, not a true combo. The docs teach a string most of the roster can't actually execute as written.

---

## 1. AUDIT — Base normals (`basic_attacks`)

**Common template** (shared by the DBZ/JJK "balanced" cluster — goku, vegeta, frieza, gojo, goku_black, and close variants): `light` ≈ dmg 45 / startup 4 / rec 10 · `heavy` ≈ 85 / 8 / 18 · `upAttack` = launcher (launchVy −8) · `airAttack` present · `downAir` = spike. Archetype clusters (Cell heavy, Flash/Batman speed, Demon-Slayer fast-startup, Omni-Man 120-dmg heavy) shift the numbers but keep the **same 5-slot shape**.

**Completeness gaps (missing core slots):**

| Character | Missing | Note |
|---|---|---|
| samurai_red / gold / green ranger | light, upAttack, airAttack, downAir | Stage-1 partials — only `heavy` defined; rely on `RANGER_BASICS` spread + Fwd+Heavy rekka |
| omega_ranger | upAttack, airAttack, downAir | Sword/kick rekka carries the kit |
| rick | downAir | Intentional ("no art exists") |
| zaraki | airAttack, downAir | Brute; Shikai form is where the chain lives |
| madara, pain | downAir → replaced by `air_heavy` | Deliberate (Susanoo hand / Deva air-slam) |
| nezuko | (adds `air_heavy`) | Extra, not a gap |

## 2. AUDIT — Command-normal REKKA chains (~34 entries)

**Dominant pattern (≈22 drivers):** **Forward + Heavy** opener → **2–4 stages** linked by `rekkaNext` → **Heavy-edge** re-tap during recovery → **`requireHit: true`** (whiff/block ends the string) → **launcher or heavy-category finisher**. Members: vegeta, ben10 (form-gated), omega (kick string), samurai ×3, omniman, chrollo, batman, superman, zenitsu, rengoku, shinobu, inosuke, maki, miwa, ichigo, obito, pain, tobirama, minato, saiki (projectile-gated hit).

**Cluster deviation — Down+Heavy opener (6):** netero, killua, hisoka, flash, gon, ghostface. Same everything else (Heavy re-tap, requireHit:true, launcher/heavy finisher) — only the **opener direction differs**. The combo-flow audit already had to bolt a "step-in glide" onto Down chains because holding Down kills the forward walk (they read "planted"; Fwd chains drift +126px/chain for free).

**Structural exceptions (genuinely different, likely to PRESERVE):**

| Char | What's different | Keep as exception? |
|---|---|---|
| **Maki** | `_cancelWindowFrames = 5` — the ONLY tightened link window (Heavenly-Vow power tradeoff) | ✅ Confirmed deliberate |
| **Madara** | No chain — single `madaraSusanooPunch`; 7-special scope kit | ✅ Confirmed deliberate (BALANCE_AUDIT) |
| **Sasuke** | No strike chain — Grab = Skeletal Grab (command grab) | ✅ Deliberate (Uchiha grab tier) |
| **Zaraki** | Base = single pokes; **Shikai** = 4-stage rekka on **Light OR Heavy** edge; dual roster entry | ✅ Confirmed deliberate |
| **Toji** | Blade stance: **Light-edge** re-tap, **`requireHit: false`** (links on timing even if blocked) | ✅ Stance identity |
| **Nezuko** | Finisher advanced by **Special-edge**, not Heavy; Fwd/Down+Heavy are single directionals | ⚠️ Review — button divergence |
| **Omega** | Dual string: Heavy=3-stage kick **+** Light=**7-stage** sword string | ⚠️ Review — 7 is long/odd |
| **Rengoku** | Dual-tier: normal Heavy chain **+** Special-button "super" branch finishers; separate air chain | ⚠️ Review — intentional but unique |
| **Ben10** | Opener/chain swaps per active alien form | ✅ Form-gated by design |

## 3. AUDIT — No command chain at all (~19 entries)

goku, goku_black, piccolo, frieza, cell, gojo, megumi, sukuna, omololu, yuji, naruto, itachi, tobi, rick, morty, evilMorty, rickPrime, beerus, albedo.

Their entire ground game is: single Light, single Heavy, Up-Attack launcher (→ air combo), air normal, down_air. Several are clearly **intended zoners/setup** (rick, rickPrime, evilMorty, beerus, gojo, megumi — `kits.js` combos start with a *special*, not a normal). Others are just **un-built** (naruto, sukuna, yuji, itachi, goku) and inherit the "Light,Light,Heavy" doc string they can't link.

## 4. AUDIT — Confirmed deliberate exceptions (preserve unconditionally)

- **(a) Maki** tight cancel window — `combat.js:362-370`. ✅
- **(b) Madara** 7-special scope exception — `BALANCE_AUDIT.md:107`. ✅
- **(c) Zaraki** dual-form Base/Shikai (two roster entries) — `combat.js:1304`. ✅
- **(d) Combo-flow Stage-4 momentum** (global) + Tobirama Fwd+Heavy glide / Down-chain "planted" tuning — `physics.js:24-27`, `abilities.js:~5733`. ✅ (Global knob — do not disturb.)

---

## 5. PROPOSAL — the standard "combo grammar"

A single, learnable grammar every **non-exception** character conforms to:

**Universal chassis (already roster-wide — keep, just fill gaps):**
- `Light` = fast poke · `Heavy` = slow high-knockback poke.
- `Up-Attack` = launcher → **jump-cancel → air normal → `down_air` spike**. This is the roster-wide air-combo route and stays the one true universal cancel.

**Standard ground string (normalize the rekka to ONE shape):**
- **Opener = Forward + Heavy** (canonical). Convert the 6 Down+Heavy openers (netero, killua, hisoka, flash, gon, ghostface) to Forward+Heavy; free up Down+Heavy for real lows/specials only.
- **Continuation = re-tap Heavy** on a fresh edge during recovery.
- **Shape = 3 stages:** opener → mid → **launcher finisher** (jump-cancelable into the universal air combo). `requireHit: true` (cancel-on-hit).
- Standardize finisher weight: default finisher **launches** (feeds the air combo); "heavy-category, no launch" finishers (maki, shinobu, inosuke, netero, ghostface, tobirama, nezuko) become deliberate, documented picks — not silent drift.

**Docs:** rewrite `kits.js` movelists to teach the **actual** executable string per character (opener direction + re-tap button + finisher), instead of the uniform-but-false `"Light, Light, Heavy, Special"`.

**Preserve as exceptions:** Maki (tight window), Madara (single punch), Sasuke (grab), Zaraki (dual-form/dual-button Shikai), Toji (stance timing-link), Ben10 (form-gated), Rengoku (super-branch), Omega (dual/sword) — and the intentional no-rekka **zoners** (rick, rickPrime, evilMorty, beerus, gojo, megumi).

---

## 6. The decision this needs before execution

The proposal above normalizes the *existing rekka model*. There is a second, larger option that matches the literal "Light→Light→Heavy into a launcher" phrasing but is a real engine change:

- **Direction A — Normalize the rekka (recommended, contained):** keep the engine; unify opener=Fwd+Heavy / re-tap=Heavy / 3-stage / launcher-finisher across the 34; grant or bless the 19; fix docs. No base-path rewrite.
- **Direction B — Add a native "magic series" (bigger):** make `Light → Light → Heavy` natively cancel *roster-wide* in `updateCombat` (a true auto-combo like the docs claim), sitting alongside/above the directional rekka. Closest to the MK/"learnable" ideal, but touches the shared base path and interacts with all 34 drivers.

**Sub-decisions regardless of direction:**
1. Down+Heavy openers → convert to Forward+Heavy? (6 chars)
2. The 19 no-rekka chars → give the standard chain, or formally bless zoners as exceptions and only build the un-built ones (naruto/sukuna/yuji/itachi/goku)?
3. Finisher weight → default-launcher, with heavy-no-launch as an opt-in exception?

---

## 7. LOCKED DECISIONS (signed off — review gate cleared)

- **Direction A — Normalize the rekka.** Keep the engine; unify the 34 rekka chars; no base-path magic-series rewrite.
- **No-rekka chars — bless zoners, build the rest.** Mark rick, rickPrime, evilMorty, beerus, gojo, megumi as intentional **no-rekka zoner/setup** exceptions. Grant the standard Fwd+Heavy launcher rekka only to the **un-built melee** chars: **naruto, sukuna, yuji, itachi, goku** (+ goku_black, piccolo, cell, frieza, tobi, morty, albedo, omololu → confirm each is melee-intent, not zoner, during Stage 1).
- **Down+Heavy → Forward+Heavy.** Convert all 6 (netero, killua, hisoka, flash, gon, ghostface) to Forward+Heavy openers; keep Down+Heavy free for real lows/specials.

## 8. CONCRETE EXECUTION PLAN (staged — each stage self-tests before the next)

**Canonical target grammar** (the "in-band" definition every non-exception char is measured against):
`Forward+Heavy` opener → re-tap `Heavy` (fresh edge, during recovery) → **3 stages** → **launcher finisher** (jump-cancelable into the universal air combo) → `requireHit: true`.

- **Stage A — Codify the standard. ✅ DONE (`test:combo-standard` 91/0).** NEW `comboStandard.js` = single source of truth: `COMBO_STANDARD` canonical grammar + `REKKA` (34 entries classified conforms/deviates-opener/deviates-finisher/exception) + `NO_REKKA` (zoner/unbuilt/review buckets) + `EXPECTED_COUNTS`. NEW `harness/combo_standard_audit.mjs` (npm `test:combo-standard`): verifies registry↔roster partition (53/53, disjoint), every driver exists in `abilities.js`, each `srcRequireHit` entry's `requireHit` literal matches source (incl. Toji `false`), the 6 Down+Heavy targets carry a `.down` gate, baseline counts, and exception notes — then prints the Stage B/C/D worklist. NO input mapping changed; siblings green (cancel-window 17/0, combo-decay 18/0, up-attack-roster 79/0).
- **Stage B — Opener normalization. ✅ DONE (`test:combo-stage-b` 26/0; `test:combo-standard` 110/0).** Converted the Down+Heavy openers → Forward+Heavy in `abilities.js` (added the house `forward` idiom to each driver; kept `COMBO_STEP_IN_VX` as a deterministic step-in, re-pointed its doc). **CORRECTION: the real Down+Heavy set was 8, not 6 — the audit had mislabeled Batman & Zenitsu as Fwd+Heavy; source gated on Down.** All 8 converted: netero, killua, hisoka, flash, gon, batman, zenitsu, ghostface. NEW `harness/combo_stage_b.test.mjs` drives the real drivers proving each opens on Fwd+Heavy, no longer on Down+Heavy, and is facing-relative (Superman control unaffected). Updated the 7 per-char Puppeteer suites' chain-opener input (`s`→`d`) + `combo_momentum_audit.mjs` rows. Registry: killua/hisoka/flash/gon → conforms; **netero + ghostface have heavy-no-launch finishers → moved to Stage C** (deviates-finisher now 5, conforms 20, deviates-opener 0). Regressions green: batman 33/0, gon 37/0, hisoka 39/0, killua 24/0, netero 38/0, zenitsu 53/0, ghostface 18/0; flash 23/6 (6 fails PRE-EXISTING Flash-Time/block WIP, unrelated).
- **Stage C — Finisher weight pass. ✅ DONE (`test:combo-stage-c` 20/0; `test:combo-standard` 120/0).** Converted the 5 heavy-no-launch finishers → launchers by replacing `category: "heavy"` with `launcher: true` on the finisher move-def (netero `down_attck_2`, ghostface `ghostfaceCombo3`, shinobu `shinobuG3`, inosuke `inosukeB5`, tobirama `tobiComboFin` — also flipped its knockbackY +4→−4 since it was a downward slam). `createAttackFromMove` already propagates `md.launcher → attack.launcher` (no fire-fn edits needed); `HITSTOP.launcher === HITSTOP.heavy` so no impact-freeze change. NEW `harness/combo_stage_c.test.mjs` drives each chain to its finisher and proves the finisher launches the dummy straight up (−26 floor, vx 0) via the universal launcher path. Audit §5b source-guards each finisher declares `launcher: true`. Maki stays a heavy-ender **exception** (tight-window tradeoff). Counts: conforms 20→25, deviates-finisher 5→0. Regressions green: shinobu 35/0, inosuke 39/0, netero 38/0, ghostface 18/0; tobirama 29/2 (both fails PRE-EXISTING guard/block-sheet WIP — `never observed: guard`, unrelated; chain + finisher-launch proven).
- **Stage D — Build the un-built melee chars. ✅ DONE (`test:combo-stage-d` 41/0; `test:combo-standard` 124/0).** ⚠️ **MAJOR DISCOVERY: the Stage-1 audit missed a SECOND combo grammar.** `abilities.js updateStandardStringCombat` is a SHARED (non-per-char, so the driver sweep never saw it) dial-a-combo giving 6 "single-poke" chars (goku/gojo/sukuna/naruto/megumi/rick) a **Light→Light→Heavy(→launcher)** magic series + heavy→special cancel, reusing each char's own `basic_attacks` (art-free), tested by `stage2b_strings.test.mjs`. This is the codebase's actual "STANDARD COMBO STRING" (MK-feel Stage 2b/2c) — and it's exactly the template this whole effort described at the start. **Correction:** naruto/sukuna/goku were NOT un-built, and gojo/megumi/rick were NOT no-combo zoners — all 6 had this string. **Decision (signed off):** roll the SAME string out to all 8 genuinely-un-built melee chars — `itachi, yuji, goku_black, cell, tobi, morty, albedo, omololu` — by adding them to `STANDARD_STRING_CHARS` (one edit, no drivers, no art; all 8 have `light`+`upAttack`). Registry restructured into two grammars: **rekka (34)** + **standard-string (14 = 6 built-in + 8 added)** + **true zoners (5: rickPrime/evilMorty/beerus/piccolo/frieza)** = 53. NEW `harness/combo_stage_d.test.mjs` proves each of the 8 gets L→L→H→launcher (vy −26) + L,L,H cap + whiff-interrupt (zoner control inert). Audit §3b source-guards the registry's standard-string set === live `STANDARD_STRING_CHARS`. Regressions green: yuji 39/0, tobi 34/0, goku-black 40/0, basickit 17/0, stage2b-strings 42/0 (original 6 untouched), up-attack-roster/cancel-window/combo-decay green.
- **Stage E — Base-normal completeness. ✅ DONE (`test:combo-standard` 128/0).** ⚠️ **The Stage-1 "gaps" were an audit artifact** — it didn't resolve the `...RANGER_BASICS` spread. Verified against the resolved roster: **all 53 characters resolve the CORE normals (light/heavy/upAttack)** — the launcher gates the roster-wide air combo, so nothing to fabricate. The samurai rangers AND omega_ranger inherit all 6 normals from `RANGER_BASICS`; the only air-normal absences are 3 **intentional** cases: rick (downAir — "no art"), zaraki + zaraki_shikai (air/downAir — brute by design). madara/pain use `air_heavy` in the down slot (present → not flagged). Added `CORE_NORMALS`/`AIR_NORMALS`/`BASE_NORMAL_EXCEPTIONS` + `hasNormal()` to `comboStandard.js` and audit §6b: asserts core normals are universal, flags any *undocumented* air-gap, and verifies each documented exception is REAL (not stale). No gameplay change — a completeness guard.
- **Stage F — Move-List docs. ✅ DONE (`test:combo-standard` 129/0).** Made `kits.js` teach the REAL grammar per character. Root fix: the `getKit()` FALLBACK (shown for the ~33 kit-less chars — most of them rekka) hard-coded a false "Light, Light, Heavy, Special"; replaced it with NEW `comboStringFor(rosterKey)` which reads `comboStandard.classify()` and emits the right bread-and-butter per grammar — rekka → "Forward + Heavy, Heavy, Heavy" (grab/single-punch variants for sasuke/madara), standard-string → "Light, Light, Heavy" + "Heavy, Special", zoner → special-based pressure. Fixed 4 explicit kits with false claims: vegeta + zenitsu (rekka → Fwd+Heavy chain), piccolo + frieza (zoner → zoning pressure), and added the L,L,H string to rick's kit (it's standard-string but only taught portals). NEW audit §F guards every char's displayed kit combo matches its grammar (rekka not taught light-strings — except the Toji/Shikai light-openers; zoners not taught L,L,H; standard-string chars DO show a light string) — 53/53. `kits.js` now imports `comboStandard.js` (pure ESM data, no cycle).
- **Stage G — Balance + regression sweep. ✅ DONE = PROJECT COMPLETE.** Balance note appended to `BALANCE_AUDIT.md` (2026-08-10): verdict **standardization toward parity, not power-creep** — no per-move damage changed; the only deltas (Stage C ×5 launcher finishers, Stage D ×8 new strings) equalize under-equipped melee chars to the roster's existing combo/juggle baseline, all in-band under the shared decay/−26-launch/cancel systems. Regression sweep green: full combo suite (standard 129/0, stage-b 26/0, stage-c 20/0, stage-d 41/0, stage2b-strings 42/0, cancel-window 17/0, combo-decay 18/0, up-attack-roster 79/0); preserved **exceptions intact** (maki 30/0 — tight window, madara 44/0, sasuke/susanoo 26/0, zaraki 81/1*); unaffected rekka (vegeta 72/0, pain 42/0, miwa 25/0, superman 27/0, ichigo 31/1*); affected chars (batman/gon/hisoka/killua/netero/zenitsu/ghostface/shinobu/inosuke green, yuji 39/0, tobi 34/0, goku-black 40/0). **All `*` failures PRE-EXISTING WIP on this branch, unrelated to combo work** (flash ×6 Flash-Time/block migration; tobirama ×2 + zaraki/ichigo ×1 = guard/block-sheet + 404 asset loads — my diff touches no assets and no guard/block code).

---

## PROJECT COMPLETE (Stages A–G)

The roster's combo strings are standardized around **two codified grammars**, verified end-to-end:
- **Rekka (Fwd+Heavy) — 34 chars:** uniform opener (Forward+Heavy) / re-tap (Heavy) / launcher finisher / cancel-on-hit; 9 documented exceptions preserved.
- **Standard-string (Light,Light,Heavy→launcher) — 14 chars:** the shared dial-a-combo, now rolled out to every un-built melee char.
- **True zoners — 5 chars:** single-poke by design (no combo string).

Single source of truth = `comboStandard.js`; guarded by `harness/combo_standard_audit.mjs` (129 checks: partition, source cross-checks for driver/requireHit/opener/finisher/standard-string-roster, base-normal completeness, and Move-List grammar accuracy) + behavioral proofs `combo_stage_b/c/d.test.mjs`. Move List (`kits.js`) teaches the real grammar per char. Uncommitted on branch `combo-flow-layer`.

**Preserved exceptions (never remapped):** Maki tight window · Madara single-punch/7-special · Sasuke grab · Zaraki dual-form/dual-button Shikai · Toji stance timing-link (`requireHit:false`, Light-edge) · Nezuko special-edge finisher (review in Stage C) · Omega dual/7-hit sword · Rengoku super-branch · Ben10 form-gated · the 6 no-rekka zoners.

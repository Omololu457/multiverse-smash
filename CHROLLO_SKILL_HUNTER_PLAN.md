# SKILL HUNTER — Stage 4 architecture investigation + Stage 5 plan

## STATUS: BUILT (Stages 5-6 complete). See "LOCKED decisions" for the shipped tuning.
> Files: chrolloSkillHunterCinematic.js (NEW) · abilities.js (applySkillHunter/revertSkillHunter/
> updateSkillHunter/endSkillHunterWindow/executeChrolloUltimate + case "chrollo") · combat.js
> (trackSkillHunterUnlock + 2 hit-site calls) · characters.js (chSkillHunterCast + ultimate meta) ·
> sprite.js (MOVE_TO_ACTION) · game.js (per-frame driver, freeze gate, draw, ult-press intercept,
> round-reset, harness hooks, _sprDrawCount). Tests: chrollo.test.mjs 35/35, chrollo_stage5 19/19.
> One shipped nuance: the Ultimate button during the copy FIRES the stolen ultimate if it can, else
> reverts ("re-press Ultimate" both uses their ult AND ends it; 30s timer is the backstop).



## Verdict: FEASIBLE, and LESS risky than the brief feared

The brief worried Skill Hunter is "a genuinely new capability, more complex than Edo
Tensei." The investigation shows the **opposite**: the hard part — swapping another roster
character's ENTIRE kit onto a live fighter instance and reverting cleanly — **already
exists, is battle-tested, and ships with passing tests** (Tobirama's Edo Tensei). Skill
Hunter is a *variation of the trigger and vessel source*, not a new engine capability.

## The proven capability (Edo Tensei, abilities.js:7164-7267)

`applyEdoTensei(fighter, vesselKey)` does, at runtime, mid-match:
- Backs up the fighter's own fields into `_edoStash` (EDO_SWAP_FIELDS = rosterKey, name,
  color, basic_attacks, animationData, spriteScale, traits, ultimate, dashTeleport,
  runWhenAdvancing, introPool, maxEnergy, energyType).
- Overwrites those fields from `characters[vesselKey]` (the SAME global character-def object
  used at match setup — `characters[opponentRosterKey]` is exactly the shape we need).
- Because `fighter.rosterKey` becomes the vessel's key, **`triggerSpecial`/`triggerUltimate`
  switch on it and dispatch to the vessel's REAL handlers** — the copied moveset, specials,
  AND the vessel's own ultimate ("nested ultimate") all work with zero per-move wiring.
- Sprites: `spritesReady(rosterKey)` + `getSpriteSheets(rosterKey)` read the vessel's sheets
  from the globally pre-loaded manifest; the sprite handler resets frame counters on sheet
  change. For Skill Hunter this is even safer than Edo Tensei — **the opponent is already in
  the match, so their sheets are guaranteed loaded (no delay, no missing-sheet risk).**
- `revertEdoTensei` restores `_edoStash`, and `_edoCleanseVesselState` wipes any copied
  form/buff flags (Susanoo/Godspeed/SSJ/giant `_canvasHeightFrac`/multipliers) BEFORE
  restore — the exact template for a clean revert with no residual state.

## The 3 deltas Skill Hunter needs (all small)

1. **Vessel source = the live opponent, not a pre-match pick.** Edo Tensei reads a
   pre-selected `_edoBackup`; Skill Hunter reads the opponent via `getOpponent(fighter)` and
   looks up `characters[opponentKey]`. **No vessel-select UI needed** (simpler than Edo).
2. **Unlock gate = 3 distinct opponent moves landed** (new substrate, below) — Edo Tensei has
   no such gate (it triggers on meter alone).
3. **End condition = fixed timer + manual early-end**, and **NO reanim palette** (Chrollo
   becomes a normal-colored copy, so we skip Edo's `_recolorTag="reanim"` step). Edo uses a
   per-frame energy drain; we use a fixed countdown plus a manual-revert input.

## Distinct-move tracking (new, ~15 lines)

- Hook the confirmed-clean-hit site **combat.js:1715** (right after `attacker.comboCounter++`).
  Move identity is available as `attacker.currentAttack.name` / `attacker.currentMove`.
- Hook the projectile connect site **combat.js resolveProjectileHitsMulti (~2013/2046)**;
  identity = `proj.name`.
- On a hit landing on Chrollo from the opponent: `chrollo._shMovesSeen ??= new Set();
  chrollo._shMovesSeen.add(moveName)`. When `size >= 3` → `chrollo._shUnlocked = true`.
  A Set dedups, so the SAME move 3× does not unlock; 3 DIFFERENT moves do.
- Attribution is free: `resolveAttackHit(attacker, defender)` — defender===chrollo,
  attacker===opponent (1v1). Reset the Set + unlock on round start.

## Activation / revert flow (Stage 5)

1. `triggerUltimate` → `case "chrollo": executeChrolloUltimate`. Gate on
   `fighter._shUnlocked` AND `spendEnergy(100)`. If not unlocked → no-op (HUD hint).
2. Play a **freeze-cinematic** (clone the freeze pattern; art = chrollo_ultimate_1 book
   windup → ultimate_2/3 purple cloak/robe swirl). At the swap beat, call
   `applySkillHunter(fighter, opponentKey)` (a Chrollo-owned sibling of applyEdoTensei —
   reuses EDO_SWAP_FIELDS + the cleanse/clear helpers, but no reanim, no dummy).
3. Copied form is live: opponent's normals/specials/ultimate all usable via rosterKey
   dispatch. Fixed `_shTimer` counts down; a **manual early-end input** (re-press Ultimate,
   or Down+Charge) calls `revertSkillHunter` immediately. On timeout OR manual end → revert +
   cleanse → Chrollo restored with his own kit, zero residual state.

## Build decision: PARALLEL, not a refactor of Edo Tensei

Write Chrollo-owned `applySkillHunter` / `revertSkillHunter` / `chrolloSkillHunterCinematic.js`
that REUSE the `EDO_SWAP_FIELDS` constant and mirror the cleanse/clear helpers, but keep
Tobirama's functions untouched. Rationale: isolation (no Edo Tensei regression — it has a
passing test suite), and Skill Hunter's differences (opponent-as-vessel, no reanim, fixed
timer+manual-end) are cleaner as their own path than as flags threaded through Edo's code.

## Edge cases / risks to handle in Stage 5 (none blocking)

- **Mirror match (opponent is Chrollo):** copying "chrollo" is a pointless no-op → disallow
  activation (or allow as a harmless self-copy). Recommend: block + HUD hint.
- **Opponent currently transformed** (Edo-Tobirama-as-vessel / Ben10 alien / Mahoraga / a
  giant ultimate form): `opponent.rosterKey` may be a transient form. Recommend copying the
  opponent's **base selected character** (`matchConfig.<side>CharKey`) for stability, and
  guard against activating while the opponent is mid-cinematic/giant. (Tuning decision.)
- **Duplicate-render bug class** (project-wide): the transformation cinematic must never show
  two bodies (Chrollo + copy) — Edo Tensei hit exactly this and fixed it with a hide flag.
  Stage 6 will explicitly test the "two instances" symptom (per the brief).
- **HP shared** (Chrollo's bar carries into the copied form); **energy**: spend 100 to
  activate, then run the copied form on a working bar so its kit is usable (tuning).
- **AI**: AI can satisfy the unlock + energy gate; motion-input specials may actuate as their
  neutral variant (known AI-directionHistory limitation) — acceptable, flag as future.

## LOCKED decisions (user, Stage 4 STOP)

- **Duration: 30 seconds** (`_shTimer = 30 * 60 = 1800` frames) auto-revert.
- **Copy target: EVERYTHING the opponent can do** — copy the opponent's BASE selected
  character (`matchConfig.<side>CharKey`, stable) AND include their transformation system so
  the stolen kit is truly complete: normals, specials, their OWN ultimate, AND their forms/
  transformations (e.g. Chrollo-as-Goku can SSJ, Chrollo-as-Megumi can summon Mahoraga). This
  means the Chrollo swap must copy `transformations` + `transformationOrder` too (NOT in
  Edo's EDO_SWAP_FIELDS — add them to the Chrollo swap list), and reset `currentForm`/
  `transformIndex` to the base form on entry so forms escalate correctly.
- **Unlock: CONSUME + RE-EARN** — each activation spends `_shUnlocked`; the opponent must land
  3 NEW distinct moves (clear + refill `_shMovesSeen`) to unlock again.
- **Manual early-end: RE-PRESS ULTIMATE** during the copied form → immediate revert.

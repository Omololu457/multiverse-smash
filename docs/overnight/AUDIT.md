# PHASE 0 — ARCHITECTURE AUDIT

Read-only survey feeding every later phase. All refs are `file:line` at time of audit (may drift
slightly under concurrent work — re-grep the symbol name). Compiled from 4 parallel audits.

---

## 1. SCREENS / ROUTING

- **`GAME_STATES`** enum — `game.js:~1550` (47 states): START, MAIN_MENU, TUTORIAL, ACCOUNT, SETTINGS,
  CREDITS, MOVE_LIST, SELECT_UNIVERSE/CHARACTER/SKIN/ALIENS/EDO_BACKUP/STAGE, BATTLE, INTRO, PAUSED,
  VICTORY, ROUND_BREAK, MATCH_END, GAMEPLAY_SELECT, AI_DIFFICULTY, AI_VS_AI_SETUP/SUMMARY,
  ARCADE_SETUP/RIVAL_INTRO/ENDING, STORY_MODE/INTRO, CUTSCENE, FFA_SETUP/CHARSELECT/SLOTSELECT/TEAMSELECT/BATTLE,
  BRACKET_SETUP/VIEW, TOWER_SELECT, ONLINE_MENU/HOST/JOIN/PLACEHOLDER, MUSIC_LIBRARY, PROFILE, CODEX,
  ACADEMY/ACADEMY_CHAR, THEMES, CONTROLS_HELP, **COMBO_TRIALS** (already present).
- **Main loop** — `game.js:~22393` `gameLoop()` → fixed 60Hz accumulator → `updateCurrentState()` (`~22114`,
  big `switch(gameState)` @ `~22158`) → `renderCurrentState()` (`~21013`, parallel `switch`).
- **Add a screen:** (1) `GAME_STATES.X`, (2) update-case, (3) render-case, (4) `drawX()`, (5) nav wiring
  (keydown handlers ~`22446`+ / menu-click dispatch). **Use the Phase-6 shared menu component for new screens.**

## 2. SETTINGS STORE

- **`juiceSettings.js`** — singleton, localStorage, tolerant `_get(key,def)` / `_set(key,val)` (try/catch).
  `LS_KEYS` @ `~19`. Existing keys: `ms_juice_shake` (off/low/full), `ms_juice_reduce_flash`, `ms_juice_slowmo`,
  `ms_juice_particles` (low/full), `ms_hitfeel` (off/low/full), `ms_hitfeel_dmgnum`, `ms_hitfeel_finisher`,
  `ms_hitsound_p1/p2` (NOT LAN-synced), `ms_atmosphere`.
- **Add a setting:** key in `LS_KEYS` → property seeded via `_get` → `set/toggle/cycle` method → wire a row in
  `drawSettingsScreen` (`game.js:~21025`, row-based scrollable, scrollKey `"settings"`, keyboard+gamepad) →
  read `juiceSettings.X` in consumers.
- **Audio settings** live separately in `sound.js` `getSettings()/applySettings()` (sfxVolume, musicVolume,
  mutes, menuPlaylistOrder), persisted in the account save schema (`game.js:~3935`).
- **Account/profile persistence:** `account.js` 3-tier (in-mem source-of-truth + localStorage + optional File
  System Access API). `SAVE_VERSION=6`, key `"multiverse-smash-save"`. Snapshot decorator refreshes derived fields.

## 3. INPUT PIPELINE (critical for Phase 4)

- **`input.js`**: `getFighterInput(fighter)` (`~512`) once/frame; `readRawControls` (`~585`) /
  `writeRawControls` (`~593`); global `keys` map.
- **Buffering ALREADY EXISTS:** `INPUT_BUFFER_FRAMES = 10` (`input.js:27`, ~167ms) — **invariant: must stay ≥
  `attackCooldown` (10f, combat.js:3780)** or re-presses drop. Per-player `PLAYER_BUFFERS` (p1..p4, fields
  light/heavy/upAttack/ultimate/dash/jump/special), `updateBuffer` decrements, `clearInputBuffers` on reset.
- **TWO motion systems:**
  - `motionInput.js` — **Naruto-universe ONLY** (13 chars), qcf/qcb/dp/hcf/hcb/cloneSummon/doubleQcf, 700–1000ms
    windows, 1 stray allowed, `motionHistory` (24 tokens), `detectMotion(f,name)`.
  - `abilities.js:~363` — `getRelativeDirections` over `directionHistory` (`{dir,time}`, ~700ms
    `COMMAND_INPUT_MAX_AGE`), facing-relative F/B, `endsWithPattern`. Used by the non-Naruto directional specials
    (e.g. Sasuke qcf Lightning).
- **Actionability gate:** `combat.js:~2965` startMove blocked by `attacking || hitstun>0 || attackCooldown>0`.
- **Determinism/LAN/replay:** replay & LAN both drive fighters via `writeRawControls` from a 14-bit mask
  (`REPLAY_INPUT_FIELDS`). Frame clock `_replayFrame` (`game.js:~2795`). **Any Phase-4 leniency MUST be computed
  identically on all peers (no wall-clock, no gameRng) — derive from buffered frame counts only.**
- Keyboard maps `game.js:~1612`: P1 WASD+JKILOU;  P2 arrows+numpad  P3/P4 synthetic (controller-only).
  Gamepad `input.js:~68` PS5_MAP.

## 4. CPU AI (critical for Phase 7)

- **`ai.js`**: tiers `dummy/easy/adaptive/impossible` (profile objects, ~13 scalar fields:
  reactionFrames, attackChance, heavyChance, blockChance, zoningChance, stringChance, adaptStrength, …).
  `getAIInput`→`updateAIController` (`~1149`), `choosePlan` (`~765`), `chooseAttackAction` (`~988`).
  Attached: `setAIDifficulty(p2AI, matchConfig.aiDifficulty)` + `applyAiTemplate` (`game.js:~4613`).
- **Randomness IS deterministic:** all rolls via `gameRng.next()` (mulberry32, seeded per match) — good.
- **`aiTemplates.js`**: 6 archetypes (rushdown/zoner/counter/bruiser/trickster/turtle) mapped per-char via
  `CHARACTER_TEMPLATE_OVERRIDES` + `deriveTemplate` (from `characters.js` archetypes). Generic/kit-derived. ✅
- **⚠ Per-character AI code EXISTS:** `choosePlan` has Gojo-only (`~788`) + Sukuna-only (`~799`) signature
  branches, and `SIGNATURE_MOTIONS`/`applySignatureMotion` (`ai.js:~139`) injects motions into `directionHistory`.
  **Phase 7 rule = "no per-character code" → extend the GENERIC template/kit path only; leave the existing Gojo/
  Sukuna signature layer as-is (don't expand it), and REPORT it.** Map Easy/Normal/Hard onto tiers (Normal ≈
  `adaptive` = current default; verify & report before renaming).

## 5. TRAINING MODE (Phase 8 extends)

- `trainingState` `game.js:~3893` `{enabled, infiniteResources, dummyBehavior, cloneNoTell, lastAdvantage}`.
  `DUMMY_BEHAVIORS = ["stand","block","jump","combo"]`. `updateTrainingMode` (`~16440`, F2 reset / F3 infinite /
  F4 dummy / F6 clone-tell). Dummy input applied `game.js:~7087`.
- Already has: infinite HP/EN, combo counter, **frame-advantage** (`~19528`), **frame data**
  `buildTrainingFrameData` (`~19544`, startup/active/recovery from `currentAttack`; `getAttackPhase`
  `combat.js:~436`), **hitbox/hurtbox draw** `drawTrainingCollisionBoxes` (`ui.js:~3895`) + `getAttackHitbox`
  (`combat.js:~635`), overlay `drawTrainingOverlay` (`ui.js:~4811`).
- **To add (Phase 8):** last-12-input display w/ frame counts, on-hit/on-block advantage lines, more dummy modes
  (block-after-first, counter-after-block, random-via-hash), RECORD/PLAYBACK (reuse replay mask encoding),
  reset-position hotkey, hitbox toggle. All Training-only, default off.
- Academy (`academy.js`) is a separate structured-lesson system (sets training flags during drills).

## 6. AUDIO (Phase 5 mixer)

- **`sound.js`** (~1459 lines): `SoundManager`, single `_master` gain + submixes `_musicGain`, `_juiceBus`,
  plus HTMLAudioElements `_musicFile`/`_intenseFile`. **No per-category buses yet.**
- Play paths: procedural SFX `play(id)`→`_master`; voice/cue `playSfxFile` (new Audio, `VOICE_VOLUME_MULT`
  per char); music `playMusic`(procedural)/`playMusicFile`(mp3); sampled `playJuiceSfx`→`_juiceBus`.
- **Ducking exists:** music ducks under voice (`MUSIC_DUCK_FACTOR 0.35`, ref-counted `_duckBegin/_duckEnd`);
  juice ducks under ult-boom (`_juiceDuck`).
- Volume: `setVolume(sfx,music)`, `setSfxMuted/setMusicMuted`, `getSettings/applySettings`.
- **To add (Phase 5):** Master/Music/SFX/Voices/Interface/Ambience gain multipliers; route each existing play
  path to the right bus (build a routing table); "mute when window unfocused"; Test Sound per slider. Keep the
  existing voice/juice ducking.

## 7. STAGES / MUSIC (Phase 12)

- **`STAGE_DEFS`** `game.js:~1800` (17 stages): name, series, landmark, music(override), sky/mid/floor/accent,
  backgroundImage?, hazards?, worldWidth?, ffa?. Finalized w/ groundOffset/floorHeight + resolved music.
- Render `drawBattleBackground` (`ui.js:~3319`): gradient → image/landmarks → **ambient** → atmosphere → label.
- **Ambient EXISTS:** `_ambientClouds` (`ui.js:~2947`), per-stage params, wall-clock (non-sim). `drawStageAtmosphere`
  (`ui.js:~3449`, mood-grade + 3 parallax fog layers, gated by `ms_atmosphere`). **Phase 12 extends with more
  ambient types + a data table + Low/Off; never hide fighters/HUD.**
- Music: `SERIES_MUSIC` (`game.js:~1731`, 15 series), `SERIES_INTENSE_MUSIC` (`~1762`, low-HP/final), per-stage
  `music` override (`~1801`). **103 TRACKED .mp3** in repo. Menu playlist `musicLibrary.js` (default/personalized/
  custom, key `"multiverse-smash-music"`). **Phase 12: use only tracked mp3; assign per-stage by mood; report.**
  ⚠ **Untracked `music/` dir exists — NEVER touch/read/stage it.**

## 8. REPLAYS / DETERMINISM (Phase 13 — mostly exists)

- **`replay.js`**: `startRecording(meta)`/`recordInputs(f,p1,p2)`/`finishRecording()`; 14-bit delta masks;
  state checkpoints every `HASH_INTERVAL=60` (x,y,health,energy); `REPLAY_VERSION=1`, `BALANCE_STAMP="mk-conv-1a"`.
  Playback: `startPlayback`/`playbackMaskAt`/`playbackCheckState` (desync frame). Meta = seed,roster,skins,stage,mode,rounds.
- **Sim is deterministic:** mulberry32 `gameRng` seeded `reseedRng(matchSeed)` (`game.js:~5299`); `makeSeed()` via
  Date.now. **gameRng scope = AI + Kamui only; voice/visual FX use Math.random (fine — visual, not sim).** So a
  match IS re-simulatable from (seed, roster, stage, input masks). **Phase 13: add a Replays SCREEN + storage of
  last 5 + checksum-verified playback + Watch controls (pause/0.5x/2x/skip) + export/import; photo mode in pause.**

## 9. SAVES / UNLOCKS (Phase 11, 14 — REPORT/reuse only)

- `account.js` persistence (above). Stats/progression via `progression.js`.
- **`unlocks.js` `UNLOCK_CONDITIONS`** (`~25`): 44 chars. Starters goku/gojo/naruto/ichigo/killua/superman;
  level-gated (8), arcade-clear-as-X (6), tower-tier (4), arcade-boss (3). Context `{level,dev,beta,arcadeCleared,
  towerTiers,arcadeAny}`. char `unlockedBy` override. **DO NOT change which characters are locked. Phase 11 adds
  COSMETIC unlocks only (HUD frames, titles, borders) via stats.**

## 10. LAN / COMPANION (Phase 3, 15)

- **`net/`**: `netMatch.js` (game-facing singleton, no-op when inactive), `lanSession.js` (delay-lockstep,
  `INPUT_DELAY=2`, `canAdvance` gate), `protocol.js` (HELLO/WELCOME/REJECT/MATCH_SETUP/INPUT/…), `lanCode.js`
  (Crockford join code).
- **`buildStamp()` `protocol.js:~41` = `r{REPLAY_VERSION}.b{BALANCE_STAMP}.p{PROTOCOL_VERSION}` — ALREADY
  exchanged on HELLO/WELCOME; mismatch REFUSES.** So Phase 3's version check is PARTLY done. **Phase 3 adds:
  (a) title-corner build-version display, (b) a ROSTER HASH in the handshake (not currently sent) with a clear
  mismatch message naming both versions, (c) the global error log + safe-fallback screen.**
- **No companion/second-screen feature exists.** The "multi-screen" QA = the LAN two-page harness
  (`net_online.test.mjs`, host page + client page). Phase-15 "companion screens" → run/verify that. **Report:
  there is nothing to break because the feature doesn't exist; don't invent one.**

## 11. TESTS / HARNESS

- Gates: `npm run test:determinism` (14/0 baseline), `npm run test:combo-standard` (**225/9 pre-existing**),
  `npm run test:roster-integrity` (pass). 1000+ `test:*` scripts.
- Harness: Playwright → local http server → `index.html?harness=1&p1=&p2=` → `window.__harness` (`game.js:~23087`:
  `.boot()`, `.skipToBattle()`, `.aiVsAi.step(n)` synchronous stepping, `.rng`, `.replay`, `.net`, `.online`,
  `.p1()/.p2()`, `.state()`). Render check = boot + skipToBattle + assert both fighters + HUD render + 0 pageerrors.

---

## DECISIONS / FLAGS FOR LATER PHASES
- **Phase 4 (input leniency):** a 10f buffer already exists → EXTEND carefully, keep ≥ attackCooldown, derive
  all leniency from frame counts (deterministic), run real-keystroke harnesses; SKIP if combo-standard/determinism move.
- **Phase 7 (AI):** map Easy/Normal/Hard onto existing tiers (Normal≈adaptive); stay generic/kit-driven; do NOT
  expand the Gojo/Sukuna per-character signature code (report it).
- **Phase 13 (replays):** feasible — extend `replay.js`; add screen + storage + verify-checksum + photo mode.
- **Phase 3 / 15 (companion):** no second-screen feature exists → report, don't invent; use LAN two-page harness.

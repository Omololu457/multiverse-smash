# MSV1-STORY — Phase 0 audit

Start commit: see `START_COMMIT.txt` (496e56699). Script: `docs/story/STORY_SCRIPT.md` (saved verbatim from the owner's paste, 1,473 displayable lines).

## 1. The existing (old) story mode

| piece | where it was | state at HEAD |
|---|---|---|
| Story Mode MVP + chapter map | `story.js`, `storyProgress.js` (commit 13329e4a0, ed3114fe4) | **deleted** in the sync commit 57ec13262 (2026-11-25) |
| THE NEXUS FRACTURE cutscene data | `nexusFracture.js` (516c8648b … 32f01f0da) | **deleted** in 57ec13262 |
| TTS voice for cutscenes | `nexusVoice.js` + `nexus_voice/*.m4a` (aa72b0110) | **deleted** in 57ec13262 |
| cutscene engine (`GAME_STATES.CUTSCENE`) | game.js | **gone** from game.js (no CUTSCENE state, no story menu entry) |
| tests | `harness/story_mode.test.mjs`, `story_live`, `nexus_*` | **deleted** in 57ec13262 |

The main menu / mode select at HEAD has **no** Story entry (`ui.js _MODE_TILES`: Training, VS, 2 Player, Arcade, Tower, FFA, AI vs AI, Back).
The only remnant is a comment in `ui.js drawRivalIntroScreen` ("Story Mode reuses this screen").

**Decision:** the old story mode is not deleted *by this build*; it was already removed from the tree by an earlier sync commit.
To honour "it moves behind a Legacy entry or stays in its file unused", Phase 2 restores its four source files from 57ec13262^ into
`legacy/story/` **unused** (not imported, no menu entry): the cutscene engine it needed no longer exists in game.js, so it
cannot run behind a menu entry without resurrecting deleted engine code.

## 2. Systems to reuse

| need | existing system | notes |
|---|---|---|
| ladder of CPU fights, health carry, continue, ending | **Arcade** (`arcade.js` + game.js `startArcade / applyArcadeFight / _beginArcadeFight / updateArcadeOutcome / continueArcade`) and **Tower** (`towerState`) | the story engine is modelled on these: `matchConfig.mode = "story"`, opponent / stage / difficulty forced onto `matchConfig` per bout, `_applyCarry` one-shot health carry in `resetRound` |
| picking the player fighter (incl. squads / variants / skins / Ben aliens) | universe → character → skin select (`beginUniverseSelect`, `_proceedAfterSkin`) | Arcade branches out in `_proceedAfterSkin(p1)`; story does the same |
| single-KO bouts | `_checkMatchOver` `bossFight` rule (one round decides) | story adds the same rule for `mode === "story"` |
| match end → result | `_checkMatchOver` (sets `victoryState`) → `_enterVictoryScreen()` | story intercepts `_enterVictoryScreen` and goes to its own scene instead of the generic victory screen |
| dialogue with portraits | `ui.js drawRivalIntroScreen` (two busts + lines), `getPortraitImage` (characters[key].portrait) | not exported; the story UI loads the same portrait files (`characters[key].portrait`) itself in `storyUI.js` |
| credits roll | `GAME_STATES.CREDITS` → `drawCreditsState()` (auto-scroll, `credits.js` CREDITS + SOURCED_ART + artist lines) | story opens the same screen after its credits narration and returns to the story menu; it cannot be left before the roll reaches the bottom |
| mid-match backdrop switching | `stageLayers.js` Multiverse Roulette (`code_random`): draws another layered map with `orDrawOther` / `drawLayeredStageBack`, render-only, circular wipe | story's second-map switch draws the second stage through the same `drawBattleBackground → drawLayeredStageBack` path with a short cross-fade; physics/platforms stay the first stage's (render-only) |
| CPU difficulty | `ai.js` keys `easy / adaptive / impossible / master` | story maps encounter number → key (see REPORT) |
| saves | `account.js` persistence + guest localStorage (`progression.js`) — arcade/tower clears live on the account | story keeps its own small JSON record under a dedicated localStorage key (per account id or guest), validated on load; corrupt → clean start |
| replays | `replay.startRecording` in `startMatch` for every recorded match (seed + roster + stage + inputs) | story bouts are normal vs-CPU matches → recorded like any match; dialogue is outside the match |
| mirror | `applyMirrorTint` (red wash on a same-character P2) | story also gives the mirror opponent an alternate skin (first non-default skin) and the label "Rift Mirror" |
| bosses | `matchConfig.p2IsBoss` → `_applyBossProfile` (2× HP etc. from `bossProfile`) | **not used** by story (it would change fighter stats); story BOSS = banner + a harder CPU only |

## 3. Stages (35)

`game.js STAGE_DEFS` names, exactly the 35 the script names: Jujutsu High Courtyard, Shibuya Incident, Hidden Leaf Village, Sunagakure,
Forest of Death, Valley of the End, Planet Namek, World Tournament Arena, Infinity Castle, Asakusa, Mugen Train, Citadel of Ricks,
Bellwood, Null Void, Soul Society, Woodsboro, Yorknew City, Heaven's Arena, Viltrumite Warzone, Angel Grove, Command Center,
PK Academy, Analysis Nexus, The Originals, Multiverse Roulette, Shadow Garden, Harbor Dock, Training Center, The Batcave, Krypton,
Arlong Park, The Baratie, Queens Alley, Stark Lab, Battle Royale Colosseum. Stage objects are looked up by `name`.

## 4. Roster

`characters.js`: 179 keys, **110 selectable** (not `hidden`) = the 110 ENDINGS entries. Select-screen groups = `characters[k].universe`
(21 universes). Squads (mmpr_rangers, spd_rangers, dinothunder, ns_squad, ninja_storm_rangers, ninja_storm_cgpt) are single roster
keys that already field the whole team; the "team slot" is just that key. Portraits: `characters[k].portrait`. Skins: `skins.js getSkins(key)`.
Every speaker in the script (Omololu, Dseyl, Enoch, Genos, Gwen, Isshiki …) is a roster key with a portrait.

## 5. Tests / checks

Baseline run on clean HEAD: `BASELINE.txt`. RENDER CHECK = a Playwright boot of the real game (pattern of `harness/msv1_render.mjs`),
plus the story-specific `harness/msv1_story_render.mjs` added in Phase 3. Frame-data diff: `harness/msv1_story_framedata_diff.mjs`.

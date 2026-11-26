# MSV1-STORY REPORT

Story mode "Multiverse Smash · The Other End of the Line", rebuilt from `docs/story/STORY_SCRIPT.md` (the source of truth; no line rewritten, shortened or "improved").

**Start commit:** `496e56699529852f0bfa99dcbaebc5b5a7b306ec` (`START_COMMIT.txt`).
Phase commits: P0 `e62aef6a5` (script, audit, baseline) · P1 `c2be9d3f0` (parser + data) · P2 `8baf171c1` (campaign engine) · P3 (tests, screenshots, report).

## Old story mode — fate

The old story mode (Story Mode MVP chapter map + THE NEXUS FRACTURE cutscenes) **had already been deleted from the tree** before this build, by sync commit `57ec13262` (2026-11-25). That commit removed `story.js`, `storyProgress.js`, `nexusFracture.js`, `nexusVoice.js`, `nexus_voice/*`, the `GAME_STATES.CUTSCENE` engine and its tests.
This build **restored its four source files, unused, into `legacy/story/`** (see `legacy/story/README.md`). They are not imported, have **no "Legacy Story" menu entry**, and are not tested. They can't run behind a menu entry because the cutscene engine they needed is gone from `game.js`.

## Real counts (parser-verified; `tools/story/build_story_data.js` exits 1 on any mismatch)

| item | count |
|---|---|
| encounters | 36 (+ 1 secret, S1 vs Saitama) |
| relay bouts in a full campaign | 114 |
| rivals | 83 |
| templates | 45 |
| intros / endings | 110 / 110 (= the 110 selectable fighters) |
| Isshiki speech / personal addresses | 6 / 9 |
| credits narration | 6 |
| displayable lines checked | 1,473 |

## Mappings

- **Key fixes:** none needed. Every fighter key in the script is a roster key, so `KEY_MAP = {}`.
- **Map fixes:** none needed. Every map name is a `STAGE_DEFS` name, so `MAP_MAP = {}`.
- **Franchises:** taken from the select-screen universe groups, with these overrides:
  - Invincible: Mark Grayson + Omni-Man.
  - The Boys: Homelander + Soldier Boy.
  - Power Rangers: Krybot + every Ranger.
  - Full table in `DATA_REPORT.md`.
- **Stage directions** are lifted out of the text as engine directives (never shown): `ISSHIKI_SPEECH`, `ISSHIKI_DEFEAT`, `ENDING_CREDITS`, `ISSHIKI_HALF`. On line 1033, only the narration part is shown.

## Lines over 140 characters

**None.** The longest line is 115 characters. Nothing was edited.

## Relay value

`STORY_RELAY_RECOVERY = 0.20` (one constant in `storyEngine.js`).
- After each relay win: `carry = min(1, health% + 0.20)`. It is applied once, at the next opponent's `resetRound` (the same mechanism Arcade uses).
- A loss restarts the whole encounter at full health.
- Replays store the carry (`storyCarry` in the replay header), so a relay bout replays from the same health.

## Half-health caption method (fight 36)

1. **Detection.** A per-frame tick at the top of `updateBattle` (`_storyTickCues`) only **reads** Isshiki's health. The first frame he is at ≤ 50 %, it sets a **render-only latch** (`storyFx.midCueFired`). The simulation never reads it.
2. **Drawing.** The line is drawn by `_drawStoryCaptionLayer` as the **top layer of the battle frame** (portrait + name), above any cinematic. It fades in, holds about 5 s and fades out.
3. **Effect on the fight.** It **does not pause**, freeze or change the fight.
4. **When it plays.** Once per attempt; a retry re-arms it.
5. **Why it isn't tied to the HUD.** The first version drew it with the HUD. A master-CPU Isshiki chains cinematic specials that hide the HUD for many seconds, so the cue could be missed.

The second-map switch (17, 21, 29) uses the same read-only tick:
- It fires when the **final** opponent reaches 50 %.
- The second stage then cross-fades in over 650 ms, through the existing `drawBattleBackground` / `drawLayeredStageFront` path.
- It is render-only: physics and platforms stay the first map's.
- The script's second-map text line plays as the caption.

## Difficulty mapping (existing CPU system, `ai.js` keys)

| encounters | CPU |
|---|---|
| 01 (tutorial, control-hint overlay) | easy |
| 02–09 | easy |
| 10–21 | adaptive |
| 22–35 | impossible |
| BOSS = one step harder | 05 / 09 adaptive · 13 / 17 / 21 impossible · 25 / 29 / 33 master |
| 36 (FINAL BOSS) | master |
| S1 vs Saitama | master |

A BOSS is the red banner + the harder CPU only. `bossProfile` / `p2IsBoss` is **not** used, because it changes fighter stats.

## Unused maps

**None.** All 35 stages are used at least once.

## How it plays (summary)

**Menu:** STORY tile → pick any fighter (team slots fight as their squad; any skin) → Continue / New Campaign / S1 (once unlocked) / Text Speed / Change Fighter / Back.

**Running order:**
- The Intro plays once, before fight 01.
- First encounter of an Act: Act card + Opening.
- Every encounter: card (BOSS / FINAL BOSS banner) → Before.
- Each opponent: entrance lines → fight → winner's line.
- After the last opponent: After → Scene → Closing.
- After 35: the 6-line speech, then the personal address (if any), then the 36 Before.
- After 36: defeat line → After → Closing → personal Ending (4) → CREDITS narration (6) → the existing credits roll.
- The credits roll can't be left before it ends; holding confirm speeds it up. The first clear unlocks S1.

**Entrance dialogue priority:**
1. Before (first opponent only).
2. Rival (2 lines; works in either order; always plays).
3. Template (3 lines, in the listed franchise order, spoken by the real fighters; each franchise pair at most once per encounter).
4. Nothing.

**Mirror:** "Rift Mirror" label, an alternate skin chosen by hash (no `Math.random`), and the existing mirror tint. No rival or template lines.

**Loss:** the opponent's winning line (rival bouts), then RETRY ENCOUNTER / STORY MENU.

**Silent fighters (Nezuko, Jason, Krybot):**
- Their own lines are italic and never voiced.
- Their template lines show unsigned on a teal "RIFT DISPLAY".
- `[Telepathy]` keeps its label.

**Dialogue UI:**
- Select-screen portrait (team portrait for squads) + name plate. Off-match speakers get portraits too. Narration uses a neutral box with no portrait.
- Typewriter text: confirm finishes the line or advances; hold speeds up.
- 4 text speeds.
- Skip Scene needs two presses within 2.5 s. It never skips the credits narration or roll.
- Text wraps at any size (checked at 640×360, 1280×720 and 1920×1080).

**Saves:**
- Stored in localStorage `msv1_story_save_v1`: per browser, not per account.
- Per fighter: highest cleared, checkpoint, ending seen, intro seen, clears.
- Global: secret unlocked / seen / cleared, campaigns cleared, text speed.
- A save that is corrupt, the wrong version or has bad fields gives a clean start.

**State split:**
- Gameplay state (`storyState`): encounter, opponent index, checkpoint, carry.
- Render-only (`storyUi` / `storyFx`): dialogue, fades, captions, cross-fade.

## Honest notes / limits

- **Voice-over (added after P3).** Every spoken line has an AI voice, cast per character (see `VOICE.md`). Silent fighters, `[stage directions]` and rift-display lines stay unvoiced. The story menu has VOICE: ON/OFF.
- **Normal match extras stay on.** Each bout keeps the fighters' own entrance cinematics, victory finishers and the normal XP / unlock toasts (story bouts count as matches).
- **Credits screen wording.** The credits screen keeps its own "BACK" button and "click BACK to return" hint. During the story they only speed the roll up, they don't leave it. The mouse wheel can also scroll it forward.
- **Second map is visual only.** Fighters keep the first map's floor and walls.

## Tests — baseline vs final

| suite | baseline (clean HEAD) | final |
|---|---|---|
| determinism | 14 / 0 | 14 / 0 |
| combo-standard | 235 / 9 | 235 / 9 (same 9 by name) |
| up-attack-roster | 77 / 2 | 77 / 2 (same: superman, ghostface) |
| credits | 11 / 3 | 11 / 3 (same 3) |
| roster-integrity | verified | verified |
| replay-playback | 8 / 1 (FATAL waitFrames timeout) | 8 / 1 (same) |
| net-online | 11 / 0 | 11 / 0 |

New story suites (all `npm run test:story-*`):

| suite | result | what it checks |
|---|---|---|
| `story_data.test.mjs` | **62 / 0** | data counts; the parser re-run reproduces `data/story/story.json` byte for byte; resolver (rival either order, template order, franchise pair once, rival always, mirror, silent → unsigned); steps; difficulty; saves (corrupt / garbage / wrong version / throwing storage) |
| `story_live.test.mjs` | **62 / 0** | headless auto-win of the **whole campaign** (114 bouts) for the team slot `mmpr_rangers`, `gojo_shinjuku` and `nezuko`, through the real match-end path; plus the features in the next table |
| `msv1_story_render.mjs` | **23 / 0** | RENDER CHECK + 21 screenshots, all looked at |
| `msv1_story_framedata_diff.mjs` | **11 / 0** | frame data, stats, traits, animation tables, skins, aliens, parity and Ranger profiles of **all 179 characters** unchanged; roster unchanged; every shared-file hunk story-gated |

What `story_live` checks besides the auto-win:

| area | checks |
|---|---|
| relay | carry is exact (0.5 → 0.7) |
| dialogue | Intro once; 6-line speech + address + defeat line; Ending 4 + credits 6 |
| credits roll | can't be left early (Enter / Esc / Backspace / BACK button) |
| in-fight cues | second map at 17 / 21 / 29; fight 36 half-health caption |
| mirror | alternate skin |
| progress | save; S1 unlock + S1 |
| loss | rival winning line → retry at opponent 1 at full health |
| controls | Skip Scene ×2; text speeds; corrupt save |
| determinism | seeded story relay bout |
| replay | story relay bout with zero desync |

Screenshots (`screenshots/`):

| # | shot | # | shot |
|---|---|---|---|
| 01 | mode select STORY tile | 12 | Isshiki half-health caption over a cinematic |
| 02 | story menu | 13 | final ending |
| 03 | dialogue with portrait | 14 | credits narration |
| 04 | tutorial hints | 15 | credits roll |
| 05 | BOSS banner | 16 | secret entry + unlock line |
| 06 | Rift Mirror | 17 | retry prompt |
| 07 | relay HUD | 18 | silent fighter italic |
| 08 | rival exchange | 19 | unsigned rift display |
| 09 | template exchange | 20 | wrap at 640×360 |
| 10 | second-map switch | 21 | wrap at 1920×1080 |
| 11 | Isshiki speech | | |

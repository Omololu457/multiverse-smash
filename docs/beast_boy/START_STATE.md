# Beast Boy build — start state (2026-11-14)

- Branch: `main`
- HEAD: `5fa3bc8d6e84f217d82ea4f4c237556f61145cb5` (White Ranger: Formation Crane Rise air conversion)
- Source sheet: `Game Boy Advance - Teen Titans - Playable Characters - Beast Boy.png` (untracked; brief named it '...Beast Boy(1).png' — only the un-suffixed file exists), 1193×1254 RGB, sha256 `f261da2b027684cc7b60a43ea2bb239e22f22b20e9c7ae37286bc86a9d567984`, key RGB(77,109,243).
- Existing Beast Boy: none (no `beast_boy`/`beastboy` in any .js before this build).

## Pre-existing worktree changes (NOT mine — concurrent Cyborg + S.P.D. Yellow sessions)

```
 M characters.js
 M combat.js
 M credits.js
 M game.js
 M input.js
 M kits.js
 M skins.js
 M sound.js
 M sprite.js
 M spritesheets.js
?? "Game Boy Advance - Teen Titans - Playable Characters - Beast Boy.png"
?? "Game Boy Advance - Teen Titans - Playable Characters - Cyborg.png"
?? "Game Boy Advance - Teen Titans - Playable Characters - Raven.png"
?? "Game Boy Advance - Teen Titans - Playable Characters - Robin.png"
?? "Game Boy Advance - Teen Titans - Playable Characters - Starfire.png"
?? assets/cyborg/
?? assets/spd_yellow/
?? cyborg.js
?? cyborgData.js
?? cyborgFx.js
?? cyborgHarness.js
?? cyborgKit.js
?? cyborgSkinTable.js
?? cyborgSkins.js
?? cyborgSound.js
?? cyborgSprites.js
?? cyborgState.js
?? docs/beast_boy/
?? docs/cyborg/
?? docs/skins/cyborg/
?? docs/skins/spd_yellow/
?? docs/spd_yellow/
?? harness/cyborg.test.mjs
?? harness/cyborg_boot.mjs
?? harness/cyborg_determinism.mjs
?? harness/cyborg_framedata_diff.mjs
?? harness/cyborg_skins.test.mjs
?? harness/cyborg_visual.mjs
?? harness/spd_yellow.test.mjs
?? harness/spd_yellow_skins.test.mjs
?? harness/spd_yellow_visual.mjs
?? spdYellow.js
?? spdYellowData.js
?? spdYellowFx.js
?? spdYellowHarness.js
?? spdYellowKit.js
?? spdYellowMaterials.js
?? spdYellowSkins.js
?? spdYellowSound.js
?? spdYellowSprites.js
?? spdYellowState.js
?? tools/cyborg/
?? tools/spd_yellow/

 characters.js   |  4 +++
 combat.js       | 11 ++++++++
 credits.js      |  6 +++++
 game.js         | 80 +++++++++++++++++++++++++++++++++++++++++++++++++++++----
 input.js        |  4 +--
 kits.js         |  4 +++
 skins.js        |  4 +++
 sound.js        |  4 +++
 sprite.js       |  3 +++
 spritesheets.js |  2 ++
 10 files changed, 115 insertions(+), 7 deletions(-)
```

Shared-file diff sha256 at start (to detect later foreign edits):
```
680554e50a9a18a9  characters.js
3d820f57b03c8758  combat.js
58a97760f4fb3362  credits.js
74d2a915b3529713  game.js
0f5dd445b79dd643  input.js
e9849c923d665abc  kits.js
31c688e2c046b78b  skins.js
ea6cbfcc44dc4dd9  sound.js
d99b99b6a38b7353  sprite.js
782b7d5bb44fda8c  spritesheets.js
```

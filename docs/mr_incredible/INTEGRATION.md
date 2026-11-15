# Ownership and integration

Owned modules: mrIncredibleData.js, mrIncredibleState.js,
mrIncredibleSprites.js, mrIncredibleSkins.js, mrIncredibleSkinTable.js,
mrIncredibleFx.js, mrIncredibleKit.js, mrIncredibleHarness.js.
Owned directories: assets/mr_incredible/, tools/mr_incredible/,
docs/mr_incredible/. Owned harnesses: harness/mr_incredible*.mjs.

Shared hooks, all scoped to mr_incredible:

- characters.js: import and one roster entry in the existing the_incredibles group.
- spritesheets.js: default idle registration.
- skins.js / kits.js: appearance and move-list registration.
- input.js: existing raw pad allowlist and remote-input suppression; no layout change.
- game.js: tick before movement; unbuffered jump release; command dispatch in
  1v1/FFA; per-fighter appearance refresh; replay checkpoint state; LAN marker;
  KO/round/training/scene cleanup; paired-mirror tint exemption; HUD/world effects;
  test-only accessor under the existing harness gate.
- combat.js: Mr-only hitbox, clean-contact and block bookkeeping hooks.
- physics.js: Mr-only prime multiplier after normal movement-unit conversion.
- abilities.js: no charge/passive ultimate farming while prime is active.
- sprite.js: Mr's form-entry / grab / exact attack / landing action selection.
- comboStandard.js: explicit fresh-light exception and one-character count update;
  existing unrelated classification gaps remain exposed.
- credits.js: Perseus/source attribution.
- updates.TXT / PROJECT_HANDOFF.md: appended status and handoff.

The existing checkout and main branch were retained. No clone, branch, worktree,
stash, reset, clean, force operation, push, merge or deployment occurred. No paths
were staged and no commit was created. The required global combo audit remains
red on unrelated existing failures, so this work is left reviewable in the tree.

Pre-existing modified character/system files and unrelated untracked art/audio/
ratings/music remain in place. naruto_seventh_kcm_jump_uniform.png was not opened
or modified. The two supplied Mr originals remain byte-identical and untracked,
as they were at the start; output assets are derived files in the owned directory.

# Krybot skin ownership

Codex owns `krybotSkins.js`, `tools/krybot/skins/`, `assets/krybot/skins/`, `harness/krybot_skins*`, and `docs/skins/krybot/`. Only appearance integration in `krybotFx.js`, the existing Krybot row/import in `skins.js`, and a narrow additive report in `updates.TXT` are planned. No gameplay, other fighters, audio, renderer infrastructure or launch changes.

Initial checkout: main at b75e05408f8f66f0429f63e6e646afe807e63d29, no staged paths. Gameplay integration is already present and tested in docs/krybot. Existing tracked modifications include its shared registration plus the protected Naruto image. BASELINE.json records status and working hashes; gameplay_baseline.json records all roster frame data before skin work. PROJECT_HANDOFF.md is absent. The available skin guide is ALT_SKIN_MANIFEST.md (targeted/region replacement, no whole-sprite hue filters). Preserve concurrent edits and do not commit shared gameplay work.

Additional minimal appearance integration: one Krybot-only exclusion in game.js applyMirrorTint, preserving native palettes on both fighters and their squad instead of the existing automatic red P2 wash. No generic renderer or gameplay behavior changes.

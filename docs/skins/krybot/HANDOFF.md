# Krybot skins handoff

Four appearances are implemented and render in matches:

| Selector name | Stable ID | Source/version |
| --- | --- | --- |
| Default — Plug & Play | `default` | Escape of the Five Fugitives supplied Plug & Play art, original pixels |
| Television Palette | `krybot_tv` | Power Rangers S.P.D. (2005) ordinary Krybot, palette adaptation |
| Super Legends DS | `krybot_super_legends_ds` | Power Rangers: Super Legends (Nintendo DS, 2007) regular finish, palette adaptation |
| Super Legends DS Red | `krybot_super_legends_ds_red` | Same DS game's red ordinary-model enemy, palette adaptation |

Select **Play → VS MATCH (choose difficulty) or 2 PLAYER → Power Rangers → Krybot → one of the four appearance cards**, then select player two and a stage. All skins are available at level 0. Back/confirm behavior and configured controls remain the existing project's. Both slots can independently choose any appearance. No extra unlock, combat mode, skin-dependent ability or voice pack is needed.

The three alternatives cover all 30 body action/reaction strips, select portraits, Covering Unit and both Troobian Crossfire participants. Original energy/explosions remain unchanged. TV materials and DS colors are adapted into supplied geometry; DS blades, proportions and separate panel shapes are not claimed. The selector's shorter names avoid overflowing its existing cards. [Sources and candidate decisions](SKIN_SOURCES.md), [contact sheet](skins_contact.png), [verification and measurements](VERIFICATION.md).

Blue-Head and Orange-Head are different models, left unselectable pending real art. Exact DS costume/weapon geometry also requires art beyond these faithful palette adaptations. [NEEDS_ART](../NEEDS_ART.md) lists the requirements. No stealth/gold/corrupted/ghost/Ranger color variants invented.

Owned implementation: `krybotSkins.js`; `tools/krybot/skins/{build,verify}.py`; `assets/krybot/skins/{tv,ds,ds_red,masks}/`; six `harness/krybot_skins*` scripts; `docs/skins/krybot/`; Krybot entries in `docs/skins/NEEDS_ART.md`.

Minimal integration: `skins.js` import + Krybot registry row; appearance-only URL resolution in `krybotFx.js`; Krybot-only mirror wash exclusion in `game.js`. All are integrated; **no patch waiting for integration**. The prior gameplay registrations remain present. Existing concurrent work was preserved, including Sanji changes. No other fighter's authored gameplay, launch setup or audio changed. Original source bytes and protected Naruto image were not edited by this task.

Checks: 120 action renders; identical 520-frame outcomes for all four skins; 58 gameplay checks; save/load 46 checks; shared skin-select checks; normal menu/KO/rematch/reload; independent mirrors/helpers/ultimates; light/dark stage captures; real host/join appearance agreement with 70 identical shared frames. No browser errors or preload failures in final runs. Variable RAF timings prompted a paired frozen-state comparison: default median 24.626 ms versus 24.24–24.28 ms for alternatives, with no additional skin render cost found. This is not a universal 60 fps guarantee. See VERIFICATION for loading costs, exact timings, fixture failure correction and pre-existing unrelated regression failures.

No staging, commit, push or merge performed. The shared checkout contains concurrent tracked changes and untracked gameplay/asset work; committing shared files would risk publishing another agent's work or creating a skin-only commit without its gameplay dependencies. Branch stayed main; HEAD advanced through concurrent commits and is recorded in FINAL_STATE.json. Review explicit owned paths and coordinate shared integration before committing. No concurrent ownership block remains on this implementation.

Final concurrent index observation: another process staged `characters.js`, `combat.js`, `credits.js`, `game.js`, `skins.js`, and `spritesheets.js` while this task was finishing. Inspection shows a separate feature snapshot (including staged `spd_red` removals), not the Krybot skin additions. Krybot skin registration/mirror integration remains in the working tree; no index entries were changed by Codex. HEAD observed at `eba8b49eed763c98eb17b09e7e15fe530d721261`. This is an index-versus-working-tree distinction, not a missing runtime integration.

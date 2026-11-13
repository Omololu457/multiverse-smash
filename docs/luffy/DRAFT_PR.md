# Add Monkey D. Luffy, the Elastic Brawler

Luffy joins the actual One Piece selection group with the supplied default art,
frame-timed normals and command routes, five directional specials, Wind-Up,
Stamina, confirmed late-recovery Snapback and Full-Stretch Finale. Sprite origins
keep his torso stable while wide attached limbs retain their native pixel scale.

**Dependency:** target `integration/ben10-complete-feel-polish`, tested base
`736c4a68`. This feature includes that integration by ancestry. Do not target the
older main or merge this PR before the Ben integration's delivery is resolved.
No other fighter's authored moves, experimental roster restrictions or Ben pending
work were changed. This PR is draft and is not authorization to merge or deploy.

Source art, original hash and visible Paddy credit are preserved. All source
regions are inventoried; extraction is reproducible with explicit rectangles.
Only a default appearance is registered. Guard/throw pose fallbacks and unused
ambiguous FX are documented. Cues are synthesized; no voice pack is claimed.

Verification: 35 mechanics checks, 37 live/visual checks, 22 lifecycle checks,
5 dash-input/replay checks, real LAN with 116 shared frames and zero mismatches,
and nine measured combo routes. Beginner/basic, close resource/pull, command
launcher and Heavy→Ultimate routes are true in the fixture; the air route has an
8f reset, and far follow-ups are pressure. Preserved Ben/Swampfire, feel, roster,
determinism, replay and network checks pass. Credits (3) and combo-audit (9)
failures match the base and remain documented. See VERIFICATION.md and the visual
montage for commands, evidence, constraints and remaining balance limitations.

Small shared fixes preserve P2 human input and ordinary dash replay/LAN intent.
Optional rendering origins/timelines preserve existing character behavior.
Physical controller hardware, prolonged FFA and a roster-wide balance study were
not tested. No skins, deployment or merge are included.

Normal-launch follow-up: the plain local URL was tested through the title, first-boot
tutorial, main menu, One Piece/Luffy/default selection and a complete competitive
match: 24 checks passed, including earned meter, Snapback, ultimate, actual KOs and
R rematch. A missing derived finisher-image request was fixed using the existing
FX-only fallback, preserving other fighters' image paths and finisher timing.
Luffy's rematch cleanup also releases the victory/defeat pose overrides; the
normal-launch and lifecycle assertions check both combat reset and idle rendering.
See [launch verification and playable instructions](https://github.com/Omololu457/multiverse-smash/blob/feat/luffy-elastic-brawler/docs/luffy/LAUNCH_VERIFICATION.md).

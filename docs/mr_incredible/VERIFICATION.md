# Verification and remaining limitations

Checkout: /Users/omololu/Desktop/project/multiverse-smash
Branch: main. Base HEAD: 5fa3bc8d6e84f217d82ea4f4c237556f61145cb5.
Tested artifact: that checkout plus pre-existing concurrent work and the uncommitted
Mr. Incredible implementation. This is not a verified standalone clean commit.
No staging, commit, push, merge or deployment was performed.

## Launch

The supported desktop launcher is `Multiverse Smash.command`, which starts the
existing Electron wrapper (`electron/main.mjs`). The automated desktop run used
that same executable and entry with an isolated temporary user-data directory.
It used the real menu dispatch, not start/skipToBattle, to reach the match.
Its ephemeral tested URL was http://127.0.0.1:59089/index.html?harness=1.
The wrapper chooses a new localhost port on each launch.

The running local web launcher is `node tools/serve.mjs` / `npm run serve`:
http://localhost:8000/index.html
Choose Play → VS → difficulty → The Incredibles → Mr. Incredible → skin →
opponent → stage. There is one roster fighter, not a second young roster slot.

Desktop evidence: desktop_01_title.png through desktop_09_rematch.png. The flow
passed roster, all 11 skins, modern selection, supplied intro, real match,
prime, natural expiry, lethal melee/KO, result and rematch. Both fighters and
HUDs remained rendered. Modern skin survived the rematch; the opponent used
Alien X. Test setup supplied full energy for transformation and low opponent
health for reproducible lethal contacts; these are documented test fixtures,
not gameplay cheats added to the fighter.

## Checks

| Check | Evidence / result |
|---|---|
| All attacks / prime contracts / inputs / expiry | 130 / 130 checks pass; runtime_results.json |
| Isolated live damage | 17 attacks in both forms, one HP drop each |
| Opponent / combo measurements | Goku, Superman, Luffy; damage_routes.json |
| Input-only replay | 1,200 authoritative frames identical; no checkpoint desync |
| JSON state | Transition and move snapshots round-trip without loss |
| Simulated DualSense parity | 840 frames match keyboard; 30 isolated move/form chords pass |
| Mr LAN gameplay | Injected P2 prime + special pass with idle physical-pad stub |
| Shared LAN transport | 6/6; 240 frames across real WebSocket relay clients |
| Lifecycle | 9/9; stun/knockdown rejection, boundaries, throw expiry, six activations, KO |
| Asset safety | 1034 alpha/geometry comparisons; 528 frame bounds |
| Source coverage | 198 veteran + 222 young segmented groups accounted for |
| Original source hashes | unchanged; assets_results.json |
| Rendering | bright World Tournament Arena and dark Gotham Rooftops, both forms, different-skin mirrors |
| Shared determinism | 14 passed / 0 failed |
| Roster integrity | pass; 150 unique roster entries |
| Combo-standard | 233 passed / 9 failed; baseline 231 passed / 9 failed |
| Credits | 11 passed / 3 failed; unrelated missing/stale entries listed below |
| Diff whitespace | git diff --check clean |

Run owned checks from the repository root, with the local server running:

```
python tools/mr_incredible/validate_assets.py
node harness/mr_incredible.test.mjs
node harness/mr_incredible_damage.mjs
node harness/mr_incredible_determinism.mjs
node harness/mr_incredible_input.mjs
node harness/mr_incredible_lifecycle.mjs
node harness/mr_incredible_render.mjs
node harness/mr_incredible_visual.mjs
```

The visual script launches Electron; `--browser` uses the supported web launcher
for the same menu flow. Chords are sampled for a real simulation frame. Simulated
pad tests normalize wall-clock time to the simulated input clock so fast headless
execution cannot fabricate the shared millisecond double-tap dash. This does not
change production input or the existing dash rules.

## Performance and limits

Assets occupy about 7.5 MiB on disk across 1,034 paired animation strips, plus
portraits. Recolors, cloth patterns, form maps and alternate animation maps are
precomputed/cached. Owned gameplay code has no Math.random, wall-clock timer,
pixel scan, per-frame image decoding or canvas allocation. Extra effect images
are cached on first use. Static stars and a reduced-motion effect path are present.

The 240-frame effect-heavy mirror stress profile recorded warm mean
49.21 ms, p95
2.10 ms and maximum
6213.60 ms. Rare multi-second stalls inflated
the mean despite low typical step times. The comparison capture in
performance_baseline.json also stalls with an existing Goku mirror. These are
noisy shared-host/headless measurements, not proof of stable 60 FPS and not a
conclusive attribution of the stalls. Further profiling on the player's hardware
remains appropriate; the slow samples are retained rather than discarded.

No physical DualSense, Bluetooth/USB latency, two physical LAN machines, hardware
rumble or non-standard controller mapping was tested. Mr-specific LAN verification
uses the real injection path with a mock peer; separate shared transport tests use
real local sockets. No claim of physical hardware validation is made.

The supplied sheets have no move-name labels. Bracing/low/throw and outlined
reaction interpretations are documented in SPRITE_MAP.md. Some detached effect
and silhouette strips are retained as presentation assets rather than forced
into every attack. The skin menu uses the supported veteran portrait; paired
prime previews are in the contact/comparison artifacts. No new voice pack or
character-specific CPU strategy was added.

Unrelated global audit failures remain: combo registry gaps for existing roster
entries, its existing zoner/count mismatch, and missing core/air normals for
gogeta and goku_rose. Mr is explicitly classified. Credits still lacks
 green_arrow, homelander, kakashi_anbu, ghostface_exe and soldier_boy and contains
the stale sasuke_war_susano key. Mr's credits entry passes. Existing tests were
not edited to hide these failures. The red required global audit is why no
commit was made.

## Final tuning / artifacts

Veteran HP 1250, Power cap 100, speed 90 → 7.5 world px/tick, two jumps. All core
normals, directional heavies, standard grab, five specials and Power Lift are
implemented. Actual clean light/heavy are 30/60 veteran, 39/78 prime. Full damage
and costs are in DAMAGE_AUDIT.md and MOVESET.md.

Prime: 900 simulation ticks including 24-tick vulnerable entry; raw damage ×1.30,
ground movement ×1.15, air control ×1.10, recovery ceil(×.90), minimum 8 ticks.
No health/HP/armor/jump benefit. A separate finite 100-point special reserve keeps
prime specials usable without rebuilding ultimate meter; it is discarded on return.

Modern: source-preserving fitted petrol/charcoal young suit and matching red/
charcoal veteran suit, actual buckle-ring removal and integrated waist shading.
Alien X: complete paired obsidian/silver material maps and fixed fabric-only stars.
All ten alternatives and classifications are in SKINS.md; modern_suit_comparison.png
shows eight poses, skins_contact.png shows every paired package.

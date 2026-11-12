# Luffy — launch recovery and normal-menu verification

**Already opened in the default browser (Safari): http://127.0.0.1:8000/**.
The final desktop capture confirms the normal main menu is visible.

Double-click **Play Luffy.command** in this project next time. If Safari restores
the Settings screen, click **BACK**, then **PLAY** to choose a game mode and
**One Piece → Monkey D. Luffy → Default**, opponent and stage.

## Actual browser/checkout recovery (2026-11-12)

The earlier separate-checkout test did not open the build for the user. This
follow-up explicitly ran macOS `open` and confirmed Safari's active tab URL and
title. The initial desktop screenshot showed the game's Settings UI; the final
capture shows the normal main menu rendered at the working address. The user is no longer being directed to the old IDE page.

- Working physical root: `/Users/omololu/Desktop/project/multiverse-smash-luffy`.
- Server: existing PID92883, `node tools/serve.mjs`, port8000, verified by listener,
  process working directory and the served luffyData.js matching this checkout.
- The supported server was reused; no extra permanent server was needed.
- The launcher detaches new servers with Node detached/unref and log-file stdio,
  so closing Terminal/ending the launcher does not terminate the game server.
- New-server logs: `~/Library/Logs/Multiverse Smash Luffy/server-<port>.log`.
- Launcher: `/Users/omololu/Desktop/project/multiverse-smash-luffy/Play Luffy.command`.
- Command alternative: `node tools/launch-luffy.mjs` from this checkout.

### Root cause evidence and limits

No existing Chrome/Safari tab at the old JetBrains address was found during the
matching-game-tab scan. Its historical _ijt token was therefore not available;
that exact authenticated old request was not replayed. The known path
`http://localhost:63342/multiverse-smash/index.html` currently returns HTTP404
from PyCharm (document failure, not a Luffy startup exception).

The original checkout was independently reproduced through its already-running
triage server at port8777. Its served index.html matches the physical original
file byte-for-byte. Startup fails on required script HTTP404s for
**supermanEyeAnchors.js** and **homelanderEyeAnchors.js**. Both files are absent
from the dirty original project and present in the Luffy checkout. A failed ES
module graph explains the background-only page; no separate page exception was
reported by the browser. The original dirty tree was not restored, overwritten,
or otherwise changed to hide these failures.

At the Luffy URL, fresh WebKit startup loads successfully: no failed required
modules or uncaught exceptions. The optional /api/health404 is the established
static-server/localStorage fallback. No saves, browser profiles or progression
were erased. Browser storage/settings were left intact.

Safari permits reading its active URL/title and a desktop capture confirms the
rendered Settings page and, on the final open, the normal main menu. It rejects Apple Events JavaScript (Safari setting is
disabled), and macOS denies synthetic keystrokes (System Events error1002).
Those security settings were not changed or bypassed. Thus native screen evidence
confirms the opened/rendered page; the full menu/match input verification below
is automated WebKit, not a claim that remote clicks drove the user's Safari tab.

### Normal startup test on the exact working URL

Command:

```sh
LUFFY_BROWSER=webkit LUFFY_SMOKE_ONLY=1 node harness/luffy_launch.mjs
```

**11 passed, zero failed.** A fresh context uses the plain URL, no ?harness,
no initialization/intro/countdown skip and normal requestAnimationFrame timing.
A read-only response observer supplies snapshots/menu rectangles; every action
is a real mouse/keyboard event. It does not write fighter state or advance time.
The game module served to the user is not instrumented.

The test went through title PLAY, the existing first-run tutorial and its normal
Escape exit, main-menu PLAY, two-player mode, One Piece/Luffy/default on both
sides, stage selection and the normal match intro/countdown. It confirmed visible
sprite actions for both fighters and HUD capture, forward movement, a clean Light
hit and Wind-Up gain, no uncaught errors and no missing Luffy assets. See
`launch/browser/webkit_match.png` and `webkit_match_results.json`.

An initial WebKit automation attempt clicked the second universe card before its
scroll-reset animation settled. The fixture now waits for that transition and
asserts card visibility before clicking. No game behavior or assertion was removed
to pass this check; initialization and menu transitions still occur normally.

### Launcher behavior

`Play Luffy.command` finds Node in standard macOS install paths and runs
`tools/launch-luffy.mjs`. That tool verifies the listener's physical working
directory and served module/import-map before reusing a server. If port8000 is
occupied by another project or unsupported server, it leaves it running and tries
8001–8009. It prints and opens the selected URL via macOS `open`. It never opens
file:// or the JetBrains address, never installs Electron, and never falls back
to the original dirty checkout. No browser security or save flags are changed.

`node harness/luffy_launcher.test.mjs` passed real-process checks: an occupied
foreign port survives, the correct checkout is served on a free port, the second
launch reuses the same PID, and the server survives its launcher parent exiting.
The test stops only the servers it created; the user's existing servers remain.

The default launch command was also invoked to open Safari itself. A final explicit
macOS open confirmed the active URL and a native desktop capture of the main menu
(`launch/browser/safari_visible_main_menu.png`, browser chrome excluded). For diagnostics,
`node tools/launch-luffy.mjs --no-open` performs the same safe server selection
without opening a tab. Manual supported server command remains `npm run serve`.

No merge, deployment, forced Git operation, or modification of the dirty original
checkout occurred. The previous detailed gameplay and PR/baseline report follows.

---

# Luffy — normal launch verification (2026-11-12)

Playable URL on this Mac: **http://127.0.0.1:8000/**.

- Feature branch: `feat/luffy-elastic-brawler`.
- Tested game commit: `00c949589df050581ad00b2088c6b67525a868e7`.
- Durable checkout: `/Users/omololu/Desktop/project/multiverse-smash-luffy`.
- Server: `node tools/serve.mjs`, rooted in that checkout, port 8000.
- PR: [#10](https://github.com/Omololu457/multiverse-smash/pull/10), open draft.

The former /tmp checkout was moved into this separate durable directory; its old
path remains a compatibility symlink. The original dirty project was preserved.
The running triage server on port 8777 serves that original main checkout and
returns 404 for luffyData.js. The IDE project and double-click launcher also point
at the original directory; launching those does not select the feature branch.
No files in that dirty checkout were replaced to make this verification pass.

## Play now

Open the URL above. Click PLAY on the title. On a fresh browser profile the
existing first-run Goku tutorial opens automatically; wait through its intro,
then press Escape to return to the main menu. Click PLAY again, choose a mode,
and select **One Piece → Monkey D. Luffy → Default**. Choose the opponent and
stage, then let the normal intros/countdown finish. VS CPU also asks for AI
difficulty; Training supplies a stationary opponent. No dev code is required.

P1 uses A/D to move, W to jump, J Light, K Heavy, I launcher, L Special, U Ultimate,
semicolon to guard and O to grab. Directional specials are Neutral/Forward/Down/
Back + L, and airborne Down + L. Special is L; P is Charge and gives Luffy no
Stamina. Release and retap J to chain, or L after a valid stretch confirm for
Snapback. It costs one Wind-Up pip. Ultimate requires 100 Stamina; normal rounds
start at 50. Press R at victory for a rematch. See CONTROLS.md for full rules.

The server is running now. If stopped, restart it from the durable checkout:

```sh
cd /Users/omololu/Desktop/project/multiverse-smash-luffy
npm run serve
```

The headless run displayed the existing low-FPS suggestion at default graphics.
If play is sluggish, F9 accepts the Low graphics preset; F10 dismisses the hint.
No GPU performance target is certified by this verification.

Then use the same URL. Opening index.html over file:// is unsupported because
browser module/CORS restrictions apply. No merge or hosted deployment was made.

## Verification method and results

`node harness/luffy_launch.mjs` opens the exact plain URL in Chromium at 1280×720.
It uses normal requestAnimationFrame timing, normal menus, real mouse/keyboard
input and the production roster policy. The ?harness parameter and __harness API
are absent. A response-only read observer exposes snapshots and menu rectangles
to assertions; it never writes fighter state, advances time, sets resources,
skips intros/countdowns or forces a KO. The observer is not served to the user.

A full local two-player Luffy mirror match is used so both sides are controlled
and the target cannot invalidate verification by AI movement. Meter is earned
through eligible play; both KOs come from actual attacks. Screenshots in launch/
show the main menu, combat, victory and rematch.

Final result: **24 passed, 0 failed**, no uncaught errors and no missing Luffy
assets. The only 404 was the optional /api/health save-service probe.

The normal flow checks movement/jump, J1/J2/J3, Heavy, three Wind-Up pips, paid
confirmed Snapback, all five directional specials, 100 earned Stamina, the
confirmed four-contact ultimate, two competitive KOs, victory and R rematch.
Rematch restores HP1000/Stamina50, zero pips and round wins. Production Ben
experiments remain disabled. No uncaught JavaScript errors were observed.

Two launch regressions were found and fixed. First, match-end finishers assumed every
new victim had derived gore art and requested fatality/luffy_chopped.png. Luffy
now declares that such art was not supplied. Both shared finisher loaders retain
their existing FX-only fallback without making that request. Their durations,
KO resolution and other fighters' art paths remain unchanged. No gore/recolor/
transformation artwork was added. The new luffy_finisher_art.test.mjs verifies
both the shared finish window and Shisui's existing finisher resolution, including
unchanged legacy image paths. The normal-launch missing-asset assertion also
covers filename-based Luffy requests, not just the assets/sprites/luffy directory.

The final visual review also found victory/defeat pose overrides surviving rematch,
despite restored HP and meter. Luffy's lifecycle cleanup now releases those
overrides. Unit coverage preserves other fighters' pose state, and both the
lifecycle and normal-launch tests assert that Luffy renders idle after rematch.

The optional /api/health request is 404 on this static dev server. That is the
existing localStorage save fallback, not a startup error or missing game asset.
The title, menu, selected fighters, combat and rematch load normally.

## PR ancestry and unfinished integration work

PR #10 targets `integration/ben10-complete-feel-polish`, exact base
`736c4a68efdb58ba577897a673f029af645b4f29`. Its base includes the Ben device work,
Swampfire, graphics/polish and timing/weather integration. Main remains at the
older `2ad979bc`; the feature therefore depends on this unmerged integration base.
The PR diff contains Luffy and its small shared fixes, with no Ben/Swampfire
files changed. The branch ancestry includes those integration commits; it is not
an independent patch on old main.

The base's production Swampfire checkpoint was tested. Thirteen legacy alien
experiments still lack finished art/full-kit certification, Prime is development
only with art pending, Albedo remains disabled, and broad FFA/balance/external
weather certification remains unfinished. Those restrictions and pending Ben
handoff notes were preserved. Publishing the exact base enabled the draft PR;
it did not finish or merge that separate work.

## Baseline failures and effect on play

| Documented baseline | Meaning for normal play |
|---|---|
| Credits: 11 pass / 3 fail | Four existing fighters lack attribution entries; one stale key and coverage drift. Credits metadata, not startup or Luffy assets. |
| Combo audit: base 226/9, Luffy 229/9 | Seven existing classification gaps and stale totals/zoner counts. Gogeta/Goku Rose also lack expected launcher/air definitions; those fighters may have limited options. No Luffy failure. |
| Older Goku stage-3: 3/7 | Recorded old rush-sheet/stage expectations conflict with rebuilt Goku; not rerun here. Not evidence of a Luffy or startup failure. |
| Superman movement: 38/1 | Recorded disabled legacy Omni-Man ultimate expectation; not rerun here. No Luffy or startup failure observed. |

The credits and combo failures were previously compared with the tested base and
were unchanged. This normal launch additionally exercised Goku's first tutorial
and the complete Luffy flow. It does not certify every other fighter's moves or
all roster matchups. Physical controller hardware and prolonged FFA remain outside
this verification; earlier simulated controller and AI smoke results still apply.

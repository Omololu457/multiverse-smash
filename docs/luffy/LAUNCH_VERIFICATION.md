# Luffy — normal launch verification (2026-11-12)

Playable URL on this Mac: **http://127.0.0.1:8000/**.

- Feature branch: `feat/luffy-elastic-brawler`.
- Tested game commit: `8a5ce0a238ea32ea8d09b1246ac4d501b510f737`.
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

Final result: **23 passed, 0 failed**, no uncaught errors and no missing Luffy
assets. The only 404 was the optional /api/health save-service probe.

The normal flow checks movement/jump, J1/J2/J3, Heavy, three Wind-Up pips, paid
confirmed Snapback, all five directional specials, 100 earned Stamina, the
confirmed four-contact ultimate, two competitive KOs, victory and R rematch.
Rematch restores HP1000/Stamina50, zero pips and round wins. Production Ben
experiments remain disabled. No uncaught JavaScript errors were observed.

One launch regression was found and fixed: match-end finishers assumed every
new victim had derived gore art and requested fatality/luffy_chopped.png. Luffy
now declares that such art was not supplied. Both shared finisher loaders retain
their existing FX-only fallback without making that request. Their durations,
KO resolution and other fighters' art paths remain unchanged. No gore/recolor/
transformation artwork was added. The new luffy_finisher_art.test.mjs verifies
both the shared finish window and Shisui's existing finisher resolution, including
unchanged legacy image paths. The normal-launch missing-asset assertion also
covers filename-based Luffy requests, not just the assets/sprites/luffy directory.

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

# MSV1-HOST REPORT

Start commit: `262b1cbba9ced642b6a4c8969a649b8418c4bf20` (docs/msv1/host/START_COMMIT.txt). While this work was
in progress, another session (msv1-blood) pushed 5 commits up to `e09774cdc`. The MSV1-HOST commits sit on top of those.
The final tests below ran on a clean export of `e09774cdc` + only the MSV1-HOST changes.

## What existed vs. what was added

**Existed**: deterministic lockstep netplay (net/protocol.js, LanClient, LanSession, onlineMatch, netMatch),
the in-game ONLINE (LAN) screens, a single-room 2-seat LAN relay on 8787 inside the Electron wrapper, and the
Electron wrapper itself (loopback page server, no packaging, no CI). See AUDIT.md.

**Added**:
| Piece | File(s) |
|---|---|
| Public host server: whitelist static files, rooms relay, join page, `/api/room` | `net/hostServer.mjs`, `net/clientManifest.mjs` |
| Room codes / link parsing / protocol URLs (shared browser + node) | `net/hostConfig.js` |
| Version handshake (build version + gameplay hash) | `net/protocol.js` (`hello.build`), enforced in hostServer |
| Hosting panel, menu badge, first-run notice, join box, mismatch dialog, browser "Open Desktop Version" + "Desktop app not found" | `net/hostLink.js` |
| Host = P1 in the same window | `net/onlineMatch.js` (4 lines), `game.js` `window.__msOnline` seam (13 lines, UI only) |
| Auto-host controller, tunnel → UPnP → LAN | `electron/host.js`, `net/tunnel.mjs`, `net/upnp.mjs` |
| Protocol `multiversesmash://`, single instance, IPC, settings, quit cleanup | `electron/main.mjs`, `electron/preload.cjs` |
| Packaging + release CI | `electron/package.json` (electron-builder 25.1.8), `electron/scripts/{stage,fetch-cloudflared}.mjs`, `.github/workflows/release.yml` |
| Tests | `harness/msv1_host.test.mjs` (77), `harness/msv1_host_tunnel.test.mjs` (20), `harness/msv1_host_e2e.mjs` (36) |
| Docs | AUDIT, BASELINE, REACHABILITY, SECURITY, RELEASING, this report, screenshots/ |

The simulation is untouched: frame-data diff **6/0** (all 162 characters, skins, alien kits, damage tags and types;
combat/abilities/physics/ai/input/characters/replay/rng/aliens/skins byte-identical), determinism **14/0**,
and no `Math.random` in any added or changed line.

## Reachability: which route worked

- **LAN: verified end to end** on this Mac. A real desktop host plus a real Chromium browser friend played a
  full match through the host relay (two rounds won by KO: 2033 damage, 84 hits, ~3,600 frames; an earlier run went
  two full 90 s timer rounds, 10,800 frames), **bit-identical on every shared frame**. Desktop
  friends joined by pasted link and by `multiversesmash://join`.
- **Cloudflare quick tunnel: the code path is verified against a stub cloudflared** (spawn, URL parse,
  restart → new URL shown, kill on stop/quit, checksum refusal, degrade to LAN). A real quick tunnel was
  **not deliberately tested**: the session's permission policy blocked running the downloaded binary.
  ⚠️ **Disclosure**: one test bug (the tunnel test read the real environment instead of the injected one)
  made the tunnel test download the pinned cloudflared 2026.11.1 (SHA-256 verified) and run a real quick tunnel
  for a few seconds pointing at a test server. The process was gone when I checked, and I deleted the temp
  download. The bug is fixed: the test now blocks network fetches and sets `MS_CLOUDFLARED_DOWNLOAD=off`.
- **UPnP: implemented, not verified.** An SSDP search on this network got **no answer** (UPnP is off or
  unsupported on this router), so the app correctly reports it as unavailable. It was never exercised against a real router.

## Ports
- **8790** (or 8791…8809, then any free port): the public host server. It is the only thing the tunnel, UPnP or LAN reach.
- **8787**: the legacy in-game LAN relay (unchanged; reports itself absent if the port is busy).
- **random 127.0.0.1 port**: the app's own page server (loopback only, never forwarded).

## Security results
`msv1_host.test.mjs` 77/0 covers traversal (encoded, double-encoded, backslash, NUL, symlink escape), no listing,
no repo/dev files or routes, method limits, CSP join page, origin check, size/rate/junk limits, seat
spoofing, cross-room isolation, full room, mismatch never seated, and brute-force 429. Electron runs with
contextIsolation, sandbox, no nodeIntegration and sender-checked IPC. Stop and Quit leave no port and no
cloudflared (e2e plus the packaged app). Details are in SECURITY.md.

## Tests: baseline vs final
| Test | Baseline (262b1cbba) | Final (e09774cdc + MSV1-HOST) |
|---|---|---|
| determinism | 14/0 | 14/0 |
| combo-standard | 233/9 | 233/9 (same checks) |
| up-attack-roster | 77/2 | 77/2 (same: ghostface, superman) |
| credits | 11/3 | 11/3 (same checks) |
| roster-integrity | PASS | PASS |
| replay_playback | 10/0 | 10/0 |
| net_online | 11/0 | 11/0 |
| net_lancode | 6/0 | 6/0 |
| net_lockstep | 6/6 | 6/6 |
| net_inject | 5/2 | 5/2 (same 2 stall-timing checks) |
| frame-data diff | n/a | 6/0 |
| msv1_host (server/security) | new | 77/0 |
| msv1_host_tunnel | new | 20/0 |
| msv1_host_e2e (real Electron + Chromium) | new | 36/0 (full 2-round KO match, ~3,600 frames, 2033 dmg / 84 hits, 0/153 frames mismatched) |

Render check: screenshots/01–08 (first-run notice, hosting panel, join page, friend-joined toast, match end
on host and browser, desktop join box, version mismatch).

## Packaged build smoke test (macOS arm64, this machine)
`electron-builder --mac dir --arm64` produced an unsigned `Multiverse Smash.app` (2.8 GB) whose Info.plist declares
`multiversesmash`. After registering it with LaunchServices:
- `open multiversesmash://open` launched it and hosting started automatically (8790 serving the game,
  `package.json` → 404).
- A second `multiversesmash://join?...` went to the same instance (still one process).
- Quitting left no process, no listener on 8790 and no cloudflared.
The packaged run used `MS_HOST_TUNNEL=off`, so it hosted LAN-only. I unregistered it afterwards. The `.dmg` wrapper itself was not built locally.

## Not tested / open issues
- **Windows and Linux builds are untested**: no machine was available. CI is configured but has never run,
  because I pushed no tags.
- **A real Cloudflare quick tunnel** was never deliberately tested (see the disclosure above); neither was **UPnP on a real router**.
- **Release size**: the client is ~68k files, **2.35 GB**, and the macOS app is 2.8 GB unpacked. Installers will very likely
  exceed GitHub's **2 GiB per-asset limit**. The workflow fails loudly if so (RELEASING.md lists options).
- **Pre-existing netcode hazard (not changed, since the sim was off-limits)**: the game canvas follows the window size and
  the stage's ground y depends on canvas height. Two players with different window sizes can therefore desync. The e2e
  matches the sizes; a fixed internal resolution for online matches would fix it.
- The browser friend downloads game assets from the host. On a slow upload the first load is slow (see REACHABILITY.md).
- `game.js` is also staged in the default git index by another session, whose staged copy lacks the 13-line
  `__msOnline` seam. If that session commits from the default index, the seam is reverted and the hosting panel's
  automatic Host/Join (and browser auto-join from a link) stop working; the panel, links and the in-game ONLINE
  screens still work. I did not touch that session's staged copy; its owner should re-apply the seam if needed.


---

## Update (same day): one button, "PLAY WITH A FRIEND", pick-your-own select

The owner asked for a single way to play together: **one button on the title screen**. It gives a **clickable link**
that opens in the browser, ready to copy and send to friends on the same Wi-Fi, and **each player picks their own
fighter on their own screen**.

- **Removed**: the ONLINE (LAN) entries in the main menu and PLAY menu, the hosting badge/panel, the
  first-run popup, the join box, and the join page's second
  button ("Open in desktop app"). The old ONLINE screens remain in code for the existing net tests only.
- **Added**:
  - The title-screen **PLAY WITH A FRIEND** button. In the desktop app it starts hosting and shows the friend
    screen: a clickable LAN link (opens in the default browser on a copy-and-send "invite" page that strips
    `#invite` from the address bar), plus Copy link and Back.
  - A friend opening the link sees **one** button, **JOIN THE GAME**, and lands on their own fighter select.
  - The host moves to their own fighter select automatically. Each player locks in on their own screen
    (new `pick` message, relayed and sanitized by the host server). The host then picks the stage, and the
    host's MATCH_SETUP starts the usual lockstep match.
  - On the result screen, REMATCH or CHANGE CHARACTER means **play again**: both go back to picking, on a
    fresh lockstep session. MAIN MENU leaves and tells the friend.
- **Hosting is now only on while you use it**. It no longer starts at app launch; it stops on Back, on
  returning to the title/main menu, and on quit. `multiversesmash://open` just opens the app.
- In a plain browser (no desktop app), PLAY WITH A FRIEND explains that hosting needs the desktop app.
- Sim untouched: the changes are UI/select-flow only (`game.js` seam + select hooks, `ui.js` menu entries).
- **"Open Desktop Version" is back** (owner request): in the browser version, the corner button on the title screen /
  main menu launches the installed desktop app (`multiversesmash://open`); if nothing opens within ~1.5 s it offers the
  download. The browser's PLAY WITH A FRIEND popup also has "Open the desktop app". Not shown inside the desktop app,
  on a friend's join link, or once you leave the home screens.

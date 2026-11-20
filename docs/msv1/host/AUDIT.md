# MSV1-HOST — Phase 0 audit (what exists before this work)

Start commit: see `START_COMMIT.txt`. Read from the code at that commit, not from older docs.

## 1. How the browser version is served

There is **no build step**. The game is a static ES-module web app at the repo root (`index.html`,
~600 root-level `*.js` modules, `net/*.js`, and ~68k media files spread over the root, `assets/`,
`voice/`, the `*_sfx/` folders and others). `index.html` holds a generated `BUILD:MODULES` block (an import map that adds
`?v=<hash>` to every module, plus `window.__ASSET_V=<hash>`), written by `tools/stamp_version.mjs`.
`__ASSET_V` is a sha256 over **every module's source text** plus root image sizes, so it acts as a
gameplay-code fingerprint.

There are three ways to serve it:

| How | Port | Bind | Notes |
|---|---|---|---|
| `npm run serve` → `tools/serve.mjs` | `PORT` or **8000** | all interfaces | static + live import map. No relay. |
| `npm run dev` → `server/save-server.mjs` | `PORT` or **8000** | `0.0.0.0` (HOST env) | static repo root + `/api/save`, `/api/feedback`, `/api/health`, `/api/lan-info`; also starts the LAN relay on **8787** |
| GitHub Pages | — | — | a `.nojekyll` sits at the root, so the static files can be served as-is |

The repo is public (`github.com/Omololu457/multiverse-smash`), so its Releases page is downloadable by
anyone.

## 2. How the Electron app starts it

`electron/` is a separate npm package (`electron@33`, its own `package.json`, `start` = `electron .`).
`electron/main.mjs`:
- starts the LAN relay (`startLanServer({ port: LAN_PORT || 8787, relay: true })`);
- runs its own **in-process HTTP server on `127.0.0.1:<port 0>`** (OS-picked, so it never clashes),
  serving the **whole repo root** with a `startsWith(REPO)` traversal guard, the live import map, and
  the same dev APIs as save-server (`/api/save` writes to `userData/saves`, `/api/feedback` appends to
  `BETA_FEEDBACK_LOG.txt`, `/api/lan-info`, `/api/health`);
- opens one fullscreen `BrowserWindow` (`contextIsolation: true`, `nodeIntegration: false`, no
  preload, no IPC), removes the app menu, sends external links to the OS browser, and pins
  navigation to its own origin;
- has the `DIAG` / `CAPTURE` / `BATTLE` / `VERIFY_GAMEPAD` env switches.

There is **no** protocol handler, **no** single-instance lock, **no** preload/IPC.

## 3. LAN lockstep + WebSocket relay (what we reuse)

Files: `net/protocol.js`, `net/lanServer.mjs`, `net/lanClient.js`, `net/lanSession.js`,
`net/onlineMatch.js`, `net/netMatch.js`, `net/lanCode.js`.

- **Wire format** (`protocol.js`): JSON envelopes `{t:…}`. Types: `hello`, `welcome`, `reject`,
  `match_setup`, `input`, `lobby`, `bye`, `ping`, `pong`. `input` = `{side, frame, mask}` where
  `mask` is the replay system's 14-bit input integer.
- **Build stamp**: `r<REPLAY_VERSION>.b<BALANCE_STAMP>.p<PROTOCOL_VERSION>` (now `p2`). The client sends
  it in `hello`; the server's `checkHello` compares strings and on mismatch sends
  `reject {reason, ours, theirs}` and closes with code 4001. **Gap:** the stamp is three hand-bumped
  constants, not a hash of the code, so two builds with different gameplay code but the same constants
  would be accepted.
- **Relay** (`lanServer.mjs`, `ws` package): one global "room" of two seats. The first client with a
  valid hello gets `p1` (host by convention), the second gets `p2`, and a third is rejected ("match is full").
  After the handshake it forwards `input` / `match_setup` / `bye` **verbatim** to every other client,
  answers `ping` with `pong`, and broadcasts `lobby {sides,count}` on join/leave. There are no rate
  limits, no size limits (beyond the `ws` 100 MiB default), no origin check, and no shape validation. That is acceptable on a LAN
  but not on the internet.
- **Client**: `LanClient` (browser `WebSocket`) → `connect()` sends `hello`, resolves on `welcome`.
  `onlineMatch.connect(url, role)` wraps it and creates a `LanSession` (delay-2 lockstep).
  `netMatch` is the gated seam that `game.js` reads every frame.
- **Game-side flow** (`game.js` ~6910–7060): ONLINE menu → *Host* (`startHostFlow`: fetch
  `/api/lan-info` → `ws://<location.hostname>:<port>`, connect as host, show a LAN **code** from
  `lanCode.js`) → when the opponent is in the lobby, pick the matchup → `startOnlineHostMatch` sends
  `match_setup` (seed, chars, skins, stage, juice/weather flags) → both sides `netMatch.begin` +
  `startMatch()`. *Join* types the code (or `ws://ip:port`), `applyOnlineSetup` starts the identical match.
  These functions are local to `game.js` and are only reachable from outside through `window.__harness`, which
  is off unless the URL has `?harness`.
- **Spectating**: not supported. `LanSession` handles exactly one remote side, so a third client could
  not follow a match. **Max players per room = 2.**

## 4. Companion / second-screen relay

There is **no separate companion relay in the code**. "Companion screens" appear only in comments
(`battleBlood.js`, `weather.js`, `game.js`) as a rendering-determinism rule: blood and weather avoid
`Math.random`, so every peer draws the same picture. The `second-screen` branch was merged `-s ours` (no code).
Keeping it working therefore means keeping LAN lockstep and render determinism intact, and those are
covered by the net/replay/determinism tests.

## 5. Packaging and release

None. No `electron-builder`, no `.github/` directory, no workflows, no release config, no app icon set.
`electron/README.md` lists packaging as a future "separate, schedulable task".
The packaged app would need: the game client files, `net/` server modules, `tools/stamp_version.mjs`,
and `ws` (imported by `lanServer.mjs` from the **root** `node_modules`).

The whitelisted client is ~68k tracked files and about **2.35 GB**, which matters because GitHub caps a single
release asset at 2 GiB (see RELEASING.md).

## 6. Port clashes (EADDRINUSE)

- Electron's own HTTP server uses port 0, so it never clashes.
- The relay: `new WebSocketServer({port})` reports EADDRINUSE **asynchronously** as an `error` event,
  so the `try/catch` in `main.mjs` / `save-server.mjs` never sees it. The relay silently fails to start,
  and `LAN_RELAY_PORT` still claims 8787 (which then points at whichever process holds 8787). It
  doesn't crash because `wss.on("error")` logs it.
- `save-server.mjs` `server.listen(8000)` has **no** error handler, so a second `npm run dev` crashes
  with an unhandled EADDRINUSE.
- (The brief mentions 8788; the code uses **8787** everywhere.)

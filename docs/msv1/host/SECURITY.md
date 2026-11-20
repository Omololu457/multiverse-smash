# MSV1-HOST — Security: everything hosting exposes, and how it was tested

Hosting is **off until you press PLAY WITH A FRIEND** on the title screen, and it stops again when you press
Back on the friend screen, go back to the title or main menu, or quit. While it is on, it opens **one** listener to the network: the public host server (`net/hostServer.mjs`, port 8790 or
the next free port, bound to all interfaces so LAN friends and the local cloudflared can reach it). Internet
traffic reaches it only through the Cloudflare tunnel (or a verified UPnP mapping). **Nothing else is
exposed.** In particular, the app's own page server, the one with the save/feedback/lan-info APIs, stays on
`127.0.0.1` with a random port and is never forwarded.

## Exposed surface (complete list)

| Path | What | Limits |
|---|---|---|
| `GET /` | the game's `index.html` with the live import map (same bytes the desktop app shows) | |
| `GET /<file>` | **only** files in the client whitelist (`net/clientManifest.mjs`): git-tracked game modules/media/data, plus every module the page actually imports (recursively, e.g. `harness/alt_skin_manifest.mjs`, which `skins.js` imports). Exact-path match; no listing; real path must stay inside the client root (symlinks escaping it → 403) | GET/HEAD only |
| `GET /join?room=CODE` | static join page; strict CSP with a per-response nonce; only a validated room code is ever placed in the page | counts as a join attempt |
| `GET /api/room/CODE` | `{ok, players, max, full, hostVersion, compatible}` | join-attempt rate limit |
| `GET /healthz` | `{ok, id}` (random instance id, used to verify a UPnP route) | |
| `WS /ws?room=CODE[&host=TOKEN]` | the lockstep relay for that room | see below |
| `WS /` (no room) | **legacy in-game LAN code only**: accepted only from a direct LAN/loopback peer with no proxy headers; mapped to the host's room | refused for tunnelled clients |

Everything else returns 404 (any other `/api/*` included), 400 (unsafe paths) or 405 (methods other than GET/HEAD).
The whitelist is a subset of what the public GitHub repo already publishes, plus not-yet-committed modules the
page imports. No `.git`, docs, harness tests, tools, server code, `node_modules`, saves, logs, `.md/.txt/.py`,
source maps, untracked music, or anything outside the game folder.

Response headers: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`,
`Cross-Origin-Resource-Policy: same-origin`. HTTP header/request timeouts 15 s / 30 s.

## WebSocket relay rules

- **Handshake first**: nothing but `hello` is accepted until the client is seated; no hello in 5 s → closed.
- **Version gate**: `hello.stamp` (replay/balance/protocol) **and** `hello.build.code` (= `window.__ASSET_V`,
  a sha256 over every game module) must equal the host's, or the client gets `reject {mismatch, hostVersion,
  releasesUrl}` and is never seated. A mismatch can never start a match.
- **Seats**: `p1` only with the room's 24-byte random host token (constant-time compare); everyone else
  `p2`; a third client → "room full" (max 2, the game's lockstep limit; no spectating).
- **Shape validation, then rebuild**: `input` (side must be the sender's own seat, integer frame, 14-bit
  mask), `match_setup` (host only; every field re-created through `makeMatchSetup` with identifier
  whitelists), `pick` (either seat: "my fighter", rebuilt through `makePick`; fighter/skin must be plain
  identifiers ≤ 64 chars, else dropped and counted as invalid), `bye` (reason ≤ 80 chars), `ping` (payload ≤ 64 chars). Unknown fields are dropped; client
  JSON is never evaluated and never forwarded raw.
- **Room isolation**: messages go only to the other seat of the sender's own room.
- **Limits**: 2 KB per message (`maxPayload`), 150 msgs/s per client (→ close 4008), 20 invalid messages
  (→ close 4003), 24 connections total, 4 per IP, 4 rooms. Dead sockets are dropped after 10 s without pong.
- **Origin check** (browsers): the host's public origin (tunnel / verified UPnP), the host's own LAN origin,
  or a loopback `http://127.0.0.1|localhost:*` origin (a desktop app, ours or a friend's, runs the game from
  its own loopback server). Anything else → 403. Non-browser clients may omit Origin. They still face every
  other rule.
- **Room codes**: 6 chars from 32 symbols (no 0/O/1/I), so ~1.07e9 codes. Unknown-code attempts are counted per
  IP (the tunnel's `CF-Connecting-IP`, else the socket address): 8 failures in 10 min → that IP is blocked
  from room lookups, join pages with a code, and the relay for 10 min (429).

## Electron hardening

- The game window: `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, and
  `webSecurity: true`. Navigation is pinned to the app's own loopback origin, and `window.open` goes to the OS browser.
  Permission requests are denied except fullscreen and clipboard writes.
- The page gets **only** `window.msDesktop` (preload, frozen): get state, start/stop hosting, settings,
  copy text, check a join link, open the Releases page. No filesystem, shell, process or Electron object.
- Every IPC handler first checks the sender: it must be the main window's `webContents` and its frame URL must have
  the app's own loopback origin. Otherwise it throws "forbidden".
- Remote content (a friend's host) is never loaded into an Electron window. A desktop joiner runs its **own**
  copy of the game and only opens a WebSocket to the host. The join pre-check (`/api/room`) is fetched by
  the main process, not the page.
- The host token is sent only to the local window (IPC) and is used only on the loopback relay URL.

## Process / port lifecycle

- **Stop Hosting**: closes every room (players get `bye`), terminates every socket, closes the listener,
  kills cloudflared (TERM → KILL after 2 s), and removes any UPnP mapping.
- **Quit**: `before-quit` runs the same stop (hard deadline 4 s), `will-quit` and `process.exit` call a
  synchronous kill as a last resort, and SIGINT/SIGTERM do too.
- **Port clash**: the host server walks 8790…8809 and then any free port. EADDRINUSE never crashes the app.
  The legacy LAN relay (8787) now reports itself absent on EADDRINUSE instead of pointing the game at another
  process.
- **cloudflared binary**: never run unverified (bundled after CI checksum check / your own PATH install /
  download verified against the pinned SHA-256 before extracting; cached copy re-hashed before every run).

## What was tested

`node harness/msv1_host.test.mjs` (headless, real server, raw sockets), **77 checks**:
- traversal refused: `/../`, `/assets/../../`, `%2e%2e`, `%2E%2E%2F`, double-encoded `%252e`, `..%5c`,
  backslashes, `%00`, `//etc/passwd`, `/./x`, `//` segments; a whitelisted-name symlink escaping the root
  → 403 (and the secret file planted next to the root is never returned)
- no directory listing (`/assets/`, `/docs/`), repo/dev files 404 (`package.json`, `.git/config`, `*.map`,
  `node_modules/…`, `harness/…`, `server/…`, `docs/…`), dev/debug routes 404 (`/api/save`, `/api/feedback`,
  `/api/lan-info`, `/api/health`, `/api/debug`, `/__harness`, `/admin`), POST/PUT → 405
- join page CSP + no reflection of input; room lookup + mismatch reporting
- relay: seats, host token, MATCH_SETUP/INPUT rebuilt (unknown fields dropped), side spoofing / joiner
  setup / out-of-range mask not relayed, no cross-room delivery, third player refused, mismatched build
  hash / missing hash / wrong stamp / bad host token refused and never seated
- oversize message → 1009, flood → 4008, junk → 4003, foreign Origin → 403, tunnelled legacy path → 404,
  brute-force room codes → 429 on HTTP and WS (other IPs unaffected)
- room close → `bye` + 4100; closed code rejected politely; `close()` frees the port; port clash → another
  port

`node harness/msv1_host_tunnel.test.mjs` (stub cloudflared): URL parsing, restart → new URL, stop kills the
process (no orphan), start fails fast, checksum mismatch refuses install, tampered cached binary ignored,
controller degrade path (tunnel fails → LAN online + clear message), Stop closes the port and kills the tunnel.

`node harness/msv1_host_e2e.mjs` (real Electron app + real Chromium): Stop Hosting and quitting the app leave
the port closed (`lsof`) and no tunnel process; mismatched desktop build refused at pre-check **and** at the
relay; the IPC surface works only from the app window.

# Desktop app (Electron) — feasibility PoC

Proof-of-concept wrapping **Multiverse Smash Ultimate** as a standalone desktop app (its own window,
title, and taskbar/dock entry — no browser tab). This folder is an **isolated experiment**: it has its
own `package.json`, so the main project keeps its single dependency (`playwright`). Nothing in the game
was modified.

## Run it

```bash
# from the repo root:
npm run desktop            # opens the game in a real desktop window
npm run desktop:capture    # headless: screenshots the window → electron/shots/poc.png, then quits

# or from electron/:
npm install                # one-time (downloads the Electron runtime, ~100 MB)
npm start
```

Screenshots proving it runs: `electron/shots/poc.png` (main menu) and `electron/shots/poc_battle.png`
(a live Miwa-vs-Maki match — `CAPTURE=1 BATTLE=1`).

## How it works (and the one real gotcha)

The game is a pure static web app: ES modules + `<script type="importmap">` + relative image/mp3 assets.

**The gotcha:** Chromium **blocks module scripts loaded over `file://`** (the origin becomes `null`, so
the import-map and every `import`/dynamic-`import()` fail CORS). So we can't just `loadFile(index.html)`.

**The fix (clean, zero game changes):** `electron/main.mjs` runs the project's **own** dev-server logic —
the exact live import-map injection from `tools/serve.mjs` / `tools/stamp_version.mjs` — on a random
localhost port inside the Electron main process, then `loadURL('http://127.0.0.1:PORT')`. The Electron
runtime is now byte-for-byte identical to a real browser / GitHub Pages, so **the game code needs no
changes at all.**

## Browser-API audit (Step 1 findings)

| API in use | File | Under Electron |
|---|---|---|
| ES modules + import-map + dynamic `import()` | `index.html`, `sprite.js` | ✅ once served over `http://localhost` (see gotcha) |
| `localStorage` (progression, session, account fallback) | `account.js`, `progression.js`, `session.js` | ✅ persists per-app (Chromium partition in userData) |
| File System Access API (`showOpen/SaveFilePicker`) | `account.js` | ✅ already gated behind `isFileApiSupported()` with a **localStorage fallback**; localhost is a secure context so the picker even works, but nothing breaks if it doesn't |
| `navigator.getGamepads()` (controllers) | `input.js` | ✅ works (Chromium) |
| Fullscreen API (`requestFullscreen` + `F` key) | `game.js` | ✅ works inside the window (could also add native window fullscreen later) |
| Web Audio / `HTMLAudioElement`, autoplay-gated | `sound.js` | ✅ already resumes on first gesture |
| `window.location.search` (`?harness` / `?session`) | `game.js` | ✅ harmless; defaults when absent |

**No browser-specific code needs rewriting.** The save-file feature is the only "different" surface and it
already self-detects and degrades. Everything else is standard Chromium, which is exactly what Electron is.

## Remaining scope to ship a real distributable

The PoC proves the approach is **clean and contained**. The rest is standard, well-trodden packaging work
— none of it requires touching game code:

| Task | Effort | Notes |
|---|---|---|
| App icon (`.icns` mac / `.ico` win / `.png` linux) | ~S | Make one 1024² source → generate the formats |
| Packaging config (`electron-builder`) | ~S–M | One `build` block; targets dmg/nsis/AppImage |
| Installers (macOS `.dmg`, Windows `.exe`/NSIS, Linux `AppImage`) | ~M | `electron-builder` produces all three; per-OS builds |
| Bundle the static assets into the app | ~S | Ship the repo files as `extraResources` and keep the tiny embedded localhost server (current approach), **or** switch to a custom `app://` protocol handler to drop the port entirely (~S–M) |
| Code-signing + notarization (mac) / Authenticode (win) | ~M | Needs paid Apple Developer ($99/yr) + Windows cert; only required to avoid "unidentified developer" warnings |
| Auto-update (optional) | ~M | `electron-updater` + a release host |

**Estimate:** a signed, installable build on all three OSes is roughly a **1–3 day** focused task
(most of it icon art + signing certificates + per-OS build runs), **not** a rewrite. The risky part —
"will the game even run in the wrapper" — is already answered: **yes, with no code changes.**

## Recommendation

Green-light as a **separate, schedulable packaging task**, not entangled with character/gameplay work.
The engine is Electron-ready today; what remains is icon/build/signing plumbing that can be done in one
sitting whenever distribution is actually wanted.

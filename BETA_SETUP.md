# Multiverse Smash Ultimate — Run It On Another PC (Beta Setup)

This guide gets the game running as a **standalone fullscreen desktop app** on a
second computer (the beta tester's machine). The desktop launcher is verified
rendering a real match, and a fresh checkout has been test-booted end-to-end.

**Single source of truth:** everything you need is committed to **`origin/main`**
(GitHub: `Omololu457/multiverse-smash`). `origin/main` was pushed and confirmed
byte-identical to the reviewed local `main` — clone/copy that, not a stray local
folder.

---

## TL;DR (the fast path)

```
git clone https://github.com/Omololu457/multiverse-smash.git
cd multiverse-smash/electron
npm install            # one time, needs internet — downloads Electron for THIS OS
cd ..
npm run desktop        # launches the fullscreen game
```

That's the whole thing. The rest of this doc explains transfer options, exactly
what is / isn't in git, and a browser fallback.

---

## Prerequisites (the other PC needs these)

- **Node.js 18 or newer** (LTS 20 or 22 recommended). Check: `node -v`.
  Get it from https://nodejs.org (the LTS installer includes `npm`).
- **~5 GB free disk** (repo checkout ≈ 3 GB of assets + ~1.6 GB git history +
  ~265 MB of `node_modules` after install).
- **Git** (only if you use the clone method) — https://git-scm.com.
- Windows, macOS, or Linux all work (Electron is cross-platform).
- Internet is needed **once**, during `npm install` (to download the Electron
  runtime). **No internet is needed to play.**

---

## How to get the project onto the new PC — two options

The repo is large because it ships the real assets: **~34,700 sprite PNGs and
~8,970 audio clips**. Concrete sizes:

| Thing | Size |
|---|---|
| `git clone` download (packed history) | **≈ 1.63 GiB** |
| Working files after checkout (assets + code) | **≈ 3 GB** |
| `.git` history folder on disk | ≈ 1.6 GB |
| `node_modules` after install (root + electron) | ≈ 265 MB |

### Option 1 — `git clone` from origin  ✅ RECOMMENDED

```
git clone https://github.com/Omololu457/multiverse-smash.git
```

- Pros: one command, pulls the exact reviewed `main`, and you can `git pull`
  later to get fixes during the beta.
- ~1.63 GiB over the network — fine on normal broadband (a few minutes). The
  checkout then writes ~44,000 files, which can take a minute or two on the
  target disk. Let it finish.
- Caveat: a plain `git clone` doesn't resume if the connection drops. On a
  slow/flaky link, prefer Option 2.

### Option 2 — Direct folder copy (offline / flaky-network reliable)

Copy the project folder via USB drive or LAN share, but **leave out** the two
big, rebuildable/host-specific folders:

```
# run in the project root on THIS machine:
zip -r multiverse-smash.zip . -x '.git/*' -x 'node_modules/*' -x 'electron/node_modules/*'
```

Copy `multiverse-smash.zip` to the other PC and unzip. This is the most reliable
route when the network is slow — no clone to interrupt. (Dropping `.git` shrinks
the transfer to the ~3 GB of working files; you lose `git pull`, so re-copy to
update.)

> ⚠️ **Never copy `node_modules/` between machines** — see the next section.

---

## What is NOT in git (and what that means for the transfer)

Audited on this pass — here is everything the app needs that is *not* tracked:

- **`node_modules/` (root) and `electron/node_modules/`** — gitignored; rebuilt by
  `npm install`. **Must be reinstalled on the target, not copied**, because
  `electron/node_modules` contains **native binaries compiled for the source OS**
  (e.g. a macOS build won't run on a Windows PC). Copying them across machines
  will fail or crash — always run `npm install` fresh on the target.
- **Nothing else is required.** There are **no `.env` files, no API keys, and no
  secrets** anywhere in the project (verified: the only environment variable used
  is an optional `PORT`, default `8000`). The game runs fully offline with zero
  configuration.
- `saves/` (local player save data) is gitignored and **not needed** — it is
  created automatically at runtime; the tester starts with a fresh profile.
- `harness/shots/`, `electron/shots/`, atlas-map intermediates, `.DS_Store`, logs
  — all regenerable test/tool artifacts, not needed to play.

So the complete "not in git" checklist to act on is exactly one item:
**run `npm install` in `electron/` on the new PC.** Nothing must be hand-copied.

---

## Install + launch (after transfer)

### 1. Install the Electron runtime (one time, needs internet)

```
cd electron
npm install
cd ..
```

That downloads Electron for the target OS. You do **not** need `npm install` in
the project root to *play* — the root deps are only test tooling (Playwright).

### 2. Launch the game (recommended — desktop app)

From the project root:

```
npm run desktop
```

The game opens **fullscreen** as its own window (no browser, no menu bar). Click
**PLAY / PRESS START** and you're in.

- Controls: keyboard by default; plug in an Xbox/PlayStation pad and it's
  auto-detected on the title screen.
- Progress auto-saves to a real file in the OS user-data folder (survives a hard
  crash).
- Quit: `Alt+F4` (Windows) / `Cmd+Q` (macOS) / close from the OS.

### 2b. Browser fallback (if Electron won't install)

If `npm install` in `electron/` fails on the target (rare — usually a proxy or
old Node), you can still run the game in a browser with zero native deps:

```
npm install            # root — for the tiny static server
npm run dev            # serves the game at http://localhost:8000
# then open http://localhost:8000 in Chrome/Edge/Firefox
```

`npm run dev` also runs a local save-server so progress persists; `npm run
dev:noserver` is a static-only variant. The gameplay is identical; you just lose
the standalone-window / auto-fullscreen polish of the desktop app.

---

## Method B — one-click installer (.dmg / .exe): NOT built yet (honest status)

The desktop app **works** (real Electron app: fullscreen, stripped chrome,
durable saves, controller support) — but it is **not** wrapped into a
double-click installer. Reasons are concrete:

- **Large asset payload (~3 GB)** — ~9,000 audio + ~34,700 sprite files must ship
  *unpacked* (read from disk at runtime), so a packaged app is multi-GB.
- `electron/main.mjs` serves the game from the **parent** folder via a tiny local
  server; packaging needs an `app.isPackaged` path branch +
  `extraResources`/`asarUnpack`.
- A macOS build can't produce a Windows `.exe` without building on/for each OS.
- A real installer can only be *trusted* after installing on a clean machine.

**Path to a real installer** (future work): add `electron-builder` to `electron/`,
make `REPO` resolve to bundled assets when `app.isPackaged`, ship the game tree as
unpacked resources (exclude `.git`, `node_modules`, `harness/`, `*.test.mjs`),
build per-OS (`mac` dmg, `win` nsis, `linux` AppImage), then verify on a clean PC.

Until then, **the clone/copy + `npm run desktop` path above is the reliable way**
and delivers the identical desktop experience.

---

## Quick troubleshooting

- `node -v` prints nothing / "command not found" → Node isn't installed (see
  Prerequisites).
- `npm run desktop` errors about Electron → you skipped `npm install` in
  `electron/`, or copied `node_modules` from another machine (delete
  `electron/node_modules` and re-run `npm install` in `electron/`).
- Black window / no assets → make sure you launched from the **project root**
  (`npm run desktop`), not from inside `electron/`.
- Port 8000 in use (browser fallback) → `PORT=8080 npm run dev`.

# Multiverse Smash Ultimate — Run It On Another PC (Beta Setup)

This guide gets the game running as a **standalone fullscreen desktop app** on
another computer. It has been tested and works today (the desktop launcher was
verified rendering a real match on this machine).

There are two ways to run it. **Method A (copy the folder + Node) is the
recommended, proven path.** Method B (a one-click installer) is not built yet —
see "Why no installer yet" at the bottom for the honest status.

---

## Prerequisites (the other PC needs these)

- **Node.js 18 or newer** (LTS 20 or 22 recommended). Check with: `node -v`
  - Get it from https://nodejs.org (the LTS installer includes `npm`).
- **~4 GB of free disk space** (the game ships a lot of audio + sprite art).
- Windows, macOS, or Linux — all work; Electron is cross-platform.
- No internet is needed to *play*. Internet is only needed once, during setup,
  so `npm install` can download the Electron runtime.

---

## Method A — Copy the folder and run (recommended, proven)

### 1. Get the game folder onto the other PC

You do **not** need the git history. Copy the project folder but **leave out**
the two big/rebuildable directories:

- `.git/`        (1.7 GB of history — not needed to play)
- `node_modules/` and `electron/node_modules/` (rebuilt by `npm install`)

Easiest options:

- **Zip it (skipping the heavy folders), then transfer the zip:**
  ```
  # run this on THIS machine, in the project root:
  zip -r multiverse-smash.zip . -x '.git/*' -x 'node_modules/*' -x 'electron/node_modules/*'
  ```
  Copy `multiverse-smash.zip` to the other PC (USB drive, network share, etc.)
  and unzip it.

- **Or, if the other PC has git access to the repo:**
  ```
  git clone <repo-url> multiverse-smash
  ```

### 2. Install the Electron runtime (one time, needs internet)

On the other PC, open a terminal in the project folder and run:

```
cd electron
npm install
cd ..
```

That downloads Electron. (You do **not** need to run `npm install` in the
project root — that only pulls test tooling, which isn't needed to play.)

### 3. Launch the game

From the project root:

```
npm run desktop
```

The game opens **fullscreen** as its own application window — no browser, no
menu bar. Click **PLAY / PRESS START** and you're in.

- Controls: keyboard by default; plug in an Xbox/PlayStation controller and it's
  detected automatically (the launcher unlocks the gamepad on the title screen).
- Progress is saved automatically to a real file in your OS user-data folder, so
  it survives even a hard crash.
- To quit: `Cmd/Ctrl` isn't bound to a menu; use `Alt+F4` (Windows), `Cmd+Q`
  (macOS), or close from the OS.

That's it. Method A gives the full desktop experience.

---

## Method B — One-click installer (.dmg / .exe)

**Not built yet.** The desktop wrapper in `electron/` is currently a launcher you
start with `npm run desktop` (Method A), not a packaged installer you
double-click. Building a true installer is a known, scoped piece of future work —
see below.

---

## Why no installer yet (honest status)

The desktop app **works** — it's a real Electron app with fullscreen, stripped
browser chrome, durable saves, and controller support. What isn't done is
wrapping it into a distributable `.dmg`/`.exe` installer. The reasons are
concrete, not hand-waving:

- **Large asset payload (~3 GB).** The game bundles ~9,000 audio clips and
  ~41,000 sprite images. A packaged app has to carry all of that, so the
  installer would be multi-gigabyte and the assets must be shipped *unpacked*
  (they're read from disk at runtime, not from inside the compressed app blob).
- **Architecture detail.** `electron/main.mjs` runs a tiny local web server and
  serves the game from the **parent** project folder. Packaging needs that path
  resolution reworked for the packaged layout (an `app.isPackaged` branch plus
  `extraResources`/`asarUnpack` config) — safe to do, but real work.
- **Cross-platform.** A macOS build can't produce a Windows `.exe` (and vice
  versa) without building on/for each target OS.
- **Single-machine verification limit.** Even if built here, a real installer
  can only be *trusted* after installing it on a clean second machine — which
  wasn't available for this pass.

### The path to a real installer (for whoever picks this up)

1. Add `electron-builder` as a dev dependency in `electron/`.
2. In `electron/main.mjs`, make `REPO` resolve to the bundled assets when
   `app.isPackaged` is true (keep the current parent-folder logic for dev).
3. Add an `electron-builder` config that ships the game tree (js modules,
   `index.html`, `tools/stamp_version.mjs`, and the audio/sprite assets) as
   unpacked resources, while excluding `.git`, `node_modules`, `harness/`, and
   `*.test.mjs`.
4. Build per target OS: `mac` (dmg/zip), `win` (nsis), `linux` (AppImage).
5. **Verify by installing on a clean machine** before shipping to testers.

Until that's done, **Method A is the reliable way to get the game running on
another PC**, and it delivers the identical desktop experience.

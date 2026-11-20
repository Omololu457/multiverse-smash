# MSV1-HOST — Releasing the desktop app (GitHub Releases)

## Cutting a release

1. Pick the version (semver: `MAJOR.MINOR.PATCH`). Bump `electron/package.json` → `"version"`.
   The desktop app reports this as its version. The join handshake does **not** use it to decide
   compatibility; it compares the gameplay-code hash (`__ASSET_V`), so two builds with the same version but
   different game code still refuse each other, and the message shows both versions.
2. Commit that bump on `main` and push it.
3. Tag and push the tag (this is what starts the build; do it yourself, nothing here pushes tags):
   ```sh
   git tag v0.1.0
   git push origin v0.1.0
   ```
4. `.github/workflows/release.yml` builds on four runners: macOS arm64 (`.dmg`), macOS Intel (`.dmg`),
   Windows x64 (NSIS **installer** `.exe` + **portable** `.exe`) and Linux x64 (`.AppImage`). It checks
   that the tag equals `electron/package.json`'s version, bundles the SHA-256-verified cloudflared, stages
   only the client whitelist, builds, checks the size limit, and creates the GitHub Release with all files.
5. Friends download from **https://github.com/Omololu457/multiverse-smash/releases/latest**. The app's "Download"
   buttons and the version-mismatch dialog point there.

Local build (current platform only):
```sh
cd electron && npm ci && cd ..
node electron/scripts/stage.mjs                    # → electron/stage/ (hard links, no extra disk)
cd electron && npx electron-builder --dir          # unpacked app in electron/dist/ (quick smoke test)
cd electron && npx electron-builder --mac dmg      # or --win nsis portable / --linux AppImage
```

### ⚠️ Size: GitHub's 2 GiB per-file limit
The game client is **~68k files, ~2.35 GB** (mostly sprite PNGs and audio, already compressed), so each
installer comes out at roughly 2.2–2.4 GB. GitHub refuses release assets ≥ 2 GiB, and the workflow fails with
a clear error if an installer is over. If that happens, the options are:
- trim unused art/audio from the repo (the biggest lever; many root-level source sheets are probably not loaded
  by the game);
- move large media to Git LFS + a CDN and have the app fetch them on first run;
- publish the installers somewhere without the cap (e.g. a cloud bucket) and link it from the Release notes.
Browser friends are unaffected: they load the game from your host, file by file.

## Unsigned-app warnings (and how a friend gets past them)

The builds are **not code-signed** (signing needs paid certificates).

- **Windows SmartScreen**: "Windows protected your PC". Click **More info → Run anyway**. The portable `.exe`
  shows the same prompt.
- **macOS Gatekeeper**: "can't be opened because Apple cannot check it for malicious software".
  **Right-click the app → Open → Open**, or System Settings → Privacy & Security → **Open Anyway**.
  If macOS says the app **"is damaged and can't be opened"** (unsigned Apple-silicon apps downloaded from a
  browser), move it to Applications and run once in Terminal:
  `xattr -cr "/Applications/Multiverse Smash.app"`.
- **Linux AppImage**: `chmod +x Multiverse*.AppImage` then run it. For `multiversesmash://` links to open the
  app, the AppImage must be integrated into your desktop (e.g. AppImageLauncher, or the app registers itself
  on first run where supported).

### Where signing would go (not set up)
Never commit keys. In GitHub: **Settings → Secrets and variables → Actions**:
- macOS: `CSC_LINK` (base64 .p12 Developer ID cert), `CSC_KEY_PASSWORD`, plus `APPLE_ID`,
  `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID` for notarization.
- Windows: `WIN_CSC_LINK` / `WIN_CSC_KEY_PASSWORD` (or an Azure Trusted Signing setup).
Then remove `CSC_IDENTITY_AUTO_DISCOVERY: "false"` and pass those secrets as env to the build step.

## The protocol: `multiversesmash://`

Declared in `electron/package.json → build.protocols`, so the installers register it (macOS Info.plist
`CFBundleURLTypes`, Windows registry via NSIS, Linux `.desktop` `x-scheme-handler`). The app also calls
`app.setAsDefaultProtocolClient` at runtime (covers the Windows portable build and dev mode).
- `multiversesmash://open` → open/focus the app and start hosting
- `multiversesmash://join?link=<join link>&room=<CODE>` → open/focus the app and join that room

---

## How to play with a friend (same Wi-Fi)

**Host (desktop app):** on the title screen press **PLAY WITH A FRIEND**. Click the link that appears. It opens in
your browser with a **Copy link** button (or copy it from the address bar). Send it to your friend.

**Paste this to your friend:**

> **Come play Multiverse Smash with me!**
> 1. Make sure you're on the **same Wi-Fi** as me.
> 2. Open this link: **<paste the link>**
> 3. Press **JOIN THE GAME**. No download needed, it runs in your browser (the first load can take a minute).
> 4. Pick your fighter. I pick mine on my screen, then I choose the stage and we fight.

Each player sees their own screen and picks their own fighter. The match only starts when both builds are identical
(if not, the game says so and links to the download page).

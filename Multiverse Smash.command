#!/bin/bash
# Multiverse Smash — double-click launcher (macOS).
#
# Launches the game's Electron wrapper DETACHED from this Terminal. Two reasons this shape:
#  1) Gatekeeper: on macOS 15+/26 an unsigned custom .app is hard-blocked ("… Not Opened … Done"),
#     so we can't ship a plain double-click .app without a paid Apple Developer ID + notarization.
#  2) Lifecycle: we launch via `open -a` the Electron runtime — which IS notarized by the Electron team,
#     so it isn't Gatekeeper-blocked — and because `open` hands off to macOS launchd, the game's parent
#     becomes launchd (PID 1), NOT this Terminal. That means closing/quitting this Terminal window can no
#     longer kill the game (a plain `exec` would attach it to the tty and it would die on SIGHUP the moment
#     the Terminal closed — the "opens then closes on its own" symptom).
#
# (Opening index.html directly still does NOT work: the browser CORS-blocks the ES modules over file://
# and it hangs on the loading screen — there is no Electron process there.)
cd "$(dirname "$0")" 2>/dev/null || true
REPO="$(pwd)"
[ -d "$REPO/electron" ] || REPO="/Users/omololu/Desktop/project/multiverse-smash"
APP="$REPO/electron/node_modules/electron/dist/Electron.app"

# First run: install the Electron runtime if missing (needs Node/npm once).
if [ ! -d "$APP" ]; then
  echo "Setting up the desktop runtime (first launch only)…"
  ( cd "$REPO/electron" && npm install ) || true
fi
if [ ! -d "$APP" ]; then
  echo "ERROR: the Electron runtime is missing and could not be installed."
  echo "Open Terminal in the project folder and run:  npm --prefix electron install"
  echo "Press any key to close."; read -n 1 -s; exit 1
fi

# Launch detached (parent = launchd). The game loads electron/ (package.json main = main.mjs).
open -a "$APP" --args "$REPO/electron"
echo "Multiverse Smash is launching in its own window — you can close this Terminal window."

# RUN_DESKTOP_APP.py — open this file in PyCharm and press Run (▶). The Multiverse Smash desktop app opens.
#
# What it does: starts the game's Electron desktop runtime pointed at this project's `electron/` folder
# (the same thing "Multiverse Smash.command" does). Electron is launched through macOS `open`, so the game
# keeps running after this script finishes — you can close the Run tab.
import os
import subprocess
import sys

REPO = os.path.dirname(os.path.abspath(__file__))
APP = os.path.join(REPO, "electron", "node_modules", "electron", "dist", "Electron.app")
GAME = os.path.join(REPO, "electron")

if sys.platform != "darwin":
    sys.exit("This launcher is for macOS. On other systems run:  npm --prefix electron start")

# First run only: install the desktop runtime if it is missing.
if not os.path.isdir(APP):
    print("Setting up the desktop runtime (first launch only)…")
    subprocess.run(["npm", "install"], cwd=GAME)
if not os.path.isdir(APP):
    sys.exit("The Electron runtime is missing. In a terminal in the project folder run:  npm --prefix electron install")

# -n = always start a NEW app instance with the game folder (if a plain Electron window is already open, a
# normal `open` would just bring that empty window to the front instead of starting the game).
subprocess.run(["open", "-n", "-a", APP, "--args", GAME], check=True)
print("Multiverse Smash is opening in its own window.")

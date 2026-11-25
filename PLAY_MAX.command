#!/bin/bash
# Multiverse Smash — MAX PERFORMANCE launcher (macOS). Double-click me.
cd "$(dirname "$0")" || exit 1
export PATH="$PATH:/opt/homebrew/bin:/usr/local/bin"
if ! command -v node >/dev/null 2>&1; then
  echo; echo "  Node.js is not installed. Get the LTS installer from https://nodejs.org, run it, then double-click this again."; echo
  open "https://nodejs.org/en/download"; read -n 1 -s -r -p "Press any key to close."; exit 1
fi
node PLAY_MAX.mjs "$@" || { read -n 1 -s -r -p "Press any key to close."; }

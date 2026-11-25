#!/usr/bin/env bash
# Multiverse Smash — MAX PERFORMANCE launcher (Linux).  ./play_max.sh  [--fullscreen] [--tier=max]
cd "$(dirname "$0")" || exit 1
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is not installed. Install the LTS from https://nodejs.org (or: sudo apt install nodejs), then run this again."; exit 1
fi
exec node PLAY_MAX.mjs "$@"

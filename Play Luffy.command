#!/bin/bash
# Double-click in Finder. The server survives this Terminal window closing.
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
cd "$(dirname "$0")" || exit 1
if ! command -v node >/dev/null 2>&1; then
  echo 'Node.js is required. Install Node, then double-click Play Luffy.command again.'
  read -r -p 'Press Return to close. '
  exit 1
fi
node tools/launch-luffy.mjs
result=$?
if [ "$result" -ne 0 ]; then
  echo 'Luffy did not open. See the error above; no existing servers were stopped.'
  read -r -p 'Press Return to close. '
fi
exit "$result"

#!/bin/bash
# tools/msv2/sync_test.sh <test-tree> — refresh an exported test tree: this build's files (FILES.txt) + the hooked
# versions of the shared files (hooks applied to the branch tip's clean blobs). The main worktree is never written.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
T="$1"
for f in $(grep -v '^#' tools/msv2/FILES.txt | grep -v '^$'); do
  if [ -d "$f" ]; then mkdir -p "$T/$f"; rsync -a --exclude __pycache__ "$f/" "$T/$f/"; else mkdir -p "$T/$(dirname "$f")"; cp "$f" "$T/$f"; fi
done
for f in harness/msv2*.mjs; do [ -e "$f" ] && cp "$f" "$T/harness/"; done
python3 tools/msv2/hooks.py export "$T" >/dev/null
echo synced "$T"

#!/bin/bash
# Enoch phase commit through a PRIVATE index (the shared index / other sessions' work is never touched).
#   tools/enoch/commit_phase.sh MSGFILE [--hooked DIR] PATH...
#   PATH...        files (or dirs) taken from the working tree, staged by explicit path
#   --hooked DIR   shared files rebuilt as HEAD + Enoch's hooks only (tools/enoch/apply_hooks.py --head HEAD --out DIR);
#                  every file under DIR is staged from DIR (the worktree copy may carry other sessions' hunks)
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
MSG="$1"; shift; HOOKED=""
if [ "${1:-}" = "--hooked" ]; then HOOKED="$2"; shift 2; fi
IDX="$(mktemp -t enoch-idx)"; trap 'rm -f "$IDX"' EXIT
export GIT_INDEX_FILE="$IDX"
git read-tree HEAD
for p in "$@"; do git add -- "$p"; done
if [ -n "$HOOKED" ]; then
  (cd "$HOOKED" && find . -type f | sed 's|^\./||') | while read -r f; do
    h=$(git hash-object -w "$HOOKED/$f"); mode=100644; git update-index --add --cacheinfo "$mode,$h,$f"
  done
fi
echo "--- staged vs HEAD:"; git diff --cached --stat HEAD | tail -3
git commit -q -F "$MSG"
unset GIT_INDEX_FILE
# refresh the shared index for exactly these paths (one call per path: bulk resets were seen to no-op)
for p in "$@"; do git reset -q -- "$p" 2>/dev/null || true; done
if [ -n "$HOOKED" ]; then (cd "$HOOKED" && find . -type f | sed 's|^\./||') | while read -r f; do git reset -q -- "$f" 2>/dev/null || true; done; fi
git log --oneline -1

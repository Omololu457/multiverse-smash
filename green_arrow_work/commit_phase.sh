#!/usr/bin/env bash
# Private-index commit onto feat/green-arrow. Stages ONLY the explicit paths given
# as args; NEVER touches the real index / worktree / the 867 foreign changes.
#   usage: commit_phase.sh <msgfile> <path1> [path2 ...]
set -euo pipefail
BR=refs/heads/feat/green-arrow
MSG="$1"; shift
[ $# -ge 1 ] || { echo "no paths"; exit 1; }

PARENT=$(git rev-parse "$BR")
TMPIDX=$(mktemp /tmp/ga_idx.XXXXXX)
export GIT_INDEX_FILE="$TMPIDX"
git read-tree "$BR"                      # start from branch tip's tree
git add -- "$@"                          # stage ONLY my explicit paths into temp index
TREE=$(git write-tree)
COMMIT=$(git commit-tree "$TREE" -p "$PARENT" -F "$MSG")
git update-ref "$BR" "$COMMIT" "$PARENT" # guarded on old value (fails if branch moved)
unset GIT_INDEX_FILE; rm -f "$TMPIDX"

echo "=== committed $COMMIT onto feat/green-arrow (parent $PARENT) ==="
echo "--- files in this commit (vs parent) ---"
git diff --name-status "$PARENT" "$COMMIT"
echo "--- foreign-change guard: real tree still dirty & untouched ---"
echo "real HEAD = $(git rev-parse --short HEAD) (branch: $(git branch --show-current))"
echo "tracked changes in real index/worktree: $(git status --porcelain | grep -cE '^( M|M |D |MM| D|A )' || true)"

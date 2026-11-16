#!/bin/bash
# Enoch phase commit through a PRIVATE index (the shared index and other sessions' work are never touched).
#   tools/enoch/commit_phase.sh MSGFILE TESTTREE PATH...
#   PATH...    Enoch's own files / dirs, staged by explicit path from the working tree
#   TESTTREE   the tree tools/enoch/test_tree.sh built and the tests ran on: Enoch's hooked shared files and its stamped
#              index.html are taken from THERE (HEAD + Enoch's lines only — the worktree copies carry another session's
#              uncommitted hunks). --no-verify: the pre-commit stamp hook would stamp the dirty worktree instead; the
#              same stamp (tools/stamp_version.mjs) was already run inside the test tree. The commit is built with write-tree /
#              commit-tree / update-ref (old-value checked), so nothing else in the repo is rehashed or touched.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
MSG="$1"; TT="$2"; shift 2
SHARED="$(python3 -I tools/enoch/apply_hooks.py --list)"
IDX="$(mktemp -t enoch-idx)"; trap 'rm -f "$IDX"' EXIT
export GIT_INDEX_FILE="$IDX"
git read-tree HEAD
for p in "$@"; do git add -- "$p"; done
for f in $SHARED index.html; do
  h=$(git hash-object -w "$TT/$f"); git update-index --add --cacheinfo "100644,$h,$f"
done
echo "--- staged vs HEAD:"; git diff --cached --stat HEAD | tail -4
OLD=$(git rev-parse HEAD); TREE=$(git write-tree)
NEW=$(git commit-tree "$TREE" -p "$OLD" -F "$MSG")   # plumbing: no full-repo index refresh (a fresh private index has no stat cache)
git update-ref -m "commit: $(head -1 "$MSG")" "$(git symbolic-ref HEAD)" "$NEW" "$OLD"   # refuses if HEAD moved meanwhile
unset GIT_INDEX_FILE
for p in "$@" $SHARED; do git reset -q -- "$p" 2>/dev/null || true; done   # shared index: those paths now match the new HEAD
git log --oneline -1

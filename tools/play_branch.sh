#!/usr/bin/env bash
# play_branch.sh <branch>
# ---------------------------------------------------------------------------
# Spin up (or reuse) a SIBLING git worktree so you can play a fighter branch
# WITHOUT disturbing the main project folder. Then print the exact launch
# commands.
#
# HARD SAFETY GUARANTEES (by construction):
#   * NEVER touches / modifies / checks out / commits in the MAIN folder.
#   * NEVER runs: git stash, git reset --hard, git clean, git checkout -f.
#   * DELETES NOTHING. If a target path is in the way, it refuses and stops.
#   * If the branch is already checked out somewhere, it REUSES that worktree
#     (and refuses outright if that somewhere is the main folder).
#
# Usage:   bash tools/play_branch.sh naruto-hokage
# ---------------------------------------------------------------------------
set -euo pipefail

BRANCH="${1:-}"
if [ -z "$BRANCH" ]; then
  echo "usage: tools/play_branch.sh <branch>" >&2
  exit 2
fi

# Must be inside the git repo.
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "ERROR: run this from inside the multiverse-smash git repo." >&2
  exit 2
fi

# The FIRST worktree listed is the primary (main) worktree — the one we must
# never touch. We only ever create/operate on SIBLING folders beside it.
MAIN_WT="$(git worktree list --porcelain | awk '/^worktree /{print $2; exit}')"
PARENT="$(dirname "$MAIN_WT")"
PLAY_DIR="$PARENT/multiverse-smash-play-$BRANCH"

echo "main folder (protected, never touched): $MAIN_WT"

# 1) Branch must exist locally or on origin.
if ! git show-ref --verify --quiet "refs/heads/$BRANCH"; then
  if git ls-remote --heads origin "$BRANCH" 2>/dev/null | grep -q .; then
    echo "note: '$BRANCH' is on origin but not local — fetching a local ref (no checkout, no merge)…"
    git fetch origin "$BRANCH:$BRANCH"
  else
    echo "ERROR: branch '$BRANCH' does not exist locally or on origin." >&2
    echo "       (nothing to play — it may never have been created/pushed.)" >&2
    exit 1
  fi
fi

# 2) Already checked out in a worktree? Reuse it (refuse if that's the main folder).
EXISTING="$(git worktree list --porcelain | awk -v br="refs/heads/$BRANCH" '
  /^worktree /{p=$2} /^branch /{if ($2==br) print p}')"
if [ -n "$EXISTING" ]; then
  if [ "$EXISTING" = "$MAIN_WT" ]; then
    echo "ERROR: '$BRANCH' is checked out in the MAIN folder ($MAIN_WT)." >&2
    echo "       This script refuses to touch the main folder. Either play from there" >&2
    echo "       directly, or switch the main folder off this branch yourself first." >&2
    exit 1
  fi
  echo "✓ '$BRANCH' is already checked out at: $EXISTING  — reusing it."
  PLAY_DIR="$EXISTING"
else
  # 3) Create a fresh sibling worktree. Refuse if the path is already occupied.
  if [ -e "$PLAY_DIR" ]; then
    echo "ERROR: '$PLAY_DIR' already exists but is not a worktree for '$BRANCH'." >&2
    echo "       Refusing to overwrite or delete it. Move/rename it yourself." >&2
    exit 1
  fi
  echo "Creating sibling worktree: $PLAY_DIR  ->  $BRANCH"
  git worktree add "$PLAY_DIR" "$BRANCH"
fi

# 4) npm install ONLY if node_modules is missing (it is per-folder, not in git).
if [ ! -d "$PLAY_DIR/node_modules" ]; then
  echo "node_modules missing — running 'npm install' in the play folder (slow, one-time)…"
  ( cd "$PLAY_DIR" && npm install )
else
  echo "✓ node_modules present — skipping npm install."
fi

# 5) Print exact launch commands.
cat <<EOF

────────────────────────────────────────────────────────────────────────
READY — play '$BRANCH' from its own folder (main folder untouched):

  cd "$PLAY_DIR"
  npm run stamp                 # refresh cache-bust hash (safe, idempotent)
  npm run dev                   # browser → http://127.0.0.1:8000  (HARD-REFRESH)

  # If port 8000/8787 is busy, pick free ones:
  PORT=8001 LAN_PORT=8788 npm run dev

  # Desktop (Electron) needs a ONE-TIME per-folder install first:
  npm --prefix "$PLAY_DIR/electron" install
  cd "$PLAY_DIR" && npm run desktop
────────────────────────────────────────────────────────────────────────
EOF

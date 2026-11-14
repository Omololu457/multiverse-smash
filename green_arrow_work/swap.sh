#!/usr/bin/env bash
# Temporarily materialize clean GA files into the Zoro-tainted worktree for render-checks,
# then restore the worktree byte-identically (foreign dirty state preserved).
#   swap.sh in <srcdir>   # backup worktree copies -> _wtbak, copy srcdir/* over the real paths
#   swap.sh out           # restore _wtbak/* and verify md5, then clear _wtbak
set -euo pipefail
ROOT="/Users/omololu/Desktop/project/multiverse-smash"
cd "$ROOT"
BAK="green_arrow_work/_wtbak"
MODE="${1:-}"
md5of() { md5 -q "$1" 2>/dev/null || md5sum "$1" | cut -d' ' -f1; }

if [ "$MODE" = "in" ]; then
  SRC="${2:?need srcdir}"
  mkdir -p "$BAK"
  for src in "$SRC"/*; do
    f="$(basename "$src")"
    [ -f "$f" ] || continue
    cp "$f" "$BAK/$f"          # backup current (tainted) worktree version
    cp "$src" "$f"             # swap in the clean/edited version
  done
  echo "swapped in from $SRC ($(ls "$SRC" | wc -l | tr -d ' ') files); backups in $BAK"
elif [ "$MODE" = "out" ]; then
  fail=0
  for bak in "$BAK"/*; do
    [ -f "$bak" ] || continue
    f="$(basename "$bak")"
    cp "$bak" "$f"
    if [ "$(md5of "$f")" != "$(md5of "$bak")" ]; then echo "RESTORE MISMATCH: $f"; fail=1; fi
  done
  rm -f "$BAK"/* 2>/dev/null || true
  [ "$fail" = 0 ] && echo "restored worktree byte-identically (foreign state preserved)" || { echo "RESTORE FAILED"; exit 1; }
else
  echo "usage: swap.sh in <srcdir> | swap.sh out"; exit 1
fi

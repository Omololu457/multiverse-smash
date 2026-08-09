#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# stage_nezuko.sh — PREPARED, REVIEW-ONLY. Run manually AFTER review, NOT automatically.
#
# WHAT IT DOES:  git add — ONLY Nezuko's unambiguous untracked FILES (448: sprites, 10
#   skin sets, 58 grunt mp3s, nezukoVoice.js, harness/nezuko_*, gen tool, asset map, etc.).
#   Name-based selection (every path contains "nezuko"); verified 0 non-nezuko matches.
#
# WHAT IT DOES NOT DO (by design):
#   • It does NOT commit — you review `git diff --cached` then commit yourself.
#   • It does NOT touch the shared source files, and it does NOT modify or unstage anyone
#     else's work.
#
# ⚠️  COHERENCE CAVEAT — READ BEFORE COMMITTING:
#   Nezuko's WIRING (her characters.js entry + hooks in abilities.js/combat.js/game.js/
#   skins.js/spritesheets.js) is interleaved LINE-BY-LINE with the Inosuke/Zaraki/Madara
#   builds that are ALSO uncommitted in those same files (e.g. one updateMiscTimers hunk
#   mixes all four; the const-nezuko block is coalesced with const-inosuke). That wiring
#   CANNOT be cleanly carved out by tooling, so this script omits it. Committing FILES-ONLY
#   leaves Nezuko INERT (unregistered — the game won't know about these files). The wiring
#   only becomes an isolatable delta once the Inosuke/Zaraki/Madara shared-file changes are
#   themselves committed. So: use this as the file half; do the wiring half separately once
#   the co-resident builds land.
#
# PRECONDITIONS (enforced; aborts otherwise):
#   1. On branch combo-flow-layer.
#   2. The git index is EMPTY — so a later `git commit` can't sweep in another session's
#      already-staged files (currently ~429 ichigo/madara/inosuke voice files are staged).
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

# guard 1 — branch
b="$(git branch --show-current)"
[ "$b" = "combo-flow-layer" ] || { echo "ABORT: on branch '$b', expected combo-flow-layer."; exit 1; }

# guard 2 — index must be empty (another session may have files staged)
staged="$(git diff --cached --name-only | wc -l | tr -d ' ')"
if [ "$staged" != "0" ]; then
  echo "ABORT: index is NOT empty ($staged file(s) staged — likely another session)."
  echo "       Wait until 'git diff --cached --name-only' is empty, then re-run."
  exit 1
fi

# collect ONLY unambiguous Nezuko untracked files
mapfile -t NZ < <(git status --porcelain | awk '/^\?\?/{print $2}' | grep -E '(^|/)nezuko')
[ "${#NZ[@]}" -gt 0 ] || { echo "ABORT: no Nezuko untracked files found."; exit 1; }

# safety — refuse if anything without 'nezuko' slipped in
bad="$(printf '%s\n' "${NZ[@]}" | grep -viE 'nezuko' || true)"
[ -z "$bad" ] || { echo "ABORT: non-nezuko path in selection:"; echo "$bad"; exit 1; }

echo "Staging ${#NZ[@]} unambiguous Nezuko files (no shared source files, no other-session files)…"
git add -- "${NZ[@]}"

echo
echo "── STAGED (review before committing) ──"
git diff --cached --stat | tail -6
echo
echo "⚠  Shared-file WIRING is NOT staged (interleaved with Inosuke/Zaraki/Madara — see header)."
echo "   A files-only commit leaves Nezuko INERT. Commit only once the wiring can be included."

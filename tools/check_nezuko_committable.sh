#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# check_nezuko_committable.sh — READ-ONLY go/no-go. Is Nezuko's work cleanly committable yet?
# Pure status queries (git diff/status only): NO add / reset / apply / commit. Safe to run anytime.
#
# It verifies BOTH conditions that must hold before a clean, Nezuko-only commit is possible:
#   (1) The git index is EMPTY — no other session's files are staged (a commit now can't sweep them in).
#   (2) Each shared source file's `git diff` contains ONLY Nezuko-related changed lines — i.e. no OTHER
#       uncommitted build's code is interleaved. Comments are stripped and Nezuko lines skipped first, so
#       Nezuko's own "mirrors Rengoku"-style comments do NOT false-trip it; only real other-session CODE
#       (matched at word boundaries so "dragon"≠gon, "excellent"≠cell) counts as a blocker.
#
# Output: an unambiguous  GO ✅  or  NO-GO ⛔  banner + itemised reasons.  Exit 0 = GO, 1 = NO-GO.
# ─────────────────────────────────────────────────────────────────────────────
set -uo pipefail
cd "$(git rev-parse --show-toplevel)"

SHARED=(characters.js abilities.js combat.js game.js skins.js spritesheets.js)
# other playable rosterKeys (NOT nezuko) — presence of any in CODE = another build still interleaved
OTHER='goku|goku_black|vegeta|piccolo|frieza|cell|gojo|megumi|sukuna|omololu|toji|maki|yuji|naruto|sasuke|itachi|tobirama|minato|madara|zenitsu|rengoku|shinobu|inosuke|rick|morty|beerus|ben10|albedo|omniman|omega_ranger|samurai_red_ranger|gold_samurai_ranger|green_samurai_ranger|netero|saiki|killua|flash|gon|batman|hisoka|superman|chrollo|ghostface|miwa|kasumi|zaraki|ichigo'
# COMMITTED shared identifiers Nezuko legitimately reuses (not other-session work) — excluded to avoid a
# false-positive residual at the flip. (Nezuko's applyNezukoOffenseVoice reuses NARUTO_COMBO_BURST_MIN.)
ALLOW='NARUTO_COMBO_BURST_MIN'
# ⚠ HEURISTIC, not an oracle: it may OVER-count (a committed shared const it doesn't know to allow) or
# UNDER-count (other-session code with char-agnostic field names like bbaCd/chargeDashCd/_shikaiActive
# carry no char token). It is a reliable NO-GO detector and a good "getting closer" gauge — but when it
# reaches GO, glance at `git diff <file>` once to confirm the residual before committing.

fail=0
echo "── Nezuko commit readiness ─────────────────────────────────"

# (1) index must be empty
staged=$(git diff --cached --name-only | wc -l | tr -d ' ')
if [ "$staged" = "0" ]; then
  echo "  [1] git index EMPTY .......................... OK"
else
  echo "  [1] git index has $staged staged file(s) ......... BLOCKED (another session is mid-staging)"
  fail=1
fi

# (2) shared files diff must be Nezuko-only
echo "  [2] shared files contain ONLY Nezuko changes (other-session code lines; 0 = clean):"
for f in "${SHARED[@]}"; do
  [ -f "$f" ] || { echo "      $f: (missing) ... skipped"; continue; }
  n=$(git diff -- "$f" | awk -v OTHER="$OTHER" -v ALLOW="$ALLOW" '
    /^[+-][^+-]/ {
      code=substr($0,2); sub(/\/\/.*/,"",code)                     # drop +/- marker + inline comment
      gsub(ALLOW, "", code)                                         # remove committed shared identifiers Nezuko reuses
      low=tolower(code)
      if (low ~ /nezuko/) next                                      # Nezuko-touching line → not a blocker
      if (match(low, "(^|[^a-z])(" OTHER ")([^a-z]|$)")) c++        # word-boundary other-session token in code
    } END { print c+0 }')
  if [ "$n" = "0" ]; then
    echo "      $f: 0 ................................... OK"
  else
    echo "      $f: $n other-session code line(s) ....... BLOCKED"
    fail=1
  fi
done

echo "────────────────────────────────────────────────────────────"
if [ "$fail" = "0" ]; then
  echo "  GO ✅   Nezuko is cleanly committable."
  echo "          → run tools/stage_nezuko.sh, review 'git diff --cached', then commit."
  exit 0
else
  echo "  NO-GO ⛔   Do NOT commit — blocker(s) above (index and/or other builds still interleaved)."
  echo "             Re-run this after the other sessions land/clear their work."
  exit 1
fi

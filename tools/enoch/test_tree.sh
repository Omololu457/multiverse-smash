#!/bin/bash
# Build a scratch TEST TREE = git archive REV + Enoch's shared-file hooks (apply_hooks.py --head) + Enoch's own files from the
# working tree, so tests / the render check run on EXACTLY what the next commit will contain (the shared worktree's dirty
# game.js / ui.js belong to another session and are never edited). Also stamps index.html inside the tree.
#   tools/enoch/test_tree.sh OUTDIR [REV=HEAD]
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
OUT="$1"; REV="${2:-HEAD}"
rm -rf "$OUT"; mkdir -p "$OUT"
git archive "$REV" | tar -x -C "$OUT"
python3 -I tools/enoch/apply_hooks.py --head "$REV" --out "$OUT" >/dev/null
for p in enoch.js enochData.js enochState.js enochFx.js enochSound.js enochKit.js enochSkins.js enochHarness.js enochSprites.js elements.js beam.js; do
  [ -f "$p" ] && cp "$p" "$OUT/$p"
done
for d in assets/enoch docs/enoch docs/elements tools/enoch; do [ -d "$d" ] && mkdir -p "$OUT/$d" && cp -R "$d/." "$OUT/$d/"; done
for t in harness/enoch*.mjs; do [ -f "$t" ] && cp "$t" "$OUT/$t"; done
ln -s "$PWD/node_modules" "$OUT/node_modules"
(cd "$OUT" && node tools/stamp_version.mjs >/dev/null)
echo "$OUT"

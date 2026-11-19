#!/bin/bash
# tools/msv1/build_tree.sh <out-index> — MSV1 private-index tree: HEAD + MSV1 files + HEAD blobs with only the MSV1 hooks.
# Never touches the default index or any other session's dirty work. Prints the tree id.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
IDX="$1"; rm -f "$IDX"
export GIT_INDEX_FILE="$IDX"
git read-tree HEAD
python3 tools/msv1/hooks.py blobs HEAD | while read -r path blob; do git update-index --cacheinfo "100644,$blob,$path"; done
FILES=$(cat tools/msv1/FILES.txt | grep -v '^#' | grep -v '^$')
for f in $FILES; do
  if [ -d "$f" ]; then git update-index --add -- $(git ls-files -o -c --exclude-standard -- "$f"); else git update-index --add -- "$f"; fi
done
git write-tree

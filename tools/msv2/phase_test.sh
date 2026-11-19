#!/bin/bash
# tools/msv2/phase_test.sh <test-tree> <phase> — reset an exported test tree to START + exactly phase 1..<phase> of MSv2
# (shared files restored from START then hooked; every MSv2-owned file removed then re-written). Worktree never written.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
T="$1"; N="$2"; START=$(cat docs/ninja_storm_rangers/START_COMMIT.txt)
for f in $(python3 -c "
src=open('tools/msv2/hooks.py').read(); ns={'__name__':'h','__file__':'tools/msv2/hooks.py'}; exec(src.split(\"if __name__ == '__main__':\")[0], ns)
print(' '.join(sorted({h[0] for h in ns['HOOKS']})))"); do git show "$START:$f" > "$T/$f"; done
rm -rf "$T"/ninjaAcademy.js "$T"/ninjaStorm*.js "$T"/assets/ninja_storm "$T"/assets/incoming/ninja_storm "$T"/tools/ninja_storm_build "$T"/tools/msv2 \
       "$T"/harness/msv2*.mjs "$T"/docs/ninja_storm_rangers "$T"/docs/ninja_academy
python3 tools/msv2/phases.py tree "$N" "$T"

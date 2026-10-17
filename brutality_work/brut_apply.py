#!/usr/bin/env python3
# Re-apply the Phase-1 BRUTALITY game.js wiring (4 sites + 1 harness hook) onto a given game.js.
# Idempotent-ish: refuses to double-apply (skips a hunk whose NEW marker already present). Each hunk's OLD anchor
# must appear EXACTLY once. Usage: python3 brut_apply.py <in game.js> <out game.js>
# This is the restore tool for the hostile shared checkout — the concurrent session keeps clobbering game.js;
# re-run this on the current origin/main:game.js to reconstruct my wiring on top of their latest.
import sys

HUNKS = [
    # (marker_already_applied, OLD, NEW)
    (
        "activateBrutalityCinematic",
        'import { startFinishWindow, isFatalityActive, updateFatalityCinematic, drawFatalityCinematic, fatalityDone, fatalityWinner, clearFatalityCinematic } from "./fatalityCinematic.js"   // roster-wide FINISH-window fatality (press Ultimate)',
        'import { startFinishWindow, isFatalityActive, updateFatalityCinematic, drawFatalityCinematic, fatalityDone, fatalityWinner, fatalityWasPerformed, clearFatalityCinematic } from "./fatalityCinematic.js"   // roster-wide FINISH-window fatality (press Ultimate)\n'
        'import { activateBrutalityCinematic, isBrutalityCinematicActive, updateBrutalityCinematic, brutalityCinematicDone, drawBrutalityCinematic, clearBrutalityCinematic, brutalityCinematicStatus } from "./brutalityCinematic.js"   // canon-themed BRUTALITY — plays when the FINISH-window expires without a fatality input\n'
        'import { BRUTALITY_CONCEPTS } from "./brutalityConcepts.js"   // canon BRUTALITY concept table (per-winner finisher themes)',
    ),
    (
        "isBrutalityCinematicActive()) return true",
        "  if (brutalityState.active) return true\n",
        "  if (brutalityState.active) return true\n  if (isBrutalityCinematicActive()) return true\n",
    ),
    (
        "window expired with NO fatality input",
        '  if (isFatalityActive()) {   // FINISH-window fatality — read the winner\'s Ultimate press; on done → victory\n'
        '    const _fwf = fatalityWinner(); updateFatalityCinematic({ ultPressed: _fwf ? !!(readRawControls(_fwf) || {}).ultimate : false, sound })\n'
        '    if (fatalityDone()) { clearFatalityCinematic(); _enterVictoryScreen() }\n'
        '    return\n'
        '  }\n',
        '  if (isFatalityActive()) {   // FINISH-window fatality — read the winner\'s Ultimate press; on done → fatality?victory : brutality\n'
        '    const _fwf = fatalityWinner(); updateFatalityCinematic({ ultPressed: _fwf ? !!(readRawControls(_fwf) || {}).ultimate : false, sound })\n'
        '    if (fatalityDone()) {\n'
        '      const _perf = fatalityWasPerformed(), _fw = fatalityWinner()\n'
        '      clearFatalityCinematic()\n'
        '      // window expired with NO fatality input → the loser gets brutalized by the winner\'s canon signature (if any)\n'
        '      if (!_perf && _fw && activateBrutalityCinematic(_fw, _fw === p1 ? p2 : p1)) return\n'
        '      _enterVictoryScreen()\n'
        '    }\n'
        '    return\n'
        '  }\n'
        '  if (isBrutalityCinematicActive()) {   // canon BRUTALITY cutaway plays out — freeze combat; on done → victory\n'
        '    updateBrutalityCinematic({ sound })\n'
        '    if (brutalityCinematicDone()) { clearBrutalityCinematic(); _enterVictoryScreen() }\n'
        '    return\n'
        '  }\n',
    ),
    (
        "drawBrutalityCinematic(ctx, canvas)",
        "  drawFatalityCinematic(ctx, canvas)   // roster-wide FINISH-window + fatality cutaway overlay\n",
        "  drawFatalityCinematic(ctx, canvas)   // roster-wide FINISH-window + fatality cutaway overlay\n"
        "  drawBrutalityCinematic(ctx, canvas)  // canon-themed BRUTALITY cutaway overlay (plays on window-timeout)\n",
    ),
    (
        "cineConcepts:",
        "      finishers:    () => Object.keys(BRUTALITY_FINISHERS),\n",
        "      finishers:    () => Object.keys(BRUTALITY_FINISHERS),\n"
        "      // CANON BRUTALITY cutaway (concept-driven; plays on FINISH-window timeout). Which winners have a concept +\n"
        "      // a frame-exact driver to activate/step/inspect it deterministically (used by brutality_cine_live harness).\n"
        "      cineConcepts: () => Object.keys(BRUTALITY_CONCEPTS),\n"
        "      cineStatus:   () => brutalityCinematicStatus(),\n"
        '      cineTrigger:  (winner = "p1") => { const w = winner === "p1" ? p1 : p2, v = winner === "p1" ? p2 : p1; clearBrutalityCinematic(); return { started: activateBrutalityCinematic(w, v), ...brutalityCinematicStatus() } },\n'
        "      cineStep:     (n = 1) => { for (let i = 0; i < n; i++) updateBrutalityCinematic({ sound }); return brutalityCinematicStatus() },\n",
    ),
    (   # hide HUD / training overlay during a finisher cutaway (runs AFTER the draw hunk adds the brutality draw line)
        "_cineHidesHud",
        "  drawBrutalityCinematic(ctx, canvas)  // canon-themed BRUTALITY cutaway overlay (plays on window-timeout)\n  drawBattleHud()\n",
        "  drawBrutalityCinematic(ctx, canvas)  // canon-themed BRUTALITY cutaway overlay (plays on window-timeout)\n"
        "  const _cineHidesHud = isBrutalityCinematicActive() || isFatalityActive() || isShisuiFallenFatalityActive()   // hide HUD/training overlay during a finisher cutaway (MK-style)\n"
        "  if (!_cineHidesHud) drawBattleHud()\n",
    ),
]


def main():
    src, dst = sys.argv[1], sys.argv[2]
    with open(src, "r") as f:
        txt = f.read()
    applied, skipped = 0, 0
    for marker, old, new in HUNKS:
        if marker in txt:
            skipped += 1
            continue
        n = txt.count(old)
        if n != 1:
            sys.stderr.write(f"FATAL: anchor appears {n}x (need 1): {old[:70]!r}\n")
            sys.exit(2)
        txt = txt.replace(old, new, 1)
        applied += 1
    with open(dst, "w") as f:
        f.write(txt)
    print(f"brut_apply: {applied} applied, {skipped} already-present")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Phase 6 defense: Emergency Extraction reversal + somersault evasion."""
import io, sys

def patch(path, anchor, insert, where="after", must_absent=None, count=1):
    s = io.open(path, encoding="utf-8").read()
    if must_absent and must_absent in s:
        print(f"  SKIP {path}: {must_absent!r} present"); return
    n = s.count(anchor)
    if n != count:
        print(f"  !! {path}: anchor count {n} != {count}: {anchor!r}"); sys.exit(1)
    s = s.replace(anchor, (insert + anchor) if where == "before" else (anchor + insert))
    io.open(path, "w", encoding="utf-8").write(s)
    print(f"  patched {path} ({where})")

# 1) append block
block = io.open("green_arrow_work/ga_phase6_block.js", encoding="utf-8").read()
s = io.open("abilities.js", encoding="utf-8").read()
if "executeGreenArrowExtraction" not in s:
    io.open("abilities.js", "w", encoding="utf-8").write(s + "\n" + block + "\n")
    print("  appended Phase-6 block to abilities.js")
else:
    print("  SKIP append P6")

# 2) tick the two cooldowns (into tickGreenArrowTimers, after the _gaEmpCd tick)
patch("abilities.js",
      "  if ((fighter._gaEmpCd || 0) > 0) fighter._gaEmpCd--\n",
      "  if ((fighter._gaExtractCd || 0) > 0) fighter._gaExtractCd--\n"
      "  if ((fighter._gaSomerCd || 0) > 0) fighter._gaSomerCd--\n",
      where="after", must_absent="fighter._gaExtractCd--")

# 3) game.js import
patch("game.js",
      "  executeTobiramaWaterFlicker,   // Tobirama Water Body-Flicker escape (hitstun/knockdown reversal)\n",
      "  executeGreenArrowExtraction, greenArrowSomersault,   // GREEN ARROW: Emergency Extraction reversal + somersault evasion\n",
      where="after", must_absent="executeGreenArrowExtraction,")

# 4) Emergency Extraction reversal (after the Tobirama reversal block)
patch("game.js",
      '  if ((fighter.rosterKey || "").toLowerCase() === "tobirama" &&\n'
      '      ((fighter.hitstun || 0) > 0 || fighter.knockdownState) &&\n'
      '      getFighterInput(fighter).special &&\n'
      '      executeTobiramaWaterFlicker(fighter, getAbilityContext())) {\n'
      '    updateCombat(fighter, getOpponent(fighter), {}, opts); return\n'
      '  }\n',
      '\n  // GREEN ARROW — Emergency Extraction reversal: ↑+Special while knocked down (>=25 Tech, 12s cd)\n'
      '  // → Skyhook yanks Oliver out with 20 invuln. Read AHEAD of the stun early-return (like Tobirama).\n'
      '  if ((fighter.rosterKey || "").toLowerCase() === "green_arrow" &&\n'
      '      ((fighter.hitstun || 0) > 0 || fighter.knockdownState || (fighter.knockdownTimer || 0) > 0) &&\n'
      '      getFighterInput(fighter).special &&\n'
      '      (getFighterInput(fighter).up || betaHeldDirFromInput(getFighterInput(fighter), fighter.facing) === "U") &&\n'
      '      executeGreenArrowExtraction(fighter, getAbilityContext())) {\n'
      '    updateCombat(fighter, getOpponent(fighter), {}, opts); return\n'
      '  }\n',
      where="after", must_absent="executeGreenArrowExtraction(fighter, getAbilityContext())")

# 5) Somersault evasion (after the GA command-combat interception line)
patch("game.js",
      '  if ((fighter.rosterKey || "").toLowerCase() === "green_arrow" && !charging &&\n'
      '      updateGreenArrowCommandCombat(fighter, inputState, getAbilityContext(), getAttackPhase)) return\n',
      '  // GREEN ARROW — somersault evasion: double-tap Back → 10-invuln back-flip (consumes the double-tap).\n'
      '  if ((fighter.rosterKey || "").toLowerCase() === "green_arrow" && !charging &&\n'
      '      greenArrowSomersault(fighter, getAbilityContext())) return\n',
      where="after", must_absent="greenArrowSomersault(fighter, getAbilityContext())")

print("Phase 6 wiring applied.")

import io, sys
# ui.js — order indicator above the drone pips
UI_A='  const pips = Array.isArray(fighter._gaDronePips) ? fighter._gaDronePips.slice(0, 3) : []\n'
UI_N=('  // DRONE ORDER indicator (FOCUS / GUARD / SWEEP) above the pips (procedural, not sprite art).\n'
      '  { const _ord = (fighter._gaOrder || "focus").toUpperCase(), _oc = { FOCUS: "#ff6a2a", GUARD: "#5fe0ff", SWEEP: "#b79bff" }[_ord] || "#fff"; ctx.save(); ctx.font = "bold 8px monospace"; ctx.fillStyle = _oc; ctx.textAlign = flip ? "right" : "left"; ctx.fillText("\\u25B8 " + _ord, flip ? (barX + barW) : barX, barTopY + barH + 2); ctx.textAlign = "left"; ctx.restore() }\n'
      +UI_A)
# game.js — import + env + counter-summon
G_IMP_A='drawDrones, drawGreenArrowFx,'
G_IMP_N='drawDrones, drawGreenArrowFx, updateDroneCounterSummon,'
G_UPD_A='    updateDrones([p1, p2], globalFrameCount, { leftWall: 0, rightWall: getStageWorldWidth(), ceilingY: -200 })\n    updateDroneCollisions([p1, p2], activeProjectiles)\n'
G_UPD_N=('    const _gaDIsEnemy = (o, f) => !!(o && f && f !== o && !ffaSameTeam(o, f)), _gaScrW = (canvas ? canvas.width : 1280)\n'
         '    updateDrones([p1, p2], globalFrameCount, { leftWall: 0, rightWall: getStageWorldWidth(), ceilingY: -200, fighters: [p1, p2].filter(Boolean), isEnemy: _gaDIsEnemy, screenW: _gaScrW })\n'
         '    updateDroneCollisions([p1, p2], activeProjectiles)\n'
         '    updateDroneCounterSummon(activeProjectiles, globalFrameCount, { isEnemy: _gaDIsEnemy, screenW: _gaScrW })\n')
def patch(path, edits, marker):
    s=io.open(path,encoding="utf-8").read()
    if marker in s: print(f"  SKIP {path}"); return
    for a,n,l in edits:
        c=s.count(a)
        if c!=1: print(f"  !! {path}: {l} {c}"); sys.exit(1)
        s=s.replace(a,n)
    io.open(path,"w",encoding="utf-8").write(s); print(f"  {path} patched")
which=sys.argv[1]
if which=="ui": patch(sys.argv[2], [(UI_A,UI_N,"order")], "DRONE ORDER indicator")
elif which=="game": patch(sys.argv[2], [(G_IMP_A,G_IMP_N,"import"),(G_UPD_A,G_UPD_N,"env")], "updateDroneCounterSummon(activeProjectiles")

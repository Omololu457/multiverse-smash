import io, sys
MUN_IMP='import { spawnMunition, updateMunitions, updateMunitionShootDown, tickMunitionChains, drawMunitions, drawMunitionDebug, resetMunitions, activeMunitions, setMunitionDebug, explodeAt, registerMunitionProfile, MUNITION_PROFILES } from "./munitions.js"   // GREEN ARROW generic bomb/hazard module (leaf beside combat/flight → no cycle)\n'
UPD_A='    updateDroneCollisions([p1, p2], activeProjectiles)\n  }\n'
UPD_N=UPD_A+('''  // GREEN ARROW munitions (bombs/hazards) — generic pool; runs even with no drones out.
  if (activeMunitions.length || (p1 && p1.rosterKey === "green_arrow") || (p2 && p2.rosterKey === "green_arrow")) {
    const _gaMEnv = { groundY, leftWall: (typeof physics !== "undefined" && physics ? (physics.stageLeft || 0) : 0), rightWall: getStageWorldWidth(), fighters: [p1, p2].filter(Boolean), isEnemy: (o, f) => !!(o && f && f !== o && !ffaSameTeam(o, f)), platformTopAt: (x) => { let best = null; for (const pl of (getPlatforms ? getPlatforms() : [])) { if (x >= pl.x && x <= pl.x + (pl.w || pl.width || 0)) { const top = pl.y; if (best == null || top < best) best = top } } return best } }
    updateMunitions(globalFrameCount, _gaMEnv)
    updateMunitionShootDown([p1, p2].filter(Boolean), activeProjectiles, globalFrameCount, _gaMEnv)
    tickMunitionChains(globalFrameCount, _gaMEnv)
  }
''')
DRAW_A='  drawGreenArrowFx(ctx, [p1, p2], globalFrameCount)   // GREEN ARROW status FX (net/flash/rings) — render-only\n'
DRAW_N=DRAW_A+'  drawMunitions(ctx, globalFrameCount); drawMunitionDebug(ctx)   // GREEN ARROW bombs/hazards + telegraphs (render-only)\n'
RST_A1='  resetDrones()                                        // GREEN ARROW drones cleared with summons/projectiles\n'
RST_N1=RST_A1+'  resetMunitions()                                     // GREEN ARROW bombs/fire-patches cleared\n'
RST_A2='  resetDrones()            // GREEN ARROW drones cleared with summons/projectiles\n'
RST_N2=RST_A2+'  resetMunitions()         // GREEN ARROW bombs/fire-patches cleared\n'
def patch(path):
    s=io.open(path,encoding="utf-8").read()
    if "from \"./munitions.js\"" in s: print(f"  SKIP {path}"); return
    # import after the drones.js import line
    lines=s.split("\n"); out=[]; ins=False
    for ln in lines:
        out.append(ln)
        if (not ins) and 'from "./drones.js"' in ln:
            out.append(MUN_IMP.rstrip("\n")); ins=True
    assert ins, f"{path}: no drones.js import"
    s="\n".join(out)
    for a,n,l in [(UPD_A,UPD_N,"update"),(DRAW_A,DRAW_N,"draw"),(RST_A1,RST_N1,"reset1"),(RST_A2,RST_N2,"reset2")]:
        c=s.count(a)
        if c!=1: print(f"  !! {path}: {l} {c}"); sys.exit(1)
        s=s.replace(a,n)
    io.open(path,"w",encoding="utf-8").write(s); print(f"  {path} patched")
for p in sys.argv[1:]: patch(p)

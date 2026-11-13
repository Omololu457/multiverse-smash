import io, sys
IMP_A='import { registerDroneProfile, registerBehaviour, spawnDrone, recallDrones, countDrones, getActiveDrones, DRONE_PROFILES } from "./drones.js"'
IMP_N='import { registerDroneProfile, registerBehaviour, spawnDrone, recallDrones, countDrones, getActiveDrones, DRONE_PROFILES, cycleDroneOrder } from "./drones.js"'
CYC_A='  if (dd && upEdge)      { inputState.upAttack = false; greenArrowCycleQuiver(fighter); return true }   // ↓↓+Up = CYCLE quiver\n'
CYC_N=CYC_A+'  if (dd && lightEdge)   { inputState.light = false; cycleDroneOrder(fighter); if (typeof sound !== "undefined") sound.play?.("ga_drone_deploy"); return true }   // ↓↓+Light = CYCLE drone ORDER (focus/guard/sweep)\n'
CPU_A='  if ((fighter._gaSomerCd || 0) > 0) fighter._gaSomerCd--\n'
CPU_N=CPU_A+'  // CPU Oliver rotates its drone ORDER on a hash schedule (deterministic; ~every 4s).\n  if (fighter._aiControlled) { fighter._gaOrderTick = (fighter._gaOrderTick || 0) + 1; if (fighter._gaOrderTick >= 240) { fighter._gaOrderTick = 0; fighter._gaOrder = ["focus", "guard", "sweep"][Math.floor(hashRandom((fighter._matchSeed | 0) || 1, (fighter._gaOrderSeq = (fighter._gaOrderSeq || 0) + 1), fighter.playerNumber || 1) * 3) % 3] } }\n'
def patch(path):
    s=io.open(path,encoding="utf-8").read()
    if "cycleDroneOrder" in s: print(f"  SKIP {path}"); return
    for a,n,l in [(IMP_A,IMP_N,"import"),(CYC_A,CYC_N,"cycle"),(CPU_A,CPU_N,"cpu")]:
        c=s.count(a)
        if c!=1: print(f"  !! {path}: {l} {c}"); sys.exit(1)
        s=s.replace(a,n)
    io.open(path,"w",encoding="utf-8").write(s); print(f"  {path} patched")
for p in sys.argv[1:]: patch(p)

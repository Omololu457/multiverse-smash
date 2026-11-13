import io, sys
IMP_A = "import { isLuffy, luffyHit, absorbLuffyStrike, prepareLuffyAttack, clearLuffy, luffyInterrupted, luffyLimbHurtbox } from './luffyState.js'\n"
IMP_N = IMP_A + 'import { forceGround as _gaForceGround } from "./flight.js"   // GREEN ARROW Net Arrow grounds flyers (flight.js is a leaf → no cycle; no-op for non-flyers)\n'
HIT_A = "      if (!fighter.isBlocking && proj._gaArrow === \"emp\" && (fighter.health || 0) > 0) { fighter._gaDisabled = 180; if (proj.owner) proj.owner._gaEmpHit = fighter }\n"
HIT_N = HIT_A + ("      if (!fighter.isBlocking && proj._gaArrow === \"net\" && (fighter.health || 0) > 0) { fighter._gaNetted = 60; if (fighter._flightCtl || fighter._flightActive) { try { _gaForceGround(fighter, 72) } catch (_) {} } if (proj.owner) proj.owner._gaNetHit = fighter }\n"
                 "      if (!fighter.isBlocking && proj._gaArrow === \"flash\" && (fighter.health || 0) > 0) { fighter.hitstun = Math.max(fighter.hitstun || 0, 30); fighter._gaFlash = 18 }\n")
TICK_A = "  if ((fighter._gaAirRecover || 0) > 0) fighter._gaAirRecover--   // GREEN ARROW Skyhook Rescue free-air-recovery window\n"
TICK_N = TICK_A + ("  if ((fighter._gaNetted || 0) > 0) { fighter._gaNetted--; if (fighter.hitstun < fighter._gaNetted) fighter.hitstun = fighter._gaNetted; fighter.vx = 0 }   // GREEN ARROW Net lock (only the Net Arrow sets it)\n"
                   "  if ((fighter._gaFlash || 0) > 0) fighter._gaFlash--   // GREEN ARROW Flash dazzle (render)\n"
                   "  if ((fighter._gaForceGroundTimer || 0) > 0) { fighter._gaForceGroundTimer = (fighter._gaForceGroundTimer || fighter._forceGroundTimer || 0); fighter._forceGroundTimer--; }\n")
def patch(path):
    s=io.open(path,encoding="utf-8").read()
    if "_gaNetted = 60" in s: print(f"  SKIP {path}"); return
    for a,n,l in [(IMP_A,IMP_N,"import"),(HIT_A,HIT_N,"hit"),(TICK_A,TICK_N,"tick")]:
        c=s.count(a)
        if c!=1: print(f"  !! {path}: {l} {c}"); sys.exit(1)
        s=s.replace(a,n)
    io.open(path,"w",encoding="utf-8").write(s); print(f"  {path} patched")
for p in sys.argv[1:]: patch(p)

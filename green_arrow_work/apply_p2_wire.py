import io, sys
GSTAMP_A = '    fighter._specialHeldDir = betaHeldDirFromInput(inputState, fighter.facing)\n'
GSTAMP_N = GSTAMP_A + '    fighter._gaStrikeMod = !!inputState.heavy   // GREEN ARROW: Heavy held at Special press -> STRIKE drone mode\n'
CTICK_A = "  if ((fighter._gaDisabled || 0) > 0) fighter._gaDisabled--   // GREEN ARROW EMP: summon/drone lockout countdown (only GA's EMP sets it)\n"
CTICK_N = CTICK_A + "  if ((fighter._gaStunRing || 0) > 0) fighter._gaStunRing--   // GREEN ARROW stun-drone shock ring (render)\n  if ((fighter._gaGuardPing || 0) > 0) fighter._gaGuardPing--   // GREEN ARROW Sentinel auto-guard ping (render)\n  if ((fighter._gaAirRecover || 0) > 0) fighter._gaAirRecover--   // GREEN ARROW Skyhook Rescue free-air-recovery window\n"
def patch(path, a, n, marker):
    s=io.open(path,encoding="utf-8").read()
    if marker in s: print(f"  SKIP {path}"); return
    assert s.count(a)==1, f"{path}: anchor {s.count(a)}"
    io.open(path,"w",encoding="utf-8").write(s.replace(a,n)); print(f"  patched {path}")
which=sys.argv[1]
if which=="game": patch(sys.argv[2], GSTAMP_A, GSTAMP_N, "_gaStrikeMod = !!inputState.heavy")
elif which=="combat": patch(sys.argv[2], CTICK_A, CTICK_N, "_gaStunRing--")

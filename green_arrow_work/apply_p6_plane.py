# PASS3 P6: plane-drone hum when the ARROWSTORM Payload bomber launches its carpet run.
import sys
OLD = '''      s._bomber = bomber || null
      s.phase = "carpet"; s.t = 76; s.dropped = 0'''
NEW = '''      s._bomber = bomber || null
      sound.playGreenArrow?.("ga_plane", 1, ((fighter._matchSeed | 0) || 1))   // Payload engine drone over the carpet run
      s.phase = "carpet"; s.t = 76; s.dropped = 0'''
def patch(p):
    s = open(p, encoding="utf-8").read()
    if 'playGreenArrow?.("ga_plane"' in s:
        print("already", p); return
    assert s.count(OLD) == 1, f"anchor x{s.count(OLD)} in {p}"
    open(p, "w", encoding="utf-8").write(s.replace(OLD, NEW, 1))
    print("patched", p)
for p in sys.argv[1:]:
    patch(p)

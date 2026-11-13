# PASS3 P5: F8 training toggle also drives the munition-debug overlay (blast radii / bomb HP /
# chain depth / reticle targets). drones.js draws order + target lines separately.
import sys
OLD = '  if (_trainingKeyPressed("f8")) toggleDroneDebug()'
NEW = '  if (_trainingKeyPressed("f8")) { const _gaDbg = toggleDroneDebug(); setMunitionDebug(_gaDbg) }   // GREEN ARROW: F8 = drone + munition training overlays'
def patch(p):
    s = open(p).read()
    if NEW in s:
        print("already", p); return
    assert s.count(OLD) == 1, f"anchor x{s.count(OLD)} in {p}"
    open(p, "w").write(s.replace(OLD, NEW))
    print("patched", p)
for p in sys.argv[1:]:
    patch(p)

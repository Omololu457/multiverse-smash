# PASS3 P7: nudge ARROWSTORM toward the ~380 spec target (was ~355). GA-only; stays <=420 cap.
import sys
EDITS = [
  ('spawnMunition(fighter, "big", { x: (opp.x || 0) + (opp.w || 60) / 2, y: planeY - 60, vx: 0, vy: 3, damage: 220, target: opp })',
   'spawnMunition(fighter, "big", { x: (opp.x || 0) + (opp.w || 60) / 2, y: planeY - 60, vx: 0, vy: 3, damage: 252, target: opp })'),
  ('_gaDroneShot(fighter, context, { type: "gaArrowstormArrow", damage: 55, vx: face * 16,',
   '_gaDroneShot(fighter, context, { type: "gaArrowstormArrow", damage: 62, vx: face * 16,'),
]
def patch(p):
    s = open(p, encoding="utf-8").read()
    for old, new in EDITS:
        if new in s: continue
        assert s.count(old) == 1, f"anchor x{s.count(old)} in {p}: {old[:40]}"
        s = s.replace(old, new, 1)
    open(p, "w", encoding="utf-8").write(s)
    print("patched", p)
for p in sys.argv[1:]:
    patch(p)

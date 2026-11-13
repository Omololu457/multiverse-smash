import io, sys
NEWFN = io.open("green_arrow_work/p3_super_new.js", encoding="utf-8").read()
FIMP_A = 'import { flightAxisStep, flightSoftLimit } from "./flight.js"   // GREEN ARROW Grapple pull reuses the flight accel/drag helpers (flight.js is a leaf → no cycle)'
FIMP_N = 'import { flightAxisStep, flightSoftLimit, hashRandom } from "./flight.js"   // GREEN ARROW Grapple pull + Super scatter RNG (flight.js is a leaf → no cycle)\nimport { spawnMunition } from "./munitions.js"   // GREEN ARROW Super/drone bombs (munitions.js is a leaf → no cycle)'
def patch(path):
    s=io.open(path,encoding="utf-8").read()
    if 'from "./munitions.js"' in s: print(f"  SKIP {path}"); return
    # replace the Super function
    a=s.index("export function applyGreenArrowArrowstorm(fighter, context) {")
    b=s.index("\n// tick the Tech lockout", a)
    s=s[:a]+NEWFN.rstrip("\n")+s[b:]
    # imports
    assert s.count(FIMP_A)==1, f"{path}: flight import {s.count(FIMP_A)}"
    s=s.replace(FIMP_A, FIMP_N)
    io.open(path,"w",encoding="utf-8").write(s); print(f"  {path} patched (super + imports)")
for p in sys.argv[1:]: patch(p)
